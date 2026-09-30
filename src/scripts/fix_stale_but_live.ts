/**
 * ⏰ FIX: STALE_BUT_LIVE jobs (closing date passed, still showing live)
 *
 * The Job Audit flags jobs whose closingDateMillis has passed but whose
 * status still lets them show on the public site (page.tsx excludes only
 * EXPIRED/CLOSED/REJECTED/PENDING_REVIEW/PENDING). These 7 are all 1-2 days
 * past their own posted closing date. Fix: set status -> "EXPIRED", which
 * page.tsx already treats as not-live (matches audit_live_site_quality.ts's
 * own visibility filter).
 *
 * SAFETY: Dry run by default. Zero writes without --commit. Fixed docId
 * allowlist below (from the 2026-09-30 report) rather than a live re-query,
 * so this can't accidentally sweep up jobs that closed for other reasons.
 *
 * Usage:
 *   npx tsx src/scripts/fix_stale_but_live.ts          (dry run)
 *   npx tsx src/scripts/fix_stale_but_live.ts --commit (apply writes)
 */

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as fs from "fs";
import * as path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const saPath = path.resolve(process.cwd(), "service-account.json");
if (fs.existsSync(saPath)) {
  const serviceAccount = require(saPath);
  if (!getApps().length) {
    initializeApp({ credential: cert(serviceAccount) });
  }
} else {
  const serviceAccount = require("../../service-account.json");
  if (!getApps().length) {
    initializeApp({ credential: cert(serviceAccount) });
  }
}
const db = getFirestore();

const COMMIT = process.argv.includes("--commit");

const STALE_DOC_IDS = [
  "fp_flis0130_cognita_3046",
  "fp_flis0149_middleschoolassist_23809e7f924dd84b",
  "fp_flis0157_middleschoolmypmat_b79672c8979cdeb4",
  "fp_flis0157_middleschoolreligi_1580afdbfb6993da",
  "fp_flis0157_myp12languageandli_32a48400814e65da",
  "fp_flis0300_elementaryschoolas_c139fc93e03b2ef6",
  "fp_flis0394_senteacher_1c4b2d824f437768",
];

async function main() {
  console.log("⏰ [FIX STALE_BUT_LIVE] Expiring jobs past their closing date");
  console.log(COMMIT ? "🔴 LIVE MODE — writes will be committed.\n" : "🟡 DRY RUN — no writes will be made.\n");

  const results: { docId: string; title: string; closingDateMillis: number; currentStatus: string; found: boolean }[] = [];

  for (const docId of STALE_DOC_IDS) {
    const ref = db.collection("featured_jobs_cache").doc(docId);
    const doc = await ref.get();
    if (!doc.exists) {
      results.push({ docId, title: "(not found)", closingDateMillis: 0, currentStatus: "", found: false });
      continue;
    }
    const data = doc.data() as any;
    results.push({
      docId,
      title: data.title || "",
      closingDateMillis: data.closingDateMillis || 0,
      currentStatus: data.status || "",
      found: true,
    });
  }

  console.log("Plan:");
  for (const r of results) {
    if (!r.found) {
      console.log(`  ⚠️  ${r.docId} — NOT FOUND, skipping (may have already been actioned).`);
      continue;
    }
    const closingDate = r.closingDateMillis ? new Date(r.closingDateMillis).toISOString().slice(0, 10) : "?";
    console.log(`  - ${r.docId}: "${r.title}" | closed ${closingDate} | status ${r.currentStatus} -> EXPIRED`);
  }
  console.log("");

  const toUpdate = results.filter((r) => r.found && r.currentStatus.toUpperCase() !== "EXPIRED");
  if (toUpdate.length === 0) {
    console.log("Nothing to do — all found jobs are already EXPIRED or none exist.");
    return;
  }

  if (!COMMIT) {
    console.log(`Dry run complete. ${toUpdate.length} job(s) would be updated. Zero Firestore writes were made.`);
    console.log("Re-run with --commit to apply.");
    return;
  }

  const batch = db.batch();
  for (const r of toUpdate) {
    const ref = db.collection("featured_jobs_cache").doc(r.docId);
    batch.update(ref, { status: "EXPIRED", updatedAt: new Date().toISOString() });
  }
  await batch.commit();
  console.log(`✅ ${toUpdate.length} job(s) updated to status: "EXPIRED".`);
}

main().catch((err) => {
  console.error("❌ Error:", err?.message || err);
  process.exit(1);
});

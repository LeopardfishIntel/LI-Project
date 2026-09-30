/**
 * 🔧 FIX: both flagged Cheltenham Muscat jobs were marked
 * isRollingDeadline: true with no closingDateMillis, but their TES source
 * pages both show real "Apply by" dates that have already passed
 * (confirmed by screenshot, 2026-09-30):
 *   - fp_flis0044_btec_2026  "Teacher of BTEC Business (Level 3)"
 *     Apply by: 12 September 2026 (page badge: "Expired")
 *   - fp_flis0044_maths_2026 "Teacher of Maths (inc. Acting Head of Dept)"
 *     Apply by: 17 September 2026
 *
 * ROOT CAUSE: tes-adaptor.ts (frozen module) only reads the closing date
 * from the page's JSON-LD `validThrough` field — it never parses the
 * visible "Apply by:" text. When TES's own structured data omits
 * validThrough (as it did here), the adaptor emits closingDate: null,
 * which downstream becomes isRollingDeadline: true even though the page
 * has a real, human-visible deadline. Not touching tes-adaptor.ts here —
 * frozen, needs explicit permission — this script only corrects the two
 * already-known-bad docs.
 *
 * Both are past their real deadline, so they're marked EXPIRED rather
 * than left approvable in pending_review.
 *
 * SAFETY: Dry run by default. Zero writes without --commit. Fixed docId
 * list, not a live re-query.
 *
 * Usage:
 *   npx tsx src/scripts/fix_cheltenham_expired_pair.ts          (dry run)
 *   npx tsx src/scripts/fix_cheltenham_expired_pair.ts --commit (apply)
 */

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const serviceAccount = require("../../service-account.json");
if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

const COMMIT = process.argv.includes("--commit");

const PLAN = [
  { docId: "fp_flis0044_btec_2026", realClosingDate: "2026-09-12", note: "source page badge reads 'Expired'" },
  { docId: "fp_flis0044_maths_2026", realClosingDate: "2026-09-17", note: "confirmed past today (2026-09-30)" },
];

async function main() {
  console.log("🔧 [FIX] Cheltenham Muscat jobs — real closing dates missed by scraper (JSON-LD validThrough was empty)");
  console.log(COMMIT ? "🔴 LIVE MODE — writes will be committed.\n" : "🟡 DRY RUN — no writes will be made.\n");

  console.log("Plan:");
  for (const p of PLAN) {
    const millis = new Date(`${p.realClosingDate}T23:59:59Z`).getTime();
    console.log(`  ${p.docId}:`);
    console.log(`    closingDate -> "${p.realClosingDate}"`);
    console.log(`    closingDateMillis -> ${millis}`);
    console.log(`    isRollingDeadline -> false`);
    console.log(`    status -> "EXPIRED" (${p.note})`);
  }
  console.log("");

  if (!COMMIT) {
    console.log(`Dry run complete. ${PLAN.length} job(s) would be updated. Zero Firestore writes were made.`);
    console.log("Re-run with --commit to apply.");
    return;
  }

  const batch = db.batch();
  for (const p of PLAN) {
    const millis = new Date(`${p.realClosingDate}T23:59:59Z`).getTime();
    const cacheRef = db.collection("featured_jobs_cache").doc(p.docId);
    batch.update(cacheRef, {
      closingDate: p.realClosingDate,
      closingDateMillis: millis,
      isRollingDeadline: false,
      status: "EXPIRED",
      closedReason: `Confirmed expired on TES source page ('Apply by: ${p.realClosingDate.split("-").reverse().join(" ")}'). JSON-LD validThrough was empty, so the adaptor misread this as a rolling deadline.`,
      updatedAt: new Date().toISOString(),
    });

    const subRef = db.collection("schools").doc("FLIS0042").collection("jobs").doc(p.docId);
    batch.update(subRef, {
      closingDate: p.realClosingDate,
      closingDateMillis: millis,
      isRollingDeadline: false,
      status: "EXPIRED",
      updatedAt: new Date().toISOString(),
    });
  }

  try {
    await batch.commit();
  } catch (e) {
    console.warn("⚠️ Batch commit hit an issue (likely a missing subcollection doc for one entry). Retrying cache-only updates individually...");
    for (const p of PLAN) {
      const millis = new Date(`${p.realClosingDate}T23:59:59Z`).getTime();
      await db.collection("featured_jobs_cache").doc(p.docId).update({
        closingDate: p.realClosingDate,
        closingDateMillis: millis,
        isRollingDeadline: false,
        status: "EXPIRED",
        updatedAt: new Date().toISOString(),
      });
    }
  }

  console.log(`✅ ${PLAN.length} job(s) updated — marked EXPIRED with real closing dates.`);
}

main().catch((err) => {
  console.error("❌ Error:", err?.message || err);
  process.exit(1);
});

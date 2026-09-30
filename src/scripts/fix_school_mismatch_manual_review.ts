/**
 * 🔎 FIX: the 14 SCHOOL_MISMATCH jobs excluded from the bulk reattribution
 *
 * fix_school_mismatch_reattribution.ts correctly excluded FLIS0028 (12
 * jobs) and FLIS0113 (2 jobs) because each had jobs matching two different
 * real schools. This is the manual-review follow-up, reading the actual
 * job text instead of trusting the fuzzy matcher's second-best guess:
 *
 * FLIS0113 (2 jobs) -> FLIS0102 (Raha International School, Abu Dhabi)
 *   Both jobs' own cached schoolName field already says "Raha International
 *   School" verbatim, an exact match to FLIS0102's real name. The matcher's
 *   other candidate, FLIS0350 "Regent International School" (Dubai), is a
 *   different name in a different city — a weaker fuzzy match, not a real
 *   alternative. One job's title even confirms it directly: "RIS - Khalifa
 *   City Campus" is Raha International School's own site.
 *
 * FLIS0028 (12 jobs) -> splits by what the title actually names:
 *   - Titles naming "Yasmina British Academy" specifically -> FLIS0366
 *     (Yasmina's own dedicated record)
 *   - Everything else (no specific campus named, or names a different
 *     unlisted campus like "Mubarak Bin Mohammed") -> FLIS0027, the
 *     general "Aldar Academies" record — the same target already used for
 *     the other 9 FLIS0028 jobs the bulk script fixed, since there's no
 *     more specific real match available for these.
 *
 * SAFETY: Dry run by default. Zero writes without --commit. Fixed docId
 * map below (not a live re-query) so this can't drift from the reviewed
 * decision above.
 *
 * Usage:
 *   npx tsx src/scripts/fix_school_mismatch_manual_review.ts          (dry run)
 *   npx tsx src/scripts/fix_school_mismatch_manual_review.ts --commit (apply)
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

const TO_RAHA_FLIS0102 = [
  "fp_flis0113_tes_2266357", // "Head of PE - Sec(BTEC) - RIS - Khalifa City Campus"
  "fp_flis0113_tes_2341101", // "Primary Music Teacher" (cached schoolName says Raha)
];

const TO_YASMINA_FLIS0366 = [
  "fp_flis0028_7ydkwz",       // "Teacher - Science - Yasmina British Academy - October start"
  "fp_flis0028_gp03a5",       // "Teacher - Science (Maternity Cover) - Yasmina British Academy - October start"
  "fp_flis0028_tes_2338761",  // "Teacher - Science (Maternity Cover) - Yasmina British Academ[y]"
  "fp_flis0028_vgq3d",        // "Teacher - Science (Maternity Cover) - Yasmina British Academy - October start"
];

const TO_ALDAR_FLIS0027 = [
  "fp_flis0028_inspired_teacher_math_mubarak", // "Teacher-Math- Mubarak Bin Mohammed Cycle 2 & 3 Charter School"
  "fp_flis0028_tes_2340174", // "Teacher - Primary"
  "fp_flis0028_tes_2340178", // "Teacher - EYFS - (Term 2 - AY 26/27)"
  "fp_flis0028_tes_2340187", // "Teacher - Primary - (Term 2 - AY 26/27)"
  "fp_flis0028_tes_2340219", // "Physical Education Teacher"
  "fp_flis0028_tes_2340842", // "Teacher - Humanities"
  "fp_flis0028_tes_2340843", // "Teacher - Psychology (January 2027)"
  "fp_flis0028_tes_2340847", // "Teacher - English - Immediate Start"
];

async function applyGroup(docIds: string[], toId: string, plan: any[]) {
  for (const docId of docIds) {
    const ref = db.collection("featured_jobs_cache").doc(docId);
    const doc = await ref.get();
    if (!doc.exists) {
      plan.push({ docId, toId, found: false });
      continue;
    }
    const data = doc.data() as any;
    plan.push({ docId, title: data.title, fromId: data.schoolId, toId, found: true, ref });
  }
}

async function main() {
  console.log("🔎 [FIX SCHOOL_MISMATCH — manual review] Applying reviewed decisions for FLIS0028 / FLIS0113");
  console.log(COMMIT ? "🔴 LIVE MODE — writes will be committed.\n" : "🟡 DRY RUN — no writes will be made.\n");

  const [raha, yasmina, aldar] = await Promise.all([
    db.collection("schools").doc("FLIS0102").get(),
    db.collection("schools").doc("FLIS0366").get(),
    db.collection("schools").doc("FLIS0027").get(),
  ]);
  const targets: Record<string, any> = {
    FLIS0102: raha.data(),
    FLIS0366: yasmina.data(),
    FLIS0027: aldar.data(),
  };
  for (const [id, data] of Object.entries(targets)) {
    if (!data) {
      console.error(`❌ Target school ${id} not found live — aborting.`);
      process.exit(1);
    }
  }

  const plan: any[] = [];
  await applyGroup(TO_RAHA_FLIS0102, "FLIS0102", plan);
  await applyGroup(TO_YASMINA_FLIS0366, "FLIS0366", plan);
  await applyGroup(TO_ALDAR_FLIS0027, "FLIS0027", plan);

  console.log("Plan:");
  for (const p of plan) {
    if (!p.found) {
      console.log(`  ⚠️  ${p.docId} — NOT FOUND, skipping.`);
      continue;
    }
    const t = targets[p.toId];
    console.log(`  ${p.docId} | "${p.title}"`);
    console.log(`    ${p.fromId} -> ${p.toId} (${t.name || t.schoolname}, ${t.city}, ${t.country})`);
  }
  console.log("");

  const toWrite = plan.filter((p) => p.found);
  if (!COMMIT) {
    console.log(`Dry run complete. ${toWrite.length} job(s) would be updated. Zero Firestore writes were made.`);
    console.log("Re-run with --commit to apply.");
    return;
  }

  const batch = db.batch();
  for (const p of toWrite) {
    const t = targets[p.toId];
    batch.update(p.ref, {
      schoolId: p.toId,
      schoolName: t.name || t.schoolname || "",
      city: t.city || "",
      country: t.country || "",
      updatedAt: new Date().toISOString(),
    });
  }
  await batch.commit();
  console.log(`✅ ${toWrite.length} job(s) reattributed.`);
}

main().catch((err) => {
  console.error("❌ Error:", err?.message || err);
  process.exit(1);
});

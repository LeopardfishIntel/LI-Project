/**
 * 🔧 FIX: the 3 pending_review jobs Roger manually flagged (2026-09-30)
 *
 * investigate_pending_review_flagged.ts confirmed:
 *   1. fp_flis0044_btec_2026  "Teacher of BTEC Business (Level 3)"
 *   2. fp_flis0044_maths_2026 "Teacher of Maths (inc. Acting Head of Dept)"
 *      Both stamped schoolId FLIS0044 ("Calcutta Int'l", Kolkata, India)
 *      but their own schoolName/city/country already correctly say
 *      "Cheltenham Muscat" / Muscat / Oman — the real school is FLIS0042.
 *      This is the SAME misattribution bug already fixed for live jobs
 *      earlier today, confirmed still active in freshly-scraped jobs.
 *   3. fp_flis0106_secondary_780c159f1de04ee4  "Head of Secondary" @ Nord
 *      Anglia International School Dubai — the careers URL confirmed
 *      returns "Sorry, this position has been filled." Not a data bug,
 *      just a stale posting that needs closing.
 *
 * Both jobs stay in pending_review after the schoolId fix (not force-
 * approved) — this only corrects the attribution so whoever reviews them
 * sees the right school. The Nord Anglia job is marked CLOSED since it's
 * confirmed filled, independent of any review decision.
 *
 * SAFETY: Dry run by default. Zero writes without --commit. Fixed docId
 * list, not a live re-query.
 *
 * Usage:
 *   npx tsx src/scripts/fix_pending_review_flagged.ts          (dry run)
 *   npx tsx src/scripts/fix_pending_review_flagged.ts --commit (apply)
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

async function main() {
  console.log("🔧 [FIX] 3 flagged pending_review jobs");
  console.log(COMMIT ? "🔴 LIVE MODE — writes will be committed.\n" : "🟡 DRY RUN — no writes will be made.\n");

  const cheltenham = await db.collection("schools").doc("FLIS0042").get();
  if (!cheltenham.exists) {
    console.error("❌ FLIS0042 (Cheltenham Muscat) not found live — aborting.");
    process.exit(1);
  }
  const cData = cheltenham.data() as any;

  const plan = [
    {
      docId: "fp_flis0044_btec_2026",
      op: "reattribute",
      detail: `schoolId FLIS0044 -> FLIS0042 (${cData.name || cData.schoolname}, ${cData.city}, ${cData.country})`,
    },
    {
      docId: "fp_flis0044_maths_2026",
      op: "reattribute",
      detail: `schoolId FLIS0044 -> FLIS0042 (${cData.name || cData.schoolname}, ${cData.city}, ${cData.country})`,
    },
    {
      docId: "fp_flis0106_secondary_780c159f1de04ee4",
      op: "close",
      detail: `status -> CLOSED (confirmed filled: careers.nordanglia.com returns "Sorry, this position has been filled.")`,
    },
  ];

  console.log("Plan:");
  for (const p of plan) {
    console.log(`  ${p.docId}: ${p.detail}`);
  }
  console.log("");

  if (!COMMIT) {
    console.log(`Dry run complete. ${plan.length} job(s) would be updated. Zero Firestore writes were made.`);
    console.log("Re-run with --commit to apply.");
    return;
  }

  const batch = db.batch();
  batch.update(db.collection("featured_jobs_cache").doc("fp_flis0044_btec_2026"), {
    schoolId: "FLIS0042",
    schoolName: cData.name || cData.schoolname || "Cheltenham Muscat",
    city: cData.city || "Muscat",
    country: cData.country || "Oman",
    updatedAt: new Date().toISOString(),
  });
  batch.update(db.collection("featured_jobs_cache").doc("fp_flis0044_maths_2026"), {
    schoolId: "FLIS0042",
    schoolName: cData.name || cData.schoolname || "Cheltenham Muscat",
    city: cData.city || "Muscat",
    country: cData.country || "Oman",
    updatedAt: new Date().toISOString(),
  });
  batch.update(db.collection("featured_jobs_cache").doc("fp_flis0106_secondary_780c159f1de04ee4"), {
    status: "CLOSED",
    closedReason: "Confirmed filled by employer (careers.nordanglia.com returns 'Sorry, this position has been filled.')",
    updatedAt: new Date().toISOString(),
  });
  await batch.commit();
  console.log(`✅ ${plan.length} job(s) updated.`);
}

main().catch((err) => {
  console.error("❌ Error:", err?.message || err);
  process.exit(1);
});

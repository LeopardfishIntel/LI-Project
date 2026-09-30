/**
 * 🇦🇪 FIX DUBAI SCHOOL MISATTRIBUTION SCRIPT
 *
 * Scans the 11 jobs with legacy campus-suffixed schoolId values:
 * - 5 jobs with `flis0115_emirates_hills` -> Reattribute to canonical FLIS0104 (Dubai British School / Emirates Hills)
 * - 4 jobs with `flis0115_jumeirah_park`  -> Reattribute to canonical FLIS0419 (Dubai British School Jumeirah Park)
 * - 2 jobs with `flis0118_academic_city` & `flis0118_college` -> Mark as rejected (anonymous recruitment agency ad)
 *
 * SAFETY: Dry run by default. Zero writes without `--commit`.
 *
 * Usage:
 *   npx tsx src/scripts/fix_dubai_school_misattribution.ts          (dry run)
 *   npx tsx src/scripts/fix_dubai_school_misattribution.ts --commit (apply writes)
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
}
const db = getFirestore();

const COMMIT = process.argv.includes("--commit");

async function main() {
  console.log("🇦🇪 [DUBAI SCHOOL RECONCILIATION] Auditing suffixed school IDs...");
  console.log(`Mode: ${COMMIT ? "🔴 COMMIT (LIVE WRITES)" : "🟢 DRY RUN (READ ONLY)"}\n`);

  const targetIds = [
    "flis0115_emirates_hills",
    "flis0115_jumeirah_park",
    "flis0118_academic_city",
    "flis0118_college",
  ];

  const snap = await db.collection("featured_jobs_cache").where("schoolId", "in", targetIds).get();

  const toEmiratesHills: any[] = [];
  const toJumeirahPark: any[] = [];
  const toRejectAgency: any[] = [];

  for (const doc of snap.docs) {
    const data = { docId: doc.id, ...doc.data() } as any;
    const sId = String(data.schoolId || "").toLowerCase();

    if (sId === "flis0115_emirates_hills") {
      toEmiratesHills.push(data);
    } else if (sId === "flis0115_jumeirah_park") {
      toJumeirahPark.push(data);
    } else if (sId === "flis0118_academic_city" || sId === "flis0118_college") {
      toRejectAgency.push(data);
    }
  }

  console.log("================ PLAN SUMMARY ================");
  console.log(`✅ To Reattribute -> FLIS0104 (Dubai British School / Emirates Hills): ${toEmiratesHills.length} job(s)`);
  console.log(`✅ To Reattribute -> FLIS0419 (Dubai British School Jumeirah Park):    ${toJumeirahPark.length} job(s)`);
  console.log(`🚫 To REJECT     -> Anonymous Agency Ads (flis0118_*):              ${toRejectAgency.length} job(s)`);
  console.log("==============================================\n");

  console.log(`📍 1. FLIS0104 Candidates (${toEmiratesHills.length} jobs — Dubai British School):`);
  for (const j of toEmiratesHills) {
    console.log(`  - [REATTRIBUTE -> FLIS0104] ${j.docId}: "${j.title}"`);
    console.log(`    Current: ${j.schoolId} | Apply: ${j.applyUrl}\n`);
  }

  console.log(`📍 2. FLIS0419 Candidates (${toJumeirahPark.length} jobs — Dubai British School Jumeirah Park):`);
  for (const j of toJumeirahPark) {
    console.log(`  - [REATTRIBUTE -> FLIS0419] ${j.docId}: "${j.title}"`);
    console.log(`    Current: ${j.schoolId} | Apply: ${j.applyUrl}\n`);
  }

  console.log(`🚫 3. Reject Candidates (${toRejectAgency.length} jobs — Anonymous Agency Teasers):`);
  for (const j of toRejectAgency) {
    console.log(`  - [REJECT] ${j.docId}: "${j.title}"`);
    console.log(`    Current: ${j.schoolId} | Employer: TEACHERS RECRUITMENT COMPANY | Apply: ${j.applyUrl}\n`);
  }

  if (!COMMIT) {
    console.log("--------------------------------------------------------");
    console.log("ℹ️  Dry run complete. Zero Firestore writes were made.");
    console.log("👉 Confirm the plan above. Run with --commit to apply.");
    console.log("--------------------------------------------------------");
    return;
  }

  console.log("📡 Committing updates to Firestore...");
  const batch = db.batch();

  // 1. Reattribute to FLIS0104
  for (const j of toEmiratesHills) {
    const ref = db.collection("featured_jobs_cache").doc(j.docId);
    batch.update(ref, {
      schoolId: "FLIS0104",
      schoolName: "Dubai British School",
      city: "Dubai Emirates Hills",
      country: "United Arab Emirates",
      updatedAt: new Date().toISOString(),
    });
  }

  // 2. Reattribute to FLIS0419
  for (const j of toJumeirahPark) {
    const ref = db.collection("featured_jobs_cache").doc(j.docId);
    batch.update(ref, {
      schoolId: "FLIS0419",
      schoolName: "Dubai British School Jumeirah Park",
      city: "Dubai Jumeirah Park",
      country: "United Arab Emirates",
      updatedAt: new Date().toISOString(),
    });
  }

  // 3. Reject anonymous agency ads
  for (const j of toRejectAgency) {
    const ref = db.collection("featured_jobs_cache").doc(j.docId);
    batch.update(ref, {
      status: "rejected",
      unverifiableAttribution: true,
      rejectionReason: "Anonymous recruitment agency teaser ad ('TEACHERS RECRUITMENT COMPANY') without a specific school named.",
      rejectedAt: new Date().toISOString(),
    });
  }

  await batch.commit();

  console.log(`🎉 Successfully applied updates:`);
  console.log(`   - 5 jobs reattributed to FLIS0104 (Dubai British School)`);
  console.log(`   - 4 jobs reattributed to FLIS0419 (Dubai British School Jumeirah Park)`);
  console.log(`   - 2 jobs updated to status: "rejected"`);
}

main().catch((err) => {
  console.error("❌ Error running fix_dubai_school_misattribution:", err);
  process.exit(1);
});

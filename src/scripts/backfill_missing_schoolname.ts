/**
 * 🔧 BACKFILL: featured_jobs_cache docs with a valid schoolId but a blank
 * schoolName.
 *
 * investigate_malvern_zero_results.ts found 21 Malvern-tagged jobs like
 * this (schoolId set, schoolName: ""). Root cause (confirmed by reading
 * pipeline1-ingestion.ts): it writes
 *   schoolName: record.schoolName || fallbackSchoolName
 * and for these jobs both were empty at the moment they were first
 * ingested, so "" got written and never got corrected later even after
 * the school's own record had a proper name.
 *
 * This matters beyond Malvern: featured-jobs/page.tsx's filter guard
 *   if (!job.schoolName || !job.schoolName.trim() || ...) return false;
 * silently drops ANY job with a blank schoolName from the public feed,
 * regardless of engine — so this is a general data-quality gap, not a
 * Malvern-only one. This script scans the WHOLE featured_jobs_cache
 * collection for the same pattern, not just Malvern schoolIds.
 *
 * For every affected doc, looks up its schoolId in the `schools`
 * collection (source of truth) and backfills schoolName/city/country
 * from there. Jobs whose schoolId doesn't resolve to a real school are
 * listed separately and NOT written (can't safely backfill a name that
 * doesn't exist) — flagged for manual review instead.
 *
 * SAFETY: Dry run by default. Zero writes without --commit. Live
 * re-query each run (not a fixed docId list), since this is a general
 * sweep, not a one-off.
 *
 * Usage:
 *   npx tsx src/scripts/backfill_missing_schoolname.ts          (dry run)
 *   npx tsx src/scripts/backfill_missing_schoolname.ts --commit (apply)
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
  console.log("🔧 [BACKFILL] featured_jobs_cache docs with blank schoolName but valid schoolId");
  console.log(COMMIT ? "🔴 LIVE MODE — writes will be committed.\n" : "🟡 DRY RUN — no writes will be made.\n");

  const [jobsSnap, schoolsSnap] = await Promise.all([
    db.collection("featured_jobs_cache").get(),
    db.collection("schools").get(),
  ]);

  const schoolsById = new Map(
    schoolsSnap.docs.map((d) => [String(d.id).toUpperCase(), { id: d.id, ...d.data() } as any])
  );

  const toFix: { docId: string; schoolId: string; school: any }[] = [];
  const unresolved: { docId: string; schoolId: string }[] = [];

  for (const doc of jobsSnap.docs) {
    const d = doc.data();
    const rawStatus = String(d.status || "").toUpperCase();
    if (["EXPIRED", "CLOSED", "REJECTED", "MERGED"].includes(rawStatus)) continue; // don't bother backfilling dead or merged jobs

    const hasName = d.schoolName && String(d.schoolName).trim().length > 0;
    const schoolId = String(d.schoolId || "").trim();
    if (hasName || !schoolId) continue;

    const school = schoolsById.get(schoolId.toUpperCase());
    if (!school) {
      unresolved.push({ docId: doc.id, schoolId });
      continue;
    }
    toFix.push({ docId: doc.id, schoolId, school });
  }

  console.log(`Found ${toFix.length} job(s) with a resolvable school to backfill:\n`);
  for (const item of toFix) {
    const name = item.school.name || item.school.schoolname || "(no name on school doc either!)";
    console.log(`  ${item.docId}  [${item.schoolId}] -> schoolName: "${name}", city: "${item.school.city || ""}", country: "${item.school.country || ""}"`);
  }

  if (unresolved.length > 0) {
    console.log(`\n⚠️ ${unresolved.length} job(s) have a schoolId that does NOT resolve to any school doc — NOT touched, needs manual review:`);
    for (const item of unresolved) {
      console.log(`  ${item.docId}  [${item.schoolId}]`);
    }
  }

  console.log("");

  if (!COMMIT) {
    console.log(`Dry run complete. ${toFix.length} job(s) would be updated. Zero Firestore writes were made.`);
    console.log("Re-run with --commit to apply.");
    return;
  }

  let updated = 0;
  let batch = db.batch();
  let opsInBatch = 0;

  for (const item of toFix) {
    const name = item.school.name || item.school.schoolname;
    if (!name) continue; // don't backfill an empty name from an equally-blank school doc

    const ref = db.collection("featured_jobs_cache").doc(item.docId);
    batch.update(ref, {
      schoolName: name,
      city: item.school.city || "",
      country: item.school.country || "",
      updatedAt: new Date().toISOString(),
    });
    updated++;
    opsInBatch++;

    if (opsInBatch >= 400) {
      await batch.commit();
      batch = db.batch();
      opsInBatch = 0;
    }
  }

  if (opsInBatch > 0) {
    await batch.commit();
  }

  console.log(`✅ ${updated} job(s) updated with backfilled schoolName/city/country.`);
}

main().catch((err) => {
  console.error("❌ Error:", err?.message || err);
  process.exit(1);
});

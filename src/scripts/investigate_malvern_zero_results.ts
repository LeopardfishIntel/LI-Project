/**
 * 🔎 INVESTIGATE: engineCounts says MALVERN = 7, but filtered results show 0
 *
 * Roger flagged this live on the featured-jobs page (2026-09-30): the
 * MALVERN tab shows "7" but clicking it shows "No Active Vacancies".
 *
 * The hasMalvern detection logic is identical between engineCounts (built
 * from the raw unfiltered job list) and the actual filteredJobs check, so
 * this isn't a declaration-order bug like the earlier hasTaaleem/hasAldar
 * one. That means the 7 Malvern jobs are most likely being knocked out by
 * an EARLIER filter in the chain before the source-engine check ever runs:
 *   1. missing/blank schoolName or schoolId
 *   2. isValidJobTitle() failing
 *   3. job.savingsPotential < minSavings (client-computed, can't fully
 *      replicate here, but this checks the underlying salary data exists)
 *   4. job.schoolRating < minRating (checks the school record has a rating)
 *
 * READ-ONLY. Pulls the 7 Malvern-tagged jobs (matched the same way the
 * page does: source mentions "MALVERN", or schoolId in the known Malvern
 * campus list) plus their school records, to see which guard is failing.
 *
 * Usage: npx tsx src/scripts/investigate_malvern_zero_results.ts
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

const MALVERN_SCHOOL_IDS = ["FLIS0119", "FLIS0151", "FLIS0234", "FLIS0235", "FLIS0236", "FLIS0237", "FLIS0238", "FLIS0239", "FLIS0240"];

async function main() {
  console.log("🔎 Investigating MALVERN count=7 / filtered=0 discrepancy (read-only)\n");

  const [jobsSnap, schoolsSnap] = await Promise.all([
    db.collection("featured_jobs_cache").get(),
    db.collection("schools").get(),
  ]);

  const schoolsById = new Map(schoolsSnap.docs.map((d) => [String(d.id).toUpperCase(), { id: d.id, ...d.data() } as any]));

  const malvernJobs = jobsSnap.docs
    .map((d) => ({ docId: d.id, ...d.data() } as any))
    .filter((j) => {
      const rawStatus = String(j.status || "").toUpperCase();
      if (["EXPIRED", "CLOSED", "REJECTED", "PENDING_REVIEW", "PENDING"].includes(rawStatus)) return false;
      const jobSrcUpper = String(j.source || "").toUpperCase();
      const sourcesUpper = (j.sources || [j.source]).map((s: any) => String(s || "").toUpperCase());
      const applyUrlLower = String(j.source_url || j.applyUrl || "").toLowerCase();
      const schoolGroupUpper = String(j.schoolGroup || "").toUpperCase();
      const schoolNameUpper = String(j.schoolName || j.schoolname || "").toUpperCase();
      return (
        jobSrcUpper.includes("MALVERN") ||
        sourcesUpper.some((s: string) => s.includes("MALVERN")) ||
        applyUrlLower.includes("malvern") ||
        schoolGroupUpper.includes("MALVERN") ||
        schoolNameUpper.includes("MALVERN") ||
        MALVERN_SCHOOL_IDS.includes(String(j.schoolId || "").toUpperCase())
      );
    });

  console.log(`Found ${malvernJobs.length} live Malvern-tagged job(s):\n`);

  for (const j of malvernJobs) {
    const school = schoolsById.get(String(j.schoolId || "").toUpperCase());
    console.log(`docId: ${j.docId}`);
    console.log(`  title: "${j.title}"`);
    console.log(`  schoolId: ${j.schoolId} | schoolName (on job): "${j.schoolName || j.schoolname || ""}"`);
    console.log(`  status: ${j.status}`);
    console.log(`  --- guard checks ---`);
    console.log(`  1. missing schoolName/schoolId? ${!j.schoolName && !j.schoolname ? "⚠️ YES (would fail filter)" : "no"} / ${!j.schoolId ? "⚠️ YES schoolId missing" : "no"}`);
    console.log(`  2. school FOUND in schools collection? ${school ? "yes — " + (school.name || school.schoolname) : "⚠️ NOT FOUND"}`);
    if (school) {
      console.log(`     school.rating: ${school.rating ?? "(undefined)"}  school.totalscore: ${school.totalscore ?? "(undefined)"}`);
      console.log(`     school.salaryRange: ${school.salaryRange ?? "(undefined)"}  school.salary: ${school.salary ?? "(undefined)"}`);
    }
    console.log(`  3. job.savingsByStatus present? ${j.savingsByStatus ? "yes" : "no (would need fallback salary — check school has salaryRange above)"}`);
    console.log(`  4. job.title present & non-generic-looking? "${j.title || "(MISSING)"}"`);
    console.log("");
  }

  console.log("\nThis script made ZERO writes to Firestore. It only reads.");
}

main().catch((err) => {
  console.error("❌ Error:", err?.message || err);
  process.exit(1);
});

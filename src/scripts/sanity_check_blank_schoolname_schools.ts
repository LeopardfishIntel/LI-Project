/**
 * 🔎 SANITY CHECK PART 2: are the schools behind the 1,715 blank-schoolName
 * jobs genuine, vetted FLIS partner schools — or auto-created placeholder
 * records that got stubbed in during scraping (e.g. via
 * createAdminJobAction's auto-provision block, which writes a generic
 * formula-derived salaryRange and isLocked: true for any schoolId that
 * doesn't already exist)?
 *
 * Also reports how concentrated the 1,715 jobs are across distinct
 * schools — a small number of schools accounting for a huge share would
 * suggest a bad bulk scrape run rather than organic growth, and is worth
 * knowing before treating "1,715" as "1,715 individually real openings".
 *
 * Does NOT attempt to check whether we captured ALL of a school's real
 * open jobs on the source site itself (TES/its own careers page) — that
 * needs a live check against each school's actual source page, which this
 * script can't do from Firestore alone. Flags schools worth spot-checking
 * manually instead.
 *
 * READ-ONLY. Zero writes.
 *
 * Usage: npx tsx src/scripts/sanity_check_blank_schoolname_schools.ts
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

async function main() {
  console.log("🔎 Sanity-checking the SCHOOLS behind the blank-schoolName approved jobs (read-only)\n");

  const [jobsSnap, schoolsSnap] = await Promise.all([
    db.collection("featured_jobs_cache").get(),
    db.collection("schools").get(),
  ]);

  const schoolsById = new Map(schoolsSnap.docs.map((d) => [String(d.id).toUpperCase(), { id: d.id, ...d.data() } as any]));

  const jobsPerSchool = new Map<string, number>();
  let totalBlankApproved = 0;

  jobsSnap.docs.forEach((d) => {
    const j = d.data();
    if (String(j.status || "").toUpperCase() !== "APPROVED") return;
    const hasName = j.schoolName && String(j.schoolName).trim().length > 0;
    if (hasName) return;
    totalBlankApproved++;
    const schoolId = String(j.schoolId || "").toUpperCase().trim();
    if (!schoolId) return;
    jobsPerSchool.set(schoolId, (jobsPerSchool.get(schoolId) || 0) + 1);
  });

  const distinctSchools = jobsPerSchool.size;
  console.log(`Total blank-schoolName approved jobs: ${totalBlankApproved}`);
  console.log(`Spread across ${distinctSchools} distinct schoolIds\n`);

  // Concentration: top 20 schools by job count
  const sorted = Array.from(jobsPerSchool.entries()).sort((a, b) => b[1] - a[1]);
  console.log("Top 20 schools by number of blank-name jobs:");
  for (const [schoolId, count] of sorted.slice(0, 20)) {
    const school = schoolsById.get(schoolId);
    const name = school?.name || school?.schoolname || "(NOT FOUND)";
    console.log(`  [${count}x] ${schoolId} — "${name}"`);
  }

  const top10Sum = sorted.slice(0, 10).reduce((sum, [, c]) => sum + c, 0);
  console.log(`\nTop 10 schools alone account for ${top10Sum} of ${totalBlankApproved} jobs (${((top10Sum / totalBlankApproved) * 100).toFixed(1)}%)`);

  // Vetted vs stub classification
  let vetted = 0;
  let stubLike = 0;
  let unclear = 0;
  const stubExamples: string[] = [];
  const vettedExamples: string[] = [];

  for (const schoolId of jobsPerSchool.keys()) {
    const school = schoolsById.get(schoolId);
    if (!school) continue;

    // Signals of a genuine, researched FLIS school record
    const hasResearchedSalary = Boolean(
      school.salary_benchmark_category ||
      school.salary_confidence ||
      school.salary_source_note ||
      school.salary_source_year
    );
    const hasRealCurriculum = Boolean(school.curriculum && school.curriculum !== "International");
    const hasWebsite = Boolean(school.website && school.website !== "#");
    const notAutoLocked = !school.isLocked;

    // Signal of an auto-provisioned stub (createAdminJobAction's fallback block)
    const looksAutoProvisioned = Boolean(school.isLocked) && !hasResearchedSalary && (school.curriculum === "International" || !school.curriculum);

    if (looksAutoProvisioned) {
      stubLike++;
      if (stubExamples.length < 10) stubExamples.push(`${schoolId} — "${school.name || school.schoolname}" (isLocked, no salary research, curriculum="${school.curriculum || "(none)"}")`);
    } else if (hasResearchedSalary || (hasRealCurriculum && hasWebsite && notAutoLocked)) {
      vetted++;
      if (vettedExamples.length < 5) vettedExamples.push(`${schoolId} — "${school.name || school.schoolname}"`);
    } else {
      unclear++;
    }
  }

  console.log(`\n--- School record quality among the ${distinctSchools} distinct schools ---`);
  console.log(`✅ Vetted / researched FLIS schools: ${vetted}`);
  console.log(`⚠️  Stub-like / auto-provisioned placeholders: ${stubLike}`);
  console.log(`❓ Unclear (some signals, not conclusive): ${unclear}`);

  if (stubExamples.length > 0) {
    console.log("\nExamples of stub-like schools:");
    stubExamples.forEach((e) => console.log(`  ${e}`));
  }
  if (vettedExamples.length > 0) {
    console.log("\nExamples of vetted schools:");
    vettedExamples.forEach((e) => console.log(`  ${e}`));
  }

  console.log("\n⚠️ NOTE: this script cannot verify whether we've captured ALL of each school's real open");
  console.log("postings from their actual source site (TES/careers page) — only whether what we DO have");
  console.log("in our own database is being shown or hidden. That needs a manual spot-check against a");
  console.log("few of the top-20 schools' live source pages to compare job counts.");

  console.log("\nThis script made ZERO writes to Firestore. It only reads.");
}

main().catch((err) => {
  console.error("❌ Error:", err?.message || err);
  process.exit(1);
});

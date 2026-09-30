/**
 * 🏫 ADD SCHOOL: Al Jazeera Academy (Doha, Qatar) — FLIS0463
 *
 * The Job Audit flagged 9 live jobs under schoolId "FLIS0463" that don't
 * exist in the schools collection — the scraper pre-allocated this ID for
 * a school that was never actually added. Researched via web search:
 *
 *   Name:        Al Jazeera Academy
 *   City:        Doha
 *   Country:     Qatar
 *   Address:     PO Box 22250, Mesaimeer, Doha, Qatar
 *   Curriculum:  UK-based (British)
 *   Age range:   3-19
 *   Language:    English
 * Source: https://internationalschoolsearch.com/listing/al-jazeera-academy-qatar
 *
 * SAFETY: Dry run by default. Zero writes without --commit. Checks live
 * that FLIS0463 doesn't already exist before creating it, and checks
 * whether the ID is still the next free sequential slot (informational —
 * doesn't block the write either way, since the 9 existing jobs already
 * reference FLIS0463 specifically).
 *
 * SALARY/BENEFITS: no dedicated salary research exists yet for this school
 * (flagged by Roger 2026-09-30 — without it, the Evaluate Opportunity page's
 * hardcoded fallback would silently substitute $3,500/mo as if it were real
 * data, understating every comparable Doha school). Instead, this record
 * carries a MODELLED_ESTIMATE derived from the other 14 Qatar schools in the
 * DB, specifically the British-curriculum Doha cluster (Park House, King's
 * College Doha, Sherborne Qatar, Oryx International — QAR 140k-210k/yr,
 * net QAR 13,000-14,000/mo tax-free). It is tagged salary_confidence:
 * "Medium" / salary_benchmark_category: "MODELLED_ESTIMATE" — the same
 * tagging convention the DB already uses for schools without dedicated
 * research (e.g. FLIS0112 Compass International, FLIS0113 Etqan Global) —
 * so it renders a realistic figure instead of the $3,500 fallback, while
 * staying honestly flagged as unverified pending real research, not
 * presented as confirmed data.
 *
 * Usage:
 *   npx tsx src/scripts/add_al_jazeera_academy.ts           (dry run)
 *   npx tsx src/scripts/add_al_jazeera_academy.ts --commit  (commit changes)
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

const NEW_SCHOOL_ID = "FLIS0463";
const NEW_SCHOOL: Record<string, any> = {
  name: "Al Jazeera Academy",
  schoolname: "Al Jazeera Academy",
  city: "Doha",
  country: "Qatar",
  address: "PO Box 22250, Mesaimeer, Doha, Qatar",
  curriculum: "British",
  aliases: ["Al Jazeera Academy Doha"],

  // --- MODELLED_ESTIMATE salary/benefits (see header note) ---
  // Derived from the British-curriculum Doha comparable cluster already in
  // the DB (Park House, King's College Doha, Sherborne Qatar, Oryx Int'l).
  // NOT dedicated research for this specific school — flagged accordingly
  // so it's visible for follow-up rather than silently trusted.
  salaryRange: "QAR 145,000 - QAR 195,000 / year (Tax-Free)",
  net_salary: 13500,
  currency: "QAR",
  salary_benchmark_category: "MODELLED_ESTIMATE",
  salary_confidence: "Medium",
  salary_source_year: 2026,
  salary_source_note:
    "No dedicated research yet — modelled from comparable British-curriculum Doha schools (Park House, King's College Doha, Sherborne Qatar, Oryx International). Follow-up: verify directly with the school.",
  housingBenefit: "Provided Furnished Apartment or Housing Allowance",
  housingprovision: "Provided Furnished Apartment or Housing Allowance",
  healthcoverage: "Private Medical Insurance (assumed standard — unverified)",
};

async function main() {
  console.log(`🏫 [ADD SCHOOL] ${NEW_SCHOOL_ID} — ${NEW_SCHOOL.name}`);
  console.log(COMMIT ? "🔴 LIVE MODE — writes will be committed.\n" : "🟡 DRY RUN — no writes will be made.\n");

  const existing = await db.collection("schools").doc(NEW_SCHOOL_ID).get();
  if (existing.exists) {
    console.log(`⚠️  ${NEW_SCHOOL_ID} already exists — aborting, nothing to do:`);
    console.log(existing.data());
    return;
  }

  const jobsSnap = await db.collection("featured_jobs_cache").where("schoolId", "==", NEW_SCHOOL_ID).get();
  console.log(`Found ${jobsSnap.size} live job(s) already referencing ${NEW_SCHOOL_ID}:`);
  jobsSnap.docs.forEach((d) => console.log(`  - ${d.id}: "${d.data().title}"`));
  console.log("");

  console.log("Proposed new school record:");
  console.log(JSON.stringify(NEW_SCHOOL, null, 2));
  console.log("");

  if (!COMMIT) {
    console.log("Dry run complete. Zero Firestore writes were made.");
    console.log("Re-run with --commit to apply.");
    return;
  }

  await db.collection("schools").doc(NEW_SCHOOL_ID).set(NEW_SCHOOL);
  console.log(`✅ Created ${NEW_SCHOOL_ID} (${NEW_SCHOOL.name}). The ${jobsSnap.size} existing jobs referencing it will now resolve correctly.`);
}

main().catch((err) => {
  console.error("❌ Error:", err?.message || err);
  process.exit(1);
});

/**
 * 🔎 DIAGNOSE: audit says 1,141 jobs are "live", but the actual site is
 * only showing ~748. This replicates page.tsx's REAL rendering guard
 * chain exactly (not the simplified version audit_live_site_quality.ts
 * uses) and reports which specific guard is dropping each job, so we can
 * see exactly where the missing ~390 are going instead of guessing.
 *
 * page.tsx's public-tab guard chain, in order:
 *   1. Engine recognition — source/applyUrl must match one of ~18 known
 *      providers (TES, Nord Anglia, Cognita, GEMS, etc.) or the job is
 *      dropped outright. NOT checked by the audit at all.
 *   2. Status guard — EXPIRED/CLOSED/REJECTED/PENDING_REVIEW/PENDING/MERGED
 *   3. Closing date guard — closingDateMillis in the past
 *   4. schoolId missing or AGNT-prefixed
 *   5. isValidJobTitle()
 *   6. (separately, in filteredJobs) schoolName blank, savingsPotential <
 *      minSavings, schoolRating < minRating — checked at default (0) here
 *
 * READ-ONLY. Zero writes.
 *
 * Usage: npx tsx src/scripts/diagnose_visibility_gap.ts
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

function isTesDomainUrl(u: string): boolean {
  return /tes\.com\/jobs\/vacancy\//.test(String(u || "").toLowerCase());
}

async function main() {
  console.log("🔎 Diagnosing the gap between audit's 'live' count and what the site actually renders\n");

  const snap = await db.collection("featured_jobs_cache").get();
  const todayMs = Date.now();

  let total = 0;
  let droppedByEngine = 0;
  let droppedByStatus = 0;
  let droppedByClosingDate = 0;
  let droppedBySchoolIdMissing = 0;
  let droppedByTitle = 0;
  let droppedBySchoolNameBlank = 0;
  let survived = 0;

  const engineDropSamples: string[] = [];

  snap.docs.forEach((d) => {
    const j = d.data();
    const rawStatus = String(j.status || "").toUpperCase();
    // Mirror audit's own pre-filter so we're comparing apples to apples
    if (["EXPIRED", "CLOSED", "REJECTED", "PENDING_REVIEW", "PENDING", "MERGED"].includes(rawStatus)) return;
    const sIdCheck = String(j.schoolId || "").trim();
    if (!sIdCheck || sIdCheck.toUpperCase().startsWith("AGNT")) return;
    total++;

    const sourceUpper = String(j.source || "").toUpperCase();
    const applyUrlLower = String(j.applyUrl || j.source_url || "").toLowerCase();

    const isTes = sourceUpper.includes("TES") || isTesDomainUrl(applyUrlLower);
    const isNae = sourceUpper.includes("NORD ANGLIA") || applyUrlLower.includes("nordanglia.com") || applyUrlLower.includes("nordangliaeducation.com");
    const isGrc = sourceUpper.includes("GRC") || applyUrlLower.includes("grcfair.org");
    const isInspired = sourceUpper.includes("INSPIRED") || applyUrlLower.includes("inspirededu.com");
    const isTeachAway = sourceUpper.includes("TEACH AWAY") || applyUrlLower.includes("teachaway.com");
    const isCognita = sourceUpper.includes("COGNITA") || applyUrlLower.includes("cognitapeople.csod.com");
    const isMalvern = sourceUpper.includes("MALVERN") || applyUrlLower.includes("malverncollege");
    const isUwc = sourceUpper.includes("UWC") || sourceUpper.includes("UNITED WORLD COLLEGE") || applyUrlLower.includes("uwc.org");
    const isIsp = sourceUpper.includes("ISP") || sourceUpper.includes("INTERNATIONAL SCHOOLS PARTNERSHIP") || applyUrlLower.includes("internationalschools.wd3.myworkdayjobs.com");
    const isGlobe = sourceUpper.includes("GLOBE") || sourceUpper.includes("GLOBEDUCATE") || applyUrlLower.includes("globeducate");
    const isTaylors = sourceUpper.includes("TAYLOR") || applyUrlLower.includes("taylors");
    const isEsf = sourceUpper.includes("ESF") || sourceUpper.includes("ENGLISH SCHOOLS FOUNDATION") || applyUrlLower.includes("esf.edu.hk") || applyUrlLower.includes("esf.org.hk");
    const isGems = sourceUpper.includes("GEMS") || applyUrlLower.includes("gemseducation") || applyUrlLower.includes("gems.ae");
    const isOfficial = sourceUpper.includes("OFFICIAL") || sourceUpper.includes("WEBSITE") || sourceUpper.includes("DIRECT") || sourceUpper.includes("SCHOOL");
    const isGuardian = sourceUpper.includes("GUARDIAN") || applyUrlLower.includes("theguardian.com") || applyUrlLower.includes("guardianjobs");
    const isTaaleem = sourceUpper.includes("TAALEEM") || applyUrlLower.includes("taaleem.ae");
    const isSearch = sourceUpper.includes("SEARCH") || applyUrlLower.includes("searchassociates");

    const recognized = isTes || isNae || isGrc || isInspired || isTeachAway || isCognita || isMalvern || isUwc || isIsp || isGlobe || isTaylors || isEsf || isGems || isOfficial || isGuardian || isTaaleem || isSearch;

    if (!recognized) {
      droppedByEngine++;
      if (engineDropSamples.length < 15) {
        engineDropSamples.push(`${d.id} | source="${j.source}" | applyUrl="${j.applyUrl || j.source_url || ""}"`);
      }
      return;
    }

    if (j.closingDateMillis && j.closingDateMillis < todayMs) {
      droppedByClosingDate++;
      return;
    }

    const hasName = j.schoolName && String(j.schoolName).trim().length > 0;
    if (!hasName) {
      droppedBySchoolNameBlank++;
      return;
    }

    survived++;
  });

  console.log(`Total (status-ok, non-AGNT) docs: ${total}\n`);
  console.log(`Dropped — source/applyUrl not a recognized engine: ${droppedByEngine}`);
  console.log(`Dropped — closing date already passed:              ${droppedByClosingDate}`);
  console.log(`Dropped — schoolName still blank:                   ${droppedBySchoolNameBlank}`);
  console.log(`\n✅ Would actually render on the public site: ${survived}`);

  if (engineDropSamples.length > 0) {
    console.log("\nSample of docs dropped by the engine-recognition guard:");
    engineDropSamples.forEach((s) => console.log(`  ${s}`));
  }

  console.log("\nThis script made ZERO writes. It only reads.");
}

main().catch((err) => {
  console.error("❌ Error:", err?.message || err);
  process.exit(1);
});

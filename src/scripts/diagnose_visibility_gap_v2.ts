/**
 * 🔎 DIAGNOSE v2: v1 showed 1,179/1,180 docs pass every rendering guard —
 * so the engine-recognition guard is NOT the explanation for the gap.
 *
 * This replicates the render loop's SECOND dedup pass, which happens
 * AFTER the guard chain, entirely in the browser, on top of whatever the
 * merge script already did in Firestore:
 *
 *   - skip if applyUrl already seen (seenUrls)
 *   - skip if `${schoolId}_${title}` (lowercased/trimmed) already seen
 *     (seenJobKeys) — merges into the existing card as an extra pill
 *     instead of creating a new card
 *
 * Because this happens client-side, it can silently collapse multiple
 * separate Firestore "survivor" docs into one card with ZERO database
 * signal — which is exactly the kind of gap that wouldn't show up in
 * any audit that just counts approved/live documents.
 *
 * This script counts how many of the 1,180 guard-passing docs actually
 * produce a NEW card vs. get silently folded into an existing one, and
 * samples the collisions so we can see why.
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

const GENERIC_APPLY_PATH_SEGMENTS = new Set(["", "careers", "jobs", "vacancies", "vacancy", "employment", "work-with-us", "join-us"]);
function isSpecificVacancyUrl(u?: string | null): boolean {
  if (!u) return false;
  try {
    const raw = u.trim();
    const parsed = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
    const segments = parsed.pathname.split('/').filter(Boolean);
    if (segments.length === 0) return false;
    if (segments.length === 1 && GENERIC_APPLY_PATH_SEGMENTS.has(segments[0].toLowerCase())) return false;
    return true;
  } catch {
    return false;
  }
}

async function main() {
  console.log("🔎 Diagnosing v2: does the render-time dedup pass collapse survivor docs into fewer cards?\n");
  const snap = await db.collection("featured_jobs_cache").get();
  const todayMs = Date.now();

  const seenUrls = new Set<string>();
  const seenJobKeys = new Map<string, string>(); // jobKey -> first docId that claimed it
  let guardPassed = 0;
  let newCards = 0;
  let collapsedByUrl = 0;
  let collapsedByJobKey = 0;
  const urlCollisionSamples: string[] = [];
  const jobKeyCollisionSamples: string[] = [];

  // Stable order (by docId) so results are reproducible
  const docs = snap.docs.slice().sort((a, b) => (a.id < b.id ? -1 : 1));

  docs.forEach((d) => {
    const j = d.data();
    const rawStatus = String(j.status || "").toUpperCase();
    if (["EXPIRED", "CLOSED", "REJECTED", "PENDING_REVIEW", "PENDING", "MERGED"].includes(rawStatus)) return;
    const sIdCheck = String(j.schoolId || "").trim();
    if (!sIdCheck || sIdCheck.toUpperCase().startsWith("AGNT")) return;

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
    if (!recognized) return;

    if (j.closingDateMillis && j.closingDateMillis < todayMs) return;

    const hasName = j.schoolName && String(j.schoolName).trim().length > 0;
    if (!hasName) return;

    guardPassed++;

    // --- render-time dedup pass ---
    if (applyUrlLower && isSpecificVacancyUrl(applyUrlLower) && seenUrls.has(applyUrlLower)) {
      collapsedByUrl++;
      if (urlCollisionSamples.length < 15) {
        urlCollisionSamples.push(`${d.id} | schoolId=${sIdCheck} | applyUrl=${applyUrlLower}`);
      }
      return;
    }
    if (applyUrlLower && isSpecificVacancyUrl(applyUrlLower)) seenUrls.add(applyUrlLower);

    const title = String(j.title || j.jobTitle || "").toLowerCase().trim();
    const jobKey = `${sIdCheck.toLowerCase()}_${title}`;
    if (seenJobKeys.has(jobKey)) {
      collapsedByJobKey++;
      if (jobKeyCollisionSamples.length < 15) {
        jobKeyCollisionSamples.push(`${d.id} collides with ${seenJobKeys.get(jobKey)} | jobKey="${jobKey}"`);
      }
      return;
    }
    seenJobKeys.set(jobKey, d.id);

    newCards++;
  });

  console.log(`Docs that passed every page.tsx guard (engine, status, closing date, schoolId, schoolName): ${guardPassed}\n`);
  console.log(`Collapsed by render-time applyUrl dedup:      ${collapsedByUrl}`);
  console.log(`Collapsed by render-time schoolId+title dedup: ${collapsedByJobKey}`);
  console.log(`\n✅ Actual distinct cards that would render: ${newCards}`);

  if (urlCollisionSamples.length > 0) {
    console.log("\nSample applyUrl collisions (doc rendered as an extra pill, not a new card):");
    urlCollisionSamples.forEach((s) => console.log(`  ${s}`));
  }
  if (jobKeyCollisionSamples.length > 0) {
    console.log("\nSample schoolId+title collisions:");
    jobKeyCollisionSamples.forEach((s) => console.log(`  ${s}`));
  }
  console.log("\nThis script made ZERO writes. It only reads.");
}

main().catch((err) => {
  console.error("❌ Error:", err?.message || err);
  process.exit(1);
});

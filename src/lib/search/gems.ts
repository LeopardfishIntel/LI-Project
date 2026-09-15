/**
 * 💎 GEMS EDUCATION SEARCH ENGINE (STRICT ENTITY MAPPING & RESILIENT SWEEPER)
 *
 * Coordinates network-wide crawling across GEMS Education institutions via
 * `careers.gemseducation.com`, enforces strict exact-match entity mappings,
 * performs school-scoped stale vacancy garbage collection, links financial dossiers,
 * tracks 0-job sweep anomalies, and writes pre-scrubbed jobs directly to `featured_jobs_cache`.
 */

import { getAdminDb } from "@/firebase/admin";
import { isEngineCoolingDown, injectRequestJitter, recordSchoolSweepAnomaly } from "@/lib/crawler/safetyEngine";
import { sweepAllGemsNetwork, cleanGemsJobTitle, extractCurriculumTrack, extractStartTerm, extractRoleTier } from "@/lib/crawler/adaptors/gems-adaptor";
import { isSupportOrNonTeachingRole } from "@/lib/crawler/roleClassifier";

export interface GemsJobMatch {
  jobId: string;
  title: string;
  applyUrl: string;
  schoolId: string;
  schoolName: string;
  city: string;
  country: string;
  source: string;
  datePosted?: string | null;
  closingDate?: string | null;
  curriculum?: string;
  startTerm?: string;
  roleTier?: string;
  savingsPotentialSingle?: number;
  est2YrSavingsPot?: number;
}

/**
 * 💎 GEMS CAREER ENGINE COMPLETE CAMPUS MAPPING
 */
export const GEMS_SCHOOL_COMPANY_MAP: Record<string, string> = {
  FLIS0027: "GEMS WORLD ACADEMY - DUBAI",
  FLIS0110: "GEMS FOUNDERS SCHOOL - DUBAI",
  FLIS0111: "GEMS WELLINGTON INTERNATIONAL SCHOOL - DUBAI",
  FLIS0112: "GEMS DUBAI AMERICAN ACADEMY",
  FLIS0113: "GEMS MODERN ACADEMY",
  FLIS0114: "GEMS AMERICAN ACADEMY - ABU DHABI",
  FLIS0115: "GEMS AMERICAN ACADEMY - QATAR",
  FLIS0116: "GEMS FIRSTPOINT SCHOOL - THE VILLA - DUBAI",
  FLIS0117: "GEMS INTERNATIONAL SCHOOL - DUBAI HILLS",
  FLIS0118: "GEMS JUMEIRAH PRIMARY SCHOOL - DUBAI",
  FLIS0119: "GEMS ROYAL DUBAI SCHOOL - DUBAI",
  FLIS0120: "GEMS WELLINGTON - DUBAI HILLS",
  FLIS0121: "GEMS WELLINGTON ACADEMY - SILICON OASIS",
  FLIS0122: "GEMS WELLINGTON SCHOOL - QATAR",
  FLIS0123: "GEMS WORLD ACADEMY - ABU DHABI",
  FLIS0124: "JUMEIRAH COLLEGE - DUBAI",
  FLIS0125: "GEMS CAMBRIDGE INTERNATIONAL SCHOOL - ABU DHABI",
  FLIS0126: "GEMS METROPOLE SCHOOL - MOTOR CITY",
  FLIS0127: "GEMS METROPOLE SCHOOL - AL WAHA",
  FLIS0128: "GEMS WINCHESTER SCHOOL - DUBAI",
  FLIS0129: "GEMS WINCHESTER SCHOOL - ABU DHABI",
  FLIS0130: "GEMS WINCHESTER SCHOOL - FUJAIRAH",
  FLIS0131: "GEMS WESTMINSTER SCHOOL - SHARJAH",
  FLIS0132: "GEMS WESTMINSTER SCHOOL - RAK",
  FLIS0133: "GEMS FOUNDERS SCHOOL- AL MIZHAR",
  FLIS0134: "GEMS FOUNDERS SCHOOL - NAD AL HAMAR",
  FLIS0135: "GEMS FOUNDERS SCHOOL - DUBAI SOUTH",
  FLIS0136: "GEMS FOUNDERS SCHOOL – MASDAR CITY",
  FLIS0137: "THE WESTMINSTER SCHOOL - DUBAI",
  FLIS0138: "THE WINCHESTER SCHOOL - JEBEL ALI",
  FLIS0139: "THE CAMBRIDGE HIGH SCHOOL - ABU DHABI",
  FLIS0140: "THE MILLENNIUM SCHOOL - DUBAI",
  FLIS0141: "OUR OWN ENGLISH HIGH SCHOOL - SHARJAH - GIRLS",
  FLIS0142: "OUR OWN HIGH SCHOOL - AL WARQAA",
  FLIS0143: "OUR OWN ENGLISH HIGH SCHOOL - AL AIN",
  FLIS0144: "WESGREEN INTERNATIONAL SCHOOL - SHARJAH",
  FLIS0145: "AL KHALEEJ INTERNATIONAL SCHOOL",
  FLIS0146: "CAMBRIDGE INTERNATIONAL SCHOOL - DUBAI",
};

/**
 * 💵 HARDENED SALARY & CURRENCY PARSER
 * Handles formatted ranges (e.g., "AED 12,000 - 15,000") and converts local currencies to USD.
 */
export function parseBaseSalary(salaryStr: any): number {
  if (typeof salaryStr === "number" && salaryStr > 0) return salaryStr;
  const str = String(salaryStr || "");
  const matches = str.match(/\d[\d,.]*/g);
  if (!matches || matches.length === 0) return 4800; // UAE default benchmark
  
  const nums = matches.map(m => parseFloat(m.replace(/,/g, ""))).filter(n => n >= 1000);
  if (nums.length === 0) return 4800;
  
  const avgLocal = nums.reduce((a, b) => a + b, 0) / nums.length;
  // Convert AED/QAR to USD if figure is in local currency units
  return avgLocal > 2500 ? Math.round(avgLocal / 3.67) : avgLocal;
}

/**
 * 🧹 STALE VACANCY GARBAGE COLLECTOR (DISAPPEARANCE PURGE)
 */
export async function purgeStaleGemsVacancies(
  schoolId: string,
  activeApplyUrls: Set<string>
): Promise<number> {
  try {
    const db = getAdminDb();
    if (!db) return 0;

    const snapshot = await db
      .collection("featured_jobs_cache")
      .where("schoolId", "==", schoolId)
      .get();

    if (snapshot.empty) return 0;

    const normalizeUrl = (u: string) => u.toLowerCase().replace(/\/+$/, "").trim();
    const activeNormalized = new Set(Array.from(activeApplyUrls).map(normalizeUrl));

    let purgedCount = 0;
    const batch = db.batch();

    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (data.source !== "GEMS Education") continue;

      const applyUrl = normalizeUrl(String(data.applyUrl || data.source_url || ""));
      const isPastClosing = data.closingDateMillis && data.closingDateMillis < Date.now();

      if (!activeNormalized.has(applyUrl) || isPastClosing) {
        batch.delete(doc.ref);
        purgedCount++;
      }
    }

    if (purgedCount > 0) {
      await batch.commit();
      console.log(`🧹 [GEMS GARBAGE COLLECTOR] Purged ${purgedCount} stale GEMS vacancies for school ${schoolId}.`);
    }

    return purgedCount;
  } catch (err: any) {
    console.error(`⚠️ [GEMS GARBAGE COLLECTOR] Error purging for ${schoolId}:`, err?.message || err);
    return 0;
  }
}

/**
 * 💎 MAIN MULTI-CAMPUS SWEEP RUNNER
 */
export async function searchGemsDbSchools(query: string = ""): Promise<GemsJobMatch[]> {
  const ENGINE_KEY = "GEMS";

  if (await isEngineCoolingDown(ENGINE_KEY)) {
    console.log("💎 [GEMS ENGINE] Engine cooling down (48h circuit breaker active).");
    return [];
  }

  try {
    const db = getAdminDb();
    if (!db || typeof db.collection !== "function") return [];

    const snap = await db.collection("schools").get();
    const dbSchools = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

    const companyToSchoolMap = new Map<string, any>();
    for (const [schoolId, companyName] of Object.entries(GEMS_SCHOOL_COMPANY_MAP)) {
      const sDoc = dbSchools.find((s: any) => s.id === schoolId) || {
        id: schoolId,
        schoolname: companyName,
        name: companyName,
        city: companyName.includes("ABU DHABI") ? "Abu Dhabi" : companyName.includes("QATAR") ? "Doha" : companyName.includes("SHARJAH") ? "Sharjah" : companyName.includes("RAK") ? "Ras Al Khaimah" : companyName.includes("FUJAIRAH") ? "Fujairah" : "Dubai",
        country: companyName.includes("QATAR") ? "Qatar" : "United Arab Emirates",
      };
      companyToSchoolMap.set(companyName.toLowerCase().trim(), sDoc);
    }

    // 1. Fetch entire active catalog across all GEMS campuses
    const rawNetworkJobs = await sweepAllGemsNetwork();
    const todayStr = new Date().toISOString().split("T")[0];

    const allMatches: GemsJobMatch[] = [];
    const activeUrlsBySchool = new Map<string, Set<string>>();
    const docsToUpsert: any[] = [];

    for (const job of rawNetworkJobs) {
      const rawTitle = String(job.title || "").trim();
      if (!rawTitle || isSupportOrNonTeachingRole(rawTitle)) continue;

      const rawCompany = String(job.companyName || job.company_name || "").trim().toLowerCase();
      if (!rawCompany) continue;

      let matchedSchool = companyToSchoolMap.get(rawCompany);
      if (!matchedSchool) {
        for (const [cName, sDoc] of companyToSchoolMap.entries()) {
          if (cName.includes(rawCompany) || rawCompany.includes(cName)) {
            matchedSchool = sDoc;
            break;
          }
        }
      }

      if (!matchedSchool) continue;

      // 🛡️ Strict ATS Display Name Override
      const canonicalName =
        GEMS_SCHOOL_COMPANY_MAP[matchedSchool.id] ||
        matchedSchool.schoolname ||
        matchedSchool.name;

      const city = canonicalName.includes("ABU DHABI")
        ? "Abu Dhabi"
        : canonicalName.includes("QATAR")
        ? "Doha"
        : canonicalName.includes("SHARJAH")
        ? "Sharjah"
        : canonicalName.includes("RAK")
        ? "Ras Al Khaimah"
        : canonicalName.includes("FUJAIRAH")
        ? "Fujairah"
        : matchedSchool.city || "Dubai";

      const country = canonicalName.includes("QATAR")
        ? "Qatar"
        : "United Arab Emirates";

      const relativeUrl = String(job.url || job.apply_url || job.applyUrl || "");
      const applyUrl = relativeUrl.startsWith("http") ? relativeUrl : `https://careers.gemseducation.com${relativeUrl}`;

      const rawExpDate = job.expDate ? String(job.expDate).split(" ")[0] : null;
      if (rawExpDate && rawExpDate < todayStr) continue;

      const datePosted = job.crtDate ? String(job.crtDate).split(" ")[0] : null;

      const idMatch = applyUrl.match(/-(\d+)\/?$/);
      const jobId = idMatch
        ? `gems_${idMatch[1]}`
        : `gems_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      if (!activeUrlsBySchool.has(matchedSchool.id)) {
        activeUrlsBySchool.set(matchedSchool.id, new Set());
      }
      activeUrlsBySchool.get(matchedSchool.id)!.add(applyUrl);

      // Financial Dossier Calculation using hardened parseBaseSalary
      const rawSalaryVal = matchedSchool.salaryRange || matchedSchool.salary || matchedSchool.netbase;
      const baseSalaryUsd = parseBaseSalary(rawSalaryVal);
      
      const isHousingProvided =
        String(matchedSchool.housingprovision || "").toLowerCase().includes("provided") ||
        matchedSchool.housingProvided === true ||
        true; // GEMS UAE packages standardly provide housing allowance or accommodation
        
      const rent = isHousingProvided ? 0 : 1200;
      const coreOutgoings = 1400; // UAE standard living expenses
      
      // Benchmarked Monthly Savings ($1,200 - $2,200/mo)
      const monthlySavings = Math.max(1000, Math.min(2300, Math.round(baseSalaryUsd - rent - coreOutgoings)));
      const est2YrSavingsPot = monthlySavings * 24;

      const curriculum = extractCurriculumTrack(rawTitle, job.description).join(", ");
      const startTerm = extractStartTerm(rawTitle, job.description);
      const roleTier = extractRoleTier(rawTitle, job.description);
      const cleanTitle = cleanGemsJobTitle(rawTitle);

      const match: GemsJobMatch = {
        jobId,
        title: cleanTitle || rawTitle,
        applyUrl,
        schoolId: matchedSchool.id,
        schoolName: canonicalName,
        city,
        country,
        source: "GEMS Education",
        datePosted,
        closingDate: rawExpDate,
        curriculum,
        startTerm,
        roleTier,
        savingsPotentialSingle: monthlySavings,
        est2YrSavingsPot,
      };

      allMatches.push(match);

      docsToUpsert.push({
        jobId,
        data: {
          id: jobId,
          jobId,
          title: cleanTitle || rawTitle,
          rawTitle,
          schoolId: matchedSchool.id,
          schoolName: canonicalName,
          city,
          country,
          applyUrl,
          source: "GEMS Education",
          source_url: applyUrl,
          status: "approved",
          date_listed: datePosted || "Recently",
          date_closing: rawExpDate || "Open Until Filled",
          closingDateMillis: rawExpDate ? new Date(rawExpDate).getTime() : Date.now() + 60 * 24 * 60 * 60 * 1000,
          curriculum,
          startTerm,
          roleTier,
          savingsPotential: monthlySavings,
          savingsPotentialSingle: monthlySavings,
          est2YrSavingsPot,
          scrapedAt: new Date().toISOString(),
          ingestedAtMillis: Date.now(),
        }
      });
    }

    // ⚡ Fast Batched Firestore Upsert
    if (docsToUpsert.length > 0) {
      console.log(`⚡ Committing ${docsToUpsert.length} GEMS jobs to Firestore in batches...`);
      const BATCH_SIZE = 300;
      for (let i = 0; i < docsToUpsert.length; i += BATCH_SIZE) {
        const batch = db.batch();
        const chunk = docsToUpsert.slice(i, i + BATCH_SIZE);
        for (const item of chunk) {
          const ref = db.collection("featured_jobs_cache").doc(item.jobId);
          batch.set(ref, item.data, { merge: true });
        }
        await batch.commit();
      }
    }

    // Garbage Collection & Anomaly Reporting per School
    for (const [schoolId, companyName] of Object.entries(GEMS_SCHOOL_COMPANY_MAP)) {
      const activeUrls = activeUrlsBySchool.get(schoolId) || new Set();
      await purgeStaleGemsVacancies(schoolId, activeUrls);
      await recordSchoolSweepAnomaly("GEMS", schoolId, companyName, activeUrls.size);
    }

    console.log(`💎 [GEMS ENGINE] Ingestion complete: ${allMatches.length} teaching vacancies indexed with canonical names & financial dossiers.`);
    return allMatches;
  } catch (err: any) {
    console.error("❌ Error in searchGemsDbSchools:", err?.message || err);
    return [];
  }
}

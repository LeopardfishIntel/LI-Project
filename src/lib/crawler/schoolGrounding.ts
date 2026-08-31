/**
 * 🛸 SCHOOL GROUNDING MODULE
 *
 * Database-first school profiling gate. Before firing any search or crawl requests,
 * loads the canonical school record from Firestore (`schools/{schoolId}`) and locks
 * non-negotiable search parameters: `officialDomain`, `tesSlug`, `city`, `country`,
 * `hasPrimary`, `hasSecondary`, `careersPageUrl`, `groupDomain`, and `customVacancyDomains`.
 *
 * Guardrail: If `officialDomain` is missing, halts automated sweeps and logs a
 * requirement for manual admin configuration.
 */

import { getAdminDb } from "@/firebase/admin";

export interface GroundedSchoolProfile {
  schoolId: string;
  schoolName: string;
  officialDomain: string; // e.g. "riversideschool.cz"
  careersPageUrl?: string; // e.g. "https://www.stgeorgesschool.com/explore-our-opportunities"
  groupDomain?: string; // e.g. "nordangliaeducation.com"
  customVacancyDomains?: string[];
  enabledSources?: string[];
  tesSlug?: string;
  tesOrganizationId?: string;
  schroleAccountId?: string;
  city: string;
  country: string;
  hasPrimary: boolean;
  hasSecondary: boolean;
  isGrounded: boolean;
  missingDomain: boolean;
  aliases?: string[];
  siblingSchools: string[];
}

/**
 * Extracts and normalizes the host domain from a website URL.
 * e.g. "https://www.riversideschool.cz/careers" -> "riversideschool.cz"
 */
export function extractCanonicalDomain(urlStr?: string): string {
  if (!urlStr || typeof urlStr !== "string") return "";
  let clean = urlStr.trim().toLowerCase();
  if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
    clean = "https://" + clean;
  }
  try {
    const parsed = new URL(clean);
    let host = parsed.hostname.toLowerCase();
    if (host.startsWith("www.")) {
      host = host.substring(4);
    }
    return host;
  } catch {
    return "";
  }
}

function normalizeTokens(str: string): string[] {
  return (str || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, " ")
    .split(/\s+/)
    .filter(t => t.length > 1 && !["school", "international", "college", "academy", "inst", "the"].includes(t));
}

function matchSchoolNameFuzzy(candidateName: string, targetName: string): boolean {
  const cNorm = (candidateName || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const tNorm = (targetName || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (cNorm === tNorm || cNorm.includes(tNorm) || tNorm.includes(cNorm)) return true;

  const cTokens = normalizeTokens(candidateName);
  const tTokens = normalizeTokens(targetName);

  if (cTokens.length === 0 || tTokens.length === 0) return false;

  const intersection = cTokens.filter(t => tTokens.includes(t) || tTokens.some(tt => tt.includes(t) || t.includes(tt)));
  return intersection.length >= Math.min(cTokens.length, tTokens.length);
}

/**
 * Database-first grounding loader.
 * Loads school document from Firestore, locks ground-truth properties.
 */
export async function loadAndGroundSchool(
  schoolIdOrName: string,
  city?: string,
  country?: string
): Promise<GroundedSchoolProfile> {
  const db = getAdminDb();
  let schoolDocData: any = null;
  let schoolId = schoolIdOrName.toLowerCase().replace(/\s+/g, "_");

  if (typeof db.collection === "function") {
    // 1. Direct document ID lookup
    try {
      const docSnap = await db.collection("schools").doc(schoolIdOrName).get();
      if (docSnap.exists) {
        schoolDocData = docSnap.data();
        schoolId = docSnap.id;
      }
    } catch {
      // Fall through to query
    }

    // 2. Query lookup by schoolname / city / fuzzy match
    if (!schoolDocData) {
      try {
        const snap = await db.collection("schools").get();
        const targetName = schoolIdOrName.toLowerCase().trim();

        snap.docs.forEach((docSnap: any) => {
          if (schoolDocData) return;
          const data = docSnap.data();
          const sName = (data.schoolname || data.name || data.school || "").toLowerCase().trim();
          const sCity = (data.city || "").toLowerCase().trim();

          const cityMatches = !city || !sCity || sCity === city.toLowerCase().trim() || sCity.includes(city.toLowerCase().trim()) || city.toLowerCase().trim().includes(sCity);
          const nameMatches = matchSchoolNameFuzzy(sName, targetName);

          if (nameMatches && cityMatches) {
            schoolDocData = data;
            schoolId = docSnap.id;
          }
        });
      } catch (err) {
        console.warn("🛸 [GROUNDING] Firestore query failed:", err);
      }
    }
  }

  const schoolName = schoolDocData?.schoolname || schoolDocData?.name || schoolIdOrName;
  const rawWebsite = schoolDocData?.website || schoolDocData?.schoolwebsite || schoolDocData?.officialDomain || "";
  const officialDomain = extractCanonicalDomain(rawWebsite);

  const careersPageUrl = schoolDocData?.careersPageUrl || schoolDocData?.careersUrl || undefined;
  const rawGroupDomain = schoolDocData?.groupDomain || schoolDocData?.schoolGroupDomain || "";
  const groupDomain = extractCanonicalDomain(rawGroupDomain) || undefined;

  const customVacancyDomains = Array.isArray(schoolDocData?.customVacancyDomains)
    ? schoolDocData.customVacancyDomains.map(extractCanonicalDomain).filter(Boolean)
    : undefined;

  const enabledSources = Array.isArray(schoolDocData?.enabledSources)
    ? schoolDocData.enabledSources
    : undefined;

  const finalCity = schoolDocData?.city || city || "";
  const finalCountry = schoolDocData?.country || country || "";

  const hasPrimary = schoolDocData?.hasPrimary !== false;
  const hasSecondary = schoolDocData?.hasSecondary !== false;

  const siblingSchools: string[] = [];
  if (finalCity?.toLowerCase() === "prague") {
    siblingSchools.push(
      "riverside school prague",
      "park lane international school",
      "prague british international school",
      "pbis",
      "the english college in prague",
      "ecp"
    );
  }

  // Guardrail check: if officialDomain is missing, halt automated sweeps
  if (!officialDomain) {
    console.error(
      `⛔ [GROUNDING GUARDRAIL] Missing officialDomain for school "${schoolName}" (ID: ${schoolId}). Manual admin configuration required in schools/${schoolId}.`
    );
    return {
      schoolId,
      schoolName,
      officialDomain: "",
      careersPageUrl,
      groupDomain,
      customVacancyDomains,
      enabledSources,
      city: finalCity,
      country: finalCountry,
      hasPrimary,
      hasSecondary,
      isGrounded: false,
      missingDomain: true,
      siblingSchools,
    };
  }

  console.log(
    `🛸 [GROUNDING] Grounded "${schoolName}" (ID: ${schoolId}) -> domain: ${officialDomain} | TES slug: ${schoolDocData?.tesEmployerSlug || "none"} | Group: ${groupDomain || "none"} | Primary: ${hasPrimary} | Secondary: ${hasSecondary}`
  );

  return {
    schoolId,
    schoolName,
    officialDomain,
    careersPageUrl,
    groupDomain,
    customVacancyDomains,
    enabledSources,
    tesSlug: schoolDocData?.tesEmployerSlug || undefined,
    tesOrganizationId: schoolDocData?.tesOrganizationId || undefined,
    schroleAccountId: schoolDocData?.schroleAccountId || undefined,
    city: finalCity,
    country: finalCountry,
    hasPrimary,
    hasSecondary,
    isGrounded: true,
    missingDomain: false,
    aliases: schoolDocData?.aliases || undefined,
    siblingSchools,
  };
}

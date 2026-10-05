/**
 * 🛸 SCHOOL WHITELIST MODULE
 *
 * Database Whitelist Cache. Loads the complete set of officially tracked schools
 * from our Firestore `schools` collection and provides fast in-memory validation
 * to ensure off-database schools are never ingested.
 */

import { getAdminDb } from "@/firebase/admin";
import { extractCanonicalDomain } from "./schoolGrounding";
import { matchSchoolEntity } from "./entityMatcher";
import { isRetiredSchool } from "@/lib/schools/retiredSchools";

export interface WhitelistedSchoolInfo {
  schoolId: string;
  schoolName: string;
  officialDomain: string;
  city?: string;
  country?: string;
  tesEmployerSlug?: string;
  aliases?: string[];
  /** How the school was matched. Only set on results of isWhitelistedSchool. "high" = exact name, alias, legal name, website or id. */
  /** Other towns/suburbs the school is known by (e.g. Oberursel for Frankfurt International School). Set in the schools collection as alternateCities. */
  alternateCities?: string[];
  matchConfidence?: "high" | "medium";
  matchType?: string;
}

let whitelistCache: Map<string, WhitelistedSchoolInfo> | null = null;
let lastCacheLoadMillis = 0;
const CACHE_TTL_MILLIS = 1000 * 60 * 15; // 15-minute in-memory TTL

/**
 * Loads and caches the full list of allowed schools from Firestore `schools` collection.
 */
export async function loadSchoolWhitelist(forceReload = false): Promise<Map<string, WhitelistedSchoolInfo>> {
  const now = Date.now();
  if (!forceReload && whitelistCache && (now - lastCacheLoadMillis < CACHE_TTL_MILLIS)) {
    return whitelistCache;
  }

  const map = new Map<string, WhitelistedSchoolInfo>();
  try {
    const db = getAdminDb();
    if (typeof db.collection === "function") {
      const snap = await db.collection("schools").get();
      snap.docs.forEach((docSnap: any) => {
        const d = docSnap.data();
        const schoolId = docSnap.id;
        const schoolName = d.schoolname || d.name || schoolId;
        const rawWebsite = d.website || d.schoolwebsite || d.officialDomain || "";
        const officialDomain = extractCanonicalDomain(rawWebsite);
        const tesEmployerSlug = d.tesEmployerSlug || undefined;
        const aliases = d.aliases || undefined;
        const alternateCities: string[] | undefined = Array.isArray(d.alternateCities) ? d.alternateCities.map((x: any) => String(x)) : undefined;

        // Exclude agency profiles (isAgency: true / type: school_agent) from job target whitelist
        if (d.isAgency === true || d.type === "school_agent" || schoolId.toUpperCase().startsWith("AGNT")) {
          return;
        }

        // Retired (merged) school IDs are never targets
        if (isRetiredSchool(schoolId)) {
          return;
        }

        map.set(schoolId.toLowerCase(), {
          schoolId,
          schoolName,
          officialDomain,
          city: d.city || d.location || "",
          country: d.country || "",
          tesEmployerSlug,
          aliases,
          alternateCities,
        });
      });
    }
  } catch (err) {
    console.warn("🛸 [WHITELIST] Failed to load school whitelist from Firestore:", err);
  }

  whitelistCache = map;
  lastCacheLoadMillis = now;
  console.log(`🛸 [WHITELIST] Loaded ${map.size} whitelisted school(s) into memory.`);
  return map;
}

const plainCity = (x: any) => String(x || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

/** If the source's city is one of the school's alternate cities (a suburb or nearby town), treat it as the school's own city. */
function cityForSchool(school: WhitelistedSchoolInfo, candidateCity?: string): string | undefined {
  const c = plainCity(candidateCity);
  if (c && (school.alternateCities || []).some((a) => { const n = plainCity(a); return n && (c.includes(n) || n.includes(c)); })) {
    return school.city;
  }
  return candidateCity;
}

/**
 * Validates if an organization name or domain belongs to an officially tracked school in our database.
 */
export async function isWhitelistedSchool(
  organizationName?: string,
  domainOrUrl?: string | null,
  targetSchoolId?: string,
  candidateCity?: string,
  candidateCountry?: string
): Promise<WhitelistedSchoolInfo | null> {
  const whitelist = await loadSchoolWhitelist();

  // 1. Domain / Host match
  const candidateDomain = extractCanonicalDomain(domainOrUrl || undefined);
  if (candidateDomain) {
    for (const school of whitelist.values()) {
      if (school.officialDomain && school.officialDomain === candidateDomain) {
        return { ...school, matchConfidence: "high", matchType: "domain" };
      }
    }
  }

  // 2. Organization Name match via matchSchoolEntity
  if (organizationName) {
    const cleanOrg = organizationName.trim().toLowerCase();
    for (const school of whitelist.values()) {
      const match = matchSchoolEntity(
        { name: school.schoolName, schoolname: school.schoolName, city: school.city, country: school.country, aliases: school.aliases, tesEmployerSlug: school.tesEmployerSlug },
        { candidateText: cleanOrg, sourceUrl: domainOrUrl || "", city: cityForSchool(school, candidateCity), country: candidateCountry }
      );
      // Roger (2026-10-05): DIRECT matching only - exact name, alias, legal name or platform id. No fuzzy or acronym matching.
      if (match.isMatch && ["exact", "alias", "legal_name", "platform_id"].includes(match.matchType)) {
        return { ...school, matchConfidence: "high", matchType: match.matchType };
      }
    }
  }

  // 2b. Second pass: the source gives a different city (e.g. a suburb) but the school NAME matches exactly.
  // Accept only when exactly one school matches by exact name, alias or legal name. Marked "medium", so the job goes to pending.
  if (organizationName && candidateCity) {
    const cleanOrg = organizationName.trim().toLowerCase();
    const hits: WhitelistedSchoolInfo[] = [];
    for (const school of whitelist.values()) {
      const match = matchSchoolEntity(
        { name: school.schoolName, schoolname: school.schoolName, city: school.city, country: school.country, aliases: school.aliases, tesEmployerSlug: school.tesEmployerSlug } as any,
        { candidateText: cleanOrg, sourceUrl: domainOrUrl || "", city: undefined, country: candidateCountry }
      );
      if (match.isMatch && ["exact", "alias", "legal_name"].includes(match.matchType)) hits.push(school);
    }
    if (hits.length === 1) {
      return { ...hits[0], matchConfidence: "medium", matchType: "name_match_city_differs" };
    }
  }

  // 3. Fallback: Direct Target School ID lookup ONLY if no org name or domain/url were provided
  if (targetSchoolId && !organizationName && !domainOrUrl) {
    const directMatch = whitelist.get(targetSchoolId.toLowerCase());
    if (directMatch) return { ...directMatch, matchConfidence: "high", matchType: "id" };
  }

  return null;
}

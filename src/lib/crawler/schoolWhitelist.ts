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

export interface WhitelistedSchoolInfo {
  schoolId: string;
  schoolName: string;
  officialDomain: string;
  tesEmployerSlug?: string;
  aliases?: string[];
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

        // Exclude agency profiles (isAgency: true / type: school_agent) from job target whitelist
        if (d.isAgency === true || d.type === "school_agent" || schoolId.toUpperCase().startsWith("AGNT")) {
          return;
        }

        map.set(schoolId.toLowerCase(), {
          schoolId,
          schoolName,
          officialDomain,
          tesEmployerSlug,
          aliases,
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

/**
 * Validates if an organization name or domain belongs to an officially tracked school in our database.
 */
export async function isWhitelistedSchool(
  organizationName?: string,
  domainOrUrl?: string | null,
  targetSchoolId?: string
): Promise<WhitelistedSchoolInfo | null> {
  const whitelist = await loadSchoolWhitelist();

  // 1. Direct Target School ID match
  if (targetSchoolId) {
    const directMatch = whitelist.get(targetSchoolId.toLowerCase());
    if (directMatch) return directMatch;
  }

  // 2. Domain / Host match
  const candidateDomain = extractCanonicalDomain(domainOrUrl || undefined);
  if (candidateDomain) {
    for (const school of whitelist.values()) {
      if (school.officialDomain && school.officialDomain === candidateDomain) {
        return school;
      }
    }
  }

  // 3. Organization Name match via matchSchoolEntity
  if (organizationName) {
    const cleanOrg = organizationName.trim().toLowerCase();
    for (const school of whitelist.values()) {
      const match = matchSchoolEntity(
        { name: school.schoolName, schoolname: school.schoolName, aliases: school.aliases, tesEmployerSlug: school.tesEmployerSlug },
        { candidateText: cleanOrg, sourceUrl: domainOrUrl || "" }
      );
      if (match.isMatch) {
        return school;
      }
    }
  }

  return null;
}

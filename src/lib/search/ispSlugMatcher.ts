import { SchoolEntity } from "../crawler/entityMatcher";

/**
 * Extracts the school slug portion from a Workday URL, external path, or raw slug.
 * Examples:
 *   - "https://internationalschools.wd3.myworkdayjobs.com/en-US/ISPCareers/job/The-Aquila-School-United-Arab-Emirates-Dubai/Islamic-teacher_JR214495" -> "The-Aquila-School-United-Arab-Emirates-Dubai"
 *   - "/The-Aquila-School-United-Arab-Emirates-Dubai/Islamic-teacher_JR214495" -> "The-Aquila-School-United-Arab-Emirates-Dubai"
 *   - "Tenby-Setia-Eco-Park-International-Malaysia-Shah-Alam" -> "Tenby-Setia-Eco-Park-International-Malaysia-Shah-Alam"
 */
export function extractIspSchoolSlug(input: string): string {
  if (!input) return "";
  let path = input.trim();

  if (path.includes("/job/")) {
    path = path.substring(path.indexOf("/job/") + 5);
  } else if (path.startsWith("/")) {
    path = path.substring(1);
  }

  const segments = path.split("/").filter(Boolean);
  return segments.length > 0 ? segments[0] : path;
}

/**
 * Converts a Workday slug into a readable school name.
 * Example: "Tenby-Setia-Eco-Park-International-Malaysia-Shah-Alam" -> "Tenby Setia Eco Park International Malaysia Shah Alam"
 */
export function extractIspWorkdaySchoolName(input: string): string {
  const slug = extractIspSchoolSlug(input);
  return slug.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Normalizes text to tokenizable form:
 * Strips accents, lowercases, replaces non-alphanumeric with spaces, expands common abbreviations.
 */
export function tokenizeText(str: string): string[] {
  if (!str) return [];
  const normalized = str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .toLowerCase()
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const words = normalized.split(/\s+/).filter(Boolean);
  return words.map((w) => {
    if (w === "intl" || w === "int") return "international";
    if (w === "st") return "saint";
    return w;
  });
}

const NOISE_WORDS = new Set([
  "the", "of", "and", "in", "de", "da", "do", "del", "di", "for", "a", "an", "at"
]);

const GENERIC_SCHOOL_WORDS = new Set([
  "school", "schools", "college", "academy", "instituto", "escuela", "escola"
]);

const CAMPUS_DISTINGUISHERS = [
  "ecohill", "gardens", "ipoh", "penang", "tropicana", "rawang", "semenyih", "twar", "mirdif"
];

/**
 * Compares the Workday link slug with candidate FLIS schools using whole-token matching.
 * Accounts for word order variations while strictly preventing campus or curriculum bleed.
 */
export function matchIspWorkdaySlug(
  slugOrUrl: string,
  schools: SchoolEntity[]
): SchoolEntity | null {
  const slug = extractIspSchoolSlug(slugOrUrl);
  if (!slug) return null;

  const slugTokens = tokenizeText(slug);
  if (slugTokens.length === 0) return null;

  const slugTokenSet = new Set(slugTokens);

  const slugHasInternational = slugTokenSet.has("international");
  const slugHasNational = slugTokenSet.has("national") && !slugHasInternational;

  let bestMatch: SchoolEntity | null = null;
  let bestTokenCount = 0;

  for (const school of schools) {
    const canonicalName = school.name || school.schoolname || "";
    const canonicalTokens = tokenizeText(canonicalName);
    const canonicalHasInternational = canonicalTokens.includes("international");
    const canonicalHasNational = canonicalTokens.includes("national") && !canonicalHasInternational;

    // 1. Strict Curriculum & Type Safeguards:
    // If the canonical school is International and the slug is National, reject
    if (canonicalHasInternational && slugHasNational) {
      continue;
    }
    // If the canonical school is National and the slug is International, reject
    if (canonicalHasNational && slugHasInternational) {
      continue;
    }

    const candidateNames = [
      canonicalName,
      ...(Array.isArray(school.aliases) ? school.aliases : [])
    ].filter(Boolean);

    for (const name of candidateNames) {
      const nameTokens = tokenizeText(name);
      if (nameTokens.length === 0) continue;

      // Extract core tokens for this school (excluding pure noise words like "the", "of", "and")
      const coreTokens = nameTokens.filter((t) => !NOISE_WORDS.has(t));
      if (coreTokens.length === 0) continue;

      // ALL core tokens of the candidate name MUST be present in the slug tokens as whole words
      const allCoreTokensMatch = coreTokens.every((t) => slugTokenSet.has(t));
      if (!allCoreTokensMatch) continue;

      // 2. Strict Negative / Conflicting Campus token checks:
      const nonGenericSchoolTokens = new Set(coreTokens.filter((t) => !GENERIC_SCHOOL_WORDS.has(t)));

      let hasConflictingCampus = false;
      for (const campusKey of CAMPUS_DISTINGUISHERS) {
        const campusKeyNorm = campusKey.replace(/[^a-z0-9]/g, "");
        if (slugTokenSet.has(campusKeyNorm) && !nonGenericSchoolTokens.has(campusKeyNorm)) {
          hasConflictingCampus = true;
          break;
        }
      }
      if (hasConflictingCampus) continue;

      // 3. Count matched distinctive tokens for tie-breaking
      const distinctiveCount = nonGenericSchoolTokens.size;
      if (distinctiveCount > bestTokenCount) {
        bestTokenCount = distinctiveCount;
        bestMatch = school;
      }
    }
  }

  return bestMatch;
}

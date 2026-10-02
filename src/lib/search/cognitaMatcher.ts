/**
 * 🏛️ COGNITA CAMPUS REGISTRY & MATCHER (CLIENT-SAFE)
 *
 * Contains canonical mappings and identification logic for Cognita schools.
 * Free of Node.js dependencies so it can safely be imported in client components.
 */

export interface CognitaCampusMeta {
  schoolId: string;
  canonicalName: string;
  city: string;
  country: string;
  matchers: string[];
}

/**
 * COGNITA CANONICAL CAMPUS REGISTRY
 * Mapped to exact canonical database FLIS IDs.
 */
export const COGNITA_CAMPUS_MAP: Record<string, CognitaCampusMeta> = {
  "stamford american": {
    schoolId: "FLIS0404",
    canonicalName: "Stamford American International School",
    city: "Singapore",
    country: "Singapore",
    matchers: ["stamford american", "singapore"],
  },
  "ishcmc": {
    schoolId: "FLIS0130",
    canonicalName: "International School Ho Chi Minh City",
    city: "Ho Chi Minh City",
    country: "Vietnam",
    matchers: ["ishcmc", "an khanh", "thu duc", "ho chi minh"],
  },
  "bsb": {
    schoolId: "FLIS0416",
    canonicalName: "The British School of Barcelona",
    city: "Castelldefels",
    country: "Spain",
    matchers: ["british school of barcelona", "castelldefels", "barcelona"],
  },
  "southbank": {
    schoolId: "FLIS0173",
    canonicalName: "Southbank International School",
    city: "London",
    country: "United Kingdom",
    matchers: ["southbank", "hampstead", "westminster"],
  },
  // FLIS0137 St Andrews Sukhumvit 107 removed 2026-10-02: sold by Cognita to Taylor's Schools (now handled by the Taylor's engine).
  "repton dubai": {
    schoolId: "FLIS0110",
    canonicalName: "Repton School Dubai",
    city: "Dubai",
    country: "United Arab Emirates",
    matchers: ["repton dubai", "repton school dubai", "nad al sheba"],
  },
  "horizon international": {
    schoolId: "FLIS0111",
    canonicalName: "Horizon International School",
    city: "Dubai",
    country: "United Arab Emirates",
    matchers: ["horizon international"],
  },
  "horizon english": {
    schoolId: "FLIS0349",
    canonicalName: "Horizon English School",
    city: "Dubai",
    country: "United Arab Emirates",
    matchers: ["horizon english"],
  },
  "cheltenham muscat": {
    schoolId: "FLIS0042",
    canonicalName: "Cheltenham Muscat",
    city: "Muscat",
    country: "Oman",
    matchers: ["cheltenham muscat", "cheltenham college muscat"],
  },
  "st gilgen": {
    schoolId: "FLIS0190",
    canonicalName: "St. Gilgen International School",
    city: "St. Gilgen",
    country: "Austria",
    matchers: ["st. gilgen", "st gilgen"],
  },
  "reigate grammar vietnam": {
    schoolId: "FLIS0443",
    canonicalName: "Reigate Grammar School Vietnam",
    city: "Hanoi",
    country: "Vietnam",
    matchers: ["reigate grammar", "hanoi"],
  },
  "heidelberg": {
    schoolId: "FLIS0090",
    canonicalName: "Heidelberg International School",
    city: "Heidelberg",
    country: "Germany",
    matchers: ["heidelberg"],
  },
};

export function isCognitaSchool(schoolId?: string | null, schoolName?: string | null, group?: string | null): boolean {
  const sId = (schoolId || "").toUpperCase().trim();
  const sName = (schoolName || "").toLowerCase();
  const gName = (group || "").toLowerCase();

  if (
    gName.includes("taaleem") ||
    sName.includes("taaleem") ||
    gName.includes("gems") ||
    sName.includes("gems") ||
    gName.includes("nord anglia") ||
    sName.includes("nord anglia") ||
    gName.includes("inspired") ||
    sName.includes("inspired")
  ) {
    return false;
  }

  for (const meta of Object.values(COGNITA_CAMPUS_MAP)) {
    if (meta.schoolId === sId) return true;
  }

  if (gName.includes("cognita")) return true;
  if (sName.includes("cognita")) return true;

  return false;
}

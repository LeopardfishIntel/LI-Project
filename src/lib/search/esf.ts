/**
 * 🏛️ ESF (ENGLISH SCHOOLS FOUNDATION) VACANCY ENGINE & DIRECT LINK RESOLVER
 *
 * Mirrors the Malvern-style dual-pill architecture.
 * Identifies ESF schools and enriches cross-posted TES listings with direct
 * links to the ESF Workday portal (https://esf.wd102.myworkdayjobs.com/ESF).
 */


export const ESF_PORTAL_URL = 'https://esf.wd102.myworkdayjobs.com/ESF';

export const ESF_SCHOOL_KEYWORDS = [
  'english schools foundation',
  'esf',
  'king george v',
  'island school',
  'shatin college',
  'sha tin college',
  'south island school',
  'west island school',
  'renaissance college',
  'discovery college',
  'beacon hill school',
  'bradbury school',
  'clearwater bay school',
  'glenealy school',
  'kennedy school',
  'kowloon junior school',
  'peak school',
  'sha tin junior school',
  'jockey club sarah roe',
];

/**
 * Checks whether a school or vacancy belongs to the English Schools Foundation (ESF).
 */
export function isEsfSchool(
  schoolId?: string | null,
  schoolName?: string | null,
  group?: string | null,
  applyUrl?: string | null
): boolean {
  const sName = (schoolName || '').toLowerCase().trim();
  const gName = (group || '').toLowerCase().trim();
  const aUrl = (applyUrl || '').toLowerCase().trim();

  if (aUrl.includes('esf.wd102.myworkdayjobs.com') || aUrl.includes('esf.edu.hk') || aUrl.includes('esf.org.hk')) {
    return true;
  }

  if (gName.includes('esf') || gName.includes('english schools foundation')) {
    return true;
  }

  return ESF_SCHOOL_KEYWORDS.some((kw) => sName.includes(kw));
}

/**
 * Resolves direct Workday portal career links for ESF roles harvested via TES or group crawls.
 */
export async function enrichEsfDirectUrl(
  tesJobUrl: string,
  flisSchoolId?: string | null,
  tesOutboundUrl?: string | null,
  memoryFallbackUrl?: string | null
): Promise<string> {
  // 1. Return outbound URL if pointing to Workday or ESF site
  if (tesOutboundUrl && (tesOutboundUrl.includes('myworkdayjobs.com/ESF') || tesOutboundUrl.includes('esf.edu.hk'))) {
    return tesOutboundUrl;
  }

  // 2. In-memory fallback if valid Workday link
  if (memoryFallbackUrl && memoryFallbackUrl.includes('myworkdayjobs.com/ESF')) {
    return memoryFallbackUrl;
  }

  // 3. Default to canonical ESF Workday portal
  return ESF_PORTAL_URL;
}

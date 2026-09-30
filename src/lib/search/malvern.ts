/**
 * 🏛️ MALVERN COLLEGE VACANCY ENGINE & DIRECT LINK RESOLVER
 *
 * Provides campus identification and direct link enrichment for Malvern College
 * roles ingested via TES or group sweeps. Automatically maps outbound application
 * links or falls back to canonical campus career URLs in Firestore.
 */


export const MALVERN_CAMPUS_IDS = new Set([
  'FLIS0119', // Malvern College Egypt
  'FLIS0151', // Malvern College Tokyo
  'FLIS0234', // Malvern College Hong Kong
  'FLIS0235', // Malvern College Pre-School HK (Island West)
  'FLIS0236', // Malvern College Pre-School HK (Coronation Circle)
  'FLIS0237', // Malvern College Qingdao
  'FLIS0238', // Malvern College Chengdu
  'FLIS0239', // Malvern College Riyadh
  'FLIS0240', // Malvern College São Paulo
]);

// Canonical, verified campus careers pages. Used as a last-resort fallback
// ONLY when neither the TES outbound link nor the school's own
// careersPageUrl/schoolWebsite field (set in Firestore) resolves to a
// usable direct link. Only add an entry here once the URL has actually
// been confirmed live — an unverified guess is worse than showing no
// Direct pill at all.
export const MALVERN_CAMPUS_CAREERS_URLS: Record<string, string> = {
  FLIS0151: 'https://www.malverncollegetokyo.jp/about-us/work-with-us/', // Malvern College Tokyo — confirmed 2026-09-30
};

/**
 * Checks whether a school entity belongs to the Malvern College international group.
 */
export function isMalvernCampus(
  schoolId?: string | null,
  schoolName?: string | null,
  group?: string | null
): boolean {
  if (schoolId && MALVERN_CAMPUS_IDS.has(schoolId.toUpperCase().trim())) {
    return true;
  }

  const sName = (schoolName || '').toLowerCase();
  const gName = (group || '').toLowerCase();

  return (
    sName.includes('malvern') ||
    gName.includes('malvern')
  );
}

/**
 * Resolves direct campus career links for Malvern roles harvested via TES.
 */
export async function enrichMalvernDirectUrl(
  tesJobUrl: string,
  flisSchoolId: string,
  tesOutboundUrl?: string | null,
  memoryFallbackUrl?: string | null
): Promise<string> {
  // 1. Return outbound URL if already present, valid, and not an internal TES apply form
  if (tesOutboundUrl && !tesOutboundUrl.includes('tes.com/jobs/apply') && !tesOutboundUrl.includes('tes.com/jobs/vacancy')) {
    return tesOutboundUrl;
  }

  // 2. Use in-memory fallback URL from crawler input if provided
  if (memoryFallbackUrl && memoryFallbackUrl !== '#' && !memoryFallbackUrl.includes('tes.com')) {
    return memoryFallbackUrl;
  }

  // 3. Fall back to a verified canonical campus careers page, if we have one
  const normId = (flisSchoolId || '').toUpperCase().trim();
  if (normId && MALVERN_CAMPUS_CAREERS_URLS[normId]) {
    return MALVERN_CAMPUS_CAREERS_URLS[normId];
  }

  // 4. No trustworthy direct link exists — return empty rather than the TES
  // listing URL. A "Direct" pill that opens a TES page is worse than no
  // Direct pill at all. The public render guard already treats a falsy
  // directUrl as "no Direct pill" (confirmed: page.tsx skips any pill
  // whose resolved URL is "#").
  return '';
}

export interface MalvernJobMatch {
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
}

export async function searchMalvernDbSchools(_query: string = ""): Promise<MalvernJobMatch[]> {
  console.log("ℹ️ [MALVERN ENGINE] Standalone parser deprecated. Malvern vacancies are now natively discovered via primary TES employer pipelines.");
  return [];
}

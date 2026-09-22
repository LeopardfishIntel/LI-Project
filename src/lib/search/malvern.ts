/**
 * 🏛️ MALVERN COLLEGE VACANCY ENGINE & DIRECT LINK RESOLVER
 *
 * Provides campus identification and direct link enrichment for Malvern College
 * roles ingested via TES or group sweeps. Automatically maps outbound application
 * links or falls back to canonical campus career URLs in Firestore.
 */


export const MALVERN_CAMPUS_IDS = new Set([
  'FLIS0130', // Malvern College Egypt
  'FLIS0164', // Malvern College Tokyo
  'FLIS0251', // Malvern College Hong Kong
  'FLIS0252', // Malvern College Pre-School HK (Island West)
  'FLIS0253', // Malvern College Pre-School HK (Coronation Circle)
  'FLIS0254', // Malvern College Qingdao
  'FLIS0255', // Malvern College Chengdu
  'FLIS0256', // Malvern College Riyadh
  'FLIS0257', // Malvern College São Paulo
]);

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

  // 3. Default fallback to TES listing URL if no direct link exists
  return tesJobUrl;
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

/**
 * 🏫 TAALEEM CANONICAL RESOLVER & CAMPUS REGISTRY
 *
 * Resolves TES & broad aggregator job signals to Taaleem's canonical ATS careers portal.
 */

export interface ResolvedTaaleemJob {
  canonicalUrl: string;
  isDirect: boolean;
  groupName: 'Taaleem';
  campus?: string;
}

export const TAALEEM_CAMPUS_MAP: Record<string, { schoolId: string; canonicalName: string }> = {
  'emirates hills': { schoolId: 'FLIS0115_EMIRATES_HILLS', canonicalName: 'Dubai British School Emirates Hills' },
  'jumeirah park': { schoolId: 'FLIS0115_JUMEIRAH_PARK', canonicalName: 'Dubai British School Jumeirah Park' },
  'mira': { schoolId: 'FLIS0115_MIRA', canonicalName: 'Dubai British School Mira' },
  'jumeira': { schoolId: 'FLIS0115_JUMEIRA', canonicalName: 'Dubai British School Jumeira' },
  'raha': { schoolId: 'FLIS0113', canonicalName: 'Raha International School' },
  'greenfield': { schoolId: 'FLIS0116_GIS', canonicalName: 'Greenfield International School' },
  'jumeira baccalaureate': { schoolId: 'FLIS0114_JBS', canonicalName: 'Jumeira Baccalaureate School' },
  'uptown': { schoolId: 'FLIS0117_UIS', canonicalName: 'Uptown International School' },
  'dubai heights': { schoolId: 'FLIS0118_DHA', canonicalName: 'Dubai Heights Academy' },
};

/**
 * Checks if a given school name or ID belongs to the Taaleem group.
 */
export function isTaaleemSchool(schoolId?: string | null, schoolName?: string | null, group?: string | null): boolean {
  const sId = (schoolId || '').toUpperCase().trim();
  const sName = (schoolName || '').toLowerCase();
  const gName = (group || '').toLowerCase();

  // Guard against other explicit groups
  if (
    gName.includes('gems') ||
    sName.includes('gems') ||
    gName.includes('nord anglia') ||
    sName.includes('nord anglia') ||
    gName.includes('cognita') ||
    sName.includes('cognita') ||
    gName.includes('inspired') ||
    sName.includes('inspired') ||
    sName.includes('dubai college') ||
    sName.includes('sunmarke') ||
    sName.includes('dubai english speaking')
  ) {
    return false;
  }

  if (gName.includes('taaleem')) {
    return true;
  }

  // Name keyword checks
  if (
    sName.includes('taaleem') ||
    sName.includes('dubai british') ||
    sName.includes('raha international') ||
    sName.includes('jumeira baccalaureate') ||
    sName.includes('greenfield international') ||
    sName.includes('greenfield community') ||
    sName.includes('uptown international') ||
    sName.includes('uptown school') ||
    sName.includes('dubai heights academy') ||
    sName.includes('american academy for girls')
  ) {
    return true;
  }

  // Exact ID-based checks for known Taaleem master IDs
  if (
    sId.startsWith('FLIS0113') || // Raha International School
    sId.startsWith('FLIS0115') || // Dubai British School campuses
    sId.startsWith('FLIS0116') || // Greenfield International School
    sId.startsWith('FLIS0117') || // Uptown International School
    sId.startsWith('FLIS0118')    // Dubai Heights Academy
  ) {
    return true;
  }

  return false;
}

/**
 * Resolves a Taaleem job listing to a direct portal/campus careers URL.
 */
export function resolveTaaleemDirectUrl(
  jobTitle: string,
  schoolName: string,
  fallbackUrl?: string | null
): ResolvedTaaleemJob {
  const sNameLower = (schoolName || '').toLowerCase();
  let matchedCampus: string | undefined;

  for (const [key, meta] of Object.entries(TAALEEM_CAMPUS_MAP)) {
    if (sNameLower.includes(key)) {
      matchedCampus = meta.canonicalName;
      break;
    }
  }

  // If an outbound direct employer link is already available and valid (direct job or deep link), use it
  if (
    fallbackUrl &&
    !fallbackUrl.includes('tes.com') &&
    fallbackUrl.startsWith('http') &&
    fallbackUrl.includes('taaleem.ae') &&
    (fallbackUrl.includes('/jobs/') || fallbackUrl.includes('/job-application/') || fallbackUrl.includes('keyword='))
  ) {
    return {
      canonicalUrl: fallbackUrl,
      isDirect: true,
      groupName: 'Taaleem',
      campus: matchedCampus,
    };
  }

  // Generate direct search on Taaleem portal for this specific job title
  const cleanTitle = (jobTitle || '')
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/[-–—].*$/, '')
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .trim();

  if (cleanTitle) {
    return {
      canonicalUrl: `https://careers.taaleem.ae/en/job-search-results/?keyword=${encodeURIComponent(cleanTitle)}`,
      isDirect: true,
      groupName: 'Taaleem',
      campus: matchedCampus,
    };
  }

  // Fallback to Taaleem primary careers search portal
  return {
    canonicalUrl: 'https://careers.taaleem.ae/en/job-search-results/',
    isDirect: true,
    groupName: 'Taaleem',
    campus: matchedCampus,
  };
}

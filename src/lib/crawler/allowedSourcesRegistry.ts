/**
 * 🛰️ ALLOWED SOURCES & DOMAIN REGISTRY
 *
 * Defines explicit whitelists, execution tiers, ATS domains, and Option 1 Virtual Agency Profile mappings:
 *
 *   Tier 1 — Primary Sweep (Searched FIRST for all schools):
 *     - Direct Official School Websites
 *     - TES (tes.com)
 *     - Major International School ATS Portals (Lever, Greenhouse, Workday, BambooHR, SmartRecruiters, JobTrain, etc.)
 *     - Major International Recruitment Agencies & Platforms:
 *       Search Associates, Teacher Horizons, ISS, Webber's Ed, Edvectus, Guardian Jobs,
 *       Teach Away, eTeach, eChinaCareers. (Excluded boards are listed in EXCLUDED_SOURCE_DOMAINS below.)
 *     - 43 Approved International School Group Portals
 */

export interface DomainSourceMetadata {
  domain: string;
  name: string;
  tier: 1 | 2;
  isGroupPortal?: boolean;
}

export const SOUTH_AMERICAN_COUNTRIES = new Set([
  'brazil',
  'argentina',
  'peru',
  'chile',
  'colombia',
  'ecuador',
  'uruguay',
  'paraguay',
  'venezuela',
  'bolivia',
  'guyana',
  'suriname',
  'french guiana',
]);

export function isSouthAmericanSchool(country?: string): boolean {
  if (!country) return false;
  return SOUTH_AMERICAN_COUNTRIES.has(country.toLowerCase().trim());
}

// ─── TIER 1: MAJOR INTERNATIONAL PLATFORMS, ATS PORTALS & AGENCIES ─────────

export const TIER_1_PLATFORMS: Record<string, string> = {
  'tes.com': 'TES',
  'jobs.theguardian.com': 'Guardian Jobs',
  'guardianjobs.com': 'Guardian Jobs',
  'teacherhorizons.com': 'Teacher Horizons',
  'iss.edu': 'ISS',
  'webbersed.com': "Webber's Ed",
  'edvectus.com': 'Edvectus',
  'edvectus.co.uk': 'Edvectus UK',
  'teachaway.com': 'Teach Away',
  'eteach.com': 'eTeach',
  'echinacareers.com': 'eChinaCareers',
  // 🏢 Major School ATS Portals & Platforms
  'lever.co': 'Lever ATS',
  'jobs.lever.co': 'Lever ATS',
  'greenhouse.io': 'Greenhouse ATS',
  'boards.greenhouse.io': 'Greenhouse ATS',
  'bamboohr.com': 'BambooHR ATS',
  'workdayjobs.com': 'Workday ATS',
  'myworkdayjobs.com': 'Workday ATS',
  'workday.com': 'Workday ATS',
  'smartrecruiters.com': 'SmartRecruiters ATS',
  'jobtrain.co.uk': 'JobTrain ATS',
  'dayforcehcm.com': 'Dayforce ATS',
  'personio.de': 'Personio ATS',
  'personio.com': 'Personio ATS',
  'recruitee.com': 'Recruitee ATS',
  'schoolrecruiter.com': 'SchoolRecruiter ATS',
  'hire.withgoogle.com': 'Google Hire ATS',
  'applytoeducation.com': 'ApplyToEducation ATS',
  'icims.com': 'iCIMS ATS',
  'jobvite.com': 'Jobvite ATS',
  'teamtailor.com': 'Teamtailor ATS',
  'oraclecloud.com': 'Oracle Cloud ATS',
};

// ─── TIER 1: APPROVED SCHOOL GROUP PORTALS (43 GROUPS) ─────────────────────

export const TIER_1_GROUP_PORTALS: Record<string, string> = {
  'acs-schools.com': 'ACS International Schools',
  'harrowschools.com': 'AISL Harrow Group',
  'alnajah.com': 'Al Najah Education',
  'aldareducation.com': 'Aldar Education',
  'bloomeducation.com': 'Bloom Education',
  'braeburn.com': 'Braeburn Schools Group',
  'brightscholar.com': 'Bright Scholar',
  'brightoncollege.org': 'Brighton College International',
  'britus.ae': 'Britus Educational',
  'cognita.com': 'Cognita Careers',
  'downehouse.org.uk': 'Downe House UK',
  'eim.edu': 'Education in Motion (EiM)',
  'emerge.edu': 'Emerge Education',
  'epsomcollege.org.uk': 'Epsom College UK',
  'repton.org.uk': 'Excelsior Schools / Repton',
  'forteseducation.com': 'Fortes Education',
  'gemseducation.com': 'GEMS Education',
  'globalschoolsfoundation.org': 'Global Schools Foundation',
  'globeducate.com': 'Globeducate Careers',
  'inspirededu.com': 'Inspired Education Group',
  'isf.edu': 'ISF Group',
  'khazar.org': 'Khazar University',
  'kcs.org.uk': "King's College Wimbledon",
  'lumina.ro': 'Lumina Educational Institutions',
  'malverncollege.org.uk': 'Malvern College International',
  'marlboroughcollege.org.uk': 'Marlborough College UK',
  'misk.org.sa': 'Misk Foundation',
  'nlcs.org.uk': 'NLCS International',
  'nps.edu': 'NPS Group',
  'nordanglia.com': 'Nord Anglia Career Portal',
  'nordangliaeducation.com': 'Nord Anglia Career Portal (Legacy)',
  'poleungkuk.org.hk': 'Po Leung Kuk',
  'qsi.org': 'Quality Schools International (QSI)',
  'qf.org.qa': 'Qatar Foundation',
  'reigategrammar.org': 'Reigate Grammar International',
  'rugbyschool.co.uk': 'Rugby School UK',
  'schoolrecruiter.com': 'SchoolRecruiter Portal',
  'sek.es': 'SEK Education Group',
  'taaleem.ae': 'Taaleem Careers',
  'tasis.ch': 'TASIS Schools',
  'taylors.edu.my': "Taylor's Education",
  'uwc.org': 'UWC Movement',
  'wellingtoncollege.cn': 'Wellington China',
  'wellingtoncollege.org.uk': 'Wellington College International',
};

// ─── TIER 2 / EXCLUDED BOARDS ────────────────────────────────────────────────
// Roger (2026-10-03): regional and secondary boards, and several agency boards, are NOT used and are never linked.
// They were removed from the allowed lists. A link on one of these hosts is never auto-approved.
// Teacher Horizons, ISS and eTeach stay in TIER_1_PLATFORMS ("for future work").

export const TIER_2_REGIONAL_BOARDS: Record<string, string> = {};

export const EXCLUDED_SOURCE_DOMAINS: string[] = [
  // agency / aggregator boards
  'schrole.com', 'linkedin.com', 'gaijinpot.com', 'join.com', 'euraxess.ec.europa.eu', 'unjoblist.org',
  // international directories and association boards (CIS Directory and SGIS were never in this file)
  'ibo.org', 'acsi.org', 'montessori-ami.org',
  // regional / secondary boards (former Tier 2)
  'arbetsformedlingen.se', 'edb.gov.hk', 'finn.no', 'gulftalent.com', 'infojobs.net', 'jobindex.dk', 'jobkey.jo',
  'jobsdb.com', 'jobsearch.az', 'jobstreet.com', 'jobstreet.com.ph', 'jobstreet.com.sg', 'karriere.at', 'naukri.com',
  'bildungsdirektion-ooe.at', 'opetus.fi', 'praca.pl', 'prace.cz', 'jobs.cz', 'moe.gov.sg', 'stepstone.de',
  'tirol.gv.at', 'vdab.be',
];

export function isExcludedSourceDomain(urlStr: string): boolean {
  const host = extractDomainHost(urlStr);
  if (!host) return false;
  return EXCLUDED_SOURCE_DOMAINS.some(d => host === d || host.endsWith('.' + d));
}

export function extractDomainHost(urlStr: string): string {
  if (!urlStr || typeof urlStr !== 'string') return '';
  let clean = urlStr.trim().toLowerCase();
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    clean = 'https://' + clean;
  }
  try {
    const parsed = new URL(clean);
    let host = parsed.hostname.toLowerCase();
    if (host.startsWith('www.')) host = host.substring(4);
    return host;
  } catch {
    return '';
  }
}

export function getAgencyEntity(source: string, url?: string): { agencyId: string; agencyName: string } | null {
  const host = extractDomainHost(url || '');
  const cleanSource = (source || '').toLowerCase();

  if (host.includes('teacherhorizons.com') || cleanSource.includes('teacher horizons')) {
    return { agencyId: 'AGNT_teacher_horizons', agencyName: 'Teacher Horizons (Client School)' };
  }
  if (host.includes('edvectus.com') || host.includes('edvectus.co.uk') || cleanSource.includes('edvectus')) {
    return { agencyId: 'AGNT_edvectus', agencyName: 'Edvectus (Confidential Client)' };
  }
  if (host.includes('searchassociates.com') || cleanSource.includes('search associates')) {
    return { agencyId: 'AGNT_search_associates', agencyName: 'Search Associates (Client School)' };
  }
  if (host.includes('iss.edu') || cleanSource.includes('iss')) {
    return { agencyId: 'AGNT_iss', agencyName: 'ISS (Confidential Client)' };
  }
  if (host.includes('webbersed.com') || cleanSource.includes("webber's ed")) {
    return { agencyId: 'AGNT_webbers_ed', agencyName: "Webber's Ed (Client School)" };
  }
  if (host.includes('teachaway.com') || cleanSource.includes('teach away')) {
    return { agencyId: 'AGNT_teach_away', agencyName: 'Teach Away (Confidential Client)' };
  }
  return null;
}

export function isWhitelistedSourceDomain(
  urlStr: string,
  officialDomain?: string,
  groupDomain?: string,
  customVacancyDomains?: string[]
): boolean {
  const host = extractDomainHost(urlStr);
  if (!host) return false;

  if (isExcludedSourceDomain(urlStr)) return false;

  if (officialDomain && (host === officialDomain || host.endsWith('.' + officialDomain))) return true;
  if (groupDomain && (host === groupDomain || host.endsWith('.' + groupDomain))) return true;
  if (customVacancyDomains && customVacancyDomains.some(d => host === d || host.endsWith('.' + d))) return true;

  if (Object.keys(TIER_1_PLATFORMS).some(d => host === d || host.endsWith('.' + d))) return true;
  if (Object.keys(TIER_1_GROUP_PORTALS).some(d => host === d || host.endsWith('.' + d))) return true;
  if (Object.keys(TIER_2_REGIONAL_BOARDS).some(d => host === d || host.endsWith('.' + d))) return true;

  return false;
}

export function getSourceTier(
  urlStr: string,
  officialDomain?: string,
  groupDomain?: string,
  customVacancyDomains?: string[]
): 1 | 2 {
  const host = extractDomainHost(urlStr);
  if (!host) return 1;

  if (officialDomain && (host === officialDomain || host.endsWith('.' + officialDomain))) return 1;
  if (groupDomain && (host === groupDomain || host.endsWith('.' + groupDomain))) return 1;
  if (customVacancyDomains && customVacancyDomains.some(d => host === d || host.endsWith('.' + d))) return 1;

  if (Object.keys(TIER_1_PLATFORMS).some(d => host === d || host.endsWith('.' + d))) return 1;
  if (Object.keys(TIER_1_GROUP_PORTALS).some(d => host === d || host.endsWith('.' + d))) return 1;
  if (Object.keys(TIER_2_REGIONAL_BOARDS).some(d => host === d || host.endsWith('.' + d))) return 2;

  return 1;
}

export function getInitialJobStatus(
  urlStr: string,
  officialDomain?: string,
  groupDomain?: string,
  customVacancyDomains?: string[]
): 'approved' | 'pending_review' {
  if (isExcludedSourceDomain(urlStr)) return 'pending_review';
  const tier = getSourceTier(urlStr, officialDomain, groupDomain, customVacancyDomains);
  return tier === 2 ? 'pending_review' : 'approved';
}

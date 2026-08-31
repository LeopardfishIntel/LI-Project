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
 *       Search Associates, Schrole, Teacher Horizons, ISS, Webber's Ed, Edvectus, Guardian Jobs,
 *       Teach Away, eTeach, LinkedIn, GaijinPot Jobs, Join.com, Euraxess, eChinaCareers, UN Job List.
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
  'schrole.com': 'Schrole',
  'searchassociates.com': 'Search Associates',
  'teacherhorizons.com': 'Teacher Horizons',
  'iss.edu': 'ISS',
  'webbersed.com': "Webber's Ed",
  'edvectus.com': 'Edvectus',
  'edvectus.co.uk': 'Edvectus UK',
  'teachaway.com': 'Teach Away',
  'eteach.com': 'eTeach',
  'linkedin.com': 'LinkedIn',
  'gaijinpot.com': 'GaijinPot Jobs',
  'join.com': 'Join.com',
  'euraxess.ec.europa.eu': 'Euraxess',
  'echinacareers.com': 'eChinaCareers',
  'unjoblist.org': 'UN Job List',
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
  'nordangliaeducation.com': 'Nord Anglia Career Portal',
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

// ─── TIER 2: SECONDARY REGIONAL BOARDS (FALLBACK ONLY) ──────────────────────

export const TIER_2_REGIONAL_BOARDS: Record<string, string> = {
  'acsi.org': 'ACSI Jobs',
  'montessori-ami.org': 'AMI Jobs',
  'arbetsformedlingen.se': 'Arbetsförmedlingen',
  'edb.gov.hk': 'Direct HK Gov Portal',
  'finn.no': 'Finn.no',
  'gulftalent.com': 'Gulf Talent',
  'ibo.org': 'IB World Schools Board',
  'infojobs.net': 'InfoJobs Spain',
  'jobindex.dk': 'Jobindex Denmark',
  'jobkey.jo': 'Jobkey Jordan',
  'jobsdb.com': 'JobsDB Hong Kong',
  'jobsearch.az': 'JobSearch.az',
  'jobstreet.com': 'JobStreet',
  'jobstreet.com.ph': 'JobStreet Philippines',
  'jobstreet.com.sg': 'JobStreet Singapore',
  'karriere.at': 'Karriere.at',
  'naukri.com': 'Naukri.com',
  'bildungsdirektion-ooe.at': 'Oberösterreich Bildungsdirektion',
  'opetus.fi': 'Opetus.fi',
  'praca.pl': 'Praca.pl',
  'prace.cz': 'Prace.cz',
  'jobs.cz': 'Jobs.cz',
  'moe.gov.sg': 'Singapore MOE Portal',
  'stepstone.de': 'StepStone Germany',
  'tirol.gv.at': 'Tirol.gv.at Job Portal',
  'vdab.be': 'VDAB Belgium',
};

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

  if (host.includes('schrole.com') || cleanSource.includes('schrole')) {
    return { agencyId: 'AGNT_schrole', agencyName: 'Schrole (Confidential Client)' };
  }
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

  if (host.includes('linkedin.com')) {
    const lowerUrl = urlStr.toLowerCase();
    return lowerUrl.includes('/company/') || lowerUrl.includes('/school/');
  }

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
  const tier = getSourceTier(urlStr, officialDomain, groupDomain, customVacancyDomains);
  return tier === 2 ? 'pending_review' : 'approved';
}

/**
 * 🔗 URL RESOLVER & ATS PARENT DOMAIN WHITELIST
 *
 * Enforces Gate 1:
 *   - Fix 1.1: Whitelist ATS Parent Domains (Workday, Lever, Greenhouse, JobTrain, BambooHR, etc.)
 *   - Fix 1.2: Discard Unlinked Agency Landers (Drops generic landers lacking target school identifiers)
 *   - Blocks PDF flyers, PTA pages, student event pages, student conferences, competitions, and non-job news paths.
 */

export interface VerifiedAtsMapping {
  atsPattern: string;
  parentGroupSlugs: string[];
}

const APPROVED_GROUP_SLUGS = [
  'nordanglia', 'nordangliaeducation', 'cognita', 'gems', 'gemseducation',
  'inspired', 'inspirededu', 'aldar', 'aldareducation', 'eim', 'eim-schools',
  'globeducate', 'brightscholar', 'taaleem', 'bloom', 'bloomeducation'
];

export function sanitizeUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  let clean = url.trim();

  clean = clean.split('?utm_')[0].split('&utm_')[0];
  if (clean.endsWith('/')) {
    clean = clean.slice(0, -1);
  }

  return clean;
}

export function isThirdPartyAggregatorUrl(urlStr: string | null | undefined): boolean {
  if (!urlStr) return false;
  const lower = urlStr.toLowerCase();
  return (
    lower.includes('glassdoor.') ||
    lower.includes('indeed.') ||
    lower.includes('linkedin.com/jobs/') ||
    lower.includes('ziprecruiter.') ||
    lower.includes('simplyhired.')
  );
}

export function isBlockedContentUrl(urlStr: string | null | undefined): boolean {
  if (!urlStr) return false;
  const lower = urlStr.toLowerCase();

  if (
    lower.endsWith('.pdf') ||
    lower.includes('.pdf?') ||
    lower.includes('/pdf/') ||
    lower.endsWith('.doc') ||
    lower.endsWith('.docx') ||
    lower.endsWith('.ppt') ||
    lower.endsWith('.pptx')
  ) {
    return true;
  }

  return isThirdPartyAggregatorUrl(urlStr) ||
         lower.includes('vertexaisearch.cloud.google.com') ||
         lower.includes('grounding-api-redirect') ||
         lower.includes('schrole.com/news/') || 
         lower.includes('/blog/') || 
         lower.includes('/news/') ||
         lower.includes('/articles/') ||
         lower.includes('/explore/') ||
         lower.includes('/events/') ||
         lower.includes('/conference') ||
         lower.includes('-conference') ||
         lower.includes('/competition/') ||
         lower.includes('/olympiad/') ||
         lower.includes('/global-perspective/') ||
         lower.includes('/parent-teacher-association') ||
         lower.includes('-pta') ||
         lower.includes('/pta/') ||
         lower.includes('/parent-association') ||
         lower.includes('/alumni') ||
         lower.includes('schrole.com/blog');
}

export function isGenericRootUrl(urlStr: string | null | undefined): boolean {
  if (!urlStr) return false;
  const clean = sanitizeUrl(urlStr);
  if (!clean) return false;

  const lower = clean.toLowerCase();

  if (
    lower.includes('/jobs/search') ||
    lower.includes('/jobs/directory') ||
    lower.includes('/employers/search') ||
    lower.includes('searchassociates.com/jobs')
  ) {
    return true;
  }

  try {
    const parsed = new URL(clean.startsWith('http') ? clean : `https://${clean}`);
    const pathname = parsed.pathname;

    return (
      pathname === '' ||
      pathname === '/' ||
      pathname === '/jobs' ||
      pathname === '/jobs/' ||
      pathname === '/careers' ||
      pathname === '/careers/' ||
      pathname === '/vacancies' ||
      pathname === '/vacancies/' ||
      pathname === '/about/careers' ||
      pathname === '/about/careers/'
    );
  } catch {
    return false;
  }
}

export function isVerifiedAtsParentUrl(urlStr: string, schoolName: string): boolean {
  if (!urlStr) return false;
  const lowerUrl = urlStr.toLowerCase();

  const isAts = [
    'workday.com', 'myworkdayjobs.com', 'lever.co', 'greenhouse.io',
    'jobtrain.co.uk', 'bamboohr.com', 'smartrecruiters.com', 'join.com'
  ].some(domain => lowerUrl.includes(domain));

  if (!isAts) return true;

  const cleanSchoolSlug = schoolName.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (lowerUrl.includes(cleanSchoolSlug)) return true;

  for (const groupSlug of APPROVED_GROUP_SLUGS) {
    if (lowerUrl.includes(groupSlug)) return true;
  }

  return false;
}

export function isUnlinkedAgencyLanderUrl(urlStr: string, schoolName: string): boolean {
  if (!urlStr) return false;
  const lowerUrl = urlStr.toLowerCase();

  const isAgencyDomain = [
    'searchassociates.com', 'teacherhorizons.com', 'edvectus.com',
    'teachaway.com', 'eteach.com'
  ].some(domain => lowerUrl.includes(domain));

  if (!isAgencyDomain) return false;

  const cleanSchoolSlug = schoolName.toLowerCase().replace(/[^a-z0-9]/g, '');
  return !lowerUrl.includes(cleanSchoolSlug);
}

export function extractUrlFromScrapedString(rawJob: string): string | null {
  if (!rawJob) return null;
  const pipeIdx = rawJob.lastIndexOf(' || ');
  if (pipeIdx !== -1) {
    const candidate = rawJob.substring(pipeIdx + 4).trim();
    if (candidate.startsWith('http://') || candidate.startsWith('https://')) {
      return candidate;
    }
  }
  return null;
}

export function resolveVacancyUrl(input: any): string {
  if (typeof input === 'string') {
    return sanitizeUrl(input) || '';
  }
  if (!input) return '';
  const url = input.rawHref || input.employerHref || input.schoolWebsite || '';
  return sanitizeUrl(url) || '';
}

export function hasTemplatePlaceholder(urlStr: string | null | undefined): boolean {
  if (!urlStr) return false;
  return urlStr.includes('{') || urlStr.includes('}') || urlStr.includes('__');
}

export async function verifyJobUrlHttp(urlStr: string): Promise<{ status: 'valid' | 'invalid' | 'unknown' | 'delisted' }> {
  if (!urlStr || isBlockedContentUrl(urlStr)) {
    return { status: 'invalid' };
  }
  return { status: 'valid' };
}

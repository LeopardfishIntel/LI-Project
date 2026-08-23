/**
 * 🛰️ URL RESOLUTION & SANITIZATION PIPELINE
 * Extracts, sanitizes, and verifies live destination URLs from SERP/DOM payloads.
 * Eliminates fragile string template construction (e.g. [slug]-[id]) and enforces sequential fallback.
 */

const TRACKING_QUERY_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
  'ref',
  'source',
  'fbclid',
  'gclid',
  'gclsrc',
  'trk',
  'trackingid',
  'sessionid',
  'redirect_uri',
  'ocid',
  'cmpid'
]);

export const THIRD_PARTY_AGGREGATOR_DOMAINS = [
  'waytogulf.com',
  'optioncarriere.com',
  'optioncarriere',
  'jobrapido.com',
  'jobrapido',
  'jooble.org',
  'jooble.com',
  'bebee.com',
  'whatjobs.com',
  'adzuna.com',
  'adzuna.co.uk',
  'bayt.com',
  'naukrigulf.com',
  'gulftalent.com',
  'monstergulf.com',
  'monster.com',
  'tanqeeb.com',
  'careerjet.com',
  'indeed.com',
  'glassdoor.com',
  'qling.ai',
  'talent.com',
  'neuvoo.com',
  'ziprecruiter.com',
  'drjobs.ae',
  'edarabia.com',
  'learn4good.com',
  'allfreightjobs.com',
  'jora.com',
  'jobstreet.com',
  'schooljobs.in',
  'internationalschoolcommunity.com',
  'linkedin.com',
  'simplyhired.com',
  'jobisjob.com',
  'recruit.net',
  'careeronestop.org',
  'workopolis.com',
  'vertexaisearch.cloud.google.com'
];

/**
 * Checks if a URL originates from a third-party job aggregator (which scrap/mirror phantom listings).
 */
export function isThirdPartyAggregatorUrl(urlStr: string | null | undefined): boolean {
  if (!urlStr) return false;
  const lower = urlStr.toLowerCase();
  return THIRD_PARTY_AGGREGATOR_DOMAINS.some(domain => lower.includes(domain));
}

/**
 * Checks if a URL points to a non-job content page (news articles, blog posts, press releases, or third-party aggregators).
 * Strictly blocks Schrole news, blog articles, and aggregator phantom listings from being ingested as vacancies.
 */
export function isBlockedContentUrl(urlStr: string | null | undefined): boolean {
  if (!urlStr) return false;
  const lower = urlStr.toLowerCase();
  return isThirdPartyAggregatorUrl(urlStr) ||
         lower.includes('schrole.com/news/') || 
         lower.includes('/blog/') || 
         lower.includes('/news/') ||
         lower.includes('/articles/') ||
         lower.includes('schrole.com/blog');
}

/**
 * Checks if a string contains un-hydrated template placeholders.
 */
export function hasTemplatePlaceholder(urlStr: string): boolean {
  if (!urlStr) return false;
  return /\[(slug|id|job-id|title|token|identifier)\]|<(slug|id|job-id|title)>|\{(slug|id|job-id|title)\}/i.test(urlStr);
}

/**
 * Checks if a URL is a generic, unparameterized root directory page.
 */
export function isGenericRootUrl(urlStr: string): boolean {
  if (!urlStr) return true;
  try {
    const parsed = new URL(urlStr);
    const pathClean = parsed.pathname.replace(/\/$/, '');
    
    // Check known generic directories that lack specific school or job context
    if (parsed.hostname.includes('tes.com') && (pathClean === '/jobs/browse/international' || pathClean === '/jobs' || pathClean === '')) {
      return !parsed.searchParams.has('keywords');
    }
    if (parsed.hostname.includes('schrole.com') && (pathClean === '/jobs' || pathClean === '')) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Sanitizes a destination URL:
 * - Strips marketing and tracking parameters
 * - Preserves structural path routes and valid search parameters
 * - Rejects malformed or template placeholder URLs
 */
export function sanitizeUrl(rawUrl: string | null | undefined): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed || hasTemplatePlaceholder(trimmed) || isBlockedContentUrl(trimmed)) return null;

  // Ensure protocol
  let urlToParse = trimmed;
  if (!/^https?:\/\//i.test(urlToParse)) {
    urlToParse = `https://${urlToParse.replace(/^\/\//, '')}`;
  }

  try {
    const parsed = new URL(urlToParse);
    
    // Clean tracking query parameters
    const searchParams = new URLSearchParams(parsed.search);
    const keysToRemove: string[] = [];
    
    searchParams.forEach((_, key) => {
      if (TRACKING_QUERY_PARAMS.has(key.toLowerCase()) || key.toLowerCase().startsWith('utm_')) {
        keysToRemove.push(key);
      }
    });

    keysToRemove.forEach(k => searchParams.delete(k));
    parsed.search = searchParams.toString();

    // Remove tracking fragments
    if (parsed.hash && /#(utm_|tracking|ref_)/i.test(parsed.hash)) {
      parsed.hash = '';
    }

    const finalClean = parsed.toString();
    if (isBlockedContentUrl(finalClean)) return null;
    return finalClean;
  } catch {
    return null;
  }
}

export interface ResolveVacancyUrlOptions {
  rawHref?: string | null;
  employerHref?: string | null;
  searchHref?: string | null;
  schoolWebsite?: string | null;
  schoolName?: string;
  sourceName?: string;
}

/**
 * Resolves the destination URL for a vacancy using a strict sequential fallback hierarchy.
 * Never attempts to guess or concatenate missing slug/id templates.
 */
export function resolveVacancyUrl(options: ResolveVacancyUrlOptions): string {
  const { rawHref, employerHref, searchHref, schoolWebsite, schoolName, sourceName } = options;

  const cleanRawHref = sanitizeUrl(rawHref);
  const isAggregator = cleanRawHref ? isThirdPartyAggregatorUrl(cleanRawHref) : false;
  const cleanSchoolWeb = sanitizeUrl(schoolWebsite);
  const cleanEmployerHref = sanitizeUrl(employerHref);
  const cleanSearchHref = sanitizeUrl(searchHref);

  // 1. Direct Non-Aggregator Link (Official School ATS, verified direct advert, TES direct link)
  if (cleanRawHref && !isGenericRootUrl(cleanRawHref) && !isAggregator) {
    return cleanRawHref;
  }

  // 2. Official School Website / Careers Page (Prioritized above aggregators)
  if (cleanSchoolWeb) {
    return cleanSchoolWeb;
  }

  // 3. Official TES Employer Hub Link
  if (cleanEmployerHref && !isGenericRootUrl(cleanEmployerHref)) {
    return cleanEmployerHref;
  }

  // 4. Fallback to raw aggregator link if no school website is available
  if (cleanRawHref && !isGenericRootUrl(cleanRawHref)) {
    return cleanRawHref;
  }

  // 5. Parameterized Search Query Link
  if (cleanSearchHref) {
    return cleanSearchHref;
  }

  // 6. Targeted TES / Google Search Fallback
  const targetSchool = (schoolName || '').trim();
  const targetSource = (sourceName || 'vacancies').trim();

  if (targetSource.toLowerCase().includes('tes') && targetSchool) {
    return `https://www.tes.com/jobs/browse/international?keywords=${encodeURIComponent(targetSchool)}`;
  }

  if (targetSchool) {
    return `https://www.google.com/search?q=${encodeURIComponent(`${targetSchool} ${targetSource}`)}`;
  }

  return 'https://www.google.com';
}

/**
 * Extracts raw destination URL appended to vacancy strings (e.g. formatted with double pipe ' || ').
 */
export function extractUrlFromScrapedString(rawJobString: string): { cleanJobString: string; extractedUrl: string | null } {
  if (!rawJobString) return { cleanJobString: '', extractedUrl: null };

  const pipeIdx = rawJobString.lastIndexOf(' || ');
  if (pipeIdx !== -1) {
    const cleanJobString = rawJobString.substring(0, pipeIdx).trim();
    const rawUrl = rawJobString.substring(pipeIdx + 4).trim();
    return {
      cleanJobString,
      extractedUrl: sanitizeUrl(rawUrl)
    };
  }

  return {
    cleanJobString: rawJobString.trim(),
    extractedUrl: null
  };
}


/**
 * Computes a quality/priority score for a destination application URL.
 * Prioritizes Official School Websites and TES over generic third-party aggregator mirrors.
 * Score range:
 * - 100: Official School Website (matching school domain) or direct School ATS (SchoolRecruiter, Schrole, SearchAssociates)
 * - 90: Direct TES Vacancy (tes.com/jobs/vacancy/...)
 * - 85: Direct TES Employer Hub (tes.com/jobs/employer/...)
 * - 80: TES Parameterized Search (tes.com/jobs/browse/...)
 * - 50: Standard verified portal
 * - 10: Aggregators / mirrors (Indeed, LinkedIn, Glassdoor, etc.)
 */
export function getUrlSourceScore(url: string | null | undefined, schoolWebsite?: string | null): number {
  if (!url) return 0;
  const lower = url.toLowerCase();

  // 1. Official School Website Domain match
  if (schoolWebsite) {
    try {
      const cleanSchoolWeb = schoolWebsite.startsWith('http') ? schoolWebsite : `https://${schoolWebsite}`;
      const schoolHost = new URL(cleanSchoolWeb).hostname.replace(/^www\./, '');
      if (schoolHost && lower.includes(schoolHost)) {
        return 100;
      }
    } catch {}
  }

  // 2. Direct School ATS Platforms
  if (lower.includes('schoolrecruiter.com') || 
      lower.includes('schrole.com/jobs/') || 
      lower.includes('searchassociates.com') || 
      lower.includes('veracross.com') || 
      lower.includes('openapply.com')) {
    return 95;
  }

  // 3. TES Direct Vacancies
  if (lower.includes('tes.com/jobs/vacancy/')) {
    return 90;
  }

  // 4. TES Employer Hub
  if (lower.includes('tes.com/jobs/employer/')) {
    return 85;
  }

  // 5. TES International Search
  if (lower.includes('tes.com')) {
    return 80;
  }

  // 6. Deprioritized Aggregators
  if (isThirdPartyAggregatorUrl(url)) {
    return 10;
  }

  return 50;
}

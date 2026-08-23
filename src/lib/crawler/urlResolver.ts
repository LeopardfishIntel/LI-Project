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
  'tanqeeb.com',
  'careerjet.com',
  'indeed.com',
  'glassdoor.com',
  'qling.ai',
  'talent.com',
  'neuvoo.com',
  'ziprecruiter.com',
  'drjobs.ae',
  'edarabia.com/jobs',
  'learn4good.com',
  'allfreightjobs.com'
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

  // 1. Direct Advert Link (Tier 1)
  const cleanRawHref = sanitizeUrl(rawHref);
  if (cleanRawHref && !isGenericRootUrl(cleanRawHref)) {
    return cleanRawHref;
  }

  // 2. Employer Hub Link (Tier 2)
  const cleanEmployerHref = sanitizeUrl(employerHref);
  if (cleanEmployerHref && !isGenericRootUrl(cleanEmployerHref)) {
    return cleanEmployerHref;
  }

  // 3. Search Query Link (Tier 3)
  const cleanSearchHref = sanitizeUrl(searchHref);
  if (cleanSearchHref) {
    return cleanSearchHref;
  }

  // 4. Official School Website Landing Page
  const cleanSchoolWeb = sanitizeUrl(schoolWebsite);
  if (cleanSchoolWeb) {
    return cleanSchoolWeb;
  }

  // 5. Targeted Query Fallback (Search Engine)
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

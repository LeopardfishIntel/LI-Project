/**
 * 🌐 LANDING PAGE CRAWLER & DEEP DOM TRACER
 *
 * Renders target careers URLs via Playwright, lock-inspects the target DOM payload,
 * extracts JobPosting JSON-LD schemas, and traces verified child vacancy links.
 * Enforces Step 3/4 Deep DOM & Signal Inspection (requires valid academic position headings & advert signals).
 */

import { scrapePage } from "./scraperEngine";
import { extractJobPostingsFromHtml } from "./adaptors/tes-adaptor";
import { sanitizeUrl, isBlockedContentUrl } from "./urlResolver";
import type { AdaptorInput, RawJobRecord } from "./adaptors/raw-job.types";
import { isSupportOrNonTeachingRole } from "./roleClassifier";
import { hasClosedPositionNegativeBanner, hasJobAdvertSignals } from "./adaptors/adaptor-utils";

const VACANCY_PATH_PATTERNS = [
  /\/jobs?\//i,
  /\/vacanc(y|ies)\//i,
  /\/career(s)?\//i,
  /\/position(s)?\//i,
  /\/openings?\//i,
  /\/employment\//i,
  /\/apply\//i,
  /\/job-detail/i,
];

const VACANCY_TITLE_KEYWORDS = [
  'teacher',
  'head of',
  'director',
  'principal',
  'coordinator',
  'lead',
  'nursery',
  'early years',
  'primary',
  'secondary',
  'mathematics',
  'physics',
  'chemistry',
  'biology',
  'science',
  'english',
  'humanities',
  'art',
  'music',
  'pe',
  'drama',
];

const ATS_DOMAINS = [
  'workday.com',
  'myworkdayjobs.com',
  'lever.co',
  'greenhouse.io',
  'jobtrain.co.uk',
  'bamboohr.com',
  'smartrecruiters.com',
  'schoolrecruiter.com',
  'join.com',
  'tes.com',
  'schrole.com',
  'searchassociates.com',
  'teacherhorizons.com',
  'edvectus.com',
  'teachaway.com',
  'eteach.com',
];

export function isCandidateVacancyUrl(href: string, anchorText: string): boolean {
  if (!href || isBlockedContentUrl(href)) return false;
  const lowerUrl = href.toLowerCase();
  const lowerText = anchorText.toLowerCase();

  // Exclude self-references / hashes / generic headers / PTA / Alumni
  if (
    lowerUrl.endsWith('#') ||
    lowerUrl.includes('/about-us') ||
    lowerUrl.includes('/contact-us') ||
    lowerUrl.includes('/site-map') ||
    lowerUrl.includes('/staff-directory') ||
    lowerUrl.includes('/social-media-directory') ||
    lowerUrl.includes('/admissions') ||
    lowerUrl.includes('/parent-teacher-association') ||
    lowerUrl.includes('/pta') ||
    lowerUrl.includes('/alumni') ||
    lowerUrl.includes('/parent-association') ||
    lowerText.includes('parent teacher association') ||
    lowerText.includes('pta')
  ) {
    return false;
  }

  // Match ATS & Portal domains directly
  if (ATS_DOMAINS.some(domain => lowerUrl.includes(domain))) return true;

  // Match URL path patterns
  if (VACANCY_PATH_PATTERNS.some(pat => pat.test(lowerUrl))) return true;

  // Match anchor text title keywords
  if (VACANCY_TITLE_KEYWORDS.some(kw => lowerText.includes(kw))) return true;

  return false;
}

export async function crawlCareersLandingPage(
  landingPageUrl: string,
  input: AdaptorInput
): Promise<RawJobRecord[]> {
  console.log(`🌐 [LANDING PAGE CRAWLER] Rendering landing page for ${input.schoolName}: ${landingPageUrl}`);

  const mainResult = await scrapePage(landingPageUrl, { timeoutMs: 25000, blockResources: true });
  if (!mainResult.success || mainResult.isBlocked) {
    console.warn(`🌐 [LANDING PAGE CRAWLER] Main landing page scrape failed or blocked: ${landingPageUrl}`);
    return [];
  }

  // Step 4 Signal Check: Negative closed position banner on main page
  if (hasClosedPositionNegativeBanner(mainResult.html)) {
    console.log(`🌐 [LANDING PAGE CRAWLER] Negative closed position banner detected on ${landingPageUrl}. Discarding page.`);
    return [];
  }

  const records: RawJobRecord[] = [];
  const seenUrls = new Set<string>();

  // 1. Inspect direct JSON-LD schema objects on main landing page
  if (mainResult.html) {
    const jsonLdPostings = extractJobPostingsFromHtml(mainResult.html);
    for (const posting of jsonLdPostings) {
      const title = (posting.title || posting.name || '').trim();
      const rawUrl = posting.url || posting.identifier || landingPageUrl;
      const cleanUrl = sanitizeUrl(rawUrl);

      if (title && cleanUrl && !isSupportOrNonTeachingRole(title)) {
        if (seenUrls.has(cleanUrl)) continue;
        seenUrls.add(cleanUrl);

        records.push({
          rawTitle: title,
          applyUrl: cleanUrl,
          source: 'School Web Landing Page',
          datePosted: posting.datePosted || null,
          closingDate: posting.validThrough || null,
          schoolId: input.schoolId,
          schoolName: input.schoolName,
          city: input.city,
          country: input.country,
          status: 'approved',
        });
      }
    }
  }

  // 2. Extract child links and trace down individual vacancy sub-pages / ATS portals
  const childLinks = mainResult.links.filter(l => isCandidateVacancyUrl(l.href, l.text));
  console.log(`🌐 [LANDING PAGE CRAWLER] Extracted ${childLinks.length} candidate child vacancy / ATS links from landing page.`);

  const targetLinks = childLinks.slice(0, 25);

  for (const link of targetLinks) {
    const cleanSubUrl = sanitizeUrl(link.href);
    if (!cleanSubUrl || seenUrls.has(cleanSubUrl)) continue;
    seenUrls.add(cleanSubUrl);

    // If link points directly to an ATS portal (e.g. Lever, Greenhouse, Workday, BambooHR), ingest directly!
    const isAtsUrl = ATS_DOMAINS.some(d => cleanSubUrl.toLowerCase().includes(d));
    if (isAtsUrl) {
      const title = link.text.replace(/apply|click here|view job|details/i, '').trim();
      if (title && title.length >= 4 && !isSupportOrNonTeachingRole(title)) {
        records.push({
          rawTitle: title,
          applyUrl: cleanSubUrl,
          source: 'School ATS Portal',
          datePosted: null,
          closingDate: null,
          schoolId: input.schoolId,
          schoolName: input.schoolName,
          city: input.city,
          country: input.country,
          status: 'approved',
        });
        continue;
      }
    }

    console.log(`🌐 [LANDING PAGE CRAWLER] Tracing sub-page: ${cleanSubUrl}`);
    const subResult = await scrapePage(cleanSubUrl, { timeoutMs: 15000, blockResources: true });
    if (!subResult.success || subResult.isBlocked) continue;

    // Check negative closed banner on subpage
    if (hasClosedPositionNegativeBanner(subResult.html)) continue;

    // Check JSON-LD on sub-page
    let foundSubPosting = false;
    if (subResult.html) {
      const subPostings = extractJobPostingsFromHtml(subResult.html);
      for (const posting of subPostings) {
        const title = (posting.title || posting.name || link.text || '').trim();
        if (title && title.length >= 4 && !isSupportOrNonTeachingRole(title)) {
          records.push({
            rawTitle: title,
            applyUrl: cleanSubUrl,
            source: 'School Web',
            datePosted: posting.datePosted || null,
            closingDate: posting.validThrough || null,
            schoolId: input.schoolId,
            schoolName: input.schoolName,
            city: input.city,
            country: input.country,
            status: 'approved',
          });
          foundSubPosting = true;
        }
      }
    }

    // Fallback: Verify sub-page HTML contains explicit job advert signals (closing date, start date, apply)
    if (!foundSubPosting) {
      const candidateTitle = link.text.trim() || subResult.title || '';
      const cleanTitle = candidateTitle
        .replace(/\|.*$/g, '')
        .replace(/-.*$/g, '')
        .trim();

      const hasAdvertSignals = hasJobAdvertSignals(subResult.html);

      if (hasAdvertSignals && cleanTitle && cleanTitle.length >= 4 && !isSupportOrNonTeachingRole(cleanTitle)) {
        records.push({
          rawTitle: cleanTitle,
          applyUrl: cleanSubUrl,
          source: 'School Web',
          datePosted: null,
          closingDate: null,
          schoolId: input.schoolId,
          schoolName: input.schoolName,
          city: input.city,
          country: input.country,
          status: 'approved',
        });
      } else if (!hasAdvertSignals) {
        console.log(`🌐 [LANDING PAGE CRAWLER] Discarded non-advert sub-page: ${cleanSubUrl} (Missing closing date / apply signals)`);
      }
    }
  }

  console.log(`🌐 [LANDING PAGE CRAWLER] Completed deep-link trace. Emitting ${records.length} record(s).`);
  return records;
}

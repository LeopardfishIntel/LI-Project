/**
 * 🌐 LANDING PAGE CRAWLER & DEEP DOM TRACER
 *
 * Renders target careers URLs via Playwright, lock-inspects the target DOM payload,
 * extracts JobPosting JSON-LD schemas, direct PDF vacancy links, and traces verified child vacancy links.
 * Enforces Step 3/4 Deep DOM & Signal Inspection (requires valid academic position headings & advert signals).
 */

import * as cheerio from "cheerio";
import { scrapePage } from "./scraperEngine";
import { extractJobPostingsFromHtml } from "./adaptors/tes-adaptor";
import { sanitizeUrl, isBlockedContentUrl } from "./urlResolver";
import type { AdaptorInput, RawJobRecord } from "./adaptors/raw-job.types";
import { isSupportOrNonTeachingRole, isStrictAcademicTeachingRole } from "./roleClassifier";
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
  /name=jobs/i,
  /name=vacanc/i,
];

const VACANCY_TITLE_KEYWORDS = [
  'teacher',
  'teacher of',
  'head of',
  'principal',
  'deputy head',
  'vice principal',
  'assistant head',
  'coordinator',
  'counselor',
  'counsellor',
  'educator',
  'instructor',
  'librarian',
  'homeroom',
  'teaching vacancy',
  'academic vacancy',
  'faculty vacancy',
  'job vacancy',
  'open position',
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

const BLOCKED_SUBPATHS = [
  '/about-us',
  '/about/',
  '/welcome',
  '/head-welcome',
  '/principal-welcome',
  '/history',
  '/our-heritage',
  '/governance',
  '/leadership-team',
  '/school-management',
  '/campus/',
  '/dover-campus',
  '/east-campus',
  '/contact-us',
  '/site-map',
  '/staff-directory',
  '/social-media-directory',
  '/admissions',
  '/parent-teacher-association',
  '/pta',
  '/alumni',
  '/parent-association',
  '/giving/',
  '/student-life/',
  '/community/',
  '/learning/',
  '/news/',
  '/blog/',
  '/events/',
  '/gallery/',
  '/faculty/',
  '/our-team/',
  '/team/',
  '/meet-the-team/',
  'youtube.com',
  'vimeo.com',
  'linkedin.com',
  'facebook.com',
  'instagram.com',
  'twitter.com',
  'veracross.eu',
];

export function isCandidateVacancyUrl(href: string, anchorText: string): boolean {
  if (!href || isBlockedContentUrl(href)) return false;
  const lowerUrl = href.toLowerCase();
  const lowerText = anchorText.toLowerCase().trim();

  // Exclude self-references, hashes, or known non-vacancy subpaths
  if (lowerUrl.endsWith('#') || BLOCKED_SUBPATHS.some(path => lowerUrl.includes(path))) {
    return false;
  }

  // Exclude conversational phrases & generic directory/portal links
  if (
    lowerText.includes('head welcome') ||
    lowerText.includes("head's welcome") ||
    lowerText.includes('from the head') ||
    lowerText.includes('from the principal') ||
    lowerText.includes('message from') ||
    lowerText.includes('welcome to') ||
    lowerText.includes('welcome from') ||
    lowerText.includes('parent teacher association') ||
    lowerText.includes('pta') ||
    lowerText.includes('search jobs') ||
    lowerText.includes('view all') ||
    lowerText.includes('work with us') ||
    lowerText.includes('join our team') ||
    lowerText.includes('jobs and tenders') ||
    lowerText.includes('tenders') ||
    lowerText.includes('(opens in new window/tab)')
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

/**
 * Resolves a potentially relative URL against the base URL.
 */
function resolveUrl(relativeOrAbsolute: string, baseUrl: string): string {
  try {
    return new URL(relativeOrAbsolute, baseUrl).toString();
  } catch {
    return relativeOrAbsolute;
  }
}

/**
 * Cleans extracted job title string.
 */
function cleanExtractedTitle(raw: string): string {
  return raw
    .replace(/\s+/g, ' ')
    .replace(/^(download|view|pdf|details|spec|job description|apply for|click here)\s*[:\-–]?\s*/i, '')
    .replace(/\s*[:\-–]?\s*(download|pdf|view spec|details|spec|application form)$/i, '')
    .replace(/\.pdf$/i, '')
    .replace(/[-_]+/g, ' ')
    .trim();
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
      const title = cleanExtractedTitle(posting.title || posting.name || '');
      const rawUrl = posting.url || posting.identifier || landingPageUrl;
      const cleanUrl = sanitizeUrl(rawUrl);

      if (title && cleanUrl && isStrictAcademicTeachingRole(title) && !isSupportOrNonTeachingRole(title)) {
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

  // 2. DOM Scoping with Cheerio: Strip Navigation, Headers, Footers, and Menus
  const $ = cheerio.load(mainResult.html || '');
  $('nav, header, footer, .menu, .navbar, .site-header, .site-footer, .sidebar-nav, .breadcrumbs, noscript, script, style, .header-navigation, .main-navigation').remove();

  // 3. Extract Direct PDF & Static Document Vacancies (e.g. St Stephen's College)
  $('a[href]').each((_, el) => {
    const rawHref = $(el).attr('href') || '';
    if (!rawHref) return;

    const lowerHref = rawHref.toLowerCase();
    const isDocLink = lowerHref.endsWith('.pdf') || lowerHref.endsWith('.docx') || lowerHref.includes('.pdf?') || lowerHref.includes('.docx?');
    if (!isDocLink) return;

    const fullDocUrl = resolveUrl(rawHref, landingPageUrl);
    const cleanDocUrl = sanitizeUrl(fullDocUrl);
    if (!cleanDocUrl || seenUrls.has(cleanDocUrl)) return;

    let candidateTitle = cleanExtractedTitle($(el).text());

    // If anchor text is generic ("Download", "PDF", "Click Here", "Details"), inspect table row or parent container
    if (!candidateTitle || candidateTitle.length < 5 || /^(download|pdf|view|details|link|form|click|apply)$/i.test(candidateTitle)) {
      const parentRow = $(el).closest('tr');
      if (parentRow.length > 0) {
        // Look in preceding <td> cells in the same row
        const rowTexts: string[] = [];
        parentRow.find('td, th').each((__, cell) => {
          const text = $(cell).text().trim();
          if (text && !text.toLowerCase().includes('download') && !text.toLowerCase().includes('pdf')) {
            rowTexts.push(text);
          }
        });
        if (rowTexts.length > 0) {
          candidateTitle = cleanExtractedTitle(rowTexts[0]);
        }
      } else {
        const parentLi = $(el).closest('li, p, div');
        if (parentLi.length > 0) {
          const fullText = parentLi.text().replace($(el).text(), '').trim();
          if (fullText.length >= 5) {
            candidateTitle = cleanExtractedTitle(fullText);
          }
        }
      }
    }

    // Also fallback to URL filename if meaningful (e.g. "Maths_Teacher_2026.pdf")
    if (!candidateTitle || candidateTitle.length < 5) {
      const fileNameMatch = rawHref.split('/').pop()?.split('?')[0];
      if (fileNameMatch) {
        candidateTitle = cleanExtractedTitle(fileNameMatch);
      }
    }

    if (candidateTitle && isStrictAcademicTeachingRole(candidateTitle) && !isSupportOrNonTeachingRole(candidateTitle)) {
      seenUrls.add(cleanDocUrl);
      records.push({
        rawTitle: candidateTitle,
        applyUrl: cleanDocUrl,
        source: 'School Web',
        datePosted: null,
        closingDate: null,
        schoolId: input.schoolId,
        schoolName: input.schoolName,
        city: input.city,
        country: input.country,
        status: 'approved',
      });
      console.log(`📄 [LANDING PAGE CRAWLER] Captured direct PDF vacancy: "${candidateTitle}" -> ${cleanDocUrl}`);
    }
  });

  // 4. Extract child links from content-scoped DOM and trace down sub-pages / ATS portals
  const contentLinks: { href: string; text: string }[] = [];
  $('a[href]').each((_, el) => {
    const rawHref = $(el).attr('href') || '';
    const text = $(el).text().trim();
    if (rawHref) {
      const fullUrl = resolveUrl(rawHref, landingPageUrl);
      if (fullUrl.startsWith('http')) {
        contentLinks.push({ href: fullUrl, text });
      }
    }
  });

  const childLinks = contentLinks.filter(l => isCandidateVacancyUrl(l.href, l.text));
  console.log(`🌐 [LANDING PAGE CRAWLER] Extracted ${childLinks.length} scoped candidate child vacancy / ATS links.`);

  const targetLinks = childLinks.slice(0, 25);

  for (const link of targetLinks) {
    const cleanSubUrl = sanitizeUrl(link.href);
    if (!cleanSubUrl || seenUrls.has(cleanSubUrl)) continue;
    seenUrls.add(cleanSubUrl);

    // If link points directly to an ATS portal, verify title and ingest directly
    const isAtsUrl = ATS_DOMAINS.some(d => cleanSubUrl.toLowerCase().includes(d));
    if (isAtsUrl) {
      const title = cleanExtractedTitle(link.text.replace(/apply|click here|view job|details/i, ''));
      if (title && isStrictAcademicTeachingRole(title) && !isSupportOrNonTeachingRole(title)) {
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
        const title = cleanExtractedTitle(posting.title || posting.name || link.text || '');
        if (title && isStrictAcademicTeachingRole(title) && !isSupportOrNonTeachingRole(title)) {
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
      const candidateTitle = cleanExtractedTitle(
        (link.text.trim() || subResult.title || '')
          .replace(/\|.*$/g, '')
          .replace(/-.*$/g, '')
      );

      const hasAdvertSignals = hasJobAdvertSignals(subResult.html);

      if (hasAdvertSignals && isStrictAcademicTeachingRole(candidateTitle) && !isSupportOrNonTeachingRole(candidateTitle)) {
        records.push({
          rawTitle: candidateTitle,
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
        console.log(`🌐 [LANDING PAGE CRAWLER] Discarded non-advert sub-page: ${cleanSubUrl} (Missing multi-category advert signals)`);
      }
    }
  }

  console.log(`🌐 [LANDING PAGE CRAWLER] Completed deep-link trace. Emitting ${records.length} record(s).`);
  return records;
}


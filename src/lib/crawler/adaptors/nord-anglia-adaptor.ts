/**
 * 🦁 NORD ANGLIA EDUCATION ENGINE ADAPTOR (SAP SUCCESSFACTORS PORTAL)
 *
 * Queries Nord Anglia's official SAP SuccessFactors Career Site Builder portal
 * using direct location parameters (`locationsearch=City/Country`), extracts
 * verified job requisition links, deep-scrapes selection process paragraphs for
 * application deadlines, and derives clean short titles (≤ 60 chars).
 */

import type { AdaptorInput, RawJobRecord } from "./raw-job.types";
import { isSupportOrNonTeachingRole } from "../roleClassifier";
import { sanitizeUrl } from "../urlResolver";

const NAE_CAREERS_BASE = "https://careers.nordanglia.com";

/**
 * 🎯 ENFORCES SHORT JOB TITLE ONLY (Capped at 60 Characters Maximum)
 */
export function cleanNordAngliaJobTitle(rawTitle: string): string {
  if (!rawTitle) return '';
  let clean = rawTitle.trim();

  // Strip generic "View all vacancies at ..." links
  if (/^view\s+all\s+vacancies/i.test(clean) || /^share\s+your\s+profile/i.test(clean)) {
    return '';
  }

  // Separate concatenated camel-case boundaries
  clean = clean.replace(/([a-z])([A-Z])/g, '$1 $2');

  // Strip location concatenations, group names & boilerplate text
  clean = clean.split(/Nord Anglia Education|Nord Anglia|NAE|Abu Dhabi|Dubai|Geneva|Madrid|Budapest|Warsaw|Prague|Doha|Hanoi|Ho Chi Minh|Chengdu|Villars|Amman|Kwun Tong/i)[0].trim();
  clean = clean.split(/are currently seeking|is currently seeking|is seeking|seeking to appoint|seeking an outstanding|The Opportunity|Due to the|Reports to|Responsibilities|Qualifications|Salary|Location|Contract|Full Time|Part Time/i)[0].trim();

  // Strip start date / month suffixes
  clean = clean.split(/-\s*(?:Immediate|October|August|Sept(?:ember)?|Jan(?:uary)?|April|May|June|July|November|December)\s*(?:start|\d{4})?/i)[0].trim();
  clean = clean.replace(/(?:-|\s+)(?:Immediate\s+Start|October\s+start|August\s+\d{4}|Sept(?:ember)?\s+\d{4}).*$/i, '').trim();

  // Clean up trailing dashes and extra spaces
  clean = clean.replace(/[-,\s]+$/, '').replace(/\s+/g, ' ').trim();

  // STRICT 60-CHARACTER MAXIMUM LENGTH CAP
  if (clean.length > 60) {
    clean = clean.substring(0, 60).replace(/[-,\s]+$/, '').trim();
  }

  return clean || rawTitle.trim().substring(0, 60);
}

/**
 * 📅 DEEP EXTRACT CLOSING DATE FROM SELECTION PROCESS PARAGRAPH
 */
export function extractNordAngliaClosingDate(pageText: string): string | null {
  if (!pageText) return null;

  const patterns = [
    /(?:closing\s+date|application\s+deadline|apply\s+by|closing\s+on)(?:\s+for\s+applications?)?\s+(?:is|:|-|\s)\s*([0-9]{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+\s+[0-9]{4})/i,
    /(?:closing\s+date|application\s+deadline|apply\s+by|closing\s+on)(?:\s+for\s+applications?)?\s+(?:is|:|-|\s)\s*([A-Za-z]+\s+[0-9]{1,2}(?:st|nd|rd|th)?,?\s+[0-9]{4})/i,
    /([0-9]{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+\s+[0-9]{4})\s*(?:is|as)?\s*(?:the\s+)?(?:closing\s+date|deadline)/i,
    /(?:closing\s+date|application\s+deadline)\s*[:\-\s]+\s*([0-9]{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+)/i,
  ];

  for (const pattern of patterns) {
    const match = pageText.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
}

export const NAE_SCHOOL_REGISTRY: Array<{ id: string; name: string; patterns: RegExp[] }> = [
  { id: "FLIS0006", name: "Amman Academy", patterns: [/amman\s+academy/i] },
  { id: "FLIS0034", name: "Leman Chengdu", patterns: [/leman\s+international|leman\s+chengdu/i] },
  { id: "FLIS0055", name: "Beau Soleil", patterns: [/beau\s+soleil/i] },
  { id: "FLIS0063", name: "Int'l College Spain", patterns: [/international\s+college\s+spain|ics\s+madrid/i] },
  { id: "FLIS0072", name: "College du Leman", patterns: [/college\s+du\s+leman|cdl\s+geneva/i] },
  { id: "FLIS0084", name: "British Int'l Budapest", patterns: [/british\s+international\s+school\s+budapest|british\s+int'?l\s+budapest/i] },
  { id: "FLIS0098", name: "British International School Abu Dhabi", patterns: [/british\s+international\s+school\s+abu\s+dhabi|bis\s*abu\s*dhabi|bisad/i] },
  { id: "FLIS0099", name: "Nord Anglia International School Abu Dhabi", patterns: [/nord\s+anglia\s+international\s+school\s+abu\s+dhabi|nas\s+abu\s+dhabi/i] },
  { id: "FLIS0106", name: "Nord Anglia International School Dubai", patterns: [/nord\s+anglia\s+international\s+school\s+dubai|nas\s+dubai/i] },
  { id: "FLIS0112", name: "Compass International School Doha", patterns: [/compass\s+international\s+school/i] },
  { id: "FLIS0113", name: "Etqan Global Academy", patterns: [/etqan\s+global\s+academy/i] },
  { id: "FLIS0127", name: "British International School Hanoi", patterns: [/british\s+international\s+school\s+hanoi|bis\s+hanoi/i] },
  { id: "FLIS0128", name: "British International School Ho Chi Minh City", patterns: [/british\s+international\s+school\s+ho\s+chi\s+minh|bis\s+hcmc|bis\s+ho\s+chi\s+minh/i] },
  { id: "FLIS0163", name: "British International School Warsaw", patterns: [/british\s+international\s+school\s+warsaw|bis\s+warsaw/i] },
  { id: "FLIS0166", name: "Prague British International School", patterns: [/prague\s+british\s+international\s+school|pbis\s+prague/i] },
  { id: "FLIS0345", name: "Swiss International Scientific School in Dubai", patterns: [/swiss\s+international\s+scientific\s+school|sisd/i] },
  { id: "FLIS0380", name: "The British International School of Kuala Lumpur", patterns: [/british\s+international\s+school\s+of\s+kuala\s+lumpur|bskl/i] },
  { id: "FLIS0401", name: "St. Andrews International School Bangkok", patterns: [/st\.?\s*andrews\s+international\s+school\s+bangkok/i] },
  { id: "FLIS0411", name: "College Alpin Beau Soleil", patterns: [/college\s+alpin\s+beau\s+soleil|beau\s+soleil/i] },
  { id: "FLIS0427", name: "The British International School Bratislava", patterns: [/british\s+international\s+school\s+bratislava|bis\s+bratislava/i] },
  { id: "FLIS0430", name: "The British School of Tashkent", patterns: [/british\s+school\s+of\s+tashkent|bst\s+tashkent/i] },
  { id: "FLIS0438", name: "The British School of Guangzhou", patterns: [/british\s+school\s+of\s+guangzhou|bsg\s+guangzhou/i] },
  { id: "FLIS0444", name: "The British School of Beijing Sanlitun", patterns: [/british\s+school\s+of\s+beijing\s+sanlitun|bsb\s+sanlitun/i] },
  { id: "FLIS0457", name: "British Vietnamese International School Ho Chi Minh City", patterns: [/british\s+vietnamese\s+international\s+school\s+ho\s+chi\s+minh|bvis\s+hcmc|bvis\s+ho\s+chi\s+minh/i] },
  { id: "FLIS0458", name: "British Vietnamese International School Hanoi", patterns: [/british\s+vietnamese\s+international\s+school\s+hanoi|bvis\s+hanoi/i] }
];

export function resolveNordAngliaSchool(pageText: string): { id: string; name: string } | null {
  const schoolMatch = pageText.match(/School:\s*([^\n\r]+)/i);
  const targetText = schoolMatch ? schoolMatch[1] : pageText;

  for (const entry of NAE_SCHOOL_REGISTRY) {
    for (const pat of entry.patterns) {
      if (pat.test(targetText)) {
        return { id: entry.id, name: entry.name };
      }
    }
  }

  // Fallback scan of full text
  if (schoolMatch) {
    for (const entry of NAE_SCHOOL_REGISTRY) {
      for (const pat of entry.patterns) {
        if (pat.test(pageText)) {
          return { id: entry.id, name: entry.name };
        }
      }
    }
  }

  return null;
}

export async function runNordAngliaAdaptor(input: AdaptorInput): Promise<RawJobRecord[]> {
  const searchTerm = input.city || input.country || input.schoolName;
  if (!searchTerm) return [];

  // 🛡️ Gate: Never run Nord Anglia adaptor on GEMS, Braeburn, or non-Nord Anglia schools
  const sGroup = (input.schoolName || "").toLowerCase();
  if (sGroup.includes("gems") || sGroup.includes("braeburn") || sGroup.includes("kings college")) {
    console.log(`🛑 [NORD ANGLIA ENGINE] Skipped non-Nord Anglia school: ${input.schoolName}`);
    return [];
  }

  const searchUrl = `${NAE_CAREERS_BASE}/search/?q=&locationsearch=${encodeURIComponent(searchTerm)}`;
  console.log(`🦁 [NORD ANGLIA ENGINE] Querying SAP SuccessFactors for ${input.schoolName} (${searchTerm}): ${searchUrl}`);

  try {
    const { chromium } = await import("playwright");
    const browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });
    const page = await browser.newPage();

    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 18000 });
    await page.waitForTimeout(1000);

    const rawItems = await page.$$eval('a[href*="/job/"]', links =>
      links.map(a => ({
        title: (a.textContent || '').trim(),
        href: (a as HTMLAnchorElement).href,
      }))
    );

    const records: RawJobRecord[] = [];
    const seenUrls = new Set<string>();

    const targetCitySlug = (input.city || "").toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
    const targetCountrySlug = (input.country || "").toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");

    for (const item of rawItems) {
      const cleanUrl = sanitizeUrl(item.href);
      if (!cleanUrl || seenUrls.has(cleanUrl)) continue;

      const title = cleanNordAngliaJobTitle(item.title);
      if (!title || isSupportOrNonTeachingRole(title) || isSupportOrNonTeachingRole(item.title)) continue;

      // 🛡️ Gate 1: URL Location Verification (Reject global search fallbacks)
      const urlLower = cleanUrl.toLowerCase();
      const matchesCity = targetCitySlug && (urlLower.includes(`/${targetCitySlug}-`) || urlLower.includes(`-${targetCitySlug}-`) || urlLower.includes(`/${targetCitySlug}/`));
      const matchesCountry = targetCountrySlug && (urlLower.includes(`/${targetCountrySlug}-`) || urlLower.includes(`-${targetCountrySlug}-`));

      // Check common aliases (e.g. Ho Chi Minh -> HCMC, UAE -> Dubai / Abu Dhabi)
      const isUaeMatch = (targetCountrySlug.includes("emirates") || targetCitySlug.includes("dubai") || targetCitySlug.includes("abu-dhabi")) &&
                         (urlLower.includes("/dubai-") || urlLower.includes("/abu-dhabi-"));
      const isHcmcMatch = (targetCitySlug.includes("ho-chi-minh") || targetCitySlug.includes("hcmc")) &&
                          (urlLower.includes("ho-chi-minh") || urlLower.includes("hcmc"));

      if (!matchesCity && !matchesCountry && !isUaeMatch && !isHcmcMatch) {
        // Global search fallback detected; skip foreign location job
        continue;
      }

      seenUrls.add(cleanUrl);

      // Deep scrape job detail page for exact school entity, closing date & verify active status
      let closingDate: string | null = null;
      let isLive = true;
      let targetSchoolId = input.schoolId;
      let targetSchoolName = input.schoolName;
      let jobStatus: 'approved' | 'pending_review' = 'approved';

      try {
        const detailPage = await browser.newPage();
        const resp = await detailPage.goto(cleanUrl, { waitUntil: "domcontentloaded", timeout: 12000 });
        if (resp?.status() === 404) {
          isLive = false;
        } else {
          const detailText = await detailPage.evaluate(() => document.body.innerText || "");
          
          // Check if vacancy is active or expired/closed
          const hasActiveTokens = detailText.includes("Apply now") || detailText.includes("Job ID:") || detailText.includes("Job Posting Date:");
          if (!hasActiveTokens || detailText.includes("Job Not Found") || detailText.includes("This job posting is closed") || detailText.includes("is no longer available")) {
            isLive = false;
          } else {
            closingDate = extractNordAngliaClosingDate(detailText);

            // 🛡️ Gate: Deep School Disambiguation
            const resolved = resolveNordAngliaSchool(detailText);
            if (resolved) {
              targetSchoolId = resolved.id;
              targetSchoolName = resolved.name;
            } else {
              // If in doubt, route to pending review
              jobStatus = 'pending_review';
            }
          }
        }
        await detailPage.close();
      } catch (err: any) {
        // Fall back if detail fetch fails
        jobStatus = 'pending_review';
      }

      if (!isLive) continue;

      records.push({
        rawTitle: title,
        source: "Nord Anglia",
        applyUrl: cleanUrl,
        schoolId: targetSchoolId,
        schoolName: targetSchoolName,
        city: input.city,
        country: input.country,
        datePosted: null,
        closingDate: closingDate,
        status: jobStatus,
      });
    }

    await browser.close();

    console.log(`🦁 [NORD ANGLIA ENGINE] Extracted ${records.length} clean job requisition(s) for ${input.schoolName}`);
    return records;
  } catch (err: any) {
    console.warn(`🦁 [NORD ANGLIA ENGINE] Failed for ${input.schoolName}:`, err.message || err);
    return [];
  }
}

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

const NAE_CAREERS_BASE = "https://careers.nordangliaeducation.com";

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

export async function runNordAngliaAdaptor(input: AdaptorInput): Promise<RawJobRecord[]> {
  const searchTerm = input.city || input.country || input.schoolName;
  if (!searchTerm) return [];

  const searchUrl = `${NAE_CAREERS_BASE}/search/?q=&locationsearch=${encodeURIComponent(searchTerm)}`;
  console.log(`🦁 [NORD ANGLIA ENGINE] Querying SAP SuccessFactors for ${input.schoolName} (${searchTerm}): ${searchUrl}`);

  try {
    const { chromium } = await import("playwright");
    const browser = await chromium.launch({ headless: true });
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

    for (const item of rawItems) {
      const cleanUrl = sanitizeUrl(item.href);
      if (!cleanUrl || seenUrls.has(cleanUrl)) continue;

      const title = cleanNordAngliaJobTitle(item.title);
      if (!title || isSupportOrNonTeachingRole(title) || isSupportOrNonTeachingRole(item.title)) continue; // Skip non-teaching / support staff / TA roles

      seenUrls.add(cleanUrl);

      // Deep scrape job detail page for closing date in Selection Process paragraph
      let closingDate: string | null = null;
      try {
        const detailPage = await browser.newPage();
        await detailPage.goto(cleanUrl, { waitUntil: "domcontentloaded", timeout: 12000 });
        const detailText = await detailPage.evaluate(() => document.body.innerText);
        closingDate = extractNordAngliaClosingDate(detailText);
        await detailPage.close();
      } catch (err: any) {
        // Fall back to null (rolling deadline) if detail fetch times out
      }

      records.push({
        rawTitle: title,
        source: "Nord Anglia",
        applyUrl: cleanUrl,
        schoolId: input.schoolId,
        schoolName: input.schoolName,
        city: input.city,
        country: input.country,
        datePosted: null,
        closingDate: closingDate,
        status: "approved",
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

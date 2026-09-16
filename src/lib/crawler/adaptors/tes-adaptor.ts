/**
 * 🛰️ TES DIRECT EMPLOYER HUB ADAPTOR (PURE EXTRACTION & DEEP DATE RESOLUTION)
 *
 * Renders official TES employer pages (e.g. `https://www.tes.com/jobs/employer/cheltenham-muscat-1224896`),
 * expands paginated / "Load more" DOM cards, extracts vacancy links, enforces role
 * classification guardrails, throttles deep closing date inspection, and purges stale records.
 * Enforces SHORT JOB NAME TITLES ONLY (Strictly Capped at 60 Characters Maximum).
 */

import type { AdaptorInput, RawJobRecord } from "./raw-job.types";
import { sanitizeUrl } from "../urlResolver";
import { sanitizeJobTitle } from "../titleSanitizer";
import { isSupportOrNonTeachingRole } from "../roleClassifier";

const TES_BASE = "https://www.tes.com";
const STEALTH_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-cache",
};

/**
 * 🎯 ENFORCES SHORT JOB TITLE ONLY (Capped at 60 Characters Maximum)
 */
export function cleanJobTitle(rawTitle: string, schoolName?: string): string {
  if (!rawTitle) return "";
  let clean = sanitizeJobTitle(rawTitle, schoolName);

  // Separate concatenated camel-case boundaries
  clean = clean.replace(/([a-z0-9\)])([A-Z])/g, "$1 $2");

  // Strip boilerplate text
  clean = clean.split(/are currently seeking|is currently seeking|is seeking|seeking to appoint|seeking an outstanding|is the leading global group|The Opportunity|Due to the|Reports to|Reporting to|Responsibilities|Qualifications|Salary|Location|Contract|Full Time|Part Time/i)[0].trim();

  // Clean up trailing dashes and extra spaces
  clean = clean.replace(/[-_\s/]+$/, "").replace(/\s+/g, " ").trim();

  if (clean.length > 60) {
    clean = clean.substring(0, 60).replace(/[-_\s/]+$/, "").trim();
  }

  return clean || rawTitle.trim().substring(0, 60);
}

export function extractJobPostingsFromHtml(html: string): any[] {
  const results: any[] = [];
  const scriptRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      const items: any[] = Array.isArray(parsed)
        ? parsed
        : parsed["@graph"]
        ? parsed["@graph"]
        : [parsed];

      for (const item of items) {
        if (item["@type"] === "JobPosting") {
          results.push(item);
        }
      }
    } catch {
      // Skip malformed block
    }
  }
  return results;
}

function jobPostingToRecord(posting: any, input: AdaptorInput): RawJobRecord | null {
  const rawUrl = posting.url || posting.identifier || null;
  const cleanUrl = rawUrl ? sanitizeUrl(rawUrl) : null;

  if (!cleanUrl || !cleanUrl.includes("tes.com/jobs/vacancy/")) {
    return null;
  }

  const rawTitle = (posting.title || posting.name || "").trim();
  // 🛡️ Gate 1: Role Classification Guardrail (Drop non-teaching early)
  if (!rawTitle || isSupportOrNonTeachingRole(rawTitle)) {
    return null;
  }

  const title = cleanJobTitle(rawTitle, input.schoolName);
  if (!title || isSupportOrNonTeachingRole(title)) {
    return null;
  }

  let city = input.city;
  let country = input.country;
  if (posting.jobLocation?.address) {
    const addr = posting.jobLocation.address;
    if (addr.addressLocality) city = addr.addressLocality;
    if (addr.addressRegion && !city) city = addr.addressRegion;
    if (addr.addressCountry) country = addr.addressCountry;
  }

  const closingDate = posting.validThrough || null;
  const datePosted = posting.datePosted || null;

  return {
    rawTitle: title,
    source: "TES",
    applyUrl: cleanUrl,
    schoolId: input.schoolId,
    schoolName: input.schoolName,
    city,
    country,
    datePosted,
    closingDate,
    status: "approved",
  };
}

async function fetchDeepClosingDate(urlStr: string): Promise<{ closingDate: string | null; datePosted: string | null; exactTitle: string | null }> {
  try {
    const res = await fetch(urlStr, { headers: STEALTH_HEADERS });
    if (!res.ok) return { closingDate: null, datePosted: null, exactTitle: null };
    const html = await res.text();
    const postings = extractJobPostingsFromHtml(html);
    if (postings.length > 0) {
      const p = postings[0];
      return {
        closingDate: p.validThrough || null,
        datePosted: p.datePosted || null,
        exactTitle: p.title || p.name || null
      };
    }
    return { closingDate: null, datePosted: null, exactTitle: null };
  } catch {
    return { closingDate: null, datePosted: null, exactTitle: null };
  }
}

/**
 * ⚡ CONCURRENCY-CONTROLLED DEEP DATE RESOLUTION
 * Bounded worker pool (concurrency = 5) prevents TES 429 Too Many Requests rate-limiting.
 */
async function fetchDeepClosingDatesConcurrently(
  items: { href: string; title: string }[],
  concurrency = 5
): Promise<Map<string, { closingDate: string | null; datePosted: string | null; exactTitle: string | null }>> {
  const results = new Map<string, { closingDate: string | null; datePosted: string | null; exactTitle: string | null }>();
  for (let i = 0; i < items.length; i += concurrency) {
    const chunk = items.slice(i, i + concurrency);
    const chunkResults = await Promise.all(
      chunk.map(async (item) => {
        const cleanUrl = sanitizeUrl(item.href);
        if (!cleanUrl) return null;
        const data = await fetchDeepClosingDate(cleanUrl);
        return { url: cleanUrl, data };
      })
    );
    for (const res of chunkResults) {
      if (res) results.set(res.url, res.data);
    }
  }
  return results;
}

/**
 * 🧹 STALE VACANCY GARBAGE COLLECTOR (TOMBSTONE DISAPPEARED RECORDS)
 */
export async function purgeStaleTesVacancies(
  schoolId: string,
  activeApplyUrls: Set<string>
): Promise<number> {
  try {
    const { getAdminDb } = await import("@/firebase/admin");
    const db = getAdminDb();
    if (!db) return 0;

    const snapshot = await db
      .collection("featured_jobs_cache")
      .where("schoolId", "==", schoolId.toUpperCase().trim())
      .get();

    if (snapshot.empty) return 0;

    const normalizeUrl = (u: string) => u.toLowerCase().replace(/\/+$/, "").trim();
    const activeNormalized = new Set(Array.from(activeApplyUrls).map(normalizeUrl));

    let purgedCount = 0;
    const batch = db.batch();

    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (data.source !== "TES") continue;

      const applyUrl = normalizeUrl(String(data.applyUrl || data.source_url || ""));
      const isPastClosing = data.closingDateMillis && data.closingDateMillis < Date.now();

      if (!activeNormalized.has(applyUrl) || isPastClosing) {
        batch.delete(doc.ref);
        purgedCount++;
      }
    }

    if (purgedCount > 0) {
      await batch.commit();
      console.log(`🧹 [TES GARBAGE COLLECTOR] Purged ${purgedCount} stale TES vacancies for school ${schoolId}.`);
    }

    return purgedCount;
  } catch (err: any) {
    console.error(`⚠️ [TES GARBAGE COLLECTOR] Error purging for ${schoolId}:`, err?.message || err);
    return 0;
  }
}

async function scrapeTesPagePlaywright(url: string, input: AdaptorInput): Promise<RawJobRecord[]> {
  try {
    const { chromium } = await import("playwright");
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
    
    // 🔄 Large Hub Pagination & Dynamic "Load More" Expansion Loop
    let loadMoreClicks = 0;
    const MAX_LOAD_MORE_CLICKS = 10;

    while (loadMoreClicks < MAX_LOAD_MORE_CLICKS) {
      await page.evaluate(async () => {
        await new Promise((resolve) => {
          let totalHeight = 0;
          const distance = 400;
          const timer = setInterval(() => {
            const scrollHeight = document.body.scrollHeight;
            window.scrollBy(0, distance);
            totalHeight += distance;
            if (totalHeight >= scrollHeight || totalHeight > 8000) {
              clearInterval(timer);
              resolve(true);
            }
          }, 80);
        });
      });
      await page.waitForTimeout(600);

      const loadMoreBtn = await page.$(
        'button:has-text("Load more"), button:has-text("Show more"), [data-testid*="load-more"], a:has-text("Load more"), button.load-more, .load-more-btn'
      );

      if (loadMoreBtn && (await loadMoreBtn.isVisible())) {
        try {
          await loadMoreBtn.click();
          loadMoreClicks++;
          await page.waitForTimeout(1200);
        } catch {
          break;
        }
      } else {
        break;
      }
    }

    const rawItems = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="/jobs/vacancy/"]'));
      return links.map((a) => {
        const headingEl = a.querySelector('h2, h3, h4, .headline, .job-title, [class*="title"]');
        const rawHeading = headingEl ? headingEl.textContent : (a.textContent || "");
        return {
          title: (rawHeading || "").trim(),
          href: (a as HTMLAnchorElement).href,
        };
      });
    });

    await browser.close();

    // 🛡️ Gate 1: Role Classification Filter (Filter non-academic roles before deep fetches)
    const validItems: { href: string; title: string }[] = [];
    const seenUrls = new Set<string>();

    for (const item of rawItems) {
      const cleanUrl = sanitizeUrl(item.href);
      if (!cleanUrl || !cleanUrl.includes("tes.com/jobs/vacancy/") || seenUrls.has(cleanUrl)) continue;
      if (!item.title || isSupportOrNonTeachingRole(item.title)) continue;

      seenUrls.add(cleanUrl);
      validItems.push({ href: cleanUrl, title: item.title });
    }

    // ⚡ Concurrency-Controlled Deep Date Fetching
    const deepDateMap = await fetchDeepClosingDatesConcurrently(validItems, 5);

    const records: RawJobRecord[] = [];
    for (const item of validItems) {
      const deepData = deepDateMap.get(item.href) || { closingDate: null, datePosted: null, exactTitle: null };
      const rawTitle = deepData.exactTitle || item.title;
      if (isSupportOrNonTeachingRole(rawTitle)) continue;

      const title = cleanJobTitle(rawTitle, input.schoolName);
      if (!title || isSupportOrNonTeachingRole(title)) continue;

      records.push({
        rawTitle: title,
        source: "TES",
        applyUrl: item.href,
        schoolId: input.schoolId,
        schoolName: input.schoolName,
        city: input.city,
        country: input.country,
        datePosted: deepData.datePosted,
        closingDate: deepData.closingDate,
        status: "approved",
      });
    }

    console.log(`🔴 [TES PLAYWRIGHT] Discovered ${records.length} academic vacancy link(s) on ${url}`);
    return records;
  } catch (err: any) {
    console.warn(`🔴 [TES PLAYWRIGHT] Failed for ${url}:`, err.message || err);
    return [];
  }
}

export async function runTesAdaptor(input: AdaptorInput): Promise<RawJobRecord[]> {
  if (!input.tesEmployerSlug && !input.tesOrganizationId) {
    return [];
  }

  const targetSlug = input.tesEmployerSlug;
  const url = targetSlug
    ? `${TES_BASE}/jobs/employer/${targetSlug}`
    : `${TES_BASE}/jobs/employer/school-${input.tesOrganizationId}`;

  console.log(`🔴 [TES DIRECT HUB] Fetching official TES employer page: ${url}`);

  try {
    const res = await fetch(url, { headers: STEALTH_HEADERS, redirect: "follow" });
    if (res.ok) {
      const html = await res.text();
      const jsonLdPostings = extractJobPostingsFromHtml(html);
      if (jsonLdPostings.length > 0) {
        const records: RawJobRecord[] = [];
        for (const posting of jsonLdPostings) {
          const record = jobPostingToRecord(posting, input);
          if (record && record.rawTitle && record.applyUrl && record.applyUrl.includes("tes.com/jobs/vacancy/")) {
            records.push(record);
          }
        }
        if (records.length > 0) {
          console.log(`🔴 [TES DIRECT HUB] Emitting ${records.length} clean JSON-LD record(s) for ${input.schoolName}`);
          return records;
        }
      }
    }
  } catch {
    // Fallback to Playwright DOM
  }

  return await scrapeTesPagePlaywright(url, input);
}

export async function scrapeTesEmployerHub(
  slug: string,
  schoolId: string,
  schoolName?: string
): Promise<RawJobRecord[]> {
  return await runTesAdaptor({
    tesEmployerSlug: slug,
    schoolId,
    schoolName: schoolName || slug,
    city: "",
    country: "",
  });
}

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
import { matchSchoolEntity, SchoolEntity } from "../entityMatcher";
import { isMalvernCampus, enrichMalvernDirectUrl } from "../../search/malvern";
import { isEsfSchool, enrichEsfDirectUrl } from "../../search/esf";
import { slugForeignCountry, classifyVacancyPage, hiringOrgFitsPage, tidyTitleEnd, parseTesVacancyLinksFromHtml } from "../../search/tesRules";

const TES_BASE = "https://www.tes.com";
const STEALTH_HEADERS: Readonly<Record<string, string>> = Object.freeze({
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-cache",
}) as Readonly<Record<string, string>>;

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

  let cut = false;
  if (clean.length > 60) {
    cut = clean.length > 60 && clean[60] !== " ";
    clean = clean.substring(0, 60).replace(/[-_\s/]+$/, "").trim();
  }
  clean = tidyTitleEnd(clean, cut) || clean;

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

/**
 * 🩹 FALLBACK: Parse a visible "Apply by: <date>" string out of raw job-detail
 * HTML when the page's JSON-LD `validThrough` field is empty or missing.
 *
 * TES does not always populate `validThrough` in structured data even when
 * the human-visible page clearly states a deadline (confirmed 2026-09-30 on
 * two Cheltenham Muscat postings whose JSON-LD had no validThrough, but
 * whose page text read "Apply by: 12 September 2026" / "17 September 2026").
 * Without this, a job with a real, already-passed deadline gets silently
 * treated as an undated "rolling deadline" listing and stays approvable
 * indefinitely. This is used ONLY as a fallback — JSON-LD validThrough is
 * always tried first, so this changes nothing for postings that already
 * report a proper closing date.
 */
function extractApplyByFallbackDate(html: string): string | null {
  // Matches "Apply by: 12 September 2026", "Apply by 12/09/2026", allowing
  // for intervening HTML tags between the label and the date text.
  const patterns = [
    /Apply\s*by\s*:?\s*(?:<[^>]+>\s*)*([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})/i,
    /Apply\s*by\s*:?\s*(?:<[^>]+>\s*)*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{4})/i,
    /Closing\s*date\s*:?\s*(?:<[^>]+>\s*)*([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})/i,
  ];

  for (const re of patterns) {
    const match = html.match(re);
    if (match && match[1]) {
      const parsed = new Date(match[1]);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString();
      }
    }
  }
  return null;
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
    if (addr.addressCountry) {
      const postingCountry = String(addr.addressCountry).trim().toLowerCase();
      const inputCountry = String(input.country || "").trim().toLowerCase();
      // 🛡️ Gate 2: Cross-Country Mismatch Shield
      if (inputCountry && postingCountry && !postingCountry.includes(inputCountry) && !inputCountry.includes(postingCountry)) {
        console.warn(`🛑 [TES ADAPTOR] Rejected cross-country mismatch for ${input.schoolName} (${input.country}): job located in ${addr.addressCountry} [${cleanUrl}]`);
        return null;
      }
      country = addr.addressCountry;
    }
  }

  // 🛡️ Gate 3: URL Slug Country Mismatch Shield (a slug naming the school's own country or city is fine)
  const slugBad = slugForeignCountry(cleanUrl, input.country);
  if (slugBad) {
    console.warn(`🛑 [TES ADAPTOR] Rejected foreign country slug "-${slugBad}-" for ${input.schoolName} (${input.country}) [${cleanUrl}]`);
    return null;
  }

  // 🛡️ Gate 4: Hiring Organization Verification Gate
  const hiringOrg = posting.hiringOrganization;
  const hiringOrgName = (typeof hiringOrg === "string" ? hiringOrg : hiringOrg?.name || "").trim();
  if (!hiringOrgName) {
    console.warn(`🛑 [TES ADAPTOR] Rejected missing hiringOrganization data for ${input.schoolName} [${cleanUrl}]`);
    return null;
  }

  const schoolEntity: SchoolEntity = {
    id: input.schoolId,
    name: input.schoolName,
    schoolname: input.schoolName,
    city: input.city || "",
    country: input.country || "",
    tesEmployerSlug: input.tesEmployerSlug,
    tesOrganizationId: input.tesOrganizationId,
  };

  const orgMatch = matchSchoolEntity(
    schoolEntity,
    {
      candidateText: hiringOrgName,
      city: input.city,
      country: input.country,
    },
    0.85
  );

  if ((!orgMatch.isMatch || orgMatch.score < 0.85) && !hiringOrgFitsPage(hiringOrgName, input.tesEmployerSlug)) {
    console.warn(`🛑 [TES ADAPTOR] Rejected hiringOrganization mismatch for ${input.schoolName} (hiringOrg="${hiringOrgName}", score=${orgMatch.score.toFixed(2)}) [${cleanUrl}]`);
    return null;
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

async function fetchDeepClosingDate(urlStr: string): Promise<{ closingDate: string | null; datePosted: string | null; exactTitle: string | null; hiringOrg?: string | null; locality?: string | null; description?: string | null }> {
  try {
    const res = await fetch(urlStr, { headers: STEALTH_HEADERS });
    if (!res.ok) return { closingDate: null, datePosted: null, exactTitle: null };
    const html = await res.text();
    const postings = extractJobPostingsFromHtml(html);
    if (postings.length > 0) {
      const p = postings[0];
      // 🩹 Prefer JSON-LD validThrough; fall back to the visible "Apply by"
      // text on the page when TES's own structured data omits it.
      const closingDate = p.validThrough || extractApplyByFallbackDate(html);
      return {
        closingDate,
        datePosted: p.datePosted || null,
        exactTitle: p.title || p.name || null,
        hiringOrg: String((typeof p.hiringOrganization === "string" ? p.hiringOrganization : p.hiringOrganization?.name) || "").trim() || null,
        description: (() => { const d = String(p.description || ""); return d ? d.replace(/<[^>]*>/g, " ").replace(/&nbsp;|&amp;|&#\d+;/g, " ").replace(/\s+/g, " ").trim().slice(0, 6000) : null; })(),
        locality: (() => { const jl = Array.isArray(p.jobLocation) ? p.jobLocation[0] : p.jobLocation; const a = jl?.address || {}; return String(a.addressLocality || a.addressRegion || jl?.name || "").trim() || null; })(),
      };
    }
    // No JSON-LD JobPosting found at all — still try the visible-text fallback
    return { closingDate: extractApplyByFallbackDate(html), datePosted: null, exactTitle: null };
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
): Promise<Map<string, { closingDate: string | null; datePosted: string | null; exactTitle: string | null; hiringOrg?: string | null; locality?: string | null; description?: string | null }>> {
  const results = new Map<string, { closingDate: string | null; datePosted: string | null; exactTitle: string | null; hiringOrg?: string | null; locality?: string | null; description?: string | null }>();
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

    // Roger (2026-10-06): a job missing from this read is only removed when we can show it is really gone.
    // - past its closing date: removed
    // - its link is not a TES vacancy page (e.g. the employer hub page): removed
    // - its own TES page is gone (404/410) or has expired: removed
    // - anything else (page still live, or we could not tell): kept. A half-loaded hub page can never wipe live jobs.
    const FETCH_CONCURRENCY = 5;
    const candidates: { doc: any; url: string }[] = [];
    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (data.source !== "TES") continue;
      const applyUrl = normalizeUrl(String(data.applyUrl || data.source_url || ""));
      const isPastClosing = data.closingDateMillis && data.closingDateMillis < Date.now();
      if (isPastClosing) { batch.delete(doc.ref); purgedCount++; continue; }
      if (activeNormalized.has(applyUrl)) continue;
      if (!["approved", "pending_review"].includes(String(data.status || "").toLowerCase())) continue;
      if (applyUrl.includes("tes.com/jobs/employer/")) {
        console.log(`🧹 [TES GARBAGE COLLECTOR] ${schoolId}: removing "${data.title}" - its link is the TES employer page, not a job (${applyUrl}).`);
        batch.delete(doc.ref); purgedCount++; continue;
      }
      if (!applyUrl.includes("tes.com/jobs/vacancy/")) continue; // a link we cannot check (school's own site etc.): keep
      candidates.push({ doc, url: String(data.applyUrl || data.source_url) });
    }
    for (let i = 0; i < candidates.length; i += FETCH_CONCURRENCY) {
      const chunk = candidates.slice(i, i + FETCH_CONCURRENCY);
      const verdicts = await Promise.all(chunk.map(async (c) => {
        try {
          const res = await fetch(c.url, { headers: STEALTH_HEADERS });
          let hasJobPosting = false;
          let validThroughMs: number | null = null;
          if (res.ok) {
            const html = await res.text();
            const postings = extractJobPostingsFromHtml(html);
            hasJobPosting = postings.length > 0;
            const vt = postings[0]?.validThrough;
            const t = vt ? Date.parse(String(vt)) : NaN;
            validThroughMs = Number.isFinite(t) ? t : null;
          }
          return classifyVacancyPage({ status: res.status, hasJobPosting, validThroughMs });
        } catch {
          return "unknown" as const;
        }
      }));
      chunk.forEach((c, idx) => {
        if (verdicts[idx] === "gone") {
          console.log(`🧹 [TES GARBAGE COLLECTOR] ${schoolId}: removing "${c.doc.data().title}" - its TES page is gone.`);
          batch.delete(c.doc.ref); purgedCount++;
        }
      });
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

/**
 * Open a TES employer page in a real browser, expand "Load more", and return every vacancy link on it (title + link). No filtering here.
 * Used by the school reader below and by the group-page reader (Roger, 2026-10-06).
 */
async function discoverTesVacancyLinksPlain(url: string): Promise<{ title: string; href: string }[]> {
  try {
    const res = await fetch(url, { headers: STEALTH_HEADERS, redirect: "follow" });
    if (!res.ok) return [];
    return parseTesVacancyLinksFromHtml(await res.text());
  } catch { return []; }
}

export async function discoverTesVacancyLinks(url: string): Promise<{ title: string; href: string }[]> {
  // Plain request first (works on the website server). The browser is only the fallback when the plain page showed no vacancy links.
  const plain = await discoverTesVacancyLinksPlain(url);
  if (plain.length > 0) return plain;
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  try {
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

    return rawItems;
  } finally {
    await browser.close().catch(() => {});
  }
}

async function scrapeTesPagePlaywright(url: string, input: AdaptorInput): Promise<RawJobRecord[]> {
  try {
    const rawItems = await discoverTesVacancyLinks(url);

    // 🛡️ Gate 1: Role Classification Filter (Filter non-academic roles before deep fetches)
    const validItems: { href: string; title: string }[] = [];
    const seenUrls = new Set<string>();

    for (const item of rawItems) {
      const cleanUrl = sanitizeUrl(item.href);
      if (!cleanUrl || !cleanUrl.includes("tes.com/jobs/vacancy/") || seenUrls.has(cleanUrl)) continue;
      if (!item.title || isSupportOrNonTeachingRole(item.title)) continue;

      // 🛡️ Gate: Foreign country in vacancy slug
      const slugBad = slugForeignCountry(cleanUrl, input.country);
      if (slugBad) {
        console.warn(`🛑 [TES PLAYWRIGHT] Rejected foreign country slug "-${slugBad}-" for ${input.schoolName} (${input.country}) [${cleanUrl}]`);
        continue;
      }

      seenUrls.add(cleanUrl);
      validItems.push({ href: cleanUrl, title: item.title });
    }

    // ⚡ Concurrency-Controlled Deep Date Fetching
    const deepDateMap = await fetchDeepClosingDatesConcurrently(validItems, 5);

    const records: RawJobRecord[] = [];
    for (const item of validItems) {
      const deepData = deepDateMap.get(item.href) || { closingDate: null, datePosted: null, exactTitle: null, hiringOrg: null };
      // 🛡️ Hiring-organisation check on the page-reading path too (Roger, 2026-10-06): the vacancy page must name this school as the employer.
      // The structured-data path always did this; this path did not, and let other schools' jobs through.
      if (!deepData.hiringOrg) {
        console.warn(`🛑 [TES PLAYWRIGHT] Rejected: vacancy page names no hiring organisation for ${input.schoolName} [${item.href}]`);
        continue;
      }
      const orgCheck = matchSchoolEntity(
        { id: input.schoolId, name: input.schoolName, schoolname: input.schoolName, city: input.city || "", country: input.country || "", tesEmployerSlug: input.tesEmployerSlug, tesOrganizationId: input.tesOrganizationId } as SchoolEntity,
        { candidateText: deepData.hiringOrg, city: input.city, country: input.country },
        0.85
      );
      if ((!orgCheck.isMatch || orgCheck.score < 0.85) && !hiringOrgFitsPage(deepData.hiringOrg, input.tesEmployerSlug)) {
        console.warn(`🛑 [TES PLAYWRIGHT] Rejected hiringOrganization mismatch for ${input.schoolName} (hiringOrg="${deepData.hiringOrg}", score=${orgCheck.score.toFixed(2)}) [${item.href}]`);
        continue;
      }
      const rawTitle = deepData.exactTitle || item.title;
      if (isSupportOrNonTeachingRole(rawTitle)) continue;

      const title = cleanJobTitle(rawTitle, input.schoolName);
      if (!title || isSupportOrNonTeachingRole(title)) continue;

      const rec: RawJobRecord = {
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
      };

      if (isMalvernCampus(input.schoolId, input.schoolName)) {
        const directUrl = await enrichMalvernDirectUrl(
          item.href,
          input.schoolId,
          null,
          input.careersPageUrl || input.schoolWebsite
        );
        rec.directUrl = directUrl;
        rec.sources = ['TES', 'Malvern'];
        rec.sourceUrls = {
          TES: item.href,
          Malvern: directUrl,
        };
      } else if (isEsfSchool(input.schoolId, input.schoolName, null, item.href)) {
        const directUrl = await enrichEsfDirectUrl(
          item.href,
          input.schoolId,
          null,
          input.careersPageUrl || input.schoolWebsite
        );
        rec.directUrl = directUrl;
        rec.sources = ['TES', 'ESF'];
        rec.sourceUrls = {
          TES: item.href,
          ESF: directUrl,
        };
      }

      records.push(rec);
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
            // 🩹 Hub-level JSON-LD often omits validThrough even when the
            // individual vacancy page has a real, human-visible "Apply by"
            // date (confirmed 2026-09-30 — Cheltenham Muscat postings whose
            // hub-page JSON-LD had no closing date at all, but whose own
            // vacancy page did). Before accepting this as a genuine rolling
            // deadline, do one deep fetch of that specific vacancy page and
            // try again there (JSON-LD validThrough, then visible-text
            // fallback). Only runs for records that would otherwise have no
            // closing date, so this adds no extra requests for postings
            // that already resolved a date from the hub page.
            if (!record.closingDate) {
              try {
                const deep = await fetchDeepClosingDate(record.applyUrl);
                if (deep.closingDate) {
                  record.closingDate = deep.closingDate;
                }
              } catch {
                // Leave as a rolling deadline if the deep fetch itself fails.
              }
            }
            if (isMalvernCampus(input.schoolId, input.schoolName)) {
              let outboundUrl: string | null = null;
              if (posting.directApplyUrl && typeof posting.directApplyUrl === 'string') {
                outboundUrl = sanitizeUrl(posting.directApplyUrl);
              } else if (posting.sameAs && typeof posting.sameAs === 'string' && !posting.sameAs.includes('tes.com')) {
                outboundUrl = sanitizeUrl(posting.sameAs);
              }
              const directUrl = await enrichMalvernDirectUrl(
                record.applyUrl,
                input.schoolId,
                outboundUrl,
                input.careersPageUrl || input.schoolWebsite
              );
              record.directUrl = directUrl;
              record.sources = ['TES', 'Malvern'];
              record.sourceUrls = {
                TES: record.applyUrl,
                Malvern: directUrl,
              };
            } else if (isEsfSchool(input.schoolId, input.schoolName, null, record.applyUrl)) {
              let outboundUrl: string | null = null;
              if (posting.directApplyUrl && typeof posting.directApplyUrl === 'string') {
                outboundUrl = sanitizeUrl(posting.directApplyUrl);
              } else if (posting.sameAs && typeof posting.sameAs === 'string' && !posting.sameAs.includes('tes.com')) {
                outboundUrl = sanitizeUrl(posting.sameAs);
              }
              const directUrl = await enrichEsfDirectUrl(
                record.applyUrl,
                input.schoolId,
                outboundUrl,
                input.careersPageUrl || input.schoolWebsite
              );
              record.directUrl = directUrl;
              record.sources = ['TES', 'ESF'];
              record.sourceUrls = {
                TES: record.applyUrl,
                ESF: directUrl,
              };
            }
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


/**
 * Read a TES employer page for what each vacancy says about itself - used to work out which school a GROUP page's job belongs to.
 * Returns every teaching-type vacancy link with the employer name, place and closing date from the vacancy's own page. No school is chosen here.
 */
export async function readTesPageRaw(url: string): Promise<{ href: string; title: string; hiringOrg: string | null; locality: string | null; closingDate: string | null; exactTitle: string | null; description: string | null }[]> {
  const links = await discoverTesVacancyLinks(url);
  const seen = new Set<string>();
  const items: { href: string; title: string }[] = [];
  for (const l of links) {
    const clean = sanitizeUrl(l.href);
    if (!clean || !clean.includes("tes.com/jobs/vacancy/") || seen.has(clean) || !l.title || isSupportOrNonTeachingRole(l.title)) continue;
    seen.add(clean);
    items.push({ href: clean, title: l.title });
  }
  const deep = await fetchDeepClosingDatesConcurrently(items, 5);
  return items.map((it) => {
    const d: any = deep.get(it.href) || {};
    return { href: it.href, title: it.title, hiringOrg: d.hiringOrg || null, locality: d.locality || null, closingDate: d.closingDate || null, exactTitle: d.exactTitle || null, description: d.description || null };
  });
}

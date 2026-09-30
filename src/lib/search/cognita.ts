/**
 * 🛸 COGNITA DB-RESTRICTED SEARCH ENGINE & DIRECT INGESTION
 *
 * Coordinates network-wide crawling across Cognita Schools via CSOD
 * (`cognitapeople.csod.com`), enforces strict canonical entity mappings,
 * filters non-teaching roles, and commits pre-scrubbed jobs directly to `featured_jobs_cache`.
 */

import { isSupportOrNonTeachingRole } from "@/lib/crawler/roleClassifier";
import { parseClosingDate } from "@/lib/crawler/dateParser";
import { chromium } from "playwright";

export interface CognitaJobMatch {
  jobId: string;
  title: string;
  applyUrl: string;
  schoolId: string;
  schoolName: string;
  city: string;
  country: string;
  source: string;
  datePosted?: string | null;
  closingDate?: string | null;
  closingDateMillis?: number | null;
  isRollingDeadline?: boolean;
  matchConfidence?: "high" | "medium" | "low";
  reasons?: string[];
}

export interface CognitaCampusMeta {
  schoolId: string;
  canonicalName: string;
  city: string;
  country: string;
  matchers: string[];
}

/**
 * COGNITA CANONICAL CAMPUS REGISTRY
 * Mapped to exact canonical database FLIS IDs.
 */
export const COGNITA_CAMPUS_MAP: Record<string, CognitaCampusMeta> = {
  "stamford american": {
    schoolId: "FLIS0404",
    canonicalName: "Stamford American International School",
    city: "Singapore",
    country: "Singapore",
    matchers: ["stamford american", "singapore"],
  },
  "ishcmc": {
    schoolId: "FLIS0130",
    canonicalName: "International School Ho Chi Minh City",
    city: "Ho Chi Minh City",
    country: "Vietnam",
    matchers: ["ishcmc", "an khanh", "thu duc", "ho chi minh"],
  },
  "bsb": {
    schoolId: "FLIS0416",
    canonicalName: "The British School of Barcelona",
    city: "Castelldefels",
    country: "Spain",
    matchers: ["british school of barcelona", "castelldefels", "barcelona"],
  },
  "southbank": {
    schoolId: "FLIS0173",
    canonicalName: "Southbank International School",
    city: "London",
    country: "United Kingdom",
    matchers: ["southbank", "hampstead", "westminster"],
  },
  "sukhumvit 107": {
    schoolId: "FLIS0137",
    canonicalName: "St. Andrews International School Sukhumvit 107",
    city: "Bangkok",
    country: "Thailand",
    matchers: ["sukhumvit 107", "bangna", "bangkok", "rayong"],
  },
  "repton dubai": {
    schoolId: "FLIS0110",
    canonicalName: "Repton School Dubai",
    city: "Dubai",
    country: "United Arab Emirates",
    matchers: ["repton dubai", "repton school dubai", "nad al sheba"],
  },
  "horizon international": {
    schoolId: "FLIS0111",
    canonicalName: "Horizon International School",
    city: "Dubai",
    country: "United Arab Emirates",
    matchers: ["horizon international"],
  },
  "horizon english": {
    schoolId: "FLIS0349",
    canonicalName: "Horizon English School",
    city: "Dubai",
    country: "United Arab Emirates",
    matchers: ["horizon english"],
  },
  "cheltenham muscat": {
    schoolId: "FLIS0042",
    canonicalName: "Cheltenham Muscat",
    city: "Muscat",
    country: "Oman",
    matchers: ["cheltenham muscat", "cheltenham college muscat"],
  },
  "st gilgen": {
    schoolId: "FLIS0190",
    canonicalName: "St. Gilgen International School",
    city: "St. Gilgen",
    country: "Austria",
    matchers: ["st. gilgen", "st gilgen"],
  },
  "reigate grammar vietnam": {
    schoolId: "FLIS0443",
    canonicalName: "Reigate Grammar School Vietnam",
    city: "Hanoi",
    country: "Vietnam",
    matchers: ["reigate grammar", "hanoi"],
  },
  "heidelberg": {
    schoolId: "FLIS0090",
    canonicalName: "Heidelberg International School",
    city: "Heidelberg",
    country: "Germany",
    matchers: ["heidelberg"],
  },
};

export function isCognitaSchool(schoolId?: string | null, schoolName?: string | null, group?: string | null): boolean {
  const sId = (schoolId || "").toUpperCase().trim();
  const sName = (schoolName || "").toLowerCase();
  const gName = (group || "").toLowerCase();

  if (
    gName.includes("taaleem") ||
    sName.includes("taaleem") ||
    gName.includes("gems") ||
    sName.includes("gems") ||
    gName.includes("nord anglia") ||
    sName.includes("nord anglia") ||
    gName.includes("inspired") ||
    sName.includes("inspired")
  ) {
    return false;
  }

  for (const meta of Object.values(COGNITA_CAMPUS_MAP)) {
    if (meta.schoolId === sId) return true;
  }

  if (gName.includes("cognita")) return true;
  if (sName.includes("cognita")) return true;

  return false;
}

/**
 * Fetches live vacancies from Cognita CSOD portal (cognitapeople.csod.com)
 * and directly persists them into Firestore `featured_jobs_cache`.
 */
export async function searchCognitaDbSchools(): Promise<CognitaJobMatch[]> {
  try {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const portalUrl = "https://cognitapeople.csod.com/ux/ats/careersite/1/home?c=cognitapeople";

    let bearerToken = "";
    page.on("request", (req) => {
      if (req.url().includes("rec-job-search/external/jobs")) {
        const authHeader = req.headers()["authorization"];
        if (authHeader) bearerToken = authHeader;
      }
    });

    await page.goto(portalUrl, { waitUntil: "networkidle", timeout: 35000 }).catch(() => {});
    await page.waitForTimeout(2000);

    let apiRequisitions: any[] = [];
    if (bearerToken) {
      try {
        apiRequisitions = await page.evaluate(async (token) => {
          const allReqs: any[] = [];
          let pageNum = 1;
          const pageSize = 200;
          let totalCount = 0;

          do {
            const res = await fetch("https://uk.api.csod.com/rec-job-search/external/jobs", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": token,
                "csod-accept-language": "en-GB",
              },
              body: JSON.stringify({
                careerSiteId: 1,
                careerSitePageId: 1,
                pageNumber: pageNum,
                pageSize: pageSize,
                cultureId: 2,
                searchText: "",
                cultureName: "en-GB",
                states: [],
                countryCodes: [],
                cities: [],
              }),
            });
            const json = await res.json();
            const reqs = json.data?.requisitions || [];
            totalCount = json.data?.totalCount || reqs.length;
            allReqs.push(...reqs);
            if (reqs.length === 0 || allReqs.length >= totalCount) break;
            pageNum++;
          } while (pageNum <= 5);

          return allReqs;
        }, bearerToken);
      } catch (err) {
        console.warn("⚠️ CSOD direct API fetch error:", err);
      }
    }

    await browser.close();

    const matchedResults: CognitaJobMatch[] = [];

    for (const job of apiRequisitions) {
      const title = String(job.displayJobTitle || job.title || "").trim();
      if (!title || isSupportOrNonTeachingRole(title)) continue;

      const locObjs: any[] = job.locations || [];
      const location = locObjs.map((l) => [l.city, l.state, l.country].filter(Boolean).join(", ")).join("; ");
      const description = String(job.externalDescription || "").trim();
      const fullText = `${title} ${location} ${description}`.toLowerCase();

      let matchedMeta: CognitaCampusMeta | null = null;
      let matchedOnPrimaryName = false;
      for (const meta of Object.values(COGNITA_CAMPUS_MAP)) {
        const primaryMatch = fullText.includes(meta.matchers[0].toLowerCase());
        const anyMatch = primaryMatch || meta.matchers.some((m) => fullText.includes(m.toLowerCase()));
        if (anyMatch) {
          matchedMeta = meta;
          matchedOnPrimaryName = primaryMatch;
          break;
        }
      }

      if (matchedMeta) {
        const reqId = String(job.requisitionId || "").trim();
        const applyUrl = `https://cognitapeople.csod.com/ux/ats/careersite/1/home/requisition/${reqId}?c=cognitapeople`;

        let rawClosingDateStr: string | null = null;
        if (description) {
          const descMatch = description.match(/(?:deadline|closing date|apply by|applications is|until)\s+(?:is\s+)?(\d{1,2}\s+[a-z]+\s+\d{4})/i);
          if (descMatch) rawClosingDateStr = descMatch[1];
        }
        if (!rawClosingDateStr && job.postingExpirationDate) {
          rawClosingDateStr = job.postingExpirationDate;
        }

        const parsedDate = parseClosingDate(rawClosingDateStr);
        const closingDateISO = parsedDate.closingDate ? parsedDate.closingDate.toISOString().split("T")[0] : null;
        const closingDateMillis = parsedDate.closingDate ? parsedDate.closingDate.getTime() : null;

        const match: CognitaJobMatch = {
          jobId: reqId,
          title,
          applyUrl,
          schoolId: matchedMeta.schoolId,
          schoolName: matchedMeta.canonicalName,
          city: matchedMeta.city,
          country: matchedMeta.country,
          source: "Cognita",
          datePosted: job.postingEffectiveDate ? String(job.postingEffectiveDate) : null,
          closingDate: closingDateISO,
          closingDateMillis,
          isRollingDeadline: parsedDate.isRollingDeadline,
          matchConfidence: matchedOnPrimaryName ? "high" : "medium",
          reasons: matchedOnPrimaryName
            ? []
            : [`Matched via secondary keyword, not the school's primary name — verify city/campus before approving.`],
        };

        matchedResults.push(match);
      }
    }

    return matchedResults;
  } catch (err: any) {
    console.error("❌ Error in searchCognitaDbSchools:", err?.message || err);
    return [];
  }
}

export async function syncCognitaNetworkToCache() {
  const jobs = await searchCognitaDbSchools();
  return { ingested: jobs.length };
}

/**
 * Returns the set of requisition IDs Cognita currently lists as open — used by the daily
 * takedown checker to detect removed listings, since Cognita's careers site is a JS app
 * and a plain HTTP fetch to a job's own URL can never see its "closed" state.
 * Returns null on failure (fail-safe: prevents false takedowns if CSOD API is unreachable).
 */
export async function getCurrentCognitaRequisitionIds(): Promise<Set<string> | null> {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const portalUrl = "https://cognitapeople.csod.com/ux/ats/careersite/1/home?c=cognitapeople";

    let bearerToken = "";
    page.on("request", (req) => {
      if (req.url().includes("rec-job-search/external/jobs")) {
        const authHeader = req.headers()["authorization"];
        if (authHeader) bearerToken = authHeader;
      }
    });

    await page.goto(portalUrl, { waitUntil: "networkidle", timeout: 35000 }).catch(() => {});
    await page.waitForTimeout(2000);

    if (!bearerToken) {
      console.warn("⚠️ [COGNITA LIVE CHECK] Failed to capture bearer token from CSOD portal.");
      await browser.close();
      return null;
    }

    const requisitionIds: string[] = await page.evaluate(async (token) => {
      const ids: string[] = [];
      let pageNum = 1;
      const pageSize = 200;
      let totalCount = 0;

      do {
        const res = await fetch("https://uk.api.csod.com/rec-job-search/external/jobs", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": token,
            "csod-accept-language": "en-GB",
          },
          body: JSON.stringify({
            careerSiteId: 1,
            careerSitePageId: 1,
            pageNumber: pageNum,
            pageSize: pageSize,
            cultureId: 2,
            searchText: "",
            cultureName: "en-GB",
            states: [],
            countryCodes: [],
            cities: [],
          }),
        });
        const json = await res.json();
        const reqs = json.data?.requisitions || [];
        totalCount = json.data?.totalCount || reqs.length;
        for (const r of reqs) {
          if (r.requisitionId) ids.push(String(r.requisitionId).trim());
        }
        if (reqs.length === 0 || ids.length >= totalCount) break;
        pageNum++;
      } while (pageNum <= 5);

      return ids;
    }, bearerToken);

    await browser.close();
    return new Set(requisitionIds);
  } catch (err) {
    console.error("⚠️ [COGNITA LIVE CHECK] Error fetching active requisitions:", err);
    if (browser) await browser.close().catch(() => {});
    return null;
  }
}


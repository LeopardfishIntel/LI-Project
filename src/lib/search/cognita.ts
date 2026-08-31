import { getAdminDb } from "@/firebase/admin";
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
  datePosted?: string | null;
  closingDate?: string | null;
  closingDateMillis?: number | null;
  isRollingDeadline?: boolean;
}

export interface DbSchoolRecord {
  id: string;
  name: string;
  city?: string | null;
  country?: string | null;
  aliases?: string[] | null;
}

/**
 * Database interface wrapper supporting db.school.findMany()
 */
export const db = {
  school: {
    findMany: async (args?: {
      select?: {
        id?: boolean;
        name?: boolean;
        city?: boolean;
        country?: boolean;
        aliases?: boolean;
      };
    }): Promise<DbSchoolRecord[]> => {
      const firestore = getAdminDb();
      if (!firestore || typeof firestore.collection !== "function") {
        return [];
      }
      try {
        const snap = await firestore.collection("schools").get();
        return snap.docs.map((d: any) => {
          const data = typeof d.data === "function" ? d.data() : d;
          return {
            id: d.id || data.id || "",
            name: data.name || data.schoolname || "",
            city: data.city || "",
            country: data.country || "",
            aliases: Array.isArray(data.aliases) ? data.aliases : [],
          };
        });
      } catch (err) {
        console.warn("⚠️ Error querying schools from DB:", err);
        return [];
      }
    },
  },
};

/**
 * 🛸 COGNITA DB-RESTRICTED SEARCH ENGINE
 *
 * Fetches live vacancies from Cognita CSOD portal (cognitapeople.csod.com)
 * and strictly matches them against ALL active schools in our database.
 * Deep dives into job title, location, and full description text for school names and closing dates.
 *
 * @returns Array of CognitaJobMatch objects strictly grounded in DB schools.
 */
export async function searchCognitaDbSchools(): Promise<CognitaJobMatch[]> {
  try {
    // 1. Query ALL active schools from db.school.findMany() with no network, operator, or name filters applied
    const activeSchools = await db.school.findMany({
      select: {
        id: true,
        name: true,
        city: true,
        country: true,
        aliases: true,
      },
    });

    if (!activeSchools || activeSchools.length === 0) {
      console.log("ℹ️ [COGNITA ENGINE] 0 active schools returned from database.");
      return [];
    }

    // 2. Launch Playwright headless browser to extract CSOD vacancies
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
    await page.waitForTimeout(3000);

    // 3. Fetch full CSOD requisitions payload (pageSize 200 to capture all live listings)
    let apiRequisitions: any[] = [];
    if (bearerToken) {
      try {
        apiRequisitions = await page.evaluate(async (token) => {
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
              pageNumber: 1,
              pageSize: 200,
              cultureId: 2,
              searchText: "",
              cultureName: "en-GB",
              states: [],
              countryCodes: [],
              cities: [],
            }),
          });
          const json = await res.json();
          return json.data?.requisitions || [];
        }, bearerToken);
      } catch (err) {
        console.warn("⚠️ CSOD direct API fetch fallback:", err);
      }
    }

    // DOM & State Fallback Extraction
    const domExtractedJobs = await page.evaluate(() => {
      const extracted: Array<{ requisitionId: string; title: string; location: string; description: string; postingEffectiveDate?: string; postingExpirationDate?: string }> = [];
      const win = window as any;

      const initialState = win.__INITIAL_STATE__ || win.csodState || win.csod;
      if (initialState && Array.isArray(initialState.requisitions)) {
        for (const req of initialState.requisitions) {
          const reqId = String(req.requisitionId || req.id || req.requisitionNum || "").trim();
          const title = String(req.title || req.jobTitle || req.name || "").trim();
          const location = String(req.location || req.displayLocation || req.locationName || "").trim();
          const description = String(req.description || req.externalDescription || "").trim();
          if (reqId && title) {
            extracted.push({
              requisitionId: reqId,
              title,
              location,
              description,
              postingEffectiveDate: req.postingEffectiveDate,
              postingExpirationDate: req.postingExpirationDate,
            });
          }
        }
      }

      const reqLinks = Array.from(document.querySelectorAll("a[href*='/requisition/']"));
      for (const a of reqLinks) {
        const href = (a as HTMLAnchorElement).href || "";
        const reqMatch = href.match(/\/requisition\/([^\/?#]+)/i);
        if (reqMatch) {
          const reqId = reqMatch[1];
          const title = a.textContent?.trim() || "";
          let container = a.parentElement;
          for (let i = 0; i < 5; i++) {
            if (container && container.textContent && container.textContent.length > title.length + 10) break;
            if (container) container = container.parentElement;
          }
          const location = container?.textContent?.trim() || "";
          if (reqId && title) {
            extracted.push({ requisitionId: reqId, title, location, description: "" });
          }
        }
      }

      return extracted;
    });

    await browser.close();

    // Consolidate CSOD API records with DOM fallback
    const rawJobsMap = new Map<string, { requisitionId: string; title: string; location: string; description: string; postingEffectiveDate?: string; postingExpirationDate?: string }>();

    for (const item of apiRequisitions) {
      const reqId = String(item.requisitionId || "").trim();
      const title = String(item.displayJobTitle || item.title || "").trim();
      const locObjs: any[] = item.locations || [];
      const location = locObjs.map((l) => [l.city, l.state, l.country].filter(Boolean).join(", ")).join("; ");
      const description = String(item.externalDescription || "").trim();
      if (reqId && title) {
        rawJobsMap.set(reqId, {
          requisitionId: reqId,
          title,
          location,
          description,
          postingEffectiveDate: item.postingEffectiveDate,
          postingExpirationDate: item.postingExpirationDate,
        });
      }
    }

    for (const domJob of domExtractedJobs) {
      if (domJob.requisitionId && !rawJobsMap.has(domJob.requisitionId)) {
        rawJobsMap.set(domJob.requisitionId, domJob);
      }
    }

    const uniqueJobs = Array.from(rawJobsMap.values());
    const matchedResults: CognitaJobMatch[] = [];

    // 4. Strict Data Matching against DB schools ONLY with Deep Dive Closing Date Extraction
    for (const job of uniqueJobs) {
      if (!job.title || isSupportOrNonTeachingRole(job.title)) continue;

      const fullText = `${job.title} ${job.location} ${job.description}`.toLowerCase();

      // Strict match: Compare strictly against school.name and school.aliases
      const matchedSchool = activeSchools.find((school) => {
        const sName = (school.name || "").toLowerCase().trim();
        if (!sName || sName.length < 4) return false;

        // A. Direct school name match
        if (fullText.includes(sName)) return true;

        // B. Exact alias match in school.aliases (e.g. "ishcmc" for FLIS0141)
        const aliases = Array.isArray(school.aliases) ? school.aliases : [];
        if (
          aliases.some((alias) => {
            const aLower = String(alias || "").toLowerCase().trim();
            return aLower.length >= 3 && fullText.includes(aLower);
          })
        ) {
          return true;
        }

        return false;
      });

      // Keep ONLY jobs that match a valid schoolId from our database. Discard all unmatched entries.
      if (matchedSchool) {
        // Deep Dive Closing Date Extraction from description text or postingExpirationDate
        let rawClosingDateStr: string | null = null;
        if (job.description) {
          const descMatch = job.description.match(/(?:deadline|closing date|apply by|applications is|until)\s+(?:is\s+)?(\d{1,2}\s+[a-z]+\s+\d{4})/i);
          if (descMatch) {
            rawClosingDateStr = descMatch[1];
          }
        }
        if (!rawClosingDateStr && job.postingExpirationDate) {
          rawClosingDateStr = job.postingExpirationDate;
        }

        const parsedDate = parseClosingDate(rawClosingDateStr);
        const closingDateISO = parsedDate.closingDate
          ? parsedDate.closingDate.toISOString().split("T")[0]
          : null;
        const closingDateMillis = parsedDate.closingDate
          ? parsedDate.closingDate.getTime()
          : null;

        matchedResults.push({
          jobId: job.requisitionId,
          title: job.title,
          applyUrl: `https://cognitapeople.csod.com/ux/ats/careersite/1/home/requisition/${job.requisitionId}?c=cognitapeople`,
          schoolId: matchedSchool.id,
          schoolName: matchedSchool.name,
          city: matchedSchool.city || "",
          country: matchedSchool.country || "",
          datePosted: job.postingEffectiveDate ? String(job.postingEffectiveDate) : null,
          closingDate: closingDateISO,
          closingDateMillis: closingDateMillis,
          isRollingDeadline: parsedDate.isRollingDeadline,
        });
      }
    }

    console.log(
      `🛸 [COGNITA ENGINE] Strictly matched ${matchedResults.length} DB-grounded vacancies out of ${uniqueJobs.length} live CSOD postings.`
    );

    return matchedResults;
  } catch (err: any) {
    console.error("❌ Error in searchCognitaDbSchools:", err?.message || err);
    return [];
  }
}

import { getAdminDb } from "@/firebase/admin";
import { isSupportOrNonTeachingRole } from "@/lib/crawler/roleClassifier";
import { matchSchoolEntity } from "@/lib/crawler/entityMatcher";
import { parseRelativeDate } from "@/lib/crawler/dateParser";
import axios from "axios";
import { guardianPageState } from "./guardianRules";
import * as cheerio from "cheerio";

export interface GuardianJobMatch {
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
  salaryRange?: string | null;
}

const GUARDIAN_SEARCH_URLS = [
  "https://jobs.theguardian.com/jobs/primary-and-secondary-education/?keywords=international",
  "https://jobs.theguardian.com/jobs/?keywords=international+school",
  "https://jobs.theguardian.com/jobs/schools/?keywords=international",
];

const AXIOS_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-GB,en-US;q=0.9,en;q=0.8"
};

export interface GuardianRawListing {
  guardianJobId: string;
  title: string;
  recruiter: string;
  location: string;
  salary: string;
  href: string;
  dateText: string;
}

/** Reads the Guardian Jobs search pages and returns every listing found (no school matching yet). Shared by the engine and the trial script. */
export async function harvestGuardianListings(): Promise<GuardianRawListing[]> {
  const rawListings: GuardianRawListing[] = [];

  const seenUrls = new Set<string>();

  for (const searchUrl of GUARDIAN_SEARCH_URLS) {
    for (let page = 1; page <= 2; page++) {
      const pageUrl = page === 1 ? searchUrl : `${searchUrl}&page=${page}`;
      try {
        const res = await axios.get(pageUrl, {
          headers: AXIOS_HEADERS,
          timeout: 12000
        });

        if (res.status !== 200 || !res.data) continue;

        const $ = cheerio.load(res.data);

        $("li.lister__item, article.lister__item").each((_, el) => {
          const titleEl = $(el).find("h3.lister__header a, a.lister__view-details").first();
          const rawTitle = titleEl.find("span").first().text().trim() || titleEl.text().trim();
          const rawHref = titleEl.attr("href") || "";

          const cleanHref = rawHref.trim().replace(/\s+/g, "");
          if (!rawTitle || !cleanHref) return;

          const fullUrl = cleanHref.startsWith("http") ? cleanHref : `https://jobs.theguardian.com${cleanHref}`;
          if (seenUrls.has(fullUrl)) return;
          seenUrls.add(fullUrl);

          const recruiter = $(el).find(".lister__meta-item--recruiter").text().trim();
          const location = $(el).find(".lister__meta-item--location").text().trim();
          const salary = $(el).find(".lister__meta-item--salary").text().trim();
          const dateText = $(el).find(".job-actions__action.pipe, time").first().text().trim();
          const guardianJobId = $(el).find("input[name=\"JobId\"]").val()?.toString() || cleanHref.replace(/[^0-9]/g, "");

          rawListings.push({
            guardianJobId,
            title: rawTitle.replace(/\s+/g, " "),
            recruiter: recruiter.replace(/\s+/g, " "),
            location: location.replace(/\s+/g, " "),
            salary: salary.replace(/\s+/g, " "),
            href: fullUrl,
            dateText
          });
        });
      } catch (fetchErr: any) {
        console.warn(`⚠️ [GUARDIAN CRAWLER] Failed to fetch page ${pageUrl}:`, fetchErr?.message || fetchErr);
      }
    }
  }

  return rawListings;
}

/** Finds the one school (if any) a Guardian listing belongs to, using the recruiter, location and title. Shared by the engine and the check script. */
export function matchGuardianListingToSchool(item: { recruiter: string; location: string; title: string; href: string }, dbSchools: any[]): any {
  const candidateString = item.recruiter ? `${item.recruiter} ${item.location} ${item.title}` : `${item.title} ${item.location}`;
  let matchedSchool: any = null;
  for (const school of dbSchools) {
    const res = matchSchoolEntity(school, {
      candidateText: candidateString,
      sourceUrl: item.href,
      city: item.location
    });
    if (res.isMatch) {
      matchedSchool = school;
      break;
    }
    if (item.recruiter) {
      const directMatch = matchSchoolEntity(school, {
        candidateText: item.recruiter,
        sourceUrl: item.href,
        city: item.location
      });
      if (directMatch.isMatch) {
        matchedSchool = school;
        break;
      }
    }
  }
  return matchedSchool;
}

/**
 * For the clean-up step. Guardian is a SEARCH (the engine only sees a few pages of results), so "not in today's results" does NOT mean a job is gone.
 * Instead every approved Guardian card's OWN page is opened: only a page that says expired (or is gone) counts as taken down.
 * Returns the links that are still live (or could not be checked, which is the safe side). Checks at most 80 cards a night.
 */
export async function guardianLiveUrls(): Promise<string[]> {
  const db = getAdminDb();
  if (!db || typeof db.collection !== "function") return [];
  const snap = await db.collection("featured_jobs_cache").where("status", "==", "approved").get();
  const has = (arr: any) => Array.isArray(arr) && arr.some((x: any) => String(x).toUpperCase() === "GUARDIAN");
  const urls: string[] = [];
  for (const d of snap.docs) {
    const x: any = d.data() || {};
    if (!(String(x.source || "").toUpperCase() === "GUARDIAN" || has(x.sources))) continue;
    const u = (x.sourceUrls && x.sourceUrls["GUARDIAN"]) || (String(x.applyUrl || "").includes("jobs.theguardian.com") ? x.applyUrl : "");
    if (u) urls.push(String(u));
  }
  const live: string[] = [];
  let checked = 0;
  for (const u of urls) {
    if (checked >= 80) { live.push(u); continue; }
    checked++;
    try {
      const res = await axios.get(u, { headers: AXIOS_HEADERS, timeout: 12000, validateStatus: () => true });
      const $ = cheerio.load(typeof res.data === "string" ? res.data : "");
      $("script, style, nav, header, footer").remove();
      const state = guardianPageState(res.status, $("body").text());
      if (state !== "expired") live.push(u);
    } catch {
      live.push(u);
    }
  }
  return live;
}

/**
 * Sweeps Guardian Jobs for international school teaching vacancies
 * and grounds them strictly against canonical database schools.
 */
export async function searchGuardianDbSchools(): Promise<GuardianJobMatch[]> {
  console.log("🛸 [GUARDIAN CRAWLER] Starting automated sweep of Guardian Jobs...");

  try {
    const db = getAdminDb();
    if (!db || typeof db.collection !== "function") {
      console.warn("⚠️ Admin SDK Firestore unavailable for Guardian search.");
      return [];
    }

    const snap = await db.collection("schools").get();
    const dbSchools = snap.docs.map((d: any) => ({
      id: d.id,
      name: d.data().name || d.data().schoolname,
      schoolname: d.data().schoolname || d.data().name,
      city: d.data().city || "",
      country: d.data().country || "",
      aliases: d.data().aliases || [],
      legalNames: d.data().legalNames || d.data().legal_names || [],
      group: d.data().group || d.data().schoolGroup || "",
    }));

    if (dbSchools.length === 0) {
      console.log("ℹ️ No schools found in DB for Guardian matching.");
      return [];
    }

    const rawListings = await harvestGuardianListings();

    console.log(`🛸 [GUARDIAN CRAWLER] Harvested ${rawListings.length} raw listings from Guardian Jobs.`);

    const matches: GuardianJobMatch[] = [];
    const seenJobKeys = new Set<string>();

    for (const item of rawListings) {
      if (isSupportOrNonTeachingRole(item.title)) {
        continue;
      }

      const matchedSchool = matchGuardianListingToSchool(item, dbSchools);

      if (matchedSchool) {
        const jobKey = `${matchedSchool.id}_${item.title.toLowerCase()}`;
        if (seenJobKeys.has(jobKey)) continue;
        seenJobKeys.add(jobKey);

        const cleanJobId = item.guardianJobId ? `guardian_${item.guardianJobId}` : `guardian_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

        matches.push({
          jobId: cleanJobId,
          title: item.title,
          applyUrl: item.href,
          schoolId: matchedSchool.id,
          schoolName: matchedSchool.name || matchedSchool.schoolname,
          city: matchedSchool.city || item.location || "",
          country: matchedSchool.country || "",
          source: "GUARDIAN",
          datePosted: item.dateText ? parseRelativeDate(item.dateText) : new Date().toISOString(),
          closingDate: null,
          salaryRange: item.salary || null
        });
      }
    }

    console.log(`🛸 [GUARDIAN CRAWLER] Grounded ${matches.length} DB-verified vacancies from Guardian Jobs.`);
    return matches;
  } catch (err: any) {
    console.error("❌ Error in searchGuardianDbSchools:", err?.message || err);
    return [];
  }
}

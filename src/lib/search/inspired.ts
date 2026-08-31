import { getAdminDb } from '@/firebase/admin';
import { isSupportOrNonTeachingRole } from '@/lib/crawler/roleClassifier';
import { chromium } from 'playwright';

export interface InspiredJobMatch {
  jobId: string;
  title: string;
  applyUrl: string;
  schoolId: string;
  schoolName: string;
  city: string;
  country: string;
  source: string;
  datePosted?: string | null;
}

/**
 * 🛸 INSPIRED EDUCATION DB-RESTRICTED SEARCH ENGINE
 *
 * Scrapes live vacancies from Inspired Education portal (jobs.inspirededu.com)
 * and strictly filters returned positions to match ONLY schools registered in our database.
 *
 * @param query Optional search query string
 * @returns Array of InspiredJobMatch objects grounded in DB schools
 */
export async function searchInspiredDbSchools(query: string = ""): Promise<InspiredJobMatch[]> {
  try {
    const db = getAdminDb();
    if (!db || typeof db.collection !== 'function') {
      console.warn("⚠️ Admin SDK Firestore unavailable for Inspired DB search.");
      return [];
    }

    // 1. Fetch active Inspired schools from DB
    const snap = await db.collection("schools").get();
    const dbSchools = snap.docs
      .map((d: any) => ({ id: d.id, ...d.data() }))
      .filter((s: any) => {
        const str = JSON.stringify(s).toLowerCase();
        return str.includes("inspired");
      });

    if (dbSchools.length === 0) {
      console.log("ℹ️ No Inspired schools found in DB.");
      return [];
    }

    // 2. Fetch live vacancies using Playwright headless browser
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const searchUrl = query 
      ? `https://jobs.inspirededu.com/search-jobs/${encodeURIComponent(query)}`
      : "https://jobs.inspirededu.com/search-jobs";

    await page.goto(searchUrl, { waitUntil: "networkidle", timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(2000);

    const rawJobs = await page.evaluate(() => {
      const titleLinks = Array.from(document.querySelectorAll("a.jobTitle-link"));
      
      return titleLinks.map(a => {
        const href = (a as HTMLAnchorElement).href || "";
        const title = a.textContent?.trim() || "";

        let container = a.parentElement;
        for (let i = 0; i < 6; i++) {
          if (container && container.textContent && container.textContent.includes("Location")) {
            break;
          }
          if (container) container = container.parentElement;
        }

        const containerText = container ? container.textContent || "" : "";
        const locMatch = containerText.match(/Location\s+([^\n\r]+?)(?=\s+School|\s+Job|\s+Type|$)/i);
        const schoolMatch = containerText.match(/School Name\s+([^\n\r]+?)(?=\s+Title|\s+Select|\s+Job|\s+Type|$)/i);

        return {
          title,
          href,
          location: locMatch ? locMatch[1].trim() : "",
          schoolName: schoolMatch ? schoolMatch[1].trim() : ""
        };
      });
    });

    await browser.close();

    // Deduplicate by applyUrl
    const uniqueJobs = Array.from(new Map(rawJobs.map(j => [j.href, j])).values());
    const matches: InspiredJobMatch[] = [];

    // 3. Match against DB schools only
    for (const job of uniqueJobs) {
      if (!job.title || isSupportOrNonTeachingRole(job.title)) continue;

      const jSchool = (job.schoolName || "").toLowerCase();
      const jLoc = (job.location || "").toLowerCase();
      const jTitle = (job.title || "").toLowerCase();

      const matchedSchool = dbSchools.find((s: any) => {
        const sName = (s.name || s.schoolname || "").toLowerCase().trim();
        if (!sName || sName.length < 4) return false;

        const matchSchoolName = jSchool && (jSchool.includes(sName) || sName.includes(jSchool));
        const matchTitleName = jTitle.includes(sName);
        
        const sCity = (s.city || "").toLowerCase().trim();
        const matchLoc = sCity && sCity.length > 3 && jLoc.includes(sCity);

        return matchSchoolName || matchTitleName || (matchLoc && jSchool.length > 0 && jSchool.includes(sName));
      });

      if (matchedSchool) {
        const seqMatch = job.href.match(/\/(\d+)\/?$/);
        const jobId = seqMatch ? seqMatch[1] : `inspired_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

        matches.push({
          jobId,
          title: job.title,
          applyUrl: job.href,
          schoolId: matchedSchool.id,
          schoolName: matchedSchool.name || matchedSchool.schoolname,
          city: matchedSchool.city || "",
          country: matchedSchool.country || "",
          source: "Inspired Education",
          datePosted: new Date().toISOString()
        });
      }
    }

    console.log(`🛸 [INSPIRED ENGINE] Found ${matches.length} DB-grounded vacancies for query "${query}".`);
    return matches;
  } catch (err: any) {
    console.error("❌ Error in searchInspiredDbSchools:", err?.message || err);
    return [];
  }
}

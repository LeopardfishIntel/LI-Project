import { getAdminDb } from "@/firebase/admin";
import { isSupportOrNonTeachingRole } from "@/lib/crawler/roleClassifier";
import { chromium } from "playwright";
import * as cheerio from "cheerio";

export interface TeachAwayJobMatch {
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
 * 🛸 TEACH AWAY DB-RESTRICTED SEARCH ENGINE
 *
 * Scrapes live postings from Teach Away (teachaway.com/teaching-jobs-abroad)
 * and strictly enforces DB primacy: surfaces ONLY postings matching schools registered
 * in our 251 FLIS Firestore database.
 *
 * @param query Optional search query string
 * @returns Array of TeachAwayJobMatch objects strictly grounded in DB schools
 */
export async function searchTeachAwayDbSchools(query: string = ""): Promise<TeachAwayJobMatch[]> {
  try {
    const db = getAdminDb();
    if (!db || typeof db.collection !== "function") {
      console.warn("⚠️ Admin SDK Firestore unavailable for Teach Away DB search.");
      return [];
    }

    // 1. DB PRIMACY SHORT-CIRCUIT: Load valid schools from DB
    const snap = await db.collection("schools").get();
    let dbSchools = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

    const queryLower = (query || "").toLowerCase().trim();
    if (queryLower) {
      dbSchools = dbSchools.filter((s: any) => {
        const sName = (s.name || s.schoolname || "").toLowerCase();
        const sCity = (s.city || "").toLowerCase();
        const sCountry = (s.country || "").toLowerCase();
        const sAliases = (s.aliases || []).map((a: string) => String(a || "").toLowerCase());

        return (
          sName.includes(queryLower) ||
          sCity.includes(queryLower) ||
          sCountry.includes(queryLower) ||
          sAliases.some((a: string) => a.includes(queryLower))
        );
      });
    }

    // Zero ghost schools short-circuit
    if (dbSchools.length === 0) {
      console.log(`ℹ️ [TEACH AWAY ENGINE] 0 DB schools match query "${query}". Short-circuiting.`);
      return [];
    }

    // 2. Fetch live vacancies from Teach Away using Playwright + Cheerio
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const searchUrl = "https://www.teachaway.com/teaching-jobs-abroad";
    await page.goto(searchUrl, { waitUntil: "networkidle", timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(2000);

    const html = await page.content();
    const $ = cheerio.load(html);

    const rawJobs: Array<{ title: string; href: string; company: string; location: string }> = [];

    $("a[href*='/teaching-jobs-abroad/'], a[href*='/job/']").each((_, el) => {
      const href = $(el).attr("href") || "";
      const title = $(el).text().trim();
      const parentText = $(el).closest("div, article, li, tr").text().trim().replace(/\s+/g, " ");

      if (href && title && title.length > 3 && !title.toLowerCase().includes("view all") && !title.toLowerCase().includes("teaching jobs")) {
        const fullHref = href.startsWith("http") ? href : `https://www.teachaway.com${href}`;
        
        // Extract company / location from parent text snippet
        const compMatch = parentText.match(/School:\s*([^|\n]+)/i) || parentText.match(/Company:\s*([^|\n]+)/i);
        const locMatch = parentText.match(/Location:\s*([^|\n]+)/i);

        rawJobs.push({
          title,
          href: fullHref,
          company: compMatch ? compMatch[1].trim() : title,
          location: locMatch ? locMatch[1].trim() : parentText.substring(0, 100)
        });
      }
    });

    await browser.close();

    // Deduplicate by href
    const uniqueJobs = Array.from(new Map(rawJobs.map(j => [j.href, j])).values());
    const matches: TeachAwayJobMatch[] = [];

    // 3. Strict DB School Grounding Match
    for (const job of uniqueJobs) {
      if (!job.title || isSupportOrNonTeachingRole(job.title)) continue;

      const jCompany = (job.company || "").toLowerCase();
      const jTitle = (job.title || "").toLowerCase();
      const jLoc = (job.location || "").toLowerCase();

      const matchedSchool = dbSchools.find((school: any) => {
        const sName = (school.name || school.schoolname || "").toLowerCase().trim();
        if (!sName || sName.length < 4) return false;

        const directMatch =
          jCompany.includes(sName) ||
          sName.includes(jCompany) ||
          jTitle.includes(sName) ||
          (jLoc.includes(sName) && jLoc.length > 5);

        const aliases: string[] = school.aliases || [];
        const aliasMatch = aliases.some((alias: string) => {
          const aLower = String(alias || "").toLowerCase().trim();
          return aLower.length >= 4 && (jCompany.includes(aLower) || jTitle.includes(aLower));
        });

        return directMatch || aliasMatch;
      });

      if (matchedSchool) {
        const jobId = job.href.split("/").filter(Boolean).pop() || `ta_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

        matches.push({
          jobId,
          title: job.title,
          applyUrl: job.href,
          schoolId: matchedSchool.id,
          schoolName: matchedSchool.name || matchedSchool.schoolname,
          city: matchedSchool.city || "",
          country: matchedSchool.country || "",
          source: "Teach Away",
          datePosted: new Date().toISOString()
        });
      }
    }

    console.log(`🛸 [TEACH AWAY ENGINE] Found ${matches.length} DB-grounded vacancies for query "${query}".`);
    return matches;
  } catch (err: any) {
    console.error("❌ Error in searchTeachAwayDbSchools:", err?.message || err);
    return [];
  }
}

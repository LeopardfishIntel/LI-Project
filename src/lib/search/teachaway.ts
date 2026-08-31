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
 * using employer route URLs, targeted location filters, and TRPC inputs.
 * Strictly enforces DB primacy: surfaces ONLY postings matching schools registered
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

    // 1. DB PRIMACY: Load valid schools from DB that use Teach Away
    const snap = await db.collection("schools").get();
    let dbSchools = snap.docs
      .map((d: any) => ({ id: d.id, ...d.data() }))
      .filter((s: any) => {
        const agency = String(s.agency || "").toLowerCase();
        const str = JSON.stringify(s).toLowerCase();
        return agency.includes("teach away") || agency.includes("teachaway") || str.includes("teachaway");
      });

    if (query.trim()) {
      const qLower = query.toLowerCase().trim();
      dbSchools = dbSchools.filter((s: any) => {
        const sName = (s.name || s.schoolname || "").toLowerCase();
        const sCity = (s.city || "").toLowerCase();
        const sCountry = (s.country || "").toLowerCase();
        const aliases = (s.aliases || []).map((a: string) => String(a || "").toLowerCase());

        return sName.includes(qLower) || sCity.includes(qLower) || sCountry.includes(qLower) || aliases.some((a: string) => a.includes(qLower));
      });
    }

    if (dbSchools.length === 0) {
      console.log(`ℹ️ [TEACH AWAY ENGINE] 0 DB schools match query "${query}". Short-circuiting.`);
      return [];
    }

    // 2. Build targeted search URLs based on known employer routes and country hubs
    const targetUrls: string[] = [
      "https://www.teachaway.com/teaching-jobs-abroad/gems-education",
      "https://www.teachaway.com/teaching-jobs-abroad/aldar-education",
      "https://www.teachaway.com/teaching-jobs-abroad/taaleem",
      "https://www.teachaway.com/teaching-jobs-abroad/qatar-foundation",
      "https://www.teachaway.com/teaching-jobs-abroad/inspired-education",
      "https://www.teachaway.com/teaching-jobs-abroad/bloom-education",
      "https://www.teachaway.com/teaching-jobs-abroad/united-arab-emirates",
      "https://www.teachaway.com/teaching-jobs-abroad/saudi-arabia",
      "https://www.teachaway.com/teaching-jobs-abroad/qatar",
      "https://www.teachaway.com/teaching-jobs-abroad/kuwait",
      "https://www.teachaway.com/teaching-jobs-abroad/vietnam",
      "https://www.teachaway.com/teaching-jobs-abroad/all-countries/certified-teacher/any-subject/any-level"
    ];

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const rawJobsMap = new Map<string, { title: string; href: string; company: string; location: string; text: string }>();

    for (const url of targetUrls) {
      try {
        await page.goto(url, { waitUntil: "networkidle", timeout: 25000 }).catch(() => {});
        await page.waitForTimeout(2000);

        const html = await page.content();
        const $ = cheerio.load(html);

        $("a[href*='/teaching-jobs-abroad/'], a[href*='/job/']").each((_, el) => {
          const href = $(el).attr("href") || "";
          const title = $(el).text().trim();
          const parentText = $(el).closest("div, article, li, tr").text().trim().replace(/\s+/g, " ");

          if (href && title && title.length > 3 && !title.toLowerCase().includes("view all") && !title.toLowerCase().includes("teaching jobs") && !title.toLowerCase().includes("certified")) {
            const fullHref = href.startsWith("http") ? href : `https://www.teachaway.com${href}`;
            
            const compMatch = parentText.match(/School:\s*([^|\n]+)/i) || parentText.match(/Company:\s*([^|\n]+)/i);
            const locMatch = parentText.match(/Location:\s*([^|\n]+)/i);

            rawJobsMap.set(fullHref, {
              title,
              href: fullHref,
              company: compMatch ? compMatch[1].trim() : title,
              location: locMatch ? locMatch[1].trim() : parentText.substring(0, 100),
              text: parentText
            });
          }
        });
      } catch (err) {
        console.warn(`⚠️ Error scraping ${url}:`, err);
      }
    }

    await browser.close();

    const uniqueJobs = Array.from(rawJobsMap.values());
    const matches: TeachAwayJobMatch[] = [];

    // 3. Strict DB School Grounding Match
    for (const job of uniqueJobs) {
      if (!job.title || isSupportOrNonTeachingRole(job.title)) continue;

      const fullText = `${job.title} ${job.company} ${job.location} ${job.text}`.toLowerCase();

      const matchedSchool = dbSchools.find((school: any) => {
        const sName = (school.name || school.schoolname || "").toLowerCase().trim();
        if (!sName || sName.length < 3) return false;

        if (fullText.includes(sName)) return true;

        const aliases: string[] = school.aliases || [];
        if (aliases.some((alias: string) => {
          const aLower = String(alias || "").toLowerCase().trim();
          return aLower.length >= 3 && fullText.includes(aLower);
        })) {
          return true;
        }

        return false;
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

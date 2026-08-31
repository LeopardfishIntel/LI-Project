import { getAdminDb } from "@/firebase/admin";
import { isSupportOrNonTeachingRole } from "@/lib/crawler/roleClassifier";
import * as cheerio from "cheerio";

export interface GlobeducateJobMatch {
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
}

export async function searchGlobeducateDbSchools(query: string = ""): Promise<GlobeducateJobMatch[]> {
  try {
    const db = getAdminDb();
    if (!db || typeof db.collection !== "function") {
      console.warn("⚠️ Admin SDK Firestore unavailable for Globeducate DB search.");
      return [];
    }

    // 1. Fetch active schools from DB
    const snap = await db.collection("schools").get();
    const dbSchools = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

    if (dbSchools.length === 0) {
      console.log("ℹ️ No schools found in DB for Globeducate matching.");
      return [];
    }

    // 2. Fetch live vacancies from central Globeducate ATS portal
    const endpoints = [
      "https://globeducate.schoolrecruiter.com/",
      "https://careers.globeducate.com/work-with-us/opportunities-worldwide"
    ];

    const rawJobs: Array<{ title: string; href: string; locationStr: string; fullText: string }> = [];
    const seenUrls = new Set<string>();

    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          }
        });

        if (res.status !== 200) continue;
        const html = await res.text();
        const $ = cheerio.load(html);

        $(".column, div.job-row, tr, div[class*='job'], .opportunity-card, .job-item, article, li").each((_: any, el: any) => {
          const href = $(el).find("a[href*='/job/'], a[href*='/vacancy/']").attr("href") || $(el).attr("href") || "";
          if (!href || (!href.includes("/job/") && !href.includes("/vacancy/"))) return;

          const cleanHref = href.startsWith("http") ? href : `https://globeducate.schoolrecruiter.com${href}`;
          if (seenUrls.has(cleanHref)) return;
          seenUrls.add(cleanHref);

          const title = $(el).find(".job-title, h2, h3, h4, a").first().text().replace(/^Job Title\s*/i, "").trim();
          const text = $(el).text().replace(/\s+/g, " ").trim();

          rawJobs.push({
            title,
            href: cleanHref,
            locationStr: text,
            fullText: text
          });
        });
      } catch (err) {
        console.warn(`⚠️ Error fetching ${url}:`, err);
      }
    }

    console.log(`泛 [GLOBEDUCATE ENGINE] Scraped ${rawJobs.length} unique raw job listings.`);

    // 3. Ground strictly against DB schools
    const matches: GlobeducateJobMatch[] = [];

    for (const job of rawJobs) {
      if (!job.title || isSupportOrNonTeachingRole(job.title)) continue;

      const fullText = `${job.title} ${job.locationStr} ${job.fullText}`.toLowerCase();

      const matchedSchool = dbSchools.find((s: any) => {
        const sName = (s.name || s.schoolname || "").toLowerCase().trim();
        if (!sName || sName.length < 3) return false;

        if (fullText.includes(sName)) return true;

        // Check city or country match combined with Globeducate brand keywords
        const city = (s.city || "").toLowerCase().trim();
        if (city && city.length >= 3 && fullText.includes(city) && (fullText.includes("globeducate") || fullText.includes("agora") || fullText.includes("nobel") || fullText.includes("ics") || fullText.includes("eib") || fullText.includes("pascal"))) {
          return true;
        }

        const aliases: string[] = Array.isArray(s.aliases) ? s.aliases : [];
        if (aliases.some((a) => a && a.length >= 3 && fullText.includes(String(a).toLowerCase().trim()))) {
          return true;
        }

        return false;
      });

      if (matchedSchool) {
        const slugMatch = job.href.match(/\/job\/([^\/]+)/);
        const jobId = slugMatch ? `globe_${slugMatch[1]}` : `globe_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

        matches.push({
          jobId,
          title: job.title,
          applyUrl: job.href,
          schoolId: matchedSchool.id,
          schoolName: matchedSchool.name || matchedSchool.schoolname,
          city: matchedSchool.city || "",
          country: matchedSchool.country || "",
          source: "Globeducate",
          datePosted: new Date().toISOString(),
          closingDate: null
        });
      }
    }

    console.log(`泛 [GLOBEDUCATE ENGINE] Found ${matches.length} DB-grounded vacancies across Globeducate schools.`);
    return matches;
  } catch (err: any) {
    console.error("❌ Error in searchGlobeducateDbSchools:", err?.message || err);
    return [];
  }
}

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
    const allDbSchools = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

    if (allDbSchools.length === 0) {
      console.log("ℹ️ No schools found in DB for Globeducate matching.");
      return [];
    }

    // Filter to Globeducate candidate schools only (prevent false positive matching to non-Globeducate schools)
    const dbSchools = allDbSchools.filter((s: any) => {
      const grp = (s.group || s.schoolGroup || s.agency || s.groupDomain || "").toLowerCase();
      if (grp.includes("globe")) return true;

      const sName = (s.schoolname || s.name || "").toLowerCase();
      const aliases = (Array.isArray(s.aliases) ? s.aliases : []).map((a: any) => String(a).toLowerCase());

      const brandKeywords = [
        "agora", "ics milan", "ics paris", "nobel algarve", "ermitage",
        "st. george's", "st george's", "nice", "mougins", "pascal", "cambridge house", "peleteiro", "eib"
      ];

      return brandKeywords.some((bk) => sName.includes(bk) || aliases.some((a: any) => a.includes(bk)));
    });

    // 2. Fetch live vacancies from central Globeducate ATS portal
    const endpoints = [
      "https://globeducate.schoolrecruiter.com/",
      "https://careers.globeducate.com/work-with-us/opportunities-worldwide"
    ];

    const rawJobs: Array<{
      title: string;
      href: string;
      portalSchool: string;
      portalCity: string;
      fullText: string;
    }> = [];
    const seenUrls = new Set<string>();

    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          }
        });

        if (res.status !== 200) continue;
        const html = await res.text();
        const $ = cheerio.load(html);

        const items = $(
          ".column.contsearch, .column, div.job-row, tr, div[class*='job'], .opportunity-card, .job-item, article, li"
        );

        items.each((_: any, el: any) => {
          const href = $(el).find("a[href*='/job/'], a[href*='/vacancy/']").attr("href") || $(el).attr("href") || "";
          if (!href || (!href.includes("/job/") && !href.includes("/vacancy/"))) return;

          const cleanHref = href.startsWith("http") ? href : `https://globeducate.schoolrecruiter.com${href}`;

          const text = $(el).text().replace(/\s+/g, " ").trim();
          if (text.length < 25) return;

          if (seenUrls.has(cleanHref)) return;
          seenUrls.add(cleanHref);

          const title = $(el).find(".job-title, h2, h3, h4, a").first().text().replace(/^Job Title\s*/i, "").trim();

          const schoolMatch = text.match(
            /School\s*(.*?)(?=\s*(Salary|Hours|Description|Contract Type|Career Group|Posted|IsHMC|Phase|Role|Subject|$))/i
          );
          const portalSchool = schoolMatch ? schoolMatch[1].trim() : "";

          const locMatch = text.match(
            /Location\s*(.*?)(?=\s*(Posted|School|Salary|Hours|Description|Contract Type|Career Group|IsHMC|Phase|Role|Subject|$))/i
          );
          const portalLoc = locMatch ? locMatch[1].trim() : "";
          const portalCity = portalLoc.split(",")[0].trim();

          rawJobs.push({
            title,
            href: cleanHref,
            portalSchool,
            portalCity,
            fullText: text
          });
        });
      } catch (err) {
        console.warn(`⚠️ Error fetching ${url}:`, err);
      }
    }

    console.log(`泛 [GLOBEDUCATE ENGINE] Scraped ${rawJobs.length} unique raw job listings.`);

    // 3. Ground strictly against Globeducate DB schools
    const matches: GlobeducateJobMatch[] = [];

    for (const job of rawJobs) {
      if (!job.title || isSupportOrNonTeachingRole(job.title)) continue;

      const normText = `${job.title} ${job.portalSchool} ${job.portalCity} ${job.fullText}`
        .toLowerCase()
        .replace(/[’']/g, "'");
      const normPortalSchool = job.portalSchool.toLowerCase().replace(/[’']/g, "'");
      const normPortalCity = job.portalCity.toLowerCase();

      let bestMatch: any = null;
      let maxScore = 0;

      for (const cand of dbSchools) {
        const cName = (cand.schoolname || cand.name || "").toLowerCase().trim().replace(/[’']/g, "'");
        const cCity = (cand.city || "").toLowerCase().trim();
        const aliases: string[] = (Array.isArray(cand.aliases) ? cand.aliases : []).map((a: any) => String(a).toLowerCase().trim().replace(/[’']/g, "'")
        );

        let score = 0;

        // 1. Direct school name / alias match against extracted portal school name
        if (normPortalSchool) {
          if (normPortalSchool === cName) score += 100;
          else if (cName.length >= 5 && (normPortalSchool.includes(cName) || cName.includes(normPortalSchool)))
            score += 80;

          if (aliases.some((a) => a.length >= 3 && (normPortalSchool.includes(a) || a.includes(normPortalSchool))))
            score += 85;
        }

        // 2. Full text match on school name / aliases
        if (cName.length >= 6 && normText.includes(cName)) score += 70;
        if (aliases.some((a) => a.length >= 4 && normText.includes(a))) score += 65;

        // 3. City match bonus
        if (cCity && cCity.length >= 3 && (normPortalCity === cCity || normText.includes(cCity))) {
          score += 20;
        }

        if (score > maxScore) {
          maxScore = score;
          bestMatch = cand;
        }
      }

      // Require strict threshold of score >= 80 to prevent fluffy mismatches
      const matchedSchool = maxScore >= 80 ? bestMatch : null;

      if (matchedSchool) {
        const slugMatch = job.href.match(/\/job\/([^\/]+)/);
        const jobId = slugMatch
          ? `globe_${slugMatch[1]}`
          : `globe_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

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

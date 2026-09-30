import { getAdminDb } from "@/firebase/admin";
import { isSupportOrNonTeachingRole } from "@/lib/crawler/roleClassifier";
import { matchSchoolEntity } from "@/lib/crawler/entityMatcher";
import * as cheerio from "cheerio";

export interface UwcJobMatch {
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

export async function searchUwcDbSchools(query: string = ""): Promise<UwcJobMatch[]> {
  try {
    const db = getAdminDb();
    if (!db || typeof db.collection !== "function") {
      console.warn("⚠️ Admin SDK Firestore unavailable for UWC DB search.");
      return [];
    }

    // 1. Query all valid UWC / United World College schools from DB
    const snap = await db.collection("schools").get();
    const dbSchools = snap.docs
      .map((d: any) => ({
        id: d.id,
        name: d.data().name || d.data().schoolname,
        schoolname: d.data().schoolname || d.data().name,
        city: d.data().city || "",
        country: d.data().country || "",
        aliases: d.data().aliases || [],
        legalNames: d.data().legalNames || d.data().legal_names || [],
        ...d.data(),
      }))
      .filter((s: any) => {
        const str = JSON.stringify(s).toLowerCase();
        return str.includes("uwc") || str.includes("united world college");
      });

    if (dbSchools.length === 0) {
      console.log("ℹ️ No UWC schools found in DB.");
      return [];
    }

    // 2. Fetch live vacancies from UWC central directory
    const pages = [
      "https://uwc.org/careers/vacancies/",
      "https://uwc.org/careers/vacancies/page/2/",
      "https://uwc.org/careers/vacancies/page/3/"
    ];

    const rawJobs: Array<{ title: string; href: string; campus: string; text: string }> = [];

    for (const pageUrl of pages) {
      try {
        const res = await fetch(pageUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          }
        });

        if (res.status !== 200) continue;
        const html = await res.text();
        const $ = cheerio.load(html);

        $(".careers-list-item, div.career-card, div.card, article, tr, li").each((_: any, el: any) => {
          const href = $(el).find("a[href*='/career/']").attr("href") || $(el).attr("href") || "";
          if (!href || !href.includes("/career/")) return;

          const title = $(el).find("h2, h3, h4, .title, a").first().text().trim();
          const text = $(el).text().replace(/\s+/g, " ").trim();

          // Filter out administrative / non-campus London Office roles
          if (text.toLowerCase().includes("london office") || text.toLowerCase().includes("international office")) {
            return;
          }

          const campusMatch = text.match(/(UWC[^'"\n\r(|]+|Pearson College UWC[^'"\n\r(|]+)/i);
          const campus = campusMatch ? campusMatch[1].trim() : "";

          rawJobs.push({ title, href, campus, text });
        });
      } catch (err) {
        console.warn(`⚠️ Error fetching ${pageUrl}:`, err);
      }
    }

    // Deduplicate raw jobs by href
    const uniqueRawJobs = Array.from(new Map(rawJobs.map((j) => [j.href, j])).values());
    const matches: UwcJobMatch[] = [];

    // 3. Ground strictly against DB schools
    for (const job of uniqueRawJobs) {
      if (!job.title || isSupportOrNonTeachingRole(job.title)) continue;

      const candidateText = job.campus ? `${job.campus} ${job.title}` : `${job.title} ${job.text}`;

      let bestSchool: any = null;
      let bestScore = 0;

      for (const school of dbSchools) {
        const matchRes = matchSchoolEntity(
          school,
          {
            candidateText,
            sourceUrl: job.href,
          },
          0.85
        );

        if (matchRes.isMatch && matchRes.score > bestScore) {
          bestScore = matchRes.score;
          bestSchool = school;
        }

        if (job.campus) {
          const campusMatch = matchSchoolEntity(
            school,
            {
              candidateText: job.campus,
              sourceUrl: job.href,
            },
            0.85
          );
          if (campusMatch.isMatch && campusMatch.score > bestScore) {
            bestScore = campusMatch.score;
            bestSchool = school;
          }
        }
      }

      if (bestSchool && bestScore >= 0.85) {
        const slugMatch = job.href.match(/\/career\/([^\/]+)/);
        const jobId = slugMatch ? `uwc_${slugMatch[1]}` : `uwc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

        matches.push({
          jobId,
          title: job.title,
          applyUrl: job.href,
          schoolId: bestSchool.id,
          schoolName: bestSchool.name || bestSchool.schoolname,
          city: bestSchool.city || "",
          country: bestSchool.country || "",
          source: "UWC",
          datePosted: new Date().toISOString(),
          closingDate: null,
        });
      }
    }

    console.log(`🛸 [UWC ENGINE] Found ${matches.length} DB-grounded vacancies across UWC schools.`);
    return matches;
  } catch (err: any) {
    console.error("❌ Error in searchUwcDbSchools:", err?.message || err);
    return [];
  }
}

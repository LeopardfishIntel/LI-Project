import { getAdminDb } from "@/firebase/admin";
import { isSupportOrNonTeachingRole } from "@/lib/crawler/roleClassifier";
import { isEngineCoolingDown, tripEngineCoolingDown, injectRequestJitter, twoPassDifferentialFilter } from "@/lib/crawler/safetyEngine";
import * as cheerio from "cheerio";

export interface TaylorsJobMatch {
  jobId: string;
  title: string;
  applyUrl: string;
  schoolId: string;
  schoolName: string;
  city: string;
  country: string;
  source: string;
}

export async function searchTaylorsDbSchools(query: string = ""): Promise<TaylorsJobMatch[]> {
  const ENGINE_KEY = "TAYLORS";

  if (await isEngineCoolingDown(ENGINE_KEY)) {
    return [];
  }

  try {
    const db = getAdminDb();
    if (!db || typeof db.collection !== "function") return [];

    const snap = await db.collection("schools").get();
    const dbSchools = snap.docs
      .map((d: any) => ({ id: d.id, ...d.data() }))
      .filter((s: any) => {
        const str = JSON.stringify(s).toLowerCase();
        return str.includes("taylor") || str.includes("taylors") || str.includes("garden international");
      });

    if (dbSchools.length === 0) return [];

    const targetUrl = "https://taylors.edu.my/careers";
    await injectRequestJitter(1500, 3500);

    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });

    if (res.status === 429 || res.status === 403) {
      await tripEngineCoolingDown(ENGINE_KEY, `HTTP ${res.status} Access Restricted`, res.status);
      return [];
    }

    if (res.status !== 200) return [];

    const html = await res.text();
    const $ = cheerio.load(html);

    const candidateJobs: Array<{ jobId: string; title: string; applyUrl: string; schoolStr: string }> = [];

    $("a[href*='job'], .job-item, article, tr, li").each((_: any, el: any) => {
      const href = $(el).find("a").attr("href") || $(el).attr("href") || "";
      if (!href || (!href.includes("job") && !href.includes("vacancy"))) return;

      const cleanUrl = href.startsWith("http") ? href : `https://taylors.edu.my${href}`;
      const title = $(el).find("h2, h3, h4, a").first().text().trim();
      const text = $(el).text().replace(/\s+/g, " ").trim();

      const slugMatch = cleanUrl.split("/").pop() || `taylors_${Date.now()}`;

      candidateJobs.push({
        jobId: `taylors_${slugMatch}`,
        title,
        applyUrl: cleanUrl,
        schoolStr: text
      });
    });

    const { newItems } = await twoPassDifferentialFilter(ENGINE_KEY, candidateJobs);

    const matches: TaylorsJobMatch[] = [];

    for (const job of newItems) {
      if (!job.title || isSupportOrNonTeachingRole(job.title)) continue;
      const fullText = `${job.title} ${job.schoolStr}`.toLowerCase();

      const matchedSchool = dbSchools.find((s: any) => {
        const sName = (s.name || s.schoolname || "").toLowerCase().trim();
        return sName && sName.length >= 3 && fullText.includes(sName);
      });

      if (matchedSchool) {
        matches.push({
          jobId: job.jobId,
          title: job.title,
          applyUrl: job.applyUrl,
          schoolId: matchedSchool.id,
          schoolName: matchedSchool.name || matchedSchool.schoolname,
          city: matchedSchool.city || "Kuala Lumpur",
          country: matchedSchool.country || "Malaysia",
          source: "Taylor's Group"
        });
      }
    }

    return matches;
  } catch (err: any) {
    console.error("❌ Error in searchTaylorsDbSchools:", err?.message || err);
    return [];
  }
}

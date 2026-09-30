import { getAdminDb } from "@/firebase/admin";
import { isStrictAcademicTeachingRole } from "@/lib/crawler/roleClassifier";
import { matchSchoolEntity, SchoolEntity } from "@/lib/crawler/entityMatcher";
import { isEngineCoolingDown, tripEngineCoolingDown, injectRequestJitter, twoPassDifferentialFilter } from "@/lib/crawler/safetyEngine";
import { chromium } from "playwright";

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

// The real Taylor's Education Group careers portal is an SAP SuccessFactors
// portal at careers.taylors.edu.my/search/. It renders a paginated table of
// positions across the whole Taylor's network (Taylor's University, Taylor's
// International Schools, Garden International School, and Nexus International Schools).
const TAYLORS_BASE_URL = "https://careers.taylors.edu.my";

async function scrapeTaylorsPortal(): Promise<Array<{ jobId: string; title: string; applyUrl: string; schoolStr: string }>> {
  const browser = await chromium.launch({ headless: true });
  const candidateJobs: Array<{ jobId: string; title: string; applyUrl: string; schoolStr: string }> = [];

  try {
    const page = await browser.newPage();
    const initialUrl = `${TAYLORS_BASE_URL}/search/?q=&startrow=0`;
    await page.goto(initialUrl, { waitUntil: "commit", timeout: 45000 });
    await page.waitForSelector("tr.data-row", { timeout: 25000 }).catch(() => {});

    // Parse total job count from header (e.g., "Results 1 – 10 of 155")
    const totalResults = await page.evaluate(() => {
      const text = document.body.innerText;
      const match = text.match(/Results\s+\d+\s+[–-]\s+\d+\s+of\s+(\d+)/i);
      return match ? parseInt(match[1], 10) : 10;
    });

    const maxLimit = Math.min(totalResults, 250);
    const seenUrls = new Set<string>();

    for (let start = 0; start < maxLimit; start += 10) {
      if (start > 0) {
        const pageUrl = `${TAYLORS_BASE_URL}/search/?q=&startrow=${start}`;
        await page.goto(pageUrl, { waitUntil: "commit", timeout: 35000 }).catch(() => {});
        await page.waitForSelector("tr.data-row", { timeout: 20000 }).catch(() => {});
      }

      const rows = await page.evaluate(() => {
        return Array.from(document.querySelectorAll("tr.data-row")).map((tr) => {
          const a = tr.querySelector(".colTitle a");
          const title = a?.textContent?.trim() || "";
          const href = a?.getAttribute("href") || "";
          const facility = tr.querySelector(".jobFacility")?.textContent?.trim() || "";
          const location = tr.querySelector(".jobLocation")?.textContent?.trim() || "";
          return { title, href, facility, location };
        });
      });

      for (const r of rows) {
        if (!r.href || !r.title) continue;
        const fullHref = r.href.startsWith("http") ? r.href : `${TAYLORS_BASE_URL}${r.href}`;
        if (seenUrls.has(fullHref)) continue;
        seenUrls.add(fullHref);

        const slugMatch = fullHref.split("/").filter(Boolean).pop() || `taylors_${Date.now()}`;
        candidateJobs.push({
          jobId: `taylors_${slugMatch}`,
          title: r.title,
          applyUrl: fullHref,
          schoolStr: `${r.facility} ${r.location}`.trim(),
        });
      }
    }
  } finally {
    await browser.close();
  }

  return candidateJobs;
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
        return str.includes("taylor") || str.includes("taylors") || str.includes("garden international") || str.includes("nexus international");
      });

    if (dbSchools.length === 0) return [];

    await injectRequestJitter(1500, 3500);

    let candidateJobs: Array<{ jobId: string; title: string; applyUrl: string; schoolStr: string }> = [];
    try {
      candidateJobs = await scrapeTaylorsPortal();
    } catch (err: any) {
      const msg = String(err?.message || err);
      if (/429|403|forbidden|too many/i.test(msg)) {
        await tripEngineCoolingDown(ENGINE_KEY, `Playwright fetch blocked: ${msg}`, 429);
      }
      console.warn("⚠️ Taylor's portal scrape error:", msg);
      return [];
    }

    if (candidateJobs.length === 0) return [];

    const { newItems } = await twoPassDifferentialFilter(ENGINE_KEY, candidateJobs);

    const matches: TaylorsJobMatch[] = [];

    for (const job of newItems) {
      if (!job.title || !isStrictAcademicTeachingRole(job.title)) continue;

      // Normalise parentheses so "Nexus International School (Singapore)" maps cleanly to
      // canonical "Nexus International School Singapore"
      const cleanCandidate = `${job.title} ${job.schoolStr}`.replace(/[()]/g, " ").replace(/\s+/g, " ").trim();

      let matchedSchool: any = null;
      let bestScore = 0;
      for (const s of dbSchools) {
        const schoolEntity: SchoolEntity = {
          id: s.id,
          name: s.name || s.schoolname,
          schoolname: s.schoolname || s.name,
          city: s.city,
          country: s.country,
          aliases: Array.isArray(s.aliases) ? s.aliases : [],
          legalNames: Array.isArray(s.legalNames) ? s.legalNames : (Array.isArray(s.legal_names) ? s.legal_names : []),
        };
        const res = matchSchoolEntity(schoolEntity, { candidateText: cleanCandidate });
        if (res.isMatch && res.score > bestScore) {
          bestScore = res.score;
          matchedSchool = s;
        }
      }

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

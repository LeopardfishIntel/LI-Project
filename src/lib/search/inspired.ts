import { getAdminDb } from "@/firebase/admin";
import { isSupportOrNonTeachingRole } from "@/lib/crawler/roleClassifier";
import { chromium } from "playwright";

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
  closingDate?: string | null;
}

export async function searchInspiredDbSchools(query: string = ""): Promise<InspiredJobMatch[]> {
  try {
    const db = getAdminDb();
    if (!db || typeof db.collection !== "function") {
      console.warn("⚠️ Admin SDK Firestore unavailable for Inspired DB search.");
      return [];
    }

    // 1. Fetch active Inspired schools from DB
    const snap = await db.collection("schools").get();
    const dbSchools = snap.docs
      .map((d: any) => ({ id: d.id, ...d.data() }))
      .filter((s: any) => {
        const str = JSON.stringify(s).toLowerCase();
        return str.includes("inspired") || (s.ownership && s.ownership.toLowerCase().includes("inspired"));
      });

    if (dbSchools.length === 0) {
      console.log("ℹ️ No Inspired schools found in DB.");
      return [];
    }

    // Build targeted search terms from DB schools and aliases
    const searchTerms: string[] = query ? [query] : ["PaRK", "Alfragide", "King", "St George", "Heritage", "ACG", "Brookhouse", "Downe House", "St John", "Lisbon"];
    if (!query) {
      dbSchools.forEach((s: any) => {
        const sName = s.name || s.schoolname || "";
        if (sName) searchTerms.push(sName);
        const aliases = Array.isArray(s.aliases) ? s.aliases : [];
        aliases.forEach((a: string) => { if (a && a.length >= 3) searchTerms.push(a); });
      });
    }

    // Clean & deduplicate search terms
    const uniqueTerms = Array.from(new Set(searchTerms.map((t) => t.trim()))).filter((t) => t.length >= 3);

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const rawJobsMap = new Map<string, { title: string; href: string; location: string; schoolName: string; text: string }>();

    // Execute direct URL search queries for each targeted school term
    for (const term of uniqueTerms) {
      try {
        const searchUrl = `https://jobs.inspirededu.com/search-jobs/${encodeURIComponent(term)}`;
        await page.goto(searchUrl, { waitUntil: "networkidle", timeout: 25000 }).catch(() => {});
        await page.waitForTimeout(1500);

        const extracted = await page.evaluate(() => {
          const titleLinks = Array.from(document.querySelectorAll("a.jobTitle-link, a[href*='/job/']"));
          const items: Array<{ title: string; href: string; location: string; schoolName: string; text: string }> = [];

          titleLinks.forEach((a) => {
            const href = (a as HTMLAnchorElement).href || "";
            const title = a.textContent?.trim() || "";
            if (!href || !title || title.length < 3) return;

            const row = a.closest("tr") || a.closest(".job-tile") || a.closest("div[class*='job']") || a.parentElement?.parentElement;
            const rowText = row ? row.textContent?.replace(/\s+/g, " ").trim() || "" : "";

            const locMatch = rowText.match(/Location\s+([^\n\r|]+?)(?=\s+School|\s+Job|\s+Type|\s+Contract|\s+Closing|$)/i);
            const schoolMatch = rowText.match(/School Name\s+([^\n\r|]+?)(?=\s+Title|\s+Select|\s+Job|\s+Type|\s+Contract|\s+Closing|$)/i);

            items.push({
              title,
              href,
              location: locMatch ? locMatch[1].trim() : "",
              schoolName: schoolMatch ? schoolMatch[1].trim() : "",
              text: rowText,
            });
          });

          return items;
        });

        extracted.forEach((item) => {
          if (!rawJobsMap.has(item.href)) {
            rawJobsMap.set(item.href, item);
          }
        });
      } catch (err) {
        console.warn(`⚠️ Error searching term "${term}":`, err);
      }
    }

    await browser.close();

    const uniqueJobs = Array.from(rawJobsMap.values());
    const matches: InspiredJobMatch[] = [];

    // Match against DB schools strictly
    for (const job of uniqueJobs) {
      if (!job.title || isSupportOrNonTeachingRole(job.title)) continue;

      const fullText = `${job.title} ${job.schoolName} ${job.location} ${job.text}`.toLowerCase();

      const matchedSchool = dbSchools.find((s: any) => {
        const sName = (s.name || s.schoolname || "").toLowerCase().trim();
        if (!sName || sName.length < 3) return false;

        if (fullText.includes(sName)) return true;

        const aliases: string[] = Array.isArray(s.aliases) ? s.aliases : [];
        if (aliases.some((a) => a && a.length >= 3 && fullText.includes(String(a).toLowerCase().trim()))) {
          return true;
        }

        return false;
      });

      if (matchedSchool) {
        const seqMatch = job.href.match(/\/(\d+)\/?$/);
        const jobId = seqMatch ? seqMatch[1] : `inspired_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

        // Closing date extraction from rowText
        const closingMatch = job.text.match(/Closing Date\s+([^\n\r|]+?)(?=\s+Location|\s+School|\s+Select|$)/i);
        const closingDateRaw = closingMatch ? closingMatch[1].trim() : null;

        matches.push({
          jobId,
          title: job.title,
          applyUrl: job.href,
          schoolId: matchedSchool.id,
          schoolName: matchedSchool.name || matchedSchool.schoolname,
          city: matchedSchool.city || "",
          country: matchedSchool.country || "",
          source: "Inspired Education",
          datePosted: new Date().toISOString(),
          closingDate: closingDateRaw,
        });
      }
    }

    console.log(`🛸 [INSPIRED ENGINE] Found ${matches.length} DB-grounded vacancies across Inspired schools.`);
    return matches;
  } catch (err: any) {
    console.error("❌ Error in searchInspiredDbSchools:", err?.message || err);
    return [];
  }
}

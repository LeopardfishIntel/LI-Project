import { getAdminDb } from "@/firebase/admin";
import { isSupportOrNonTeachingRole } from "@/lib/crawler/roleClassifier";
import { chromium } from "playwright";

export interface MalvernJobMatch {
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

export async function searchMalvernDbSchools(query: string = ""): Promise<MalvernJobMatch[]> {
  try {
    const db = getAdminDb();
    if (!db || typeof db.collection !== "function") {
      console.warn("⚠️ Admin SDK Firestore unavailable for Malvern DB search.");
      return [];
    }

    // 1. Fetch all valid schools from DB
    const snap = await db.collection("schools").get();
    const dbSchools = snap.docs
      .map((d: any) => ({ id: d.id, ...d.data() }))
      .filter((s: any) => {
        const str = JSON.stringify(s).toLowerCase();
        return str.includes("malvern") || (s.ownership && String(s.ownership).toLowerCase().includes("malvern"));
      });

    if (dbSchools.length === 0) {
      console.log("ℹ️ No Malvern schools found in DB.");
      return [];
    }

    // 2. Fetch live vacancies from Malvern College Family portal & embedded widget
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const portalUrl = "https://www.malverncollegefamily.org/work-with-us/current-vacancies/";
    await page.goto(portalUrl, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(2000);

    // Extract iframe src if present
    const iframeSrc = await page.evaluate(() => {
      const iframe = document.querySelector("iframe[src*='tes.com']") as HTMLIFrameElement;
      return iframe ? iframe.src : "";
    });

    if (iframeSrc) {
      await page.goto(iframeSrc, { waitUntil: "networkidle", timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(2000);
    }

    const rawJobs = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll("a[href*='/jobs/vacancy/'], a[href*='/job/'], a.job-title-link"));
      const items: Array<{ title: string; href: string; text: string }> = [];

      links.forEach((a) => {
        const href = (a as HTMLAnchorElement).href || "";
        const title = a.textContent?.trim() || "";
        if (!href || !title || title.length < 3) return;

        const container = a.closest("article, tr, li, div[class*='job']") || a.parentElement?.parentElement;
        const text = container ? container.textContent?.replace(/\s+/g, " ").trim() || "" : "";

        items.push({ title, href, text });
      });

      const unique = new Map<string, { title: string; href: string; text: string }>();
      items.forEach((i) => { if (!unique.has(i.href)) unique.set(i.href, i); });
      return Array.from(unique.values());
    });

    await browser.close();

    const matches: MalvernJobMatch[] = [];

    // 3. Ground strictly against DB schools
    for (const job of rawJobs) {
      if (!job.title || isSupportOrNonTeachingRole(job.title)) continue;

      const fullText = `${job.title} ${job.text}`.toLowerCase();

      const matchedSchool = dbSchools.find((s: any) => {
        const sName = (s.name || s.schoolname || "").toLowerCase().trim();
        if (!sName || sName.length < 3) return false;

        if (fullText.includes(sName)) return true;

        // Check city or country match combined with "malvern"
        const city = (s.city || "").toLowerCase().trim();
        if (city && city.length >= 3 && fullText.includes(city) && fullText.includes("malvern")) {
          return true;
        }

        const aliases: string[] = Array.isArray(s.aliases) ? s.aliases : [];
        if (aliases.some((a) => a && a.length >= 3 && fullText.includes(String(a).toLowerCase().trim()))) {
          return true;
        }

        return false;
      });

      if (matchedSchool) {
        const tesIdMatch = job.href.match(/-(\d+)\/?$/) || job.href.match(/\/(\d+)\/?$/);
        const jobId = tesIdMatch ? tesIdMatch[1] : `malvern_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

        matches.push({
          jobId,
          title: job.title,
          applyUrl: job.href,
          schoolId: matchedSchool.id,
          schoolName: matchedSchool.name || matchedSchool.schoolname,
          city: matchedSchool.city || "",
          country: matchedSchool.country || "",
          source: "Malvern College",
          datePosted: new Date().toISOString(),
          closingDate: null,
        });
      }
    }

    console.log(`🛸 [MALVERN ENGINE] Found ${matches.length} DB-grounded vacancies across Malvern schools.`);
    return matches;
  } catch (err: any) {
    console.error("❌ Error in searchMalvernDbSchools:", err?.message || err);
    return [];
  }
}

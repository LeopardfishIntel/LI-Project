import { getAdminDb } from "@/firebase/admin";
import { isSupportOrNonTeachingRole } from "@/lib/crawler/roleClassifier";
import { 
  isEngineCoolingDown, 
  tripEngineCoolingDown, 
  injectRequestJitter, 
  twoPassDifferentialFilter,
  setEngineWafFallback
} from "@/lib/crawler/safetyEngine";
import * as cheerio from "cheerio";
import { chromium } from "playwright";
import { HttpsProxyAgent } from "https-proxy-agent";

export interface TeacherHorizonsJobMatch {
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

const STEALTH_HEADERS: Readonly<Record<string, string>> = Object.freeze({
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  "Accept":
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "sec-ch-ua": '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"macOS"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
  "Cache-Control": "max-age=0"
}) as Readonly<Record<string, string>>;

/**
 * Resilient fetcher with rotating proxy support and Playwright stealth fallback
 */
async function fetchWithResilience(url: string, engineKey: string): Promise<string | null> {
  const proxyUrl = process.env.RESIDENTIAL_PROXY_URL || process.env.PROXY_URL || process.env.HTTP_PROXY;
  const agent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;

  // Pass 1: Fast HTTP fetch with modern stealth headers and proxy if configured
  try {
    const fetchOptions: any = {
      headers: STEALTH_HEADERS,
      redirect: "follow",
    };
    if (agent) {
      fetchOptions.agent = agent;
    }

    const res = await fetch(url, fetchOptions);

    if (res.status === 200) {
      const html = await res.text();
      // Ensure response is actual HTML and not a Cloudflare challenge page
      if (html.includes("/jobs/") || html.includes("job-item") || html.includes("teacherhorizons")) {
        return html;
      }
    }

    console.warn(`⚠️ [TEACHER HORIZONS] Direct fetch received HTTP ${res.status}. Falling back to stealth browser.`);
  } catch (fetchErr: any) {
    console.warn(`⚠️ [TEACHER HORIZONS] Direct fetch failed (${fetchErr?.message || fetchErr}). Falling back to stealth browser.`);
  }

  // Pass 2: Playwright Stealth Browser Fallback on 403 / 429 / WAF challenges
  let browser = null;
  try {
    const launchOptions: any = { headless: true };
    if (proxyUrl) {
      launchOptions.proxy = { server: proxyUrl };
    }

    browser = await chromium.launch(launchOptions);
    const context = await browser.newContext({
      userAgent: STEALTH_HEADERS["User-Agent"],
      viewport: { width: 1280, height: 800 },
      locale: "en-US",
      extraHTTPHeaders: {
        "Accept-Language": STEALTH_HEADERS["Accept-Language"],
        "sec-ch-ua": STEALTH_HEADERS["sec-ch-ua"],
      },
    });

    const page = await context.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 25000 }).catch(() => {});
    await page.waitForTimeout(2000);

    const html = await page.content();
    await browser.close();
    browser = null;

    if (html && (html.includes("/jobs/") || html.includes("teacherhorizons"))) {
      await setEngineWafFallback(engineKey, false, "Stealth browser successfully resolved page");
      return html;
    }
  } catch (browserErr: any) {
    console.warn(`⚠️ [TEACHER HORIZONS] Stealth browser fallback error:`, browserErr?.message || browserErr);
    if (browser) {
      await browser.close().catch(() => {});
    }
  }

  // If both direct fetch and stealth fallback failed, trip a soft graduated cooldown (2 hours)
  await tripEngineCoolingDown(engineKey, "WAF Challenge / Rate Limited across all fallback tiers", 429);
  return null;
}

export async function searchTeacherHorizonsDbSchools(query: string = ""): Promise<TeacherHorizonsJobMatch[]> {
  const ENGINE_KEY = "TEACHER_HORIZONS";

  if (await isEngineCoolingDown(ENGINE_KEY)) {
    return [];
  }

  try {
    const db = getAdminDb();
    if (!db || typeof db.collection !== "function") return [];

    const snap = await db.collection("schools").get();
    const dbSchools = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

    if (dbSchools.length === 0) return [];

    const targetUrl = "https://www.teacherhorizons.com/search/jobs";
    
    // Inject dynamic request jitter (2.5s to 5.0s)
    await injectRequestJitter(2500, 5000);

    const html = await fetchWithResilience(targetUrl, ENGINE_KEY);
    if (!html) return [];

    const $ = cheerio.load(html);
    const candidateJobs: Array<{ jobId: string; title: string; applyUrl: string; schoolStr: string }> = [];

    $("a[href*='/jobs/'], .job-item, article, tr, li").each((_: any, el: any) => {
      const href = $(el).find("a").attr("href") || $(el).attr("href") || "";
      if (!href || !href.includes("/jobs/")) return;

      const cleanUrl = href.startsWith("http") ? href : `https://www.teacherhorizons.com${href}`;
      const title = $(el).find("h2, h3, h4, a").first().text().trim();
      const text = $(el).text().replace(/\s+/g, " ").trim();

      const slugMatch = cleanUrl.split("/").pop() || `th_${Date.now()}`;

      candidateJobs.push({
        jobId: `th_${slugMatch}`,
        title,
        applyUrl: cleanUrl,
        schoolStr: text
      });
    });

    const { newItems } = await twoPassDifferentialFilter(ENGINE_KEY, candidateJobs);
    const matches: TeacherHorizonsJobMatch[] = [];

    for (const job of newItems) {
      if (!job.title || isSupportOrNonTeachingRole(job.title)) continue;
      const fullText = `${job.title} ${job.schoolStr}`.toLowerCase();

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
        matches.push({
          jobId: job.jobId,
          title: job.title,
          applyUrl: job.applyUrl,
          schoolId: matchedSchool.id,
          schoolName: matchedSchool.name || matchedSchool.schoolname,
          city: matchedSchool.city || "",
          country: matchedSchool.country || "",
          source: "Teacher Horizons",
          datePosted: new Date().toISOString(),
          closingDate: null
        });
      }
    }

    console.log(`🛸 [TEACHER HORIZONS ENGINE] Discovered ${matches.length} DB-grounded vacancies.`);
    return matches;
  } catch (err: any) {
    console.error("❌ Error in searchTeacherHorizonsDbSchools:", err?.message || err);
    return [];
  }
}

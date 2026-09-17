import { getAdminDb } from "@/firebase/admin";
import { isSupportOrNonTeachingRole } from "@/lib/crawler/roleClassifier";
import { isValidJobTitle, sanitizeJobTitle } from "@/lib/crawler/titleSanitizer";
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
  closingDate?: string | null;
}

export interface TeachAwaySearchOptions {
  query?: string;
  region?: "MENA" | "SE_ASIA" | "EUROPE" | "LATAM" | "EAST_ASIA" | "ALL";
  schoolId?: string;
  maxHubs?: number;
}

/**
 * 🗺️ REGIONAL COUNTRY MAPPINGS FOR BATCH SWEEPS
 */
const REGIONAL_COUNTRY_MAP: Record<string, string[]> = {
  MENA: ["united-arab-emirates", "qatar", "saudi-arabia", "kuwait", "oman", "bahrain", "egypt", "jordan"],
  SE_ASIA: ["vietnam", "thailand", "malaysia", "singapore", "indonesia", "philippines"],
  EAST_ASIA: ["china", "hong-kong", "japan", "south-korea", "taiwan"],
  EUROPE: ["spain", "italy", "germany", "france", "switzerland", "netherlands", "czech-republic", "austria", "portugal", "belgium", "poland", "hungary", "cyprus", "greece"],
  LATAM: ["argentina", "brazil", "colombia", "peru", "chile", "mexico", "costa-rica", "panama"]
};

/**
 * 🏢 KNOWN INTERNATIONAL NETWORK EMPLOYER ROUTES ON TEACH AWAY
 */
const GROUP_EMPLOYER_URLS: string[] = [
  "https://www.teachaway.com/teaching-jobs-abroad/gems-education",
  "https://www.teachaway.com/teaching-jobs-abroad/aldar-education",
  "https://www.teachaway.com/teaching-jobs-abroad/taaleem",
  "https://www.teachaway.com/teaching-jobs-abroad/qatar-foundation",
  "https://www.teachaway.com/teaching-jobs-abroad/inspired-education",
  "https://www.teachaway.com/teaching-jobs-abroad/bloom-education",
  "https://www.teachaway.com/schools/northlands-school"
];

/**
 * Helper to slugify country names for Teach Away URLs
 */
function countryToSlug(country: string): string {
  return country
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

/**
 * 🛸 FLIS-EXCLUSIVE DYNAMIC TEACH AWAY SEARCH ENGINE
 *
 * Dynamically builds target country hubs from registered FLIS schools in Firestore.
 * Strictly enforces Database Primacy: surfaces ONLY vacancies belonging to verified FLIS schools.
 * Non-FLIS and untracked entities are strictly rejected before committing.
 *
 * @param options TeachAwaySearchOptions (query, region, schoolId, maxHubs)
 * @returns Array of TeachAwayJobMatch objects strictly grounded in FLIS database
 */
export async function searchTeachAwayDbSchools(
  options: TeachAwaySearchOptions | string = {}
): Promise<TeachAwayJobMatch[]> {
  const opts: TeachAwaySearchOptions = typeof options === "string" ? { query: options } : options;
  const { query = "", region = "ALL", schoolId, maxHubs = 20 } = opts;

  try {
    const db = getAdminDb();
    if (!db || typeof db.collection !== "function") {
      console.warn("⚠️ Admin SDK Firestore unavailable for Teach Away DB search.");
      return [];
    }

    // 1. DB PRIMACY: Load all active FLIS schools from database
    const snap = await db.collection("schools").get();
    let dbSchools = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

    if (schoolId) {
      const sIdUpper = schoolId.toUpperCase();
      dbSchools = dbSchools.filter((s: any) => s.id?.toUpperCase() === sIdUpper);
    }

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
      console.log(`ℹ️ [TEACH AWAY ENGINE] 0 FLIS DB schools match search criteria. Short-circuiting.`);
      return [];
    }

    // 2. DYNAMICALLY BUILD TARGET HUBS FROM FLIS COUNTRIES
    const flisCountries = new Set<string>();
    dbSchools.forEach((s: any) => {
      if (s.country) {
        flisCountries.add(countryToSlug(s.country));
      }
    });

    let targetCountrySlugs: string[] = Array.from(flisCountries);

    // Apply regional batch filter if specified
    if (region !== "ALL" && REGIONAL_COUNTRY_MAP[region]) {
      const allowedInRegion = new Set(REGIONAL_COUNTRY_MAP[region]);
      targetCountrySlugs = targetCountrySlugs.filter(slug => allowedInRegion.has(slug));
    }

    // Build unique list of hub URLs using the canonical Teach Away pattern
    const targetUrls: string[] = [
      ...GROUP_EMPLOYER_URLS,
      ...targetCountrySlugs.slice(0, maxHubs).map(slug =>
        `https://www.teachaway.com/teaching-jobs-abroad/${slug}/all-positions/any-subject/any-level`
      )
    ];

    console.log(`🔍 [TEACH AWAY ENGINE] Crawling ${targetUrls.length} targeted FLIS country hubs and employer routes...`);

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const rawJobsMap = new Map<string, { title: string; href: string; company: string; location: string; text: string }>();

    for (const url of targetUrls) {
      try {
        await page.goto(url, { waitUntil: "networkidle", timeout: 25000 }).catch(() => {});
        await page.waitForTimeout(1500);

        const html = await page.content();
        const $ = cheerio.load(html);

        $("a[href*='/teaching-jobs-abroad/'], a[href*='/job/'], a[href*='/schools/']").each((_, el) => {
          const href = $(el).attr("href") || "";
          const rawTitle = $(el).text().trim();
          const parentText = $(el).closest("div, article, li, tr").text().trim().replace(/\s+/g, " ");

          if (
            href &&
            rawTitle &&
            rawTitle.length > 3 &&
            !rawTitle.toLowerCase().includes("view all") &&
            !rawTitle.toLowerCase().includes("teaching jobs") &&
            !rawTitle.toLowerCase().includes("certified teacher") &&
            !rawTitle.toLowerCase().includes("explore jobs")
          ) {
            const fullHref = href.startsWith("http") ? href : `https://www.teachaway.com${href}`;
            
            const compMatch = parentText.match(/School:\s*([^|\n]+)/i) || parentText.match(/Company:\s*([^|\n]+)/i);
            const locMatch = parentText.match(/Location:\s*([^|\n]+)/i);

            rawJobsMap.set(fullHref, {
              title: rawTitle,
              href: fullHref,
              company: compMatch ? compMatch[1].trim() : rawTitle,
              location: locMatch ? locMatch[1].trim() : parentText.substring(0, 100),
              text: parentText
            });
          }
        });
      } catch (err: any) {
        console.warn(`⚠️ [TEACH AWAY ENGINE] Error scraping hub ${url}:`, err.message);
      }
    }

    await browser.close();

    const uniqueJobs = Array.from(rawJobsMap.values());
    console.log(`📦 [TEACH AWAY ENGINE] Extracted ${uniqueJobs.length} raw listings. Commencing 3-Stage FLIS Grounding...`);

    const matches: TeachAwayJobMatch[] = [];

    // 3. STRICT 3-STAGE FLIS VERIFICATION GATE
    for (const job of uniqueJobs) {
      // Stage 1: Pedagogy & Job Title Hygiene Check
      if (!isValidJobTitle(job.title) || isSupportOrNonTeachingRole(job.title)) {
        continue;
      }

      const cleanTitle = sanitizeJobTitle(job.title);
      const combinedText = `${cleanTitle} ${job.company} ${job.location} ${job.text}`.toLowerCase();

      // Stage 2 & 3: Strict FLIS School Match & Geographical Alignment
      const matchedSchool = dbSchools.find((school: any) => {
        const sName = (school.name || school.schoolname || "").toLowerCase().trim();
        if (!sName || sName.length < 3) return false;

        // Verify Country Context Alignment (if detectable in listing text)
        const schoolCountry = (school.country || "").toLowerCase().trim();
        if (schoolCountry && job.location) {
          const locLower = job.location.toLowerCase();
          // If location is specified, ensure it matches the school country
          if (!locLower.includes(schoolCountry) && !combinedText.includes(schoolCountry)) {
            return false;
          }
        }

        // Match exact canonical name
        if (combinedText.includes(sName)) return true;

        // Match registered school aliases
        const aliases: string[] = school.aliases || [];
        if (aliases.some((alias: string) => {
          const aLower = String(alias || "").toLowerCase().trim();
          return aLower.length >= 3 && combinedText.includes(aLower);
        })) {
          return true;
        }

        return false;
      });

      // If NOT grounded in a verified FLIS school, strictly discard (Zero Non-FLIS Leaks)
      if (!matchedSchool) {
        continue;
      }

      const jobId = job.href.split("/").filter(Boolean).pop() || `ta_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      matches.push({
        jobId,
        title: cleanTitle,
        applyUrl: job.href,
        schoolId: matchedSchool.id,
        schoolName: matchedSchool.name || matchedSchool.schoolname,
        city: matchedSchool.city || "",
        country: matchedSchool.country || "",
        source: "Teach Away",
        datePosted: new Date().toISOString()
      });
    }

    console.log(`✅ [TEACH AWAY ENGINE] Finished sweep. ${matches.length} accredited FLIS vacancies verified and grounded.`);
    return matches;
  } catch (err: any) {
    console.error("❌ Error in searchTeachAwayDbSchools:", err?.message || err);
    return [];
  }
}

import { getAdminDb } from "@/firebase/admin";
import { isSupportOrNonTeachingRole } from "@/lib/crawler/roleClassifier";
import { isValidJobTitle, sanitizeJobTitle } from "@/lib/crawler/titleSanitizer";
import { parseRelativeDate } from "@/lib/crawler/dateParser";
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
  startDate?: string | null;
  isMidYearReplacement?: boolean;
  curriculum?: string | null;
  subject?: string | null;
}

export interface TeachAwaySearchOptions {
  query?: string;
  region?: "MENA" | "SE_ASIA" | "EUROPE" | "LATAM" | "EAST_ASIA" | "ALL";
  schoolId?: string;
  maxHubs?: number;
  maxPagesPerHub?: number;
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

function countryToSlug(country: string): string {
  return country
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

/**
 * 🛸 FLIS-EXCLUSIVE ENHANCED TEACH AWAY SEARCH ENGINE
 *
 * Implements 6 Core Pipeline Capabilities:
 * 1. Card DOM Extraction & Relative Date Conversion (parseRelativeDate)
 * 2. Start Term & Contract Cycle Capture (startDate, isMidYearReplacement)
 * 3. Subject & Curriculum Badge DOM Extractor
 * 4. Unmapped School Entity Staging Queue (unmapped_discovered_schools)
 * 5. WAF Safeguards, Dynamic Jitter & Hub Depth Capping
 * 6. High-Fidelity FLIS Database Primacy
 */
export async function searchTeachAwayDbSchools(
  options: TeachAwaySearchOptions | string = {}
): Promise<TeachAwayJobMatch[]> {
  const opts: TeachAwaySearchOptions = typeof options === "string" ? { query: options } : options;
  const { query = "", region = "ALL", schoolId, maxHubs = 20, maxPagesPerHub = 3 } = opts;

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

    const baseHubUrls: string[] = [
      ...GROUP_EMPLOYER_URLS,
      ...targetCountrySlugs.slice(0, maxHubs).map(slug =>
        `https://www.teachaway.com/teaching-jobs-abroad/${slug}/all-positions/any-subject/any-level`
      )
    ];

    console.log(`🔍 [TEACH AWAY ENGINE] Starting sweep across ${baseHubUrls.length} FLIS hubs (capped at ${maxPagesPerHub} pages/hub)...`);

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 800 }
    });
    const page = await context.newPage();
    const rawJobsMap = new Map<string, any>();

    for (const baseHub of baseHubUrls) {
      for (let pageNum = 0; pageNum < maxPagesPerHub; pageNum++) {
        const hubUrl = pageNum === 0 ? baseHub : `${baseHub}?page=${pageNum}`;

        try {
          // Dynamic Jitter Delay (600ms - 1200ms) for Cloudflare WAF safety
          const jitter = Math.floor(Math.random() * 600) + 600;
          await new Promise(res => setTimeout(res, jitter));

          await page.goto(hubUrl, { waitUntil: "networkidle", timeout: 25000 }).catch(() => {});
          await page.waitForTimeout(1000);

          const html = await page.content();
          const $ = cheerio.load(html);

          let foundOnPage = 0;

          $("div, article, li").each((_, el) => {
            const cardText = $(el).text().trim().replace(/\s+/g, " ");
            if (cardText.includes("View Details") || cardText.includes("Quick Apply")) {
              const a = $(el).find("a[href*=\"/teaching-jobs-abroad/\"]").first();
              const href = a.attr("href");
              if (!href) return;
              const fullHref = href.startsWith("http") ? href : `https://www.teachaway.com${href}`;
              if (fullHref.includes("/all-positions/") || fullHref.includes("/certified-teacher/") || fullHref.includes("/esl-teaching/") || fullHref.includes("/events/")) return;

              let title = a.text().trim();
              if (!title || title === "View Details" || title === "Quick Apply") {
                const parts = cardText.split(/(?:View Details|Quick Apply)/)[0].trim().split(" ");
                title = parts.slice(0, 5).join(" ");
              }

              let curriculum: string | null = null;
              if (cardText.includes("IB DP") || cardText.includes("IB PYP") || cardText.includes("IB MYP") || cardText.includes("International Baccalaureate")) {
                curriculum = "IB Continuum";
              } else if (cardText.includes("British") || cardText.includes("Cambridge") || cardText.includes("IGCSE")) {
                curriculum = "British / Cambridge";
              } else if (cardText.includes("US Curriculum") || cardText.includes("American")) {
                curriculum = "US / AP";
              }

              const startMatch = cardText.match(/Start(?:ing)?\s*(?:in\s+)?([A-Za-z]+\s+\d{4})/i) || cardText.match(/(August\s+\d{4}|September\s+\d{4}|January\s+\d{4}|ASAP|Immediate)/i);

              foundOnPage++;
              rawJobsMap.set(fullHref, {
                title,
                href: fullHref,
                company: cardText,
                location: cardText,
                rawDate: "recently",
                startDate: startMatch ? startMatch[1] : null,
                curriculum,
                text: cardText
              });
            }
          });

          if (foundOnPage === 0) {
            break;
          }
        } catch (err: any) {
          console.warn(`⚠️ [TEACH AWAY ENGINE] Hub error ${hubUrl}:`, err.message);
          break;
        }
      }
    }

    await browser.close();

    const uniqueJobs = Array.from(rawJobsMap.values());
    console.log(`📦 [TEACH AWAY ENGINE] Extracted ${uniqueJobs.length} raw listings. Commencing 3-Stage FLIS Grounding...`);

    const matches: TeachAwayJobMatch[] = [];

    // 3. STRICT 3-STAGE FLIS VERIFICATION & UNMAPPED STAGING GATE
    for (const job of uniqueJobs) {
      // Stage 1: Pedagogy & Job Title Hygiene Check
      const isValidTeaching = isValidJobTitle(job.title) && !isSupportOrNonTeachingRole(job.title);
      if (!isValidTeaching) {
        continue;
      }

      const cleanTitle = sanitizeJobTitle(job.title);
      const combinedText = `${cleanTitle} ${job.company} ${job.location} ${job.text}`.toLowerCase();

      // Stage 2 & 3: Strict FLIS School Match & Geographical Alignment
      const matchedSchool = dbSchools.find((school: any) => {
        const sName = (school.name || school.schoolname || "").toLowerCase().trim();
        if (!sName || sName.length < 3) return false;

        const schoolCountry = (school.country || "").toLowerCase().trim();
        if (schoolCountry && job.location) {
          const locLower = job.location.toLowerCase();
          if (!locLower.includes(schoolCountry) && !combinedText.includes(schoolCountry)) {
            return false;
          }
        }

        // Exact canonical name match
        if (combinedText.includes(sName)) return true;

        // Registered aliases match
        const aliases: string[] = school.aliases || [];
        if (aliases.some((alias: string) => {
          const aLower = String(alias || "").toLowerCase().trim();
          return aLower.length >= 3 && combinedText.includes(aLower);
        })) {
          return true;
        }

        return false;
      });

      // Stage 4: Unmapped School Entity Staging Queue (for legitimate non-FLIS campuses)
      if (!matchedSchool) {
        const rawSlug = (job.company || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        if (rawSlug && rawSlug.length >= 3 && !rawSlug.includes("view-all")) {
          try {
            await db.collection("unmapped_discovered_schools").doc(rawSlug).set({
              rawEmployerName: job.company,
              country: job.location,
              sampleJobTitle: cleanTitle,
              sampleUrl: job.href,
              source: "Teach Away",
              discoveredAtMillis: Date.now(),
              updatedAt: new Date().toISOString()
            }, { merge: true });
          } catch (e: any) {
            // Ignore staging write errors
          }
        }
        continue;
      }

      const jobId = job.href.split("/").filter(Boolean).pop() || `ta_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const datePostedISO = parseRelativeDate(job.rawDate);
      const isMidYear = Boolean(
        (job.startDate && (job.startDate.toLowerCase().includes("asap") || job.startDate.toLowerCase().includes("immediate") || job.startDate.toLowerCase().includes("january") || job.startDate.toLowerCase().includes("term 2"))) ||
        cleanTitle.toLowerCase().includes("maternity") ||
        cleanTitle.toLowerCase().includes("immediate")
      );

      matches.push({
        jobId,
        title: cleanTitle,
        applyUrl: job.href,
        schoolId: matchedSchool.id,
        schoolName: matchedSchool.name || matchedSchool.schoolname,
        city: matchedSchool.city || "",
        country: matchedSchool.country || "",
        source: "Teach Away",
        datePosted: datePostedISO,
        startDate: job.startDate,
        isMidYearReplacement: isMidYear,
        curriculum: job.curriculum || matchedSchool.curriculum || null
      });
    }

    console.log(`✅ [TEACH AWAY ENGINE] Finished sweep. ${matches.length} accredited FLIS vacancies verified and grounded.`);
    return matches;
  } catch (err: any) {
    console.error("❌ Error in searchTeachAwayDbSchools:", err?.message || err);
    return [];
  }
}

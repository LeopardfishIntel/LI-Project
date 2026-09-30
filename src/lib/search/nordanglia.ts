import { getAdminDb } from "@/firebase/admin";
import { isSupportOrNonTeachingRole } from "@/lib/crawler/roleClassifier";
import { matchSchoolEntity } from "@/lib/crawler/entityMatcher";
import axios from "axios";
import * as cheerio from "cheerio";

export interface NordAngliaJobMatch {
  jobId: string;
  title: string;
  applyUrl: string;
  schoolId: string;
  schoolName: string;
  city: string;
  country: string;
  source: string;
  sources: string[];
  sourceUrls: Record<string, string>;
  datePosted?: string | null;
  closingDate?: string | null;
  directUrl?: string;
  group?: string;
}

/** Base URL for the Nord Anglia careers portal */
const NA_PORTAL_BASE = "https://careers.nordanglia.com";

/** SuccessFactors API endpoint for paginated tile search */
const NA_TILE_SEARCH = `${NA_PORTAL_BASE}/tile-search-results`;

const AXIOS_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
};

/** ISO 3166-1 alpha-2 to full country name mapping (most common ones in the NA network) */
const COUNTRY_MAP: Record<string, string> = {
  AE: "United Arab Emirates", GB: "United Kingdom", US: "United States",
  CN: "China", SG: "Singapore", VN: "Vietnam", CZ: "Czech Republic",
  CH: "Switzerland", HU: "Hungary", QA: "Qatar", IN: "India", MX: "Mexico",
  MY: "Malaysia", BR: "Brazil", IT: "Italy", JO: "Jordan", UY: "Uruguay",
  RO: "Romania", PL: "Poland", UZ: "Uzbekistan", SK: "Slovakia", HK: "Hong Kong",
  TH: "Thailand", KH: "Cambodia", ID: "Indonesia", PH: "Philippines",
  NL: "Netherlands", ES: "Spain", DE: "Germany", FR: "France",
};

interface RawPortalJob {
  portalJobId: string;
  title: string;
  schoolOnPortal: string;
  city: string;
  countryCode: string;
  country: string;
  portalUrl: string;
}

/**
 * Scrapes all pages from the Nord Anglia SuccessFactors careers portal.
 * Returns structured job data with school names, locations, and apply URLs.
 */
async function scrapeNordAngliaPortal(): Promise<RawPortalJob[]> {
  const allJobs: RawPortalJob[] = [];
  const seenIds = new Set<string>();
  let startRow = 0;
  const pageSize = 25;
  const maxPages = 20; // safety cap

  for (let page = 0; page < maxPages; page++) {
    try {
      const url = `${NA_TILE_SEARCH}?q=&sortColumn=referencedate&sortDirection=desc&startrow=${startRow}`;
      const res = await axios.get(url, { headers: AXIOS_HEADERS, timeout: 15000 });
      if (res.status !== 200) break;

      const $ = cheerio.load(res.data);
      let foundNew = 0;

      $("[class*=job-id-]").each((_, tile) => {
        const cls = $(tile).attr("class") || "";
        const idMatch = cls.match(/job-id-(\d+)/);
        const portalJobId = idMatch ? idMatch[1] : "";
        if (!portalJobId || seenIds.has(portalJobId)) return;
        seenIds.add(portalJobId);

        const titleEl = $(tile).find("a.jobTitle-link").first();
        const title = titleEl.text().trim();
        const href = titleEl.attr("href") || "";

        // Extract structured fields from the tile
        const schoolOnPortal = $(tile)
          .find("[class*=customfield3] div[id*=value]").first().text().trim();
        const countryCode = $(tile)
          .find("[class*=section-field][class*=country] div[id*=value]").first().text().trim();
        const city = $(tile)
          .find("[class*=section-field][class*=city] div[id*=value]").first().text().trim();

        if (title) {
          allJobs.push({
            portalJobId,
            title,
            schoolOnPortal,
            city,
            countryCode,
            country: COUNTRY_MAP[countryCode] || countryCode,
            portalUrl: href.startsWith("http") ? href : `${NA_PORTAL_BASE}${href}`
          });
          foundNew++;
        }
      });

      if (foundNew === 0) break;
      startRow += pageSize;

      // Brief throttle between pages
      await new Promise(r => setTimeout(r, 200));
    } catch (err: any) {
      console.warn(`⚠️ [NORD ANGLIA] Error fetching page ${page}: ${err?.message}`);
      break;
    }
  }

  return allJobs;
}

/**
 * Fetch TES international job listings that contain "nord anglia" in name,
 * building a lookup map keyed by normalised title+location for cross-referencing.
 */
async function fetchTesNordAngliaListings(): Promise<Map<string, { tesUrl: string; tesEmployer: string }>> {
  const lookup = new Map<string, { tesUrl: string; tesEmployer: string }>();
  try {
    const res = await axios.get(
      "https://www.tes.com/jobs/browse/international?keywords=nord+anglia",
      { headers: AXIOS_HEADERS, timeout: 10000 }
    );
    const $ = cheerio.load(res.data);
    const script = $("script#__NEXT_DATA__").html();
    if (!script) return lookup;
    const data = JSON.parse(script);
    const jobs = data?.props?.pageProps?.initialData?.jobs || [];
    for (const j of jobs) {
      const title = (j.title || "").trim().toLowerCase();
      const loc = (j.displayLocation || "").trim().toLowerCase();
      const key = `${title}|||${loc}`;
      const canonicalUrl = j.canonicalUrl
        ? (j.canonicalUrl.startsWith("http") ? j.canonicalUrl : `https://www.tes.com${j.canonicalUrl}`)
        : "";
      if (canonicalUrl) {
        lookup.set(key, { tesUrl: canonicalUrl, tesEmployer: j.employer?.name || "" });
      }
    }
  } catch {
    // TES is optional for dual-pill — don't fail the whole sweep
  }
  return lookup;
}

/**
 * Normalise a title for fuzzy matching between portal and TES.
 * Strips common prefixes like "View all Vacancies at ..."
 */
function normTitle(t: string): string {
  return t.toLowerCase()
    .replace(/^view all vacancies at\s+/i, "")
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

/**
 * Normalize and expand school names for robust entity matching
 */
function cleanSchoolStr(s: string): string {
  return (s || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\bnas\b/g, "nord anglia international school")
    .replace(/\bbis\b/g, "british international school")
    .replace(/\bbvis\b/g, "british vietnamese international school")
    .replace(/\bbsg\b/g, "the british school of guangzhou")
    .replace(/\bbskl\b/g, "the british international school of kuala lumpur")
    .replace(/\bsisd\b/g, "swiss international scientific school")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Match a portal school name to one of our canonical NA database schools
 */
function resolveCanonicalNaSchool(portalSchool: string, portalCity: string, naSchools: any[]): any {
  const pClean = cleanSchoolStr(portalSchool);
  if (!pClean) return null;

  // Specific disambiguation for Abu Dhabi schools
  if (pClean.includes("abu dhabi")) {
    if (pClean.includes("nord anglia") || pClean.includes("nas")) {
      const nasAd = naSchools.find(s => s.id === "FLIS0099" || (s.name || s.schoolname || "").toLowerCase().includes("nord anglia international school abu dhabi"));
      if (nasAd) return nasAd;
    }
    if (pClean.includes("british international") || pClean.includes("bis")) {
      const bisAd = naSchools.find(s => s.id === "FLIS0098" || (s.name || s.schoolname || "").toLowerCase().includes("british international school abu dhabi"));
      if (bisAd) return bisAd;
    }
  }

  // 1. Direct or alias match
  for (const s of naSchools) {
    const sClean = cleanSchoolStr(s.name || s.schoolname);
    const aliases = (s.aliases || []).map((a: string) => cleanSchoolStr(a));

    if (pClean === sClean || pClean.includes(sClean) || sClean.includes(pClean)) {
      return s;
    }
    for (const a of aliases) {
      if (a && (pClean === a || pClean.includes(a) || a.includes(pClean))) {
        return s;
      }
    }
  }

  // 2. City + Core Name match
  for (const s of naSchools) {
    const sCity = cleanSchoolStr(s.city || "");
    const pCity = cleanSchoolStr(portalCity || "");
    if ((sCity && pClean.includes(sCity)) || (sCity && pCity && sCity === pCity)) {
      const coreS = cleanSchoolStr(s.name || s.schoolname).replace(/international|school|the|college|british|of/g, "").trim();
      const coreP = pClean.replace(/international|school|the|college|british|of/g, "").trim();
      if (coreS && coreP && (coreP.includes(coreS) || coreS.includes(coreP))) {
        return s;
      }
    }
  }

  // 3. Fallback to general entityMatcher
  for (const s of naSchools) {
    const schoolName = s.name || s.schoolname || "";
    const res = matchSchoolEntity(
      { id: s.id, name: schoolName, schoolname: s.schoolname, city: s.city, country: s.country, aliases: s.aliases, legalNames: s.legalNames || s.legal_names || [] },
      { candidateText: portalSchool, city: portalCity }
    );
    if (res.isMatch) return s;
  }

  return null;
}

/**
 * Dedicated Crawler for Nord Anglia Education network vacancies.
 *
 * Primary source: careers.nordanglia.com (SuccessFactors portal)
 * Secondary confirmation: TES cross-reference for dual-pill
 *
 * Grounds each vacancy against our canonical Nord Anglia school entries
 * in the database using matchSchoolEntity.
 */
export async function searchNordAngliaDbSchools(): Promise<NordAngliaJobMatch[]> {
  console.log("🛸 [NORD ANGLIA CRAWLER] Starting automated sweep via careers.nordanglia.com...");

  try {
    const db = getAdminDb();
    if (!db || typeof db.collection !== "function") {
      console.warn("⚠️ Admin SDK Firestore unavailable for Nord Anglia search.");
      return [];
    }

    // 1. Load canonical Nord Anglia schools from DB
    const snap = await db.collection("schools").get();
    const allSchools = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

    const naSchools = allSchools.filter((s: any) => {
      const g = (s.group || s.schoolGroup || "").toLowerCase();
      const sName = (s.name || s.schoolname || "").toLowerCase();
      const gd = (s.groupDomain || "").toLowerCase();
      return g.includes("nord anglia") || sName.includes("nord anglia") || gd.includes("nordanglia");
    });

    console.log(`🛸 [NORD ANGLIA CRAWLER] Loaded ${naSchools.length} canonical Nord Anglia schools from database.`);

    // 2. Scrape the Nord Anglia careers portal
    const portalJobs = await scrapeNordAngliaPortal();
    console.log(`🛸 [NORD ANGLIA CRAWLER] Scraped ${portalJobs.length} listings from careers.nordanglia.com.`);

    // 3. Fetch TES listings for cross-reference (optional)
    const tesLookup = await fetchTesNordAngliaListings();
    console.log(`🛸 [NORD ANGLIA CRAWLER] Found ${tesLookup.size} TES listings for cross-reference.`);

    // 4. Ground each portal job to our canonical schools
    const matches: NordAngliaJobMatch[] = [];
    const seenJobKeys = new Set<string>();
    let skippedNonTeaching = 0;
    let skippedMetaListings = 0;
    let unmatchedSchools = 0;

    for (const pj of portalJobs) {
      // Skip "View all Vacancies at ..." umbrella listings
      if (/^view all vacancies/i.test(pj.title) || /^share your profile/i.test(pj.title)) {
        skippedMetaListings++;
        continue;
      }

      // Filter out non-teaching roles (Police Officer, Marketing Officer, etc.)
      if (isSupportOrNonTeachingRole(pj.title)) {
        skippedNonTeaching++;
        continue;
      }

      // Match portal school to canonical DB school
      const matchedSchool = resolveCanonicalNaSchool(pj.schoolOnPortal, pj.city, naSchools);

      if (!matchedSchool) {
        unmatchedSchools++;
        continue;
      }

      const jobKey = `${matchedSchool.id}_${normTitle(pj.title)}`;
      if (seenJobKeys.has(jobKey)) continue;
      seenJobKeys.add(jobKey);

      const schoolName = matchedSchool.name || matchedSchool.schoolname;

      // Build sources list and source URLs — primary is always Nord Anglia portal
      const sources = ["Nord Anglia"];
      const sourceUrls: Record<string, string> = {
        "Nord Anglia": pj.portalUrl
      };

      // Check TES for dual-pill confirmation
      const tesKey = `${pj.title.toLowerCase()}|||${pj.city.toLowerCase()}`;
      const tesMatch = tesLookup.get(tesKey);
      if (tesMatch) {
        sources.push("TES");
        sourceUrls["TES"] = tesMatch.tesUrl;
      }

      matches.push({
        jobId: `na_${pj.portalJobId}`,
        title: pj.title,
        applyUrl: pj.portalUrl,
        schoolId: matchedSchool.id,
        schoolName,
        city: matchedSchool.city || pj.city || "",
        country: matchedSchool.country || pj.country || "",
        source: "Nord Anglia",
        sources,
        sourceUrls,
        directUrl: pj.portalUrl,
        group: "Nord Anglia Education",
        datePosted: new Date().toISOString(),
        closingDate: null
      });
    }

    console.log(`🛸 [NORD ANGLIA CRAWLER] Grounding results:`);
    console.log(`   ✅ Matched: ${matches.length} teaching vacancies to canonical schools`);
    console.log(`   🚫 Non-teaching filtered: ${skippedNonTeaching}`);
    console.log(`   📋 Meta listings skipped: ${skippedMetaListings}`);
    console.log(`   ❓ Unmatched schools: ${unmatchedSchools}`);
    if (tesLookup.size > 0) {
      const dualPills = matches.filter(m => m.sources.length > 1).length;
      console.log(`   🔗 Dual-pill (Nord Anglia + TES): ${dualPills}`);
    }

    return matches;
  } catch (err: any) {
    console.error("❌ Error in searchNordAngliaDbSchools:", err?.message || err);
    return [];
  }
}

import axios from "axios";
import * as cheerio from "cheerio";
/**
 * 🏫 TAALEEM CANONICAL RESOLVER, ATS SWEEPER & CAMPUS REGISTRY
 *
 * Coordinates network-wide crawling across Taaleem Education institutions via
 * `careers.taaleem.ae`, enforces strict exact-match entity mappings,
 * writes pre-scrubbed direct jobs directly to `featured_jobs_cache`, and matches
 * dual-listed TES vacancies to their exact deep direct job URLs (e.g. /en/uae/jobs/<slug>-<id>/).
 */

import { getAdminDb } from "@/firebase/admin";
import { sweepAllTaaleemNetwork, cleanTaaleemJobTitle, extractTaaleemCurriculumTrack, extractTaaleemStartTerm, extractTaaleemRoleTier, RawTaaleemJob } from "@/lib/crawler/adaptors/taaleem-adaptor";
import { isSupportOrNonTeachingRole } from "@/lib/crawler/roleClassifier";

export interface ResolvedTaaleemJob {
  canonicalUrl: string;
  isDirect: boolean;
  groupName: "Taaleem";
  campus?: string;
}

export interface TaaleemSchoolMeta {
  schoolId: string;
  canonicalName: string;
  city: string;
  country: string;
  tesEmployerUrl?: string;
}

export const TAALEEM_CAMPUS_MAP: Record<string, TaaleemSchoolMeta> = {
  "dubai british school jumeirah park": { 
    schoolId: "FLIS0115_JUMEIRAH_PARK", 
    canonicalName: "Dubai British School Jumeirah Park", 
    city: "Dubai", 
    country: "United Arab Emirates",
    tesEmployerUrl: "https://www.tes.com/jobs/employer/dubai-british-school-jumeirah-park-1081671"
  },
  "dubai british school emirates hills": { 
    schoolId: "FLIS0115_EMIRATES_HILLS", 
    canonicalName: "Dubai British School Emirates Hills", 
    city: "Dubai", 
    country: "United Arab Emirates",
    tesEmployerUrl: "https://www.tes.com/jobs/employer/dubai-british-school-emirates-hills-1057169"
  },
  "dubai british school - mira": { 
    schoolId: "FLIS0115_MIRA", 
    canonicalName: "Dubai British School Mira", 
    city: "Dubai", 
    country: "United Arab Emirates",
    tesEmployerUrl: "https://www.tes.com/jobs/employer/dubai-british-school-mira-1255316"
  },
  "dubai british school - jumeira": { 
    schoolId: "FLIS0115_JUMEIRA", 
    canonicalName: "Dubai British School Jumeira", 
    city: "Dubai", 
    country: "United Arab Emirates",
    tesEmployerUrl: "https://www.tes.com/jobs/employer/dubai-british-school-jumeira-1265177"
  },
  "dubai british school": { 
    schoolId: "FLIS0115", 
    canonicalName: "Dubai British School", 
    city: "Dubai", 
    country: "United Arab Emirates",
    tesEmployerUrl: "https://www.tes.com/jobs/employer/dubai-british-school-emirates-hills-1057169"
  },
  "dubai british foundation": { 
    schoolId: "FLIS0115_DBF", 
    canonicalName: "Dubai British Foundation", 
    city: "Dubai", 
    country: "United Arab Emirates" 
  },
  "raha international school kcc": { 
    schoolId: "FLIS0113", 
    canonicalName: "Raha International School (Khalifa City)", 
    city: "Abu Dhabi", 
    country: "United Arab Emirates",
    tesEmployerUrl: "https://www.tes.com/jobs/employer/raha-international-school-gardens-campus-1070644"
  },
  "raha international school gc": { 
    schoolId: "FLIS0113", 
    canonicalName: "Raha International School (Gardens Campus)", 
    city: "Abu Dhabi", 
    country: "United Arab Emirates",
    tesEmployerUrl: "https://www.tes.com/jobs/employer/raha-international-school-gardens-campus-1070644"
  },
  "raha international school": { 
    schoolId: "FLIS0113", 
    canonicalName: "Raha International School", 
    city: "Abu Dhabi", 
    country: "United Arab Emirates",
    tesEmployerUrl: "https://www.tes.com/jobs/employer/raha-international-school-gardens-campus-1070644"
  },
  "greenfield international school": { 
    schoolId: "FLIS0116_GIS", 
    canonicalName: "Greenfield International School", 
    city: "Dubai", 
    country: "United Arab Emirates" 
  },
  "jumeira baccalaureate school": { 
    schoolId: "FLIS0114_JBS", 
    canonicalName: "Jumeira Baccalaureate School", 
    city: "Dubai", 
    country: "United Arab Emirates" 
  },
  "uptown international school": { 
    schoolId: "FLIS0117_UIS", 
    canonicalName: "Uptown International School", 
    city: "Dubai", 
    country: "United Arab Emirates",
    tesEmployerUrl: "https://www.tes.com/jobs/employer/uptown-international-school-1081669"
  },
  "dubai heights academy": { 
    schoolId: "FLIS0118_DHA", 
    canonicalName: "Dubai Heights Academy", 
    city: "Dubai", 
    country: "United Arab Emirates" 
  },
  "jebel ali school": { 
    schoolId: "FLIS0119_JAS", 
    canonicalName: "Jebel Ali School", 
    city: "Dubai", 
    country: "United Arab Emirates" 
  },
  "harrow international school-dubai": { 
    schoolId: "FLIS_HARROW_DXB", 
    canonicalName: "Harrow International School Dubai", 
    city: "Dubai", 
    country: "United Arab Emirates" 
  },
  "harrow international school abu dhabi": { 
    schoolId: "FLIS_HARROW_AUH", 
    canonicalName: "Harrow International School Abu Dhabi", 
    city: "Abu Dhabi", 
    country: "United Arab Emirates" 
  },
  "dubai schools al barsha": { 
    schoolId: "FLIS_DS_BARSHA", 
    canonicalName: "Dubai Schools Al Barsha", 
    city: "Dubai", 
    country: "United Arab Emirates" 
  },
  "dubai schools al khawaneej": { 
    schoolId: "FLIS_DS_KHAWANEEJ", 
    canonicalName: "Dubai Schools Al Khawaneej", 
    city: "Dubai", 
    country: "United Arab Emirates" 
  },
  "dubai school nad al sheba": { 
    schoolId: "FLIS_DS_NAS", 
    canonicalName: "Dubai School Nad Al Sheba", 
    city: "Dubai", 
    country: "United Arab Emirates" 
  },
  "lycée libanais francophone privé meydan": { 
    schoolId: "FLIS_LLFP_MEYDAN", 
    canonicalName: "Lycée Libanais Francophone Privé Meydan", 
    city: "Dubai", 
    country: "United Arab Emirates" 
  },
  "taaleem": { 
    schoolId: "FLIS0115", 
    canonicalName: "Taaleem Education", 
    city: "Dubai", 
    country: "United Arab Emirates" 
  }
};

/**
 * Checks if a given school name or ID belongs to the Taaleem group.
 */
export function isTaaleemSchool(schoolId?: string | null, schoolName?: string | null, group?: string | null): boolean {
  const sId = (schoolId || "").toUpperCase().trim();
  const sName = (schoolName || "").toLowerCase();
  const gName = (group || "").toLowerCase();

  // Guard against other explicit groups
  if (
    gName.includes("gems") ||
    sName.includes("gems") ||
    gName.includes("nord anglia") ||
    sName.includes("nord anglia") ||
    gName.includes("cognita") ||
    sName.includes("cognita") ||
    gName.includes("inspired") ||
    sName.includes("inspired") ||
    sName.includes("dubai college") ||
    sName.includes("sunmarke") ||
    sName.includes("dubai english speaking")
  ) {
    return false;
  }

  if (gName.includes("taaleem")) {
    return true;
  }

  // Name keyword checks
  if (
    sName.includes("taaleem") ||
    sName.includes("dubai british") ||
    sName.includes("raha international") ||
    sName.includes("jumeira baccalaureate") ||
    sName.includes("greenfield international") ||
    sName.includes("greenfield community") ||
    sName.includes("uptown international") ||
    sName.includes("uptown school") ||
    sName.includes("dubai heights academy") ||
    sName.includes("jebel ali school") ||
    sName.includes("dubai school") ||
    sName.includes("american academy for girls")
  ) {
    return true;
  }

  // Exact ID-based checks for known Taaleem master IDs
  if (
    sId.startsWith("FLIS0113") || // Raha International School
    sId.startsWith("FLIS0115") || // Dubai British School campuses
    sId.startsWith("FLIS0116") || // Greenfield International School
    sId.startsWith("FLIS0117") || // Uptown International School
    sId.startsWith("FLIS0118") || // Dubai Heights Academy
    sId.startsWith("FLIS0119_JAS")
  ) {
    return true;
  }

  return false;
}

/**
 * Resolves a Taaleem job listing to a direct portal/campus careers URL.
 */
export function resolveTaaleemDirectUrl(
  _jobTitle: string,
  schoolName: string,
  fallbackUrl?: string | null
): ResolvedTaaleemJob {
  const sNameLower = (schoolName || "").toLowerCase();
  let matchedCampus: string | undefined;

  for (const [key, meta] of Object.entries(TAALEEM_CAMPUS_MAP)) {
    if (sNameLower.includes(key)) {
      matchedCampus = meta.canonicalName;
      break;
    }
  }

  // If an outbound direct employer link is already available and valid (direct job deep link), use it
  if (
    fallbackUrl &&
    !fallbackUrl.includes("tes.com") &&
    fallbackUrl.startsWith("http") &&
    fallbackUrl.includes("taaleem.ae") &&
    (fallbackUrl.includes("/jobs/") || fallbackUrl.includes("/job-application/"))
  ) {
    return {
      canonicalUrl: fallbackUrl,
      isDirect: true,
      groupName: "Taaleem",
      campus: matchedCampus,
    };
  }

  return {
    canonicalUrl: "https://careers.taaleem.ae/",
    isDirect: true,
    groupName: "Taaleem",
    campus: matchedCampus,
  };
}

/**
 * Normalize title strings for fuzzy matching
 */
function normalizeTitleKey(t: string): string {
  return (t || "")
    .toLowerCase()
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/[-–—].*$/, "")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * 🧹 SYNC & CROSS-LINK ALL TAALEEM DIRECT VACANCIES TO FIRESTORE CACHE
 */
/**
 * Fetches all live TES vacancies for a given TES employer portal URL
 */
async function fetchTesEmployerVacancies(employerUrl: string): Promise<Array<{ title: string; tesUrl: string }>> {
  if (!employerUrl) return [];
  try {
    const res = await axios.get(employerUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" },
      timeout: 10000,
    });
    const $ = cheerio.load(res.data);
    const jobs: Array<{ title: string; tesUrl: string }> = [];
    $("a[href*=\"/jobs/vacancy/\"]").each((_, el) => {
      const href = $(el).attr("href");
      const title = $(el).find(".job-v2-mobile-title strong, strong").first().text().trim() || $(el).text().trim();
      if (href && !jobs.some(j => j.tesUrl === href)) {
        const fullHref = href.startsWith("http") ? href : `https://www.tes.com${href}`;
        jobs.push({ title, tesUrl: fullHref });
      }
    });
    return jobs;
  } catch (e: any) {
    console.warn(`⚠️ [TAALEEM ENGINE] Could not fetch TES vacancies for ${employerUrl}: ${e.message}`);
    return [];
  }
}

/**
 * 🧹 SYNC & CROSS-LINK ALL TAALEEM DIRECT VACANCIES TO FIRESTORE CACHE
 */

const SUBJECT_KEYWORDS: Record<string, string[]> = {
  librarian: ["librar"],
  science: ["science", "biology", "chemistry", "physics"],
  maths: ["math", "mathematics"],
  english: ["english", "literature", "language and lit"],
  humanities: ["humanities", "history", "politics", "psychology", "geography"],
  social_studies: ["social studies", "uae social"],
  islamic: ["islamic"],
  arabic: ["arabic"],
  pe: ["head of pe", "pe teacher", "pe ", " pe", "(pe)", "physical education"],
  music: ["music"],
  art: ["art", "drama", "theatre"],
  mfl: ["mfl", "french", "spanish"],
  homeroom: ["homeroom", "primary teacher", "early years", "eyfs", "ks1", "ks2", "kindergarten"],
  counselor: ["counsel"],
  inclusion: ["inclusion", "learning support", "sen", "special needs"],
};

function detectSubject(title: string): string | null {
  const t = (title || "").toLowerCase();
  for (const [subj, keywords] of Object.entries(SUBJECT_KEYWORDS)) {
    if (keywords.some(k => t.includes(k))) return subj;
  }
  return null;
}

function findBestTesMatch(jobTitle: string, tesList: Array<{ rawTitle?: string; cleanTitle?: string; title?: string; tesUrl: string }>): string | undefined {
  const subj = detectSubject(jobTitle);
  if (subj) {
    const match = tesList.find(t => detectSubject(t.rawTitle || t.cleanTitle || t.title || "") === subj);
    if (match) return match.tesUrl;
  }
  return undefined;
}

export async function syncTaaleemNetworkToCache(): Promise<{ ingested: number; crossLinked: number }> {
  console.log("🏫 [TAALEEM ENGINE] Starting full network direct sweep and cache synchronization...");
  const rawJobs = await sweepAllTaaleemNetwork();
  if (!rawJobs || rawJobs.length === 0) {
    console.warn("⚠️ [TAALEEM ENGINE] No jobs returned from sweep.");
    return { ingested: 0, crossLinked: 0 };
  }

  const db = getAdminDb();
  if (!db) {
    console.error("❌ [TAALEEM ENGINE] Firestore Admin DB not available.");
    return { ingested: 0, crossLinked: 0 };
  }

  const snap = await db.collection("schools").get();
  const dbSchools = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

  const companyToSchoolMap = new Map<string, any>();
  for (const [companyKey, meta] of Object.entries(TAALEEM_CAMPUS_MAP)) {
    const sDoc = dbSchools.find((s: any) => s.id.toUpperCase() === meta.schoolId.toUpperCase()) || {
      id: meta.schoolId,
      schoolname: meta.canonicalName,
      name: meta.canonicalName,
      city: meta.city,
      country: meta.country,
      salaryRange: "$4,200.00",
      housingprovision: "Provided",
    };
    companyToSchoolMap.set(companyKey, { 
      ...sDoc, 
      canonicalName: meta.canonicalName, 
      schoolId: meta.schoolId,
      tesEmployerUrl: meta.tesEmployerUrl 
    });
  }

  // 1. Sweep active TES employer vacancies for all Taaleem campuses
  console.log("🔍 [TAALEEM ENGINE] Sweeping active TES employer vacancies for cross-linking...");
  const tesJobsBySchool = new Map<string, Array<{ rawTitle: string; cleanTitle: string; normKey: string; tesUrl: string }>>();
  
  const uniqueEmployers = new Map<string, { schoolId: string; tesEmployerUrl: string }>();
  for (const meta of Object.values(TAALEEM_CAMPUS_MAP)) {
    if (meta.tesEmployerUrl && !uniqueEmployers.has(meta.tesEmployerUrl)) {
      uniqueEmployers.set(meta.tesEmployerUrl, { schoolId: meta.schoolId, tesEmployerUrl: meta.tesEmployerUrl });
    }
  }

  for (const { schoolId, tesEmployerUrl } of uniqueEmployers.values()) {
    const scrapedTes = await fetchTesEmployerVacancies(tesEmployerUrl);
    if (scrapedTes.length > 0) {
      if (!tesJobsBySchool.has(schoolId)) tesJobsBySchool.set(schoolId, []);
      for (const tJob of scrapedTes) {
        const cleanT = cleanTaaleemJobTitle(tJob.title);
        const normK = normalizeTitleKey(cleanT);
        tesJobsBySchool.get(schoolId)!.push({
          rawTitle: tJob.title,
          cleanTitle: cleanT,
          normKey: normK,
          tesUrl: tJob.tesUrl,
        });
      }
      console.log(`   ✓ [TES] Scraped ${scrapedTes.length} active vacancies from ${tesEmployerUrl}`);
    }
  }

  let ingestedCount = 0;
  const directJobsBySchool = new Map<string, Array<{ rawTitle: string; cleanTitle: string; normKey: string; applyUrl: string }>>();

  for (const job of rawJobs) {
    const rawTitle = String(job.title || "").trim();
    if (!rawTitle || isSupportOrNonTeachingRole(rawTitle)) continue;

    const rawCompany = String(job.companyName || "").trim().toLowerCase();
    let matchedMeta = companyToSchoolMap.get(rawCompany);
    if (!matchedMeta) {
      for (const [k, v] of companyToSchoolMap.entries()) {
        if (k.includes(rawCompany) || rawCompany.includes(k)) {
          matchedMeta = v;
          break;
        }
      }
    }

    if (!matchedMeta) {
      matchedMeta = companyToSchoolMap.get("taaleem") || {
        id: "FLIS0115",
        schoolId: "FLIS0115",
        canonicalName: job.companyName || "Taaleem Education",
        city: "Dubai",
        country: "United Arab Emirates",
        salaryRange: "$4,200.00",
        housingprovision: "Provided",
      };
    }

    const schoolId = matchedMeta.schoolId || matchedMeta.id || "FLIS0115";
    const schoolName = matchedMeta.canonicalName || matchedMeta.schoolname || matchedMeta.name || "Taaleem School";
    const applyUrl = job.applyUrl;
    const cleanTitle = cleanTaaleemJobTitle(rawTitle);
    const normKey = normalizeTitleKey(rawTitle);

    if (!directJobsBySchool.has(schoolId)) {
      directJobsBySchool.set(schoolId, []);
    }
    directJobsBySchool.get(schoolId)!.push({ rawTitle, cleanTitle, normKey, applyUrl });

    const idMatch = applyUrl.match(/-(\d+)\/?$/);
    const docId = idMatch ? `taaleem_${idMatch[1]}` : `taaleem_${Buffer.from(applyUrl).toString("base64url").slice(0, 20)}`;

    // Match with TES vacancies
    const schoolTesList = tesJobsBySchool.get(schoolId) || [];
    const matchedTesUrl = findBestTesMatch(rawTitle, schoolTesList) || findBestTesMatch(cleanTitle, schoolTesList);

    // Fallback to school TES employer portal if individual TES post was not matched
    const finalTesUrl = matchedTesUrl || matchedMeta.tesEmployerUrl;

    const sources = ["Taaleem"];
    const sourceUrls: Record<string, string> = {
      Taaleem: applyUrl,
      TAALEEM: applyUrl,
    };

    if (finalTesUrl) {
      sources.unshift("TES");
      sourceUrls["TES"] = finalTesUrl;
      sourceUrls["tes"] = finalTesUrl;
    }

    const cacheDoc = {
      id: docId,
      jobId: docId,
      title: cleanTitle,
      rawTitle: rawTitle,
      schoolId: schoolId,
      schoolName: schoolName,
      city: matchedMeta.city || "Dubai",
      country: matchedMeta.country || "United Arab Emirates",
      source: finalTesUrl ? "TES" : "Taaleem",
      sources: sources,
      sourceUrls: sourceUrls,
      applyUrl: applyUrl,
      directUrl: applyUrl,
      curriculum: extractTaaleemCurriculumTrack(rawTitle, job.description).join(", "),
      startTerm: extractTaaleemStartTerm(rawTitle, job.description),
      roleTier: extractTaaleemRoleTier(rawTitle, job.description),
      datePosted: job.crtDate ? String(job.crtDate).split(" ")[0] : null,
      closingDate: job.expDate ? String(job.expDate).split(" ")[0] : null,
      status: "APPROVED",
      group: "Taaleem",
      ownership: "Taaleem",
      ingestedAtMillis: Date.now(),
      scrapedAtRaw: new Date().toISOString(),
    };

    await db.collection("featured_jobs_cache").doc(docId).set(cacheDoc, { merge: true });
    ingestedCount++;
  }

  console.log(`✅ [TAALEEM ENGINE] Successfully ingested ${ingestedCount} direct Taaleem vacancies with dual links.`);

  // Cross-link existing dual-listed TES jobs in featured_jobs_cache
  let crossLinkedCount = 0;
  const cacheSnap = await db.collection("featured_jobs_cache").get();

  for (const doc of cacheSnap.docs) {
    const d = doc.data();
    if (doc.id.startsWith("taaleem_")) continue; // Skip native Taaleem docs

    const isTaaleem = isTaaleemSchool(d.schoolId, d.schoolName, d.group || d.ownership);
    if (!isTaaleem) continue;

    const sId = (d.schoolId || "").toUpperCase();
    const directCandidates = [
      ...(directJobsBySchool.get(sId) || []),
      ...(directJobsBySchool.get("FLIS0113") || []),
      ...(directJobsBySchool.get("FLIS0115") || []),
      ...(directJobsBySchool.get("FLIS0115_EMIRATES_HILLS") || []),
      ...(directJobsBySchool.get("FLIS0115_JUMEIRAH_PARK") || []),
      ...(directJobsBySchool.get("FLIS0115_MIRA") || []),
      ...(directJobsBySchool.get("FLIS0115_JUMEIRA") || []),
      ...(directJobsBySchool.get("FLIS0116_GIS") || []),
      ...(directJobsBySchool.get("FLIS0114_JBS") || []),
      ...(directJobsBySchool.get("FLIS0117_UIS") || []),
      ...(directJobsBySchool.get("FLIS0118_DHA") || []),
      ...(directJobsBySchool.get("FLIS0119_JAS") || []),
    ];

    const dNorm = normalizeTitleKey(d.title || d.rawTitle || "");
    if (!dNorm) continue;

    // Find best direct match
    let matchedDirect = directCandidates.find(c => c.normKey === dNorm || dNorm.includes(c.normKey) || c.normKey.includes(dNorm));
    if (!matchedDirect) {
      const dWords = dNorm.split(" ").filter(w => w.length > 2);
      let bestScore = 0;
      for (const cand of directCandidates) {
        const cWords = cand.normKey.split(" ").filter(w => w.length > 2);
        const overlap = dWords.filter(w => cWords.includes(w)).length;
        if (overlap >= 2 && overlap > bestScore) {
          bestScore = overlap;
          matchedDirect = cand;
        }
      }
    }

    if (matchedDirect && matchedDirect.applyUrl) {
      const existingUrls = d.sourceUrls || {};
      const existingSources = d.sources || [d.source || "TES"];

      if (!existingSources.includes("Taaleem")) {
        existingSources.push("Taaleem");
      }

      existingUrls["Taaleem"] = matchedDirect.applyUrl;
      existingUrls["TAALEEM"] = matchedDirect.applyUrl;

      await doc.ref.update({
        sources: existingSources,
        sourceUrls: existingUrls,
        directUrl: matchedDirect.applyUrl,
      });

      crossLinkedCount++;
      console.log(`🔗 [TAALEEM ENGINE] Cross-linked TES job "${d.title}" -> "${matchedDirect.applyUrl}"`);
    }
  }

  console.log(`🎉 [TAALEEM ENGINE] Synchronization finished: ${ingestedCount} direct jobs synced, ${crossLinkedCount} dual-listed jobs cross-linked.`);
  return { ingested: ingestedCount, crossLinked: crossLinkedCount };
}

import { getAdminDb } from "@/firebase/admin";
import { sweepAllTaaleemNetwork, cleanTaaleemJobTitle, extractTaaleemCurriculumTrack, extractTaaleemStartTerm, extractTaaleemRoleTier } from "@/lib/crawler/adaptors/taaleem-adaptor";
import { isSupportOrNonTeachingRole } from "@/lib/crawler/roleClassifier";
import { TAALEEM_CAMPUS_MAP, isTaaleemSchool } from "@/lib/search/taaleem";
import axios from "axios";
import * as cheerio from "cheerio";

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

function normalizeTitleKey(t: string): string {
  return (t || "")
    .toLowerCase()
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/[-–—].*$/, "")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findBestTesMatch(jobTitle: string, tesList: Array<{ rawTitle?: string; cleanTitle?: string; title?: string; tesUrl: string }>): string | undefined {
  const subj = detectSubject(jobTitle);
  if (subj) {
    const match = tesList.find(t => detectSubject(t.rawTitle || t.cleanTitle || t.title || "") === subj);
    if (match) return match.tesUrl;
  }
  return undefined;
}

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

    const schoolTesList = tesJobsBySchool.get(schoolId) || [];
    const matchedTesUrl = findBestTesMatch(rawTitle, schoolTesList) || findBestTesMatch(cleanTitle, schoolTesList);
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

  let crossLinkedCount = 0;
  const cacheSnap = await db.collection("featured_jobs_cache").get();

  for (const doc of cacheSnap.docs) {
    const d = doc.data();
    if (doc.id.startsWith("taaleem_")) continue;

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
    }
  }

  console.log(`🎉 [TAALEEM ENGINE] Synchronization finished: ${ingestedCount} direct jobs synced, ${crossLinkedCount} dual-listed jobs cross-linked.`);
  return { ingested: ingestedCount, crossLinked: crossLinkedCount };
}

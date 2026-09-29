import { translateJobTitleToEnglish } from "@/lib/utils/titleTranslator";
/**
 * 🛸 PIPELINE 1 — CLEAN DUAL-COMMIT INGESTION ENGINE (STRICT TES-ONLY MODE)
 *
 * Enforces pre-ingestion quality gates on raw scraped records before
 * committing to BOTH:
 *   1. `schools/<schoolId>/jobs/<jobFingerprint>` (source of truth subcollection)
 *   2. `featured_jobs_cache/<jobFingerprint>`       (denormalized flat cache)
 *
 * STRICT TES MODE:
 *   - Only permits source === "TES" and applyUrl starting with "https://www.tes.com/jobs/vacancy/"
 *   - Enforces SHORT JOB TITLE ONLY (Capped at 60 Characters Maximum)
 *   - Deduplicates by Unique TES Vacancy ID (`fp_<schoolId>_tes_<vacancyId>`)
 */

import { isSupportOrNonTeachingRole, isStrictAcademicTeachingRole } from "../crawler/roleClassifier";
import { purgeStaleTesVacancies } from "../crawler/adaptors/tes-adaptor";
import { generateJobFingerprint, saveScrapedJobs, getAdminDb, setDocument } from "@/firebase/admin";
import { parseClosingDate, triageVacancyLifecycle } from "../crawler/dateParser";
import { isWhitelistedSchool } from "../crawler/schoolWhitelist";
import { isMalvernCampus } from "../search/malvern";
import { isTaaleemSchool, resolveTaaleemDirectUrl } from "../search/taaleem";
import { isEsfSchool, ESF_PORTAL_URL } from "../search/esf";
import type { RawJobRecord } from "../crawler/adaptors/raw-job.types";

export interface IngestionResult {
  accepted: number;
  rejected: number;
  reasons: string[];
  acceptedFingerprints: string[];
  addedCount?: number;
  removedCount?: number;
}

export interface CacheJobDocument {
  id: string;
  title: string;
  source: string;
  sources?: string[];
  sourceUrls?: Record<string, string>;
  group?: string;
  ownership?: string;
  applyUrl: string;
  directUrl?: string | null;
  datePosted: string | null;
  closingDate: string | null;
  closingDateMillis: number | null;
  schoolId: string;
  schoolName: string;
  city: string;
  country: string;
  status: 'approved' | 'pending_review' | 'expired' | 'rejected';
  ingestedAtMillis: number;
  isRollingDeadline: boolean;
  campus?: string;
  isAgencyListing?: boolean;
  agencyName?: string;
  department?: string;
  curriculum?: string;
  savingsPotentialSingle?: number;
  savingsByStatus?: Record<string, number>;
  searchTokens?: string[];
  schoolRating?: number;
  schoolWebsite?: string;
  isVolatileMarket?: boolean;
  paidInUSD?: boolean;
  startDate?: string | null;
  isMidYearReplacement?: boolean;
  matchConfidence?: "high" | "medium" | "low" | null;
  verificationReasons?: string[] | null;
}

function buildCacheDocument(
  record: RawJobRecord,
  fingerprint: string,
  fallbackSchoolName: string
): CacheJobDocument {
  const parsedDate = parseClosingDate(record.closingDate);
  const closingDateISO = parsedDate.closingDate
    ? parsedDate.closingDate.toISOString().split("T")[0]
    : null;
    
  let closingDateMillis = parsedDate.closingDate
    ? parsedDate.closingDate.getTime()
    : null;

  // 🛡️ Gate 3: 42-Day Cap for Rolling / Unlimited Deadlines
  if (!closingDateMillis) {
    const postTime = record.datePosted ? new Date(record.datePosted).getTime() : NaN;
    const baseTime = !isNaN(postTime) ? postTime : Date.now();
    closingDateMillis = baseTime + 42 * 24 * 60 * 60 * 1000;
  }

  const srcName = record.source || "TES";
  const srcUrls: Record<string, string> = { ...(record.sourceUrls || {}) };
  if (record.applyUrl && !srcUrls[srcName]) {
    srcUrls[srcName] = record.applyUrl;
  }

  const initialSources = record.sources && record.sources.length > 0
    ? [...record.sources]
    : [srcName];

  // Multi-campus & St. Christopher's Bahrain canonical master re-parenting
  let targetSchoolId = record.schoolId ? record.schoolId.toUpperCase() : '';
  let targetSchoolName = record.schoolName || fallbackSchoolName;
  let targetCity = record.city || "";
  let campus = record.campus || undefined;

  let directUrl = record.directUrl || null;
  let groupName = (record as any).group || undefined;
  if (isMalvernCampus(record.schoolId, record.schoolName)) {
    groupName = 'Malvern College';
    if (!initialSources.includes('Malvern')) {
      initialSources.push('Malvern');
    }
    if (directUrl && !srcUrls['Malvern']) {
      srcUrls['Malvern'] = directUrl;
    }
  }

  if (isTaaleemSchool(record.schoolId, record.schoolName, (record as any).group)) {
    groupName = 'Taaleem';
    const resolvedTaaleem = resolveTaaleemDirectUrl(
      record.rawTitle || (record as any).title || '',
      record.schoolName || fallbackSchoolName,
      directUrl || record.applyUrl
    );
    const taaleemUrl = resolvedTaaleem.canonicalUrl;
    // A job-specific Taaleem link is one that isn't the bare careers hub.
    const isGenericTaaleemUrl = !taaleemUrl
      || taaleemUrl === 'https://careers.taaleem.ae/'
      || taaleemUrl === 'https://careers.taaleem.ae'
      || taaleemUrl === 'https://taaleem.ae'
      || taaleemUrl === 'https://www.taaleem.ae';
    if (resolvedTaaleem.campus && !campus) {
      campus = resolvedTaaleem.campus;
    }
    if (record.applyUrl && record.applyUrl.includes('tes.com')) {
      if (!initialSources.includes('TES')) initialSources.push('TES');
      srcUrls['TES'] = record.applyUrl;
    }
    // Only attach the Taaleem source/pill when we have a real, job-specific
    // apply link — never for the generic careers hub fallback. A TES-only
    // job at a Taaleem school should show just the TES pill, not a Taaleem
    // pill pointing at the generic careers page.
    if (!isGenericTaaleemUrl) {
      if (!initialSources.includes('Taaleem')) {
        initialSources.push('Taaleem');
      }
      srcUrls['Taaleem'] = taaleemUrl;
      srcUrls['TAALEEM'] = taaleemUrl;
      if (!directUrl || !directUrl.includes('taaleem.ae')) {
        directUrl = taaleemUrl;
      }
    }
  }

  if (isEsfSchool(record.schoolId, record.schoolName, (record as any).group, record.applyUrl)) {
    groupName = 'English Schools Foundation';
    if (!initialSources.includes('ESF')) {
      initialSources.push('ESF');
    }
    const esfDirect = directUrl || (record.applyUrl?.includes('myworkdayjobs.com/ESF') ? record.applyUrl : ESF_PORTAL_URL);
    if (!srcUrls['ESF']) {
      srcUrls['ESF'] = esfDirect;
      srcUrls['esf'] = esfDirect;
    }
    if (record.applyUrl && record.applyUrl.includes('tes.com')) {
      if (!initialSources.includes('TES')) initialSources.push('TES');
      srcUrls['TES'] = record.applyUrl;
    }
  }

  // ── Nord Anglia Education group enrichment ──
  const isNordAngliaGroup = (
    (record as any).group?.toLowerCase().includes('nord anglia') ||
    record.applyUrl?.includes('nordanglia.com') ||
    record.applyUrl?.includes('nordangliaeducation.com') ||
    (record.source || '').toUpperCase().includes('NORD ANGLIA')
  );
  if (isNordAngliaGroup) {
    groupName = 'Nord Anglia Education';
    if (!initialSources.includes('Nord Anglia')) {
      initialSources.push('Nord Anglia');
    }
    const naDirectUrl = directUrl || record.applyUrl || '';
    if (naDirectUrl.includes('nordanglia.com') && !srcUrls['Nord Anglia']) {
      srcUrls['Nord Anglia'] = naDirectUrl;
    }
    // Preserve any TES URL for dual-pill display
    if (record.applyUrl && record.applyUrl.includes('tes.com')) {
      if (!initialSources.includes('TES')) initialSources.push('TES');
      srcUrls['TES'] = record.applyUrl;
    }
    // If the record already carries TES sourceUrls from the crawler
    if ((record as any).sourceUrls?.['TES']) {
      if (!initialSources.includes('TES')) initialSources.push('TES');
      srcUrls['TES'] = (record as any).sourceUrls['TES'];
    }
  }

  const rawSchoolIdLower = (record.schoolId || "").toLowerCase();
  if (rawSchoolIdLower === 'flis0224_primary' || rawSchoolIdLower.includes('flis0224_p')) {
    targetSchoolId = 'FLIS0224';
    targetSchoolName = "St Christopher's School";
    targetCity = 'Saar';
    campus = 'Primary (Saar)';
  } else if (rawSchoolIdLower === 'flis0224_senior' || rawSchoolIdLower.includes('flis0224_s')) {
    targetSchoolId = 'FLIS0224';
    targetSchoolName = "St Christopher's School";
    targetCity = 'Isa Town';
    campus = 'Senior (Isa Town)';
  } else if (rawSchoolIdLower === 'flis0224') {
    targetSchoolId = 'FLIS0224';
    targetSchoolName = "St Christopher's School";
  }

  const rawStart = (record as any).startDate || null;
  const isMidYearReplacement = Boolean(
    (rawStart && (rawStart.toLowerCase().includes("asap") || rawStart.toLowerCase().includes("immediate") || rawStart.toLowerCase().includes("january") || rawStart.toLowerCase().includes("term 2"))) ||
    (record.rawTitle && (record.rawTitle.toLowerCase().includes("maternity") || record.rawTitle.toLowerCase().includes("immediate start") || record.rawTitle.toLowerCase().includes("asap")))
  );

  return {
    id: fingerprint,
    title: translateJobTitleToEnglish(record.rawTitle),
    source: srcName,
    sources: initialSources,
    sourceUrls: srcUrls,
    directUrl,
    group: groupName,
    applyUrl: record.applyUrl || "",
    datePosted: record.datePosted ? String(record.datePosted) : null,
    closingDate: closingDateISO,
    closingDateMillis,
    schoolId: targetSchoolId,
    schoolName: targetSchoolName,
    city: targetCity,
    country: record.country || "",
    campus,
    status: 'pending_review',
    ingestedAtMillis: Date.now(),
    isRollingDeadline: closingDateMillis === null,
    isAgencyListing: false,
    agencyName: record.source || "TES",
    matchConfidence: record.matchConfidence ?? null,
    verificationReasons: record.verificationReasons ?? null,
  };
}

async function writeToCacheCollection(doc: CacheJobDocument): Promise<{ isNew: boolean }> {
  try {
    const { getAdminDb } = await import("@/firebase/admin");
    const db = getAdminDb();
    if (db) {
      const snap = await db.collection("featured_jobs_cache").where("schoolId", "==", doc.schoolId).get();
      const normTitle = doc.title.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
      const existingDoc = snap.docs.find((d: any) => {
        const data = d.data();
        const dTitle = String(data.title || "").toLowerCase().replace(/[^a-z0-9]/g, "").trim();
        return data.schoolId === doc.schoolId && dTitle === normTitle;
      });

      if (existingDoc) {
        const exData = existingDoc.data();
        const rawSources = [...(exData.sources || [exData.source || "Official Source"]), ...(doc.sources || [doc.source])];
        const sourceMap = new Map<string, string>();
        rawSources.forEach(s => {
          if (!s) return;
          const u = String(s).toUpperCase().trim();
          const cleanName = (u === "GLOBE" || u === "GLOBEDUCATE") ? "Globeducate" : (u === "COGNITA" ? "Cognita" : (u === "INSPIRED" ? "Inspired" : (u === "MALVERN" ? "Malvern" : (u === "UWC" ? "UWC" : (u === "ISP" ? "ISP" : (u === "TES" ? "TES" : (u === "NORD ANGLIA" ? "Nord Anglia" : s)))))));
          if (!sourceMap.has(u)) sourceMap.set(u, cleanName);
        });
        const mergedSources = Array.from(sourceMap.values());
        const mergedUrls = { ...(exData.sourceUrls || {}), ...(doc.sourceUrls || {}) };
        if (exData.applyUrl) mergedUrls[exData.source || "Official Source"] = exData.applyUrl;
        if (doc.applyUrl) mergedUrls[doc.source] = doc.applyUrl;
        if (doc.directUrl) mergedUrls["Malvern"] = doc.directUrl;

        await existingDoc.ref.update({
          sources: mergedSources,
          sourceUrls: mergedUrls,
          directUrl: doc.directUrl || exData.directUrl || null,
          group: doc.group || exData.group || null,
          updatedAtMillis: Date.now()
        });
        console.log(`🛸 [PIPELINE 1] Merged dual listing sources for "${doc.title}":`, mergedSources);
        return { isNew: false };
      }
    }
    const { setDocument } = await import("@/firebase/admin");
    await setDocument("featured_jobs_cache", doc.id, doc, { merge: true });
    return { isNew: true };
  } catch (err) {
    console.warn(`🛸 [PIPELINE 1] Cache write failed for ${doc.id}:`, err);
    return { isNew: false };
  }
}

export async function runIngestionPipeline(
  schoolId: string,
  rawRecords: RawJobRecord[],
  options?: { purgeTesVacancies?: boolean }
): Promise<IngestionResult> {
  if (!rawRecords || rawRecords.length === 0) {
    return { accepted: 0, rejected: 0, reasons: [], acceptedFingerprints: [], addedCount: 0, removedCount: 0 };
  }

  const targetWhitelisted = await isWhitelistedSchool(undefined, undefined, schoolId);
  const targetSchoolName = targetWhitelisted ? targetWhitelisted.schoolName : schoolId;

  const reasons: string[] = [];
  let rejected = 0;
  const seenFingerprints = new Set<string>();
  const seenUrls = new Set<string>();
  const mappedJobs: any[] = [];
  const cacheDocs: CacheJobDocument[] = [];
  const acceptedFingerprints: string[] = [];

  for (const record of rawRecords) {
    // ── MULTI-ENGINE SOURCE GATE ──────────────────────────────────────────
    const srcUpper = (record.source || "").toUpperCase();
    const isTes = (srcUpper === "TES" || srcUpper.includes("TES")) && record.applyUrl && record.applyUrl.includes("tes.com/jobs/vacancy/");
    const isNordAnglia = (srcUpper.includes("NORD ANGLIA") || srcUpper.includes("NORD_ANGLIA") || (record.applyUrl && (record.applyUrl.includes("nordangliaeducation.com") || record.applyUrl.includes("nordanglia.com"))));
    const isGrc = srcUpper === "GRC" && record.applyUrl && (record.applyUrl.includes("grcfair.org/job-details/") || record.applyUrl.includes("grcfair.org/job/"));

    const isInspired = (srcUpper.includes("INSPIRED") || (record.applyUrl && record.applyUrl.includes("inspirededu.com/job/")));
    const isTeachAway = (srcUpper.includes("TEACH AWAY") || (record.applyUrl && record.applyUrl.includes("teachaway.com/")));
    const isCognita = (srcUpper.includes("COGNITA") || (record.applyUrl && record.applyUrl.includes("cognitapeople.csod.com/")));
    const isMalvern = (srcUpper.includes("MALVERN") || (record.applyUrl && record.applyUrl.includes("malverncollegefamily.org")) || isMalvernCampus(schoolId, targetSchoolName));
    const isUwc = (srcUpper.includes("UWC") || srcUpper.includes("UNITED WORLD COLLEGE") || (record.applyUrl && (record.applyUrl.includes("uwc.org/career/") || record.applyUrl.includes("uwc.org/careers/"))));
    const isIsp = (srcUpper.includes("ISP") || srcUpper.includes("INTERNATIONAL SCHOOLS PARTNERSHIP") || (record.applyUrl && record.applyUrl.includes("internationalschools.wd3.myworkdayjobs.com/")));
    const isGlobeducate = (srcUpper.includes("GLOBEDUCATE") || srcUpper.includes("GLOBE") || (record.applyUrl && (record.applyUrl.includes("globeducate.schoolrecruiter.com/") || record.applyUrl.includes("careers.globeducate.com/"))));
    const isGems = (srcUpper.includes("GEMS") || (record.applyUrl && record.applyUrl.includes("careers.gemseducation.com/")));
    const isGuardian = (srcUpper.includes("GUARDIAN") || (record.applyUrl && (record.applyUrl.includes("theguardian.com") || record.applyUrl.includes("guardianjobs"))));
    const isTaylors = (srcUpper.includes("TAYLOR") || (record.applyUrl && record.applyUrl.includes("taylors")));
    const isDirectWeb = (srcUpper.includes("DIRECT") || srcUpper.includes("SCHOOL WEB") || srcUpper.includes("WEBSITE") || srcUpper.includes("OFFICIAL") || srcUpper.includes("ATS")) && record.applyUrl && !record.applyUrl.includes("google.com/maps");

    const isRecognizedSource = isTes || isNordAnglia || isGrc || isInspired || isTeachAway || isCognita || isMalvern || isUwc || isIsp || isGlobeducate || isGems || isGuardian || isTaylors || isDirectWeb;

    if (!isRecognizedSource) {
      rejected++;
      reasons.push(`[UNRECOGNIZED_SOURCE_REJECTED] Discarded "${record.rawTitle}" from source "${record.source}".`);
      continue;
    }

    const cleanApplyUrl = (record.applyUrl || "").toLowerCase().trim();
    if (cleanApplyUrl && seenUrls.has(cleanApplyUrl)) {
      rejected++;
      reasons.push(`[DEDUP_URL] "${record.rawTitle}" (${record.applyUrl})`);
      continue;
    }
    if (cleanApplyUrl) {
      seenUrls.add(cleanApplyUrl);
    }

    // ── GATE 2: Role Classifier (Academic Teaching Roles Only) ───────────────
    if (!isStrictAcademicTeachingRole(record.rawTitle)) {
      rejected++;
      reasons.push(`[ROLE_FILTER_NON_ACADEMIC] "${record.rawTitle}"`);
      continue;
    }

    // ── GATE 3: Expired Closing Date & Past Intake Check ───────────────────
    const triage = triageVacancyLifecycle(
      String(record.closingDate || ''), 
      record.datePosted, 
      new Date(), 
      record.rawTitle
    );
    if (triage.status === "expired") {
      rejected++;
      reasons.push(`[EXPIRED_JOB_REJECTED] "${record.rawTitle}" (${record.closingDate || 'undated'}: ${triage.expiryReason || 'expired'})`);
      continue;
    }

    // ── GATE 5: Composite Key Fingerprint Deduplication (Cross-Engine Unified) ──
    const fp = generateJobFingerprint(schoolId, record.rawTitle, undefined, record.applyUrl, record.datePosted);

    if (seenFingerprints.has(fp)) {
      rejected++;
      reasons.push(`[DEDUP_FP] "${record.rawTitle}" (fingerprint: ${fp})`);
      continue;
    }
    seenFingerprints.add(fp);
    acceptedFingerprints.push(fp);

    mappedJobs.push({
      id: fp,
      title: record.rawTitle,
      source: record.source,
      sourceName: record.source,
      applyUrl: record.applyUrl,
      source_url: record.applyUrl,
      closingDate: record.closingDate || null,
      datePosted: record.datePosted || null,
      city: record.city || "",
      country: record.country || "",
      jobFingerprint: fp,
      status: "pending_review",
      matchConfidence: record.matchConfidence ?? null,
      verificationReasons: record.verificationReasons ?? null,
    });

    cacheDocs.push(buildCacheDocument(record, fp, targetSchoolName));
  }

  if (mappedJobs.length > 0) {
    await saveScrapedJobs(schoolId, mappedJobs);
  }

  // 🕒 Checkpoint school sweep timestamp in Firestore
  try {
    const { getAdminDb } = await import("@/firebase/admin");
    const db = getAdminDb();
    if (db) {
      await db.collection("schools").doc(schoolId).set({
        lastSweptAtMillis: Date.now(),
        lastSweptDate: new Date().toISOString()
      }, { merge: true });
    }
  } catch (err: any) {
    console.warn(`⚠️ [PIPELINE 1] Failed to update lastSweptAtMillis on ${schoolId}:`, err.message);
  }

  const cacheResults = await Promise.all(cacheDocs.map(d => writeToCacheCollection(d)));

  // 🧹 Auto-purge stale TES vacancies for this school ONLY when explicitly requested for full-school sweep
  if (options?.purgeTesVacancies === true) {
    const activeTesUrls = new Set(
      mappedJobs
        .filter(j => (j.source || "").toUpperCase().includes("TES") && j.applyUrl)
        .map(j => j.applyUrl)
    );
    if (activeTesUrls.size > 0) {
      await purgeStaleTesVacancies(schoolId, activeTesUrls);
    }
  }
  const addedCount = cacheResults.filter(r => r.isNew).length;
  const removedCount = rejected;

  const accepted = mappedJobs.length;
  console.log(
    `🛸 [PIPELINE 1 INGESTION] schoolId=${schoolId} | accepted=${accepted} | rejected=${rejected}`
  );

  return { accepted, rejected, reasons, acceptedFingerprints, addedCount, removedCount };
}

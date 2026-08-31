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

import { isSupportOrNonTeachingRole } from "../crawler/roleClassifier";
import { generateJobFingerprint, saveScrapedJobs } from "@/firebase/admin";
import { parseClosingDate, triageVacancyLifecycle } from "../crawler/dateParser";
import { isWhitelistedSchool } from "../crawler/schoolWhitelist";
import type { RawJobRecord } from "../crawler/adaptors/raw-job.types";

export interface IngestionResult {
  accepted: number;
  rejected: number;
  reasons: string[];
  acceptedFingerprints: string[];
}

export interface CacheJobDocument {
  id: string;
  title: string;
  source: string;
  applyUrl: string;
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
  const closingDateMillis = parsedDate.closingDate
    ? parsedDate.closingDate.getTime()
    : null;

  return {
    id: fingerprint,
    title: record.rawTitle,
    source: record.source || "TES",
    applyUrl: record.applyUrl || "",
    datePosted: record.datePosted ? String(record.datePosted) : null,
    closingDate: closingDateISO,
    closingDateMillis,
    schoolId: record.schoolId,
    schoolName: record.schoolName || fallbackSchoolName,
    city: record.city || "",
    country: record.country || "",
    status: 'approved',
    ingestedAtMillis: Date.now(),
    isRollingDeadline: closingDateMillis === null,
    isAgencyListing: false,
    agencyName: record.source || "TES",
  };
}

async function writeToCacheCollection(doc: CacheJobDocument): Promise<void> {
  try {
    const { setDocument } = await import("@/firebase/admin");
    await setDocument("featured_jobs_cache", doc.id, doc, { merge: true });
  } catch (err) {
    console.warn(`🛸 [PIPELINE 1] Cache write failed for ${doc.id}:`, err);
  }
}

export async function runIngestionPipeline(
  schoolId: string,
  rawRecords: RawJobRecord[]
): Promise<IngestionResult> {
  if (!rawRecords || rawRecords.length === 0) {
    return { accepted: 0, rejected: 0, reasons: [], acceptedFingerprints: [] };
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
    const isTes = srcUpper === "TES" && record.applyUrl && record.applyUrl.includes("tes.com/jobs/vacancy/");
    const isNordAnglia = srcUpper === "NORD ANGLIA" && record.applyUrl && record.applyUrl.includes("careers.nordangliaeducation.com/job/");
    const isGrc = srcUpper === "GRC" && record.applyUrl && (record.applyUrl.includes("grcfair.org/job-details/") || record.applyUrl.includes("grcfair.org/job/"));

    if (!isTes && !isNordAnglia && !isGrc) {
      rejected++;
      reasons.push(`[UNRECOGNIZED_SOURCE_REJECTED] Discarded "${record.rawTitle}" from source "${record.source}".`);
      continue;
    }

    const cleanApplyUrl = (record.applyUrl || "").toLowerCase().trim();
    if (seenUrls.has(cleanApplyUrl)) {
      rejected++;
      reasons.push(`[DEDUP_URL] "${record.rawTitle}" (${record.applyUrl})`);
      continue;
    }
    seenUrls.add(cleanApplyUrl);

    // ── GATE 2: Role Classifier (Academic Teaching Roles Only) ───────────────
    if (isSupportOrNonTeachingRole(record.rawTitle)) {
      rejected++;
      reasons.push(`[ROLE_FILTER] "${record.rawTitle}"`);
      continue;
    }

    // ── GATE 3: Expired Closing Date Check ──────────────────────────────────
    const triage = triageVacancyLifecycle(String(record.closingDate || ''), record.datePosted);
    if (triage.status === "expired") {
      rejected++;
      reasons.push(`[EXPIRED_JOB_REJECTED] "${record.rawTitle}" (${record.closingDate})`);
      continue;
    }

    // ── GATE 5: Composite Key Fingerprint Deduplication ─────────────────────
    let fp = "";
    if (isTes) {
      const tesIdMatch = cleanApplyUrl.match(/-(\d+)\/?$/);
      fp = tesIdMatch ? `fp_${schoolId.toLowerCase()}_tes_${tesIdMatch[1]}` : generateJobFingerprint(schoolId, record.rawTitle);
    } else if (isNordAnglia) {
      const naeIdMatch = cleanApplyUrl.match(/\/(\d+)\/?$/);
      fp = naeIdMatch ? `fp_${schoolId.toLowerCase()}_nae_${naeIdMatch[1]}` : generateJobFingerprint(schoolId, record.rawTitle);
    } else if (isGrc) {
      const grcIdMatch = cleanApplyUrl.match(/\/job-details\/(\d+)/i) || cleanApplyUrl.match(/\/(\d+)\/?$/);
      fp = grcIdMatch ? `fp_${schoolId.toLowerCase()}_${grcIdMatch[1]}` : generateJobFingerprint(schoolId, record.rawTitle);
    } else {
      fp = generateJobFingerprint(schoolId, record.rawTitle);
    }

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
      status: "approved",
    });

    cacheDocs.push(buildCacheDocument(record, fp, targetSchoolName));
  }

  if (mappedJobs.length > 0) {
    await saveScrapedJobs(schoolId, mappedJobs);
  }

  await Promise.all(cacheDocs.map(d => writeToCacheCollection(d)));

  const accepted = mappedJobs.length;
  console.log(
    `🛸 [PIPELINE 1 TES ONLY] schoolId=${schoolId} | accepted=${accepted} | rejected=${rejected}`
  );

  return { accepted, rejected, reasons, acceptedFingerprints };
}

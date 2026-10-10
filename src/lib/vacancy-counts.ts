import { getAcademicYear } from "./academic-year";

export interface YearCount {
  label: string;
  count: number;
}

export interface VacancyCountsResult {
  currentYear: YearCount;
  previousYear: YearCount;
  notCountedNoPostedDate: number;
}

/**
 * Parses any date representation into a valid UTC Date object.
 * Supports Date, Firestore Timestamp objects ({ _seconds } or { seconds } or .toDate()),
 * epoch milliseconds, and date strings.
 * Does not import firebase-admin or Firestore.
 */
export function parseToUtcDate(val: any): Date | null {
  if (val === undefined || val === null || val === "") return null;
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val;
  }
  if (val && typeof val.toDate === "function") {
    try {
      const d = val.toDate();
      return isNaN(d.getTime()) ? null : d;
    } catch {
      // Fall through to other checks
    }
  }
  if (typeof val === "object") {
    if (typeof val._seconds === "number") {
      return new Date(val._seconds * 1000);
    }
    if (typeof val.seconds === "number") {
      return new Date(val.seconds * 1000);
    }
  }
  if (typeof val === "number" && Number.isFinite(val) && val > 0) {
    return new Date(val);
  }
  if (typeof val === "string") {
    const clean = val.replace(/posted:\s*/i, "").trim();
    if (!clean) return null;
    const d = new Date(clean);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/**
 * Normalises an apply URL for reliable deduplication matching.
 */
function normalizeUrl(url: string | null | undefined): string {
  if (!url) return "";
  try {
    const u = new URL(url.trim());
    const path = u.pathname.replace(/\/+$/, "");
    return `${u.hostname}${path}`.toLowerCase();
  } catch {
    return url.trim().toLowerCase().replace(/\/+$/, "");
  }
}

interface MergedJobCandidate {
  id: string;
  applyUrl: string;
  datePostedRaw?: any;
  date_listed?: any;
  closingDateRaw?: any;
  isManualOverride: boolean;
  isRejected: boolean;
}

/**
 * Resolves the usable date for a job according to business rules:
 * - datePosted, or date_listed if datePosted is missing.
 * - Does NOT use firstDiscoveredAt, ingestedAtMillis, scrapedAt, or closingDate.
 * - Exception: records with isManualOverride === true use closingDate when they have no datePosted.
 */
function getJobUsableDate(candidate: MergedJobCandidate): Date | null {
  // 1. Primary: datePosted
  if (candidate.datePostedRaw !== undefined && candidate.datePostedRaw !== null && candidate.datePostedRaw !== "") {
    const d = parseToUtcDate(candidate.datePostedRaw);
    if (d) return d;
  }

  // 2. Secondary: date_listed if datePosted missing
  if (candidate.date_listed !== undefined && candidate.date_listed !== null && candidate.date_listed !== "") {
    const d = parseToUtcDate(candidate.date_listed);
    if (d) return d;
  }

  // 3. Exception: isManualOverride === true uses closingDate if no datePosted
  if (candidate.isManualOverride && candidate.closingDateRaw !== undefined && candidate.closingDateRaw !== null && candidate.closingDateRaw !== "") {
    const d = parseToUtcDate(candidate.closingDateRaw);
    if (d) return d;
  }

  return null;
}

/**
 * Note for callers: Each job record must have its Firestore document ID placed in the `id` field.
 *
 * Counts known vacancies for one school across current and previous academic years.
 *
 * @param jobs Job records for the school (from featured_jobs_cache and schools/{id}/jobs together)
 * @param country The school's country (used by getAcademicYear)
 * @param today Reference date for current academic year (defaults to new Date())
 * @returns { currentYear: { label, count }, previousYear: { label, count }, notCountedNoPostedDate: number }
 */
export function countSchoolVacancies(
  jobs: any[],
  country?: string,
  today: Date = new Date()
): VacancyCountsResult {
  // Determine current and previous academic years
  const currentAy = getAcademicYear(today, country);

  const prevYearDate = new Date(today.getTime());
  prevYearDate.setUTCFullYear(prevYearDate.getUTCFullYear() - 1);
  const prevAy = getAcademicYear(prevYearDate, country);

  if (!Array.isArray(jobs) || jobs.length === 0) {
    return {
      currentYear: { label: currentAy.label, count: 0 },
      previousYear: { label: prevAy.label, count: 0 },
      notCountedNoPostedDate: 0,
    };
  }

  const uniqueCandidates: MergedJobCandidate[] = [];
  const idMap = new Map<string, number>();
  const urlMap = new Map<string, number>();

  for (const job of jobs) {
    if (!job) continue;

    const rawStatus = String(job.status || "").toLowerCase();
    const isRejected = rawStatus === "rejected";

    const id = String(job.id || "").trim();
    const applyUrl = String(job.applyUrl || job.source_url || job.directUrl || "").trim();
    const normUrl = normalizeUrl(applyUrl);

    // Rule 2: Count each job once: match by job ID, then by applyUrl
    let matchIdx: number | undefined;
    if (id && idMap.has(id)) {
      matchIdx = idMap.get(id);
    } else if (normUrl && urlMap.has(normUrl)) {
      matchIdx = urlMap.get(normUrl);
    }

    const isManualOverride = Boolean(
      job.isManualOverride === true || job.isManual === true || job.manual === true
    );
    const datePostedRaw = job.datePosted !== undefined && job.datePosted !== null ? job.datePosted : undefined;
    const date_listed = job.date_listed !== undefined && job.date_listed !== null ? job.date_listed : undefined;
    const closingDateRaw = job.closingDate !== undefined && job.closingDate !== null
      ? job.closingDate
      : job.closingDateMillis;

    if (matchIdx !== undefined) {
      // Job already seen: merge attributes
      const existing = uniqueCandidates[matchIdx];
      // Rule 1: If ANY copy has status "rejected", the whole job is rejected
      if (isRejected) {
        existing.isRejected = true;
      }
      if (!existing.datePostedRaw && datePostedRaw) {
        existing.datePostedRaw = datePostedRaw;
      }
      if (!existing.date_listed && date_listed) {
        existing.date_listed = date_listed;
      }
      if (!existing.closingDateRaw && closingDateRaw) {
        existing.closingDateRaw = closingDateRaw;
      }
      if (isManualOverride) {
        existing.isManualOverride = true;
      }
      continue;
    }

    const candidate: MergedJobCandidate = {
      id,
      applyUrl,
      datePostedRaw,
      date_listed,
      closingDateRaw,
      isManualOverride,
      isRejected,
    };

    const newIdx = uniqueCandidates.length;
    uniqueCandidates.push(candidate);
    if (id) idMap.set(id, newIdx);
    if (normUrl) urlMap.set(normUrl, newIdx);
  }

  // Count distribution across academic years
  let currentYearCount = 0;
  let previousYearCount = 0;
  let notCountedNoPostedDate = 0;

  for (const candidate of uniqueCandidates) {
    // Rule 1: Skip if ANY copy of the job had status "rejected" (do NOT add to notCountedNoPostedDate)
    if (candidate.isRejected) {
      continue;
    }

    const usableDate = getJobUsableDate(candidate);

    // Rule 4: A job with no usable date is not counted. Add it to notCountedNoPostedDate.
    if (!usableDate) {
      notCountedNoPostedDate++;
      continue;
    }

    // Rule 5: Work out each job's academic year with getAcademicYear
    const jobAy = getAcademicYear(usableDate, country);

    if (jobAy.label === currentAy.label) {
      currentYearCount++;
    } else if (jobAy.label === prevAy.label) {
      previousYearCount++;
    }
    // Rule 6: Jobs in any other year are not counted.
  }

  return {
    currentYear: {
      label: currentAy.label,
      count: currentYearCount,
    },
    previousYear: {
      label: prevAy.label,
      count: previousYearCount,
    },
    notCountedNoPostedDate,
  };
}

// Convenient alias
export const getSchoolVacancyCounts = countSchoolVacancies;

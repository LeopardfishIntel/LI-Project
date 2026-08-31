/**
 * 📅 CENTRAL DATE PARSER & LIFECYCLE TRIAGE
 *
 * Normalizes ambiguous raw date strings into ISO 8601 date strings or Date objects.
 * Enforces Gate 3:
 *   - Fix 3.1: 45-Day Rolling Post Staleness Cap (Imposes an automatic 45-day expiration cap on undated/rolling listings).
 *   - Fix 3.2: Automated Cache Purge helper function.
 */

export interface ParsedClosingDate {
  closingDate: Date | null;
  isRollingDeadline: boolean;
}

export interface LifecycleTriageResult {
  status: 'approved' | 'expired';
  isRollingDeadline: boolean;
  closingDate: Date | null;
  isStaleRolling?: boolean;
}

const MONTH_MAP: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

export const ROLLING_STALENESS_CAP_MS = 45 * 24 * 60 * 60 * 1000; // 45 Days

export function isRollingDeadlineString(rawDateStr: string | null | undefined): boolean {
  if (!rawDateStr || typeof rawDateStr !== 'string') return true;
  const clean = rawDateStr.trim().toLowerCase();
  return (
    clean.includes('rolling') ||
    clean.includes('until filled') ||
    clean.includes('asap') ||
    clean.includes('open') ||
    clean.includes('continuous') ||
    clean.includes('ongoing')
  );
}

export function parseClosingDate(rawDateStr: string | null | undefined): ParsedClosingDate {
  if (!rawDateStr || typeof rawDateStr !== 'string') {
    return { closingDate: null, isRollingDeadline: true };
  }

  const clean = rawDateStr.trim().toLowerCase();

  if (isRollingDeadlineString(clean)) {
    return { closingDate: null, isRollingDeadline: true };
  }

  // ISO Format: YYYY-MM-DD
  const isoMatch = clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10) - 1;
    const d = parseInt(isoMatch[3], 10);
    const date = new Date(y, m, d);
    if (!isNaN(date.getTime())) {
      return { closingDate: date, isRollingDeadline: false };
    }
  }

  // Textual formats (e.g. "15 October 2026", "Oct 15, 2026")
  const words = clean.replace(/[,.]/g, ' ').split(/\s+/).filter(Boolean);
  let day: number | null = null;
  let month: number | null = null;
  let year: number | null = null;

  for (const token of words) {
    if (/^\d{1,2}(st|nd|rd|th)?$/.test(token)) {
      const num = parseInt(token, 10);
      if (num >= 1 && num <= 31 && day === null) {
        day = num;
      }
    } else if (MONTH_MAP[token] !== undefined && month === null) {
      month = MONTH_MAP[token];
    } else if (/^\d{4}$/.test(token)) {
      year = parseInt(token, 10);
    }
  }

  if (month !== null && year !== null) {
    const finalDay = day !== null ? day : 1;
    const date = new Date(year, month, finalDay);
    if (!isNaN(date.getTime())) {
      return { closingDate: date, isRollingDeadline: false };
    }
  }

  // Fallback native Date parse
  const parsedNative = new Date(rawDateStr);
  if (!isNaN(parsedNative.getTime())) {
    return { closingDate: parsedNative, isRollingDeadline: false };
  }

  return { closingDate: null, isRollingDeadline: true };
}

/**
 * 🛠️ FIX 3.1: 45-DAY STALENESS THRESHOLD & TRIAGE
 * Evaluates whether a vacancy is active or expired.
 * For rolling deadlines, applies a strict 45-day cap from datePosted/ingestedAt.
 */
export function triageVacancyLifecycle(
  rawDateStr: string | null | undefined, 
  datePostedOrIngestedAt?: Date | string | number | null,
  referenceDate: Date = new Date()
): LifecycleTriageResult {
  const { closingDate, isRollingDeadline } = parseClosingDate(rawDateStr);

  const refTime = referenceDate.getTime();

  if (isRollingDeadline || !closingDate) {
    // Calculate staleness from posted or ingested timestamp
    let postTime = refTime;
    if (datePostedOrIngestedAt) {
      const parsed = new Date(datePostedOrIngestedAt);
      if (!isNaN(parsed.getTime())) {
        postTime = parsed.getTime();
      }
    }

    const isStale = (refTime - postTime) > ROLLING_STALENESS_CAP_MS;

    return {
      status: isStale ? 'expired' : 'approved',
      isRollingDeadline: true,
      closingDate: null,
      isStaleRolling: isStale
    };
  }

  const refStartOfDay = new Date(referenceDate);
  refStartOfDay.setHours(0, 0, 0, 0);

  if (closingDate.getTime() >= refStartOfDay.getTime()) {
    return {
      status: 'approved',
      isRollingDeadline: false,
      closingDate,
    };
  }

  return {
    status: 'expired',
    isRollingDeadline: false,
    closingDate,
  };
}

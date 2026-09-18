/**
 * 📅 CENTRAL DATE PARSER & LIFECYCLE TRIAGE
 *
 * Normalizes ambiguous raw date strings into ISO 8601 date strings or Date objects.
 * Enforces Gate 3:
 *   - Fix 3.1: 45-Day Rolling Post Staleness Cap (Imposes an automatic 45-day expiration cap on undated/rolling listings).
 *   - Fix 3.2: Automated Cache Purge helper function.
 *   - End-of-Day Deadline Normalization (sets closing timestamps to 23:59:59.999 to prevent premature daytime expiry).
 *   - Date Range Resolution (selects the closing/upper bound date).
 *   - Smart US / European slash date disambiguation.
 *   - Day-of-week, time string, and timezone suffix sanitization.
 *   - 2-digit short year support (e.g. "15/10/26" -> 2026).
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

function setEndOfDay(date: Date): Date {
  date.setHours(23, 59, 59, 999);
  return date;
}

function normalizeYear(yearNum: number): number {
  if (yearNum < 100) {
    return yearNum >= 20 && yearNum <= 60 ? 2000 + yearNum : 1900 + yearNum;
  }
  return yearNum;
}

export function isRollingDeadlineString(rawDateStr: string | null | undefined): boolean {
  if (!rawDateStr || typeof rawDateStr !== 'string') return true;
  const clean = rawDateStr.trim().toLowerCase();
  return (
    clean.includes('rolling') ||
    clean.includes('until filled') ||
    clean.includes('asap') ||
    clean.includes('open') ||
    clean.includes('continuous') ||
    clean.includes('ongoing') ||
    clean.includes('immediate start') ||
    clean.includes('tbd')
  );
}

/**
 * Sanitizes scraped strings by removing days of the week, times, timezones, and leading prefixes.
 */
function sanitizeRawDateString(str: string): string {
  let s = str.trim().toLowerCase();

  // Strip leading prefixes like "deadline: ", "closing date: ", "apply by ", etc.
  s = s.replace(/^(?:deadline|closing date|closing|closes|apply by|applications close|posted on|posted|expires|due date)[:\s-]+/i, '');

  // Strip days of the week
  s = s.replace(/\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)[.,]?\b/gi, ' ');

  // Strip time expressions (e.g. "at 12:00 noon", "at 5pm", "11:59 pm", "midnight")
  s = s.replace(/\bat\s+\d{1,2}(?::\d{2})?\s*(?:am|pm|noon|midnight)?/gi, ' ');
  s = s.replace(/\b\d{1,2}:\d{2}(?::\d{2})?\s*(?:am|pm)?\b/gi, ' ');
  s = s.replace(/\b(?:noon|midnight)\b/gi, ' ');

  // Strip timezones
  s = s.replace(/\b(?:gmt|utc|bst|est|pst|cst|cet|cest|jst|aest|sgt|hkt)\b/gi, ' ');

  // Clean up punctuation and multiple whitespace
  s = s.replace(/[,()]/g, ' ').replace(/\s+/g, ' ').trim();

  return s;
}

export function parseClosingDate(rawDateStr: string | null | undefined): ParsedClosingDate {
  if (!rawDateStr || typeof rawDateStr !== 'string') {
    return { closingDate: null, isRollingDeadline: true };
  }

  if (isRollingDeadlineString(rawDateStr)) {
    return { closingDate: null, isRollingDeadline: true };
  }

  const clean = sanitizeRawDateString(rawDateStr);
  if (!clean || isRollingDeadlineString(clean)) {
    return { closingDate: null, isRollingDeadline: true };
  }

  // 1. Date Range: e.g. "10 - 24 October 2026" or "10th to 24th Oct 2026" -> select upper bound (24)
  const rangeMatch1 = clean.match(/(\d{1,2})(?:st|nd|rd|th)?\s*(?:[-–—]|to)\s*(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)\s+(\d{2,4})/i);
  if (rangeMatch1) {
    const d = parseInt(rangeMatch1[2], 10);
    const monthStr = rangeMatch1[3].toLowerCase();
    const y = normalizeYear(parseInt(rangeMatch1[4], 10));
    if (MONTH_MAP[monthStr] !== undefined && d >= 1 && d <= 31) {
      const date = new Date(y, MONTH_MAP[monthStr], d);
      if (!isNaN(date.getTime())) {
        return { closingDate: setEndOfDay(date), isRollingDeadline: false };
      }
    }
  }

  // Date Range: e.g. "October 10 - 24 2026" -> select upper bound (24)
  const rangeMatch2 = clean.match(/([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?\s*(?:[-–—]|to)\s*(\d{1,2})(?:st|nd|rd|th)?\s+(\d{2,4})/i);
  if (rangeMatch2) {
    const monthStr = rangeMatch2[1].toLowerCase();
    const d = parseInt(rangeMatch2[3], 10);
    const y = normalizeYear(parseInt(rangeMatch2[4], 10));
    if (MONTH_MAP[monthStr] !== undefined && d >= 1 && d <= 31) {
      const date = new Date(y, MONTH_MAP[monthStr], d);
      if (!isNaN(date.getTime())) {
        return { closingDate: setEndOfDay(date), isRollingDeadline: false };
      }
    }
  }

  // 2. ISO Format: YYYY-MM-DD (e.g. "2026-10-15" or "2026/10/15")
  const isoMatch = clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10) - 1;
    const d = parseInt(isoMatch[3], 10);
    if (m >= 0 && m <= 11 && d >= 1 && d <= 31) {
      const date = new Date(y, m, d);
      if (!isNaN(date.getTime())) {
        return { closingDate: setEndOfDay(date), isRollingDeadline: false };
      }
    }
  }

  // 3. Slash/Dash Date with Smart US vs European Disambiguation:
  // e.g. "15/10/2026", "10/25/2026", "15/10/26"
  const slashMatch = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
  if (slashMatch) {
    const p1 = parseInt(slashMatch[1], 10);
    const p2 = parseInt(slashMatch[2], 10);
    const y = normalizeYear(parseInt(slashMatch[3], 10));

    let d: number;
    let m: number;

    if (p1 > 12 && p2 <= 12) {
      // Unambiguously DD/MM/YYYY (e.g. 25/08/2026)
      d = p1;
      m = p2 - 1;
    } else if (p2 > 12 && p1 <= 12) {
      // Unambiguously MM/DD/YYYY (e.g. 08/25/2026)
      m = p1 - 1;
      d = p2;
    } else {
      // Ambiguous (both <= 12): Default to International standard DD/MM/YYYY
      d = p1;
      m = p2 - 1;
    }

    if (m >= 0 && m <= 11 && d >= 1 && d <= 31) {
      const date = new Date(y, m, d);
      if (!isNaN(date.getTime())) {
        return { closingDate: setEndOfDay(date), isRollingDeadline: false };
      }
    }
  }

  // 4. Textual formats (e.g. "15 October 2026", "15th Oct 2026", "Oct 15 2026", "15-Oct-2026", "15-Oct-26")
  const words = clean.replace(/[-.]/g, ' ').split(/\s+/).filter(Boolean);
  let day: number | null = null;
  let month: number | null = null;
  let year: number | null = null;

  for (const token of words) {
    if (/^\d{1,2}(st|nd|rd|th)?$/i.test(token)) {
      const num = parseInt(token, 10);
      if (num >= 1 && num <= 31 && day === null) {
        day = num;
      }
    } else if (MONTH_MAP[token.toLowerCase()] !== undefined && month === null) {
      month = MONTH_MAP[token.toLowerCase()];
    } else if (/^\d{4}$/.test(token)) {
      year = parseInt(token, 10);
    } else if (/^\d{2}$/.test(token) && year === null && (month !== null || day !== null)) {
      year = normalizeYear(parseInt(token, 10));
    }
  }

  if (month !== null && year !== null) {
    const finalDay = day !== null ? day : 1;
    const date = new Date(year, month, finalDay);
    if (!isNaN(date.getTime())) {
      return { closingDate: setEndOfDay(date), isRollingDeadline: false };
    }
  }

  // 5. Fallback native Date parse
  const parsedNative = new Date(rawDateStr);
  if (!isNaN(parsedNative.getTime())) {
    return { closingDate: setEndOfDay(parsedNative), isRollingDeadline: false };
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

  // End-of-day normalized comparison
  if (closingDate.getTime() >= refTime) {
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

/**
 * 🕒 RELATIVE DATE PARSER
 * Converts relative timestamp strings (e.g., "Posted 2 days ago", "3 weeks ago")
 * into normalized ISO date strings.
 */
export function parseRelativeDate(relativeStr: string): string {
  if (!relativeStr || typeof relativeStr !== "string") return new Date().toISOString();
  const now = new Date();
  const match = relativeStr.match(/(\d+)\s+(day|week|month|hour|minute)s?\s+ago/i);
  if (!match) {
    const directDate = new Date(relativeStr);
    return !isNaN(directDate.getTime()) ? directDate.toISOString() : now.toISOString();
  }

  const num = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  if (unit === "minute") now.setMinutes(now.getMinutes() - num);
  if (unit === "hour") now.setHours(now.getHours() - num);
  if (unit === "day") now.setDate(now.getDate() - num);
  if (unit === "week") now.setDate(now.getDate() - num * 7);
  if (unit === "month") now.setMonth(now.getMonth() - num);

  return now.toISOString();
}

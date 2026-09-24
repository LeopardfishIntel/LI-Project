/**
 * 📅 CENTRAL DATE PARSER & LIFECYCLE TRIAGE
 *
 * Normalizes ambiguous raw date strings into ISO 8601 date strings or Date objects.
 * Enforces Gate 3 & 6-Week Expiration Rules:
 *   - 6-Week (42-Day) Max Lifespan on "Unlimited", "Open until filled", or undated rolling postings.
 *   - Immediate Expiry on past intake years / terms (e.g., "August 2025", "2024", "Posted 2 years ago").
 *   - End-of-Day Deadline Normalization (sets closing timestamps to 23:59:59.999).
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
  expiryReason?: string;
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

export const ROLLING_STALENESS_CAP_MS = 42 * 24 * 60 * 60 * 1000; // 42 Days (6 Weeks)

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

/**
 * Detects whether a string signifies an open-ended, unlimited, or rolling deadline.
 */
export function isRollingDeadlineString(rawDateStr: string | null | undefined): boolean {
  if (!rawDateStr || typeof rawDateStr !== 'string') return true;
  const clean = rawDateStr.trim().toLowerCase();
  return (
    clean === '' ||
    clean.includes('unlimited') ||
    clean.includes('rolling') ||
    clean.includes('until filled') ||
    clean.includes('open until filled') ||
    clean.includes('asap') ||
    clean.includes('open') ||
    clean.includes('continuous') ||
    clean.includes('ongoing') ||
    clean.includes('immediate start') ||
    clean.includes('tbd') ||
    clean.includes('n/a')
  );
}

/**
 * Detects whether a job title, date string, or description indicates a past academic intake,
 * past calendar year, or stale relative posting age.
 */
export function isPastAcademicIntake(
  text: string | null | undefined,
  referenceDate: Date = new Date()
): { isPast: boolean; reason?: string } {
  if (!text || typeof text !== 'string') return { isPast: false };
  const clean = text.toLowerCase().trim();
  const currentYear = referenceDate.getFullYear();
  const currentMonth = referenceDate.getMonth(); // 0-indexed

  // 1. Check relative age strings like "Posted 2 years ago", "Posted 6 months ago", "7 weeks ago"
  const relMatch = clean.match(/(?:posted\s+)?(\d+)\s+(year|month|week|day)s?\s+ago/i);
  if (relMatch) {
    const num = parseInt(relMatch[1], 10);
    const unit = relMatch[2].toLowerCase();
    let ageDays = 0;
    if (unit === 'year') ageDays = num * 365;
    else if (unit === 'month') ageDays = num * 30;
    else if (unit === 'week') ageDays = num * 7;
    else if (unit === 'day') ageDays = num;

    if (ageDays > 42) {
      return { isPast: true, reason: `Relative age ${num} ${unit}(s) ago exceeds 42 days (6 weeks)` };
    }
  }

  // 2. Check academic split years (e.g. 2024/2025, 2024/25, 2025/26)
  const splitYearMatch = clean.match(/\b(20\d{2})\s*[-/]\s*(?:20)?(\d{2})\b/);
  if (splitYearMatch) {
    const startY = parseInt(splitYearMatch[1], 10);
    if (startY < currentYear) {
      return { isPast: true, reason: `Past academic cycle ${splitYearMatch[0]}` };
    }
  }

  // 3. Check explicit month + year start dates (e.g. "August 2025", "Jan 2025", "Start August 2024")
  const monthYearMatch = clean.match(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)[,\s]+(20\d{2})\b/i);
  if (monthYearMatch) {
    const mStr = monthYearMatch[1].toLowerCase();
    const yVal = parseInt(monthYearMatch[2], 10);
    const mVal = MONTH_MAP[mStr];

    if (mVal !== undefined) {
      if (yVal < currentYear) {
        return { isPast: true, reason: `Past intake start date: ${monthYearMatch[0]}` };
      }
      if (yVal === currentYear && mVal < currentMonth) {
        return { isPast: true, reason: `Past intake month in current year: ${monthYearMatch[0]}` };
      }
    }
  }

  // 4. Standalone past years in title or term (e.g., "Islamic Teacher - 2025", "Physics - 2024")
  const yearMatches = clean.match(/\b(201\d|202[0-5])\b/g);
  if (yearMatches) {
    for (const yStr of yearMatches) {
      const y = parseInt(yStr, 10);
      if (y < currentYear) {
        return { isPast: true, reason: `Explicit past year reference: ${y}` };
      }
    }
  }

  return { isPast: false };
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
 * 🛠️ 6-WEEK (42-DAY) STALENESS & LIFECYCLE TRIAGE
 * Evaluates whether a vacancy is active or expired.
 * - Applies a strict 42-day cap from datePosted/ingestedAt for rolling/unlimited postings.
 * - Evaluates title/body for past academic intakes (e.g. "August 2025" or "Posted 2 years ago").
 */
export function triageVacancyLifecycle(
  rawDateStr: string | null | undefined, 
  datePostedOrIngestedAt?: Date | string | number | null,
  referenceDate: Date = new Date(),
  titleOrContext?: string | null
): LifecycleTriageResult {
  const refTime = referenceDate.getTime();

  // 1. Check title/context or rawDateStr for past intake year / stale relative age
  const intakeCheck = isPastAcademicIntake(
    `${titleOrContext || ''} ${rawDateStr || ''}`,
    referenceDate
  );
  if (intakeCheck.isPast) {
    return {
      status: 'expired',
      isRollingDeadline: false,
      closingDate: null,
      expiryReason: intakeCheck.reason,
    };
  }

  const { closingDate, isRollingDeadline } = parseClosingDate(rawDateStr);

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
      isStaleRolling: isStale,
      expiryReason: isStale ? `Rolling/unlimited deadline exceeded 42 days` : undefined,
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
    expiryReason: `Explicit closing date ${closingDate.toISOString().split('T')[0]} has passed`,
  };
}

/**
 * 🕒 RELATIVE DATE PARSER
 * Converts relative timestamp strings (e.g., "Posted 2 days ago", "3 weeks ago", "2 years ago")
 * into normalized ISO date strings.
 */
export function parseRelativeDate(relativeStr: string): string {
  if (!relativeStr || typeof relativeStr !== "string") return new Date().toISOString();
  const now = new Date();
  const match = relativeStr.match(/(\d+)\s+(year|month|week|day|hour|minute)s?\s+ago/i);
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
  if (unit === "year") now.setFullYear(now.getFullYear() - num);

  return now.toISOString();
}

/**
 * 🛰️ DATE PARSER & VACANCY LIFECYCLE TRIAGE
 * Robust multi-format date extraction, rolling deadline detection, and lifecycle classification.
 * Prevents active listings from misclassifying as 'expired' or throwing invalid date errors.
 */

const ROLLING_DEADLINE_PATTERNS = [
  /\brolling\b/i,
  /\buntil filled\b/i,
  /\bopen until\b/i,
  /\basap\b/i,
  /\bongoing\b/i,
  /\bimmediate\b/i,
  /\bcontinuous\b/i,
  /\bopen\b/i,
  /\btbd\b/i,
  /\bno deadline\b/i,
  /\bwhen filled\b/i,
];

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

export interface ParsedDateResult {
  closingDate: Date | null;
  isRollingDeadline: boolean;
  rawString: string;
}

export interface LifecycleTriageResult {
  status: 'pending_review' | 'expired';
  isRollingDeadline: boolean;
  closingDate: Date | null;
}

/**
 * Checks if a string contains rolling deadline indicators.
 */
export function isRollingDeadlineString(str: string | null | undefined): boolean {
  if (!str) return true; // Missing deadline defaults to rolling
  const clean = str.trim();
  return ROLLING_DEADLINE_PATTERNS.some(pattern => pattern.test(clean));
}

/**
 * Parses a closing date string supporting multiple international formats.
 */
export function parseClosingDate(rawDateStr: string | null | undefined): ParsedDateResult {
  if (!rawDateStr || typeof rawDateStr !== 'string') {
    return { closingDate: null, isRollingDeadline: true, rawString: '' };
  }

  const clean = rawDateStr.trim();
  if (!clean || isRollingDeadlineString(clean)) {
    return { closingDate: null, isRollingDeadline: true, rawString: clean };
  }

  // 1. Try ISO format / standard Date.parse (e.g. YYYY-MM-DD or YYYY-MM-DDTHH:mm:ssZ)
  if (/^\d{4}-\d{2}-\d{2}/.test(clean)) {
    const d = new Date(clean);
    if (!isNaN(d.getTime())) {
      return { closingDate: d, isRollingDeadline: false, rawString: clean };
    }
  }

  // 2. Try DD/MM/YYYY, DD.MM.YYYY, or DD-MM-YYYY (International school standard)
  const slashMatch = clean.match(/^(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{4})$/);
  if (slashMatch) {
    const day = parseInt(slashMatch[1], 10);
    const month = parseInt(slashMatch[2], 10) - 1;
    const year = parseInt(slashMatch[3], 10);
    const d = new Date(year, month, day, 23, 59, 59);
    if (!isNaN(d.getTime()) && d.getMonth() === month) {
      return { closingDate: d, isRollingDeadline: false, rawString: clean };
    }
  }

  // 3. Try Textual format: "15 Oct 2026", "15th October 2026", "15-Oct-2026"
  const textualDayFirstMatch = clean.match(/^(\d{1,2})(?:st|nd|rd|th)?[\s\-]+([a-zA-Z]+)[\s\,]+(\d{4})$/i);
  if (textualDayFirstMatch) {
    const day = parseInt(textualDayFirstMatch[1], 10);
    const monthName = textualDayFirstMatch[2].toLowerCase();
    const year = parseInt(textualDayFirstMatch[3], 10);
    if (MONTH_MAP[monthName] !== undefined) {
      const d = new Date(year, MONTH_MAP[monthName], day, 23, 59, 59);
      if (!isNaN(d.getTime())) {
        return { closingDate: d, isRollingDeadline: false, rawString: clean };
      }
    }
  }

  // 4. Try Textual format: "Oct 15, 2026", "October 15th 2026"
  const textualMonthFirstMatch = clean.match(/^([a-zA-Z]+)[\s\-]+(\d{1,2})(?:st|nd|rd|th)?[\s\,]+(\d{4})$/i);
  if (textualMonthFirstMatch) {
    const monthName = textualMonthFirstMatch[1].toLowerCase();
    const day = parseInt(textualMonthFirstMatch[2], 10);
    const year = parseInt(textualMonthFirstMatch[3], 10);
    if (MONTH_MAP[monthName] !== undefined) {
      const d = new Date(year, MONTH_MAP[monthName], day, 23, 59, 59);
      if (!isNaN(d.getTime())) {
        return { closingDate: d, isRollingDeadline: false, rawString: clean };
      }
    }
  }

  // 5. Fallback general JS date parse (validate realistic year 2020-2035)
  const fallbackDate = new Date(clean);
  if (!isNaN(fallbackDate.getTime()) && fallbackDate.getFullYear() >= 2020 && fallbackDate.getFullYear() <= 2035) {
    return { closingDate: fallbackDate, isRollingDeadline: false, rawString: clean };
  }

  // If date parsing fails completely, treat safely as rolling deadline (never default to expired!)
  return { closingDate: null, isRollingDeadline: true, rawString: clean };
}

/**
 * Classifies the vacancy lifecycle status based on parsed date and rolling flag.
 */
export function triageVacancyLifecycle(
  rawDateStr: string | null | undefined, 
  referenceDate: Date = new Date()
): LifecycleTriageResult {
  const { closingDate, isRollingDeadline } = parseClosingDate(rawDateStr);

  // If rolling deadline or parsing failed -> force status: 'pending_review'
  if (isRollingDeadline || !closingDate) {
    return {
      status: 'pending_review',
      isRollingDeadline: true,
      closingDate: null,
    };
  }

  // Check against reference date
  const refStartOfDay = new Date(referenceDate);
  refStartOfDay.setHours(0, 0, 0, 0);

  if (closingDate.getTime() >= refStartOfDay.getTime()) {
    return {
      status: 'pending_review',
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

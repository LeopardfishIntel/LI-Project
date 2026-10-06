/**
 * GEMS EDUCATION - the rules (Roger, 2026-10-06). Pure functions, no network, no database, so they can be unit-tested.
 *
 * The GEMS careers site gives every job a company name. A job is attached to one of our schools ONLY when that company name
 * is exactly one of the names in GEMS_SCHOOL_COMPANY_MAP (an exact, whole-name match - never a partial or fuzzy one).
 * A company that is known but not in our registry is left out. A company we do not know at all is left out and reported, so we can decide.
 */
import { isSupportOrNonTeachingRole } from "@/lib/crawler/roleClassifier";
import { isPastAcademicIntake } from "@/lib/crawler/dateParser";

export const GEMS_SOURCE = "GEMS";
export const GEMS_BASE = "https://careers.gemseducation.com";

/** Registry school -> the company name GEMS uses for it. These FLIS codes must exist in the schools collection. */
export const GEMS_SCHOOL_COMPANY_MAP: Readonly<Record<string, string>> = Object.freeze({
  FLIS0026: "GEMS WORLD ACADEMY - DUBAI",
  FLIS0329: "JUMEIRAH COLLEGE - DUBAI",
  FLIS0331: "GEMS DUBAI AMERICAN ACADEMY",
  FLIS0332: "GEMS WELLINGTON INTERNATIONAL SCHOOL - DUBAI",
  FLIS0333: "GEMS WELLINGTON ACADEMY - SILICON OASIS",
  FLIS0334: "GEMS JUMEIRAH PRIMARY SCHOOL - DUBAI",
  FLIS0335: "GEMS FIRSTPOINT SCHOOL - THE VILLA - DUBAI",
  FLIS0336: "GEMS FOUNDERS SCHOOL - DUBAI",
  FLIS0337: "GEMS METROPOLE SCHOOL - MOTOR CITY",
  FLIS0338: "GEMS ROYAL DUBAI SCHOOL - DUBAI",
  FLIS0339: "GEMS WINCHESTER SCHOOL - DUBAI",
  FLIS0340: "THE WINCHESTER SCHOOL - JEBEL ALI",
});

/** GEMS campuses we know about that are NOT in our registry. Their jobs are left out. */
export const GEMS_UNREGISTERED_CAMPUSES: ReadonlySet<string> = new Set([
  "gems modern academy",
  "gems american academy - abu dhabi",
  "gems american academy - qatar",
  "gems international school - dubai hills",
  "gems wellington - dubai hills",
  "gems wellington school - qatar",
  "gems world academy - abu dhabi",
  "gems cambridge international school - abu dhabi",
  "gems metropole school - al waha",
  "gems winchester school - abu dhabi",
  "gems winchester school - fujairah",
  "gems westminster school - sharjah",
  "gems westminster school - rak",
  "gems founders school- al mizhar",
  "gems founders school - al mizhar",
  "gems founders school - nad al hamar",
  "gems founders school - dubai south",
  "gems founders school – masdar city",
  "gems founders school - masdar city",
  "the westminster school - dubai",
  "the cambridge high school - abu dhabi",
  "the millennium school - dubai",
  "our own english high school - sharjah - girls",
  "our own english high school - sharjah (girls)",
  "our own high school - al warqaa",
  "our own english high school - al ain",
  "wesgreen international school - sharjah",
  "al khaleej international school",
  "cambridge international school - dubai",
]);

/** Same company name written slightly differently (capitals, dash type, spaces around the dash) is the same name. */
export function normGemsCompany(c: any): string {
  return String(c || "").toLowerCase().replace(/[–—]/g, "-").replace(/\s*-\s*/g, " - ").replace(/\s+/g, " ").trim();
}

const MAPPED = new Map<string, string>(Object.entries(GEMS_SCHOOL_COMPANY_MAP).map(([id, c]) => [normGemsCompany(c), id]));
const KNOWN_OUT = new Set<string>(Array.from(GEMS_UNREGISTERED_CAMPUSES).map(normGemsCompany));

export type GemsCampus = { kind: "mapped"; schoolId: string } | { kind: "known_unregistered" } | { kind: "unknown" } | { kind: "none" };

/** Exact whole-name match only. */
export function gemsCampusFor(company: any): GemsCampus {
  const n = normGemsCompany(company);
  if (!n) return { kind: "none" };
  const id = MAPPED.get(n);
  if (id) return { kind: "mapped", schoolId: id };
  if (KNOWN_OUT.has(n)) return { kind: "known_unregistered" };
  return { kind: "unknown" };
}

/** The apply link must be the job's own page on the GEMS careers site (ends with the job number). Anything else gives null. */
export function gemsApplyUrl(job: any): string | null {
  const raw = String(job?.url || job?.apply_url || job?.applyUrl || "").trim();
  if (!raw) return null;
  const abs = raw.startsWith("http") ? raw : `${GEMS_BASE}${raw.startsWith("/") ? "" : "/"}${raw}`;
  return /^https:\/\/careers\.gemseducation\.com\/.+-\d+\/?$/i.test(abs) ? abs : null;
}

export function gemsJobId(url: string): string | null {
  const m = String(url || "").match(/-(\d+)\/?$/);
  return m ? `gems_${m[1]}` : null;
}

const isoDay = (v: any): string | null => {
  const m = String(v || "").trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== `${m[1]}-${m[2]}-${m[3]}` ? null : `${m[1]}-${m[2]}-${m[3]}`;
};

/**
 * Keep or leave out one GEMS job (the school is decided separately by gemsCampusFor).
 * Closing date = GEMS's own expiry date. If it has passed the job is left out. If GEMS gives none (or one we cannot read) closingDate is null and the gate's own rule applies.
 */
export function gemsDecide(j: { title?: any; description?: any; expDate?: any; crtDate?: any; now?: Date }): { keep: boolean; why: string; closingDate: string | null; datePosted: string | null; expUnreadable: boolean } {
  const now = j.now || new Date();
  const today = now.toISOString().slice(0, 10);
  const title = String(j.title || "").trim();
  const datePosted = isoDay(j.crtDate);
  const closingDate = isoDay(j.expDate);
  const expUnreadable = !!String(j.expDate || "").trim() && !closingDate;
  const base = { closingDate, datePosted, expUnreadable };
  if (!title) return { keep: false, why: "no title", ...base };
  if (isSupportOrNonTeachingRole(title)) return { keep: false, why: "not a teaching or leadership role", ...base };
  if (isPastAcademicIntake(title, now).isPast || isPastAcademicIntake(j.description, now).isPast || isPastAcademicIntake(j.crtDate, now).isPast) {
    return { keep: false, why: "an old intake or an old posting", ...base };
  }
  if (closingDate && closingDate < today) return { keep: false, why: `closing date ${closingDate} has passed`, ...base };
  return { keep: true, why: "kept", ...base };
}

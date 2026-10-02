/**
 * First-seen dates for vacancies (Roger, 2026-10-02):
 *  - If the scraped page gives a real posted date, that date is used.
 *  - If the page gives no date, the date we first saw the job is used (saved per school in `vacancyFirstSeen`).
 *  - The placeholder date "21 May 2026" and words like "Recently" are NOT real dates.
 * These dates feed the 42-day rule for jobs with no closing date.
 */

const PLACEHOLDER = /21\s+May\s+2026/i;

/** Returns a Date only for a real date; returns null for empty, "Recently", the placeholder, or anything that does not parse. */
export function realDateOrNull(input: any): Date | null {
  if (!input) return null;
  const clean = String(input).replace(/posted:\s*/i, "").trim();
  if (!clean || /recent/i.test(clean) || PLACEHOLDER.test(clean)) return null;
  const d = new Date(clean);
  return isNaN(d.getTime()) ? null : d;
}

export function firstSeenKey(title: any): string {
  return String(title || "").toLowerCase().replace(/\s*\([^)]*\)/g, "").replace(/[^a-z0-9]/g, "");
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmt = (d: Date) => `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;

/**
 * For every OPEN vacancy that has no closing date (a rolling job), sets date_listed to the page's real posted date,
 * else the saved first-seen date, else today (and remembers it). Returns the vacancies and the updated first-seen map,
 * which only holds jobs that are still listed.
 */
export function applyFirstSeen<T extends { title?: any; status?: any; date_listed?: any; date_closing?: any }>(
  vacancies: T[],
  previous: Record<string, string> | null | undefined,
  now: Date = new Date()
): { vacancies: T[]; map: Record<string, string> } {
  const prev = previous && typeof previous === "object" ? previous : {};
  const map: Record<string, string> = {};
  for (const v of vacancies) {
    if (!v || v.status !== "OPEN" || v.date_closing) continue;
    const key = firstSeenKey(v.title);
    if (!key) continue;
    const page = realDateOrNull(v.date_listed);
    const saved = realDateOrNull(prev[key]);
    const chosen = page || saved || now;
    map[key] = chosen.toISOString();
    v.date_listed = fmt(chosen);
  }
  return { vacancies, map };
}

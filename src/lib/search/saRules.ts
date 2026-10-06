/**
 * SEARCH ASSOCIATES RULES (Roger, 2026-10-06) - pure rules, no database and no network, so tests can lock them.
 * Search Associates (searchassociates.com/Leadership-Vacancies) lists leadership jobs (head, principal, deputy, coordinator...).
 * Only the first two tabs are read ("Head of School" and "Other Leadership"); the third tab is filled posts.
 * Every job must name a school we have in the registry. No school found = the job is left out (never put in a "hub").
 */

export const SA_SOURCE = "SEARCH ASSOCIATES";
export const SA_BASE_URL = "https://www.searchassociates.com";
export const SA_LEADERSHIP_URL = "https://www.searchassociates.com/Leadership-Vacancies/";

export interface SaSchool { id: string; name: string; country?: string; aliases?: string[] }

/**
 * Page wording that is not the registry name. Each phrase must appear in the page's school text as WHOLE words.
 * (The old engine matched "unis" inside "Tunis" and wired Zagreb to a school in Qatar; both rules are gone.)
 */
export const SA_ALIASES: Array<{ phrase: string; schoolId: string }> = [
  { phrase: "john f kennedy the american school of queretaro", schoolId: "FLIS0269" }, // John F. Kennedy School Querétaro
  { phrase: "aba oman international school", schoolId: "FLIS0189" }, // American British Academy (Muscat)
  { phrase: "international school of prague", schoolId: "FLIS0049" }, // IS Prague
  { phrase: "united nations international school of hanoi", schoolId: "FLIS0129" }, // UNIS Hanoi
  { phrase: "graded the american school of sao paulo", schoolId: "FLIS0184" }, // Graded School Sao Paulo
];

/** Lower case, accents removed, only letters and digits, single spaces. */
export function normSa(s: string): string {
  return String(s || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

const hasPhrase = (text: string, phrase: string) => !!phrase && ` ${text} `.includes(` ${phrase} `);
const tokenCount = (p: string) => (p ? p.split(" ").length : 0);

/** Splits a page heading like "Head of School Reedley International School (Philippines)" into school text and country. */
export function saSchoolText(heading: string, role: string): { school: string; country: string } {
  let h = String(heading || "").replace(/\s+/g, " ").trim();
  let country = "";
  if (h.endsWith(")")) {
    let depth = 0;
    for (let i = h.length - 1; i >= 0; i--) {
      if (h[i] === ")") depth++;
      else if (h[i] === "(") { depth--; if (depth === 0) { country = h.slice(i + 1, h.length - 1).trim(); h = h.slice(0, i).trim(); break; } }
    }
  }
  const r = String(role || "").replace(/\s+/g, " ").trim();
  if (r && h.toLowerCase().startsWith(r.toLowerCase())) h = h.slice(r.length).trim();
  return { school: h, country };
}

/** Does the page's country fit the registry country? Loose on spelling (first four letters of any word), strict on being different. */
export function saCountryFits(pageCountry: string, schoolCountry?: string): boolean {
  if (!pageCountry || !schoolCountry) return true;
  const toks = (s: string) => normSa(s).split(" ").filter((t) => t.length >= 4).map((t) => t.slice(0, 4));
  const a = toks(pageCountry), b = new Set(toks(schoolCountry));
  if (!a.length || !b.size) return true;
  return a.some((t) => b.has(t));
}

export interface SaMatch { schoolId: string | null; why: string }

/**
 * Finds the registry school named in the page's school text.
 * Whole words only; the longest matching name wins; two different schools matching equally = no match; the country must fit.
 */
export function matchSaSchool(schoolText: string, pageCountry: string, schools: SaSchool[]): SaMatch {
  const n = normSa(schoolText);
  if (!n) return { schoolId: null, why: "no school name on the page" };
  const byId = new Map(schools.map((s) => [s.id, s]));
  const found: Array<{ id: string; len: number; via: string }> = [];
  for (const a of SA_ALIASES) {
    if (byId.has(a.schoolId) && hasPhrase(n, a.phrase)) found.push({ id: a.schoolId, len: tokenCount(a.phrase), via: `alias "${a.phrase}"` });
  }
  for (const s of schools) {
    const phrases = [s.name, ...(Array.isArray(s.aliases) ? s.aliases : [])].map(normSa);
    for (const p of phrases) {
      if (!p) continue;
      if (n === p || (tokenCount(p) >= 2 && hasPhrase(n, p))) found.push({ id: s.id, len: tokenCount(p), via: `name "${p}"` });
    }
  }
  if (!found.length) return { schoolId: null, why: "school not in the registry" };
  const best = Math.max(...found.map((f) => f.len));
  const top = found.filter((f) => f.len === best);
  const ids = Array.from(new Set(top.map((f) => f.id)));
  if (ids.length > 1) return { schoolId: null, why: `several schools fit equally (${ids.join(", ")})` };
  const school = byId.get(ids[0])!;
  if (!saCountryFits(pageCountry, school.country)) return { schoolId: null, why: `country differs (page "${pageCountry}", registry "${school.country}")` };
  return { schoolId: ids[0], why: top[0].via };
}

const MONTHS: Record<string, number> = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

/** "Oct 21, 2026" -> { iso: "2026-10-21", endOfDayMs }. Rolling / Open / anything else -> null. */
export function parseSaDate(raw: string | null | undefined): { iso: string; endOfDayMs: number } | null {
  const m = String(raw || "").trim().match(/^([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})$/);
  if (!m) return null;
  const mon = MONTHS[m[1].slice(0, 3).toLowerCase()];
  const day = parseInt(m[2], 10), year = parseInt(m[3], 10);
  if (mon === undefined || day < 1 || day > 31) return null;
  const start = Date.UTC(year, mon, day);
  const d = new Date(start);
  if (d.getUTCMonth() !== mon || d.getUTCDate() !== day) return null;
  return { iso: d.toISOString().slice(0, 10), endOfDayMs: start + 24 * 60 * 60 * 1000 - 1 };
}

export interface SaDecision { keep: boolean; why: string; closingDate: string | null; datePosted: string | null }

/** Keep a job only if the page still accepts applications and the real deadline has not passed. Rolling = no closing date (the pipeline then applies its own 42-day rule). */
export function saDecide(i: { deadline: string; posted: string; closedLabel: boolean; now?: number }): SaDecision {
  const now = i.now ?? Date.now();
  const dl = parseSaDate(i.deadline);
  const posted = parseSaDate(i.posted);
  const out = { closingDate: dl ? dl.iso : null, datePosted: posted ? posted.iso : null };
  if (i.closedLabel) return { keep: false, why: 'page says "No longer accepting applications"', ...out };
  if (dl && dl.endOfDayMs < now) return { keep: false, why: `deadline ${dl.iso} has passed`, ...out };
  return { keep: true, why: dl ? "open" : "no fixed deadline", ...out };
}

/** Business / operations posts are not teaching or school-leadership jobs (Roger 2026-10-06: leave them out). */
const SA_BUSINESS_ROLE = /\b(facilit(?:y|ies)|admissions?|development|advancement|alumni|fundrais\w*|financ\w*|business\s+(?:manager|officer|operations)|chief\s+(?:operating|financial|business|technology|information)\s+officer|coo|cfo|human\s+resources|hr|marketing|communications?|operations|procurement|maintenance|security|transport\w*|registrar|information\s+technology|it\s+(?:manager|director))\b/i;
export function saIsBusinessRole(title: string): boolean {
  return SA_BUSINESS_ROLE.test(String(title || ""));
}

/** Stable id for a listing, from its page address. */
export function saJobId(href: string): string {
  const slug = String(href || "").split("?")[0].split("/").filter(Boolean).pop() || "";
  const clean = slug.toLowerCase().replace(/[^a-z0-9_-]/g, "");
  return clean ? `sa_${clean}` : "";
}

const clean = (s: string) => String(s || "").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

export function absoluteSaUrl(raw: string): string {
  const r = String(raw || "").trim();
  if (!r) return "";
  if (r.startsWith("//")) return `https:${r}`;
  if (r.startsWith("http")) return r;
  return `${SA_BASE_URL}${r.startsWith("/") ? "" : "/"}${r}`;
}

/** Links on the listing page, tabs 1 and 2 only (the same split the old engine used: the third tab is filled posts). */
export function parseSaListing(html: string): Array<{ tab: number; href: string; title: string }> {
  const panes = String(html || "").split(/class=["']tab-pane/i);
  const out: Array<{ tab: number; href: string; title: string }> = [];
  const seen = new Set<string>();
  for (let t = 1; t <= 2; t++) {
    const pane = panes[t] || "";
    const re = /<a[^>]+href=["']([^"']*(?:leadership-vacanc)[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(pane)) !== null) {
      const title = clean(m[2]);
      if (!title || title.length < 3) continue;
      const href = absoluteSaUrl(m[1]);
      if (seen.has(href.toLowerCase())) continue;
      seen.add(href.toLowerCase());
      out.push({ tab: t, href, title });
    }
  }
  return out;
}

export interface SaDetail { heading: string; posted: string; deadline: string; pdf: string | null; closedLabel: boolean }

/** Reads one leadership page. The apply link is the candidate-pack PDF on searchassociates.com when there is one. */
export function parseSaDetail(html: string): SaDetail {
  const h = String(html || "");
  const h1 = h.match(/<h1>([\s\S]*?)<\/h1>/i);
  const posted = h.match(/Position Posted<\/label>\s*<b>([^<]+)<\/b>/i);
  const deadline = h.match(/Deadline<\/label>\s*<b>([^<]+)<\/b>/i);
  let pdf: string | null = null;
  const re = /href=["']([^"']*\.pdf[^"']*)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(h)) !== null) {
    const u = absoluteSaUrl(m[1]);
    if (/(^|\/\/|\.)searchassociates\.com\//i.test(u)) { pdf = u; break; }
  }
  return {
    heading: h1 ? clean(h1[1]) : "",
    posted: posted ? clean(posted[1]) : "",
    deadline: deadline ? clean(deadline[1]) : "",
    pdf,
    closedLabel: /no longer accepting applications/i.test(h),
  };
}

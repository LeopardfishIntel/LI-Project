/**
 * Direct engine - pure rules (no web, no database, no AI), so tests can lock them.
 * The Direct engine reads a school's OWN careers page. These rules decide what is a real job title, a real apply link,
 * a real page, and when two titles are the same job.
 */
import { createHash } from "crypto";

// ── Titles ────────────────────────────────────────────────────────────────
export const ABBREVIATIONS: Record<string, string> = {
  ms: "middle school", hs: "high school", es: "elementary school", ps: "primary school", ls: "lower school",
  jr: "junior", sr: "senior", asst: "assistant", dept: "department", hod: "head of department", hos: "head of school", pe: "physical education",
};
const PREFIX_A = /^(誠聘|诚聘|招聘|誠徵|recruitment of)\s*[:\-–—]?\s*/i;
const PREFIX_B = /^(now hiring|we are hiring|hiring|vacancy|job opening|wanted)\s*[:\-–—]\s*/i;
const SUFFIX_RX = /\s*(apply now|apply here|read more|learn more|more details|view details|click here to view|job description)\s*$/i;
const ID_RX = /\s*[\(\[]?\s*\bid\s*:?\s*\d+\s*[\)\]]?\s*$/i;

/** Removes page noise from a title ("誠聘", "Recruitment of", "Apply now", "(ID: 3650"). */
export function cleanTitle(raw: string): string {
  let t = String(raw ?? "").replace(/\s+/g, " ").trim();
  for (let i = 0; i < 4; i++) {
    const before = t;
    t = t.replace(PREFIX_A, "").replace(PREFIX_B, "").replace(SUFFIX_RX, "").replace(ID_RX, "").trim();
    if (t === before) break;
  }
  return t;
}
function norm(s: string): string {
  const t = String(s ?? "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9À-￿]+/g, " ").trim();
  return t.split(" ").filter(Boolean).map((w) => ABBREVIATIONS[w] ?? w).join(" ");
}
/** Comparison key for a job title: cleaned, lower case, abbreviations expanded (MS = Middle School). */
export function titleKey(raw: string): string { return norm(cleanTitle(raw)); }
/** True when two titles are the same job in different words. */
export function sameTitle(a: string, b: string): boolean {
  const x = titleKey(a), y = titleKey(b);
  if (!x || !y) return false;
  if (x === y) return true;
  if (Math.min(x.length, y.length) >= 10 && (x.includes(y) || y.includes(x))) return true;
  const A = new Set(x.split(" ")), B = new Set(y.split(" "));
  // numbers must match exactly (Grade 3 is not Grade 4)
  const nums = (set: Set<string>) => [...set].filter((w) => /\d/.test(w)).sort().join(",");
  if (nums(A) !== nums(B)) return false;
  let n = 0; A.forEach((w) => B.has(w) && n++);
  return n / Math.max(A.size, B.size) > 0.8;
}
/** The title must really be on the page (guards against anything the AI made up). */
export function titleInText(title: string, text: string): boolean {
  const needle = titleKey(title);
  if (!needle) return false;
  const hay = norm(text);
  if (hay.includes(needle)) return true;
  const words = needle.split(" ");
  if (words.length < 3) return false;
  const set = new Set(hay.split(" "));
  return words.filter((w) => set.has(w)).length / words.length >= 0.9;
}
export function titleSlug(title: string): string { return titleKey(title).replace(/\s+/g, "-").slice(0, 80) || "job"; }

// ── Links ─────────────────────────────────────────────────────────────────
const BOARD_HOST_RX = /(^|\.)(tes\.com|teachaway\.com|teacherhorizons\.com|schrole\.com|searchassociates\.com|iseekplus\.com|iss\.edu|indeed\.[a-z.]+|linkedin\.com|glassdoor\.[a-z.]+|jobs\.theguardian\.com|guardianjobs\.com|eteach\.com|echinacareers\.com|edvectus\.[a-z.]+|webbersed\.com|cois\.org|jobs\.ac\.uk|totaljobs\.com|reed\.co\.uk|jobsdb\.com)$/i;
const ATS_HOST_RX = /(myworkdayjobs\.com|greenhouse\.io|lever\.co|smartrecruiters\.com|teamtailor\.com|recruitee\.com|bamboohr\.com|applitrack\.com|personio\.(de|com)|breezy\.hr|workable\.com|applytojob\.com|jazzhr\.com|taleo\.net|oraclecloud\.com|successfactors\.(com|eu)|zohorecruit\.[a-z.]+|hirehive\.com|homerun\.co|pinpointhq\.com|csod\.com|schoolspring\.com|ukg\.com)$/i;
const GROUP_PAGE_RX = /nordangliaeducation\.com|gemseducation\.com|taaleem\.ae|aldar/i;

export function hostOf(u: string): string { try { return new URL(u).hostname.replace(/^www\./, "").toLowerCase(); } catch { return ""; } }
export function registrableDomain(host: string): string {
  const p = host.split(".");
  if (p.length <= 2) return host;
  const second = p[p.length - 2];
  return ["co", "com", "org", "edu", "ac", "sch", "gov", "net", "gd"].includes(second) ? p.slice(-3).join(".") : p.slice(-2).join(".");
}
export function isJobBoardUrl(u: string): boolean { return BOARD_HOST_RX.test(hostOf(u)); }
export function isGroupSitePage(u: string): boolean { return GROUP_PAGE_RX.test(u); }
export function isHomepageUrl(u: string): boolean { try { const x = new URL(u); return x.pathname.replace(/\/+$/, "") === "" && !x.search; } catch { return false; } }
/** A saved careers link that silently lands on the school's homepage is not a careers page. */
export function isSoftHomepage(savedUrl: string, finalUrl: string): boolean {
  try { const s = new URL(savedUrl), f = new URL(finalUrl); return s.pathname.replace(/\/+$/, "") !== "" && f.pathname.replace(/\/+$/, "") === "" && !f.search; } catch { return false; }
}

/**
 * Picks the apply link for a job. Allowed: a link that was really on the page, on the school's own website or a known job system.
 * Never a job-board link (TES etc.), a homepage, or a mailto. Anything else falls back to the careers page itself.
 */
export function chooseApplyUrl(jobUrl: string | null | undefined, pageUrl: string, knownLinks?: Set<string>): string {
  const u = String(jobUrl || "").trim();
  if (!/^https?:\/\//i.test(u)) return pageUrl;
  if (isJobBoardUrl(u) || isHomepageUrl(u)) return pageUrl;
  const sameSite = registrableDomain(hostOf(u)) === registrableDomain(hostOf(pageUrl));
  if (!sameSite && !ATS_HOST_RX.test(hostOf(u))) return pageUrl;
  if (knownLinks && u !== pageUrl && !knownLinks.has(u)) return pageUrl;
  return u;
}
/** Pipeline 1 drops jobs that share an apply link. Jobs without a link of their own get a unique "#job-..." ending (the page still opens normally). */
export function makeUniqueUrls<T extends { title: string; applyUrl: string }>(jobs: T[], pageUrl: string): T[] {
  const used = new Set<string>();
  return jobs.map((j) => {
    let url = j.applyUrl;
    if (used.has(url.toLowerCase()) || url === pageUrl) url = `${url.split("#")[0]}#job-${titleSlug(j.title)}`;
    let n = 2; while (used.has(url.toLowerCase())) url = `${url.split("#")[0]}#job-${titleSlug(j.title)}-${n++}`;
    used.add(url.toLowerCase());
    return { ...j, applyUrl: url };
  });
}

// ── Pages ─────────────────────────────────────────────────────────────────
export interface Anchor { label: string; href: string }
export function textHash(text: string): string { return createHash("sha1").update(norm(text)).digest("hex"); }
export function pagingInfo(text: string): { page: number; total: number } | null {
  const m = String(text).match(/Page\s+(\d+)\s+of\s+(\d+)/i);
  return m ? { page: Number(m[1]), total: Number(m[2]) } : null;
}
export function findNextPageUrl(html: string, baseUrl: string): string | null {
  for (const m of html.matchAll(/<a\b[^>]*href=["']([^"'#][^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const tag = m[0].slice(0, m[0].indexOf(">") + 1);
    const label = m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (/rel=["']next["']/i.test(tag) || /^(next|next page|next »|›|»|>|older)$/i.test(label)) {
      try { return new URL(m[1], baseUrl).toString(); } catch { /* ignore */ }
    }
  }
  return null;
}
const CAREER_RX = /career|vacanc|employment|join (us|our)|work(ing)? (with|at|for) us|jobs?\b|recruit|opportunit|openings|hiring/i;
const BAD_RX = /universit|counsel+ing|guidance|admission|alumni|parent|student|giving|donat|news|event|tender|privacy|cookie/i;
/** Ranks homepage links that look like the real careers page. University / counselling / admissions links are excluded. */
export function rankRepairCandidates(anchors: Anchor[], homeUrl: string): { url: string; score: number; label: string }[] {
  const seen = new Set<string>(); const out: { url: string; score: number; label: string }[] = [];
  for (const a of anchors) {
    if (seen.has(a.href)) continue; seen.add(a.href);
    const text = `${a.label} ${a.href}`;
    if (!CAREER_RX.test(text) || BAD_RX.test(text) || isGroupSitePage(a.href) || isJobBoardUrl(a.href)) continue;
    let score = 0;
    if (/vacanc|employment|join (us|our)|work (with|at|for) us|jobs?\b|recruit/i.test(a.label)) score += 3;
    if (/^careers?$/i.test(a.label.trim())) score += 3;
    if (/careers?-at|work-with|join|vacanc|employment|jobs?|recruit/i.test(a.href)) score += 2;
    if (hostOf(a.href) === hostOf(homeUrl)) score += 1;
    out.push({ url: a.href, score, label: a.label });
  }
  return out.sort((x, y) => y.score - x.score).slice(0, 3);
}
const DEEPER_RX = /teaching (roles|jobs|positions)|current (vacanc|jobs|openings|positions)|job openings|vacancies|open positions|available positions|view (all )?(jobs|vacancies|roles)|positions available|employment opportunit/i;
export function deeperLinks(anchors: Anchor[], pageUrl: string, max = 3): Anchor[] {
  const m = new Map<string, Anchor>();
  anchors.forEach((a) => { if (hostOf(a.href) === hostOf(pageUrl) && a.href !== pageUrl && !BAD_RX.test(a.href) && DEEPER_RX.test(a.label)) m.set(a.href, a); });
  return [...m.values()].slice(0, max);
}
export function looksBlocked(text: string): boolean {
  return /checking your browser|enable javascript|firewall to protect|access denied|attention required|just a moment/i.test(text);
}

// ── Dates ─────────────────────────────────────────────────────────────────
const MONTHS: Record<string, number> = { january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3, april: 4, apr: 4, may: 5, june: 6, jun: 6, july: 7, jul: 7, august: 8, aug: 8, september: 9, sep: 9, sept: 9, october: 10, oct: 10, november: 11, nov: 11, december: 12, dec: 12 };
const pad = (n: number) => String(n).padStart(2, "0");
/** Turns a closing date written on a page into YYYY-MM-DD, or null when it cannot be read with certainty. */
export function toIsoDate(s: string | null | undefined): string | null {
  const t = String(s || "").trim();
  if (!t || t === "-") return null;
  let m = t.match(/(\d{4})-(\d{2})-(\d{2})/); if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = t.match(/(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/); if (m) return `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`;
  m = t.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?([A-Za-z]+),?\s+(\d{4})/); if (m && MONTHS[m[2].toLowerCase()]) return `${m[3]}-${pad(MONTHS[m[2].toLowerCase()])}-${pad(+m[1])}`;
  m = t.match(/([A-Za-z]+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/); if (m && MONTHS[m[1].toLowerCase()]) return `${m[3]}-${pad(MONTHS[m[1].toLowerCase()])}-${pad(+m[2])}`;
  return null;
}

/**
 * Direct engine - reads a school's OWN careers page and returns the vacancies on it.
 * The web and the AI are passed in (DirectDeps), so tests can fake both. Real versions: directIo.ts.
 * Order: use the saved careers link (or the one repaired last time) -> if it is dead or just the homepage, look for the real link on the
 * homepage -> read the page, its "Teaching roles / Vacancies" sub-pages and following pages -> skip the AI if nothing changed since last time
 * -> ask the AI to list ONLY vacancies written on the page -> check every answer (title is on the page, apply link is allowed) -> records.
 * Every Direct job goes to Pipeline 1 and the job gate, and starts as PENDING (Direct is not signed off).
 */
import type { RawJobRecord } from "@/lib/crawler/adaptors/raw-job.types";
import { withUwcLabel } from "./uwcRules";
import {
  Anchor, chooseApplyUrl, cleanTitle, deeperLinks, findNextPageUrl, hostOf, isGroupSitePage, isHomepageUrl, isJobBoardUrl, isSoftHomepage, anchorForTitle,
  looksBlocked, makeUniqueUrls, pagingInfo, rankRepairCandidates, sameTitle, textHash, titleInText, toIsoDate,
} from "./directRules";

export interface DirectSchool { id: string; name: string; city?: string; country?: string; careersUrl: string; website?: string }
/**
 * Rules version. It is mixed into the page fingerprint, so when the way jobs or links are read is improved (change this text),
 * every school is read once again instead of being skipped as "page text unchanged".
 */
export const DIRECT_RULES_VERSION = "2026-10-08-own-links-2";

export interface DirectState { pageUrl?: string; repairedFrom?: string; textHash?: string; lastStatus?: string; lastCheckedAt?: number; lastJobCount?: number; failCount?: number }
export type DirectStatus = "ok" | "no_jobs" | "unchanged" | "dead_link" | "blocked" | "needs_browser" | "board_only" | "group_skipped" | "no_link" | "error";
export interface DirectJob { title: string; applyUrl: string; closingDate: string | null; evidence: string }
export interface DirectResult {
  schoolId: string; status: DirectStatus; pageUrl: string; repairedFrom?: string; textHash?: string;
  jobs: DirectJob[]; tokensIn: number; tokensOut: number; pagesRead: number; note?: string;
}
export interface PageResult { ok: boolean; status: number; url: string; html: string; contentType: string; err?: string }
export interface AiJob { title: string; applyUrl?: string | null; closingDate?: string | null; evidence?: string | null }
export interface DirectDeps {
  fetchPage(url: string): Promise<PageResult>;
  askAI(i: { schoolName: string; pageUrl: string; text: string; links: Anchor[] }): Promise<{ jobs: AiJob[]; tokensIn: number; tokensOut: number }>;
}

export const MAX_TEXT_CHARS = 24000;
export const MAX_FOLLOW_PAGES = 4;
const clean = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#0?39;|&#8217;|&rsquo;/g, "'").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
export function htmlToText(html: string): string {
  return clean(html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<(nav|footer|header)[\s\S]*?<\/\1>/gi, " "));
}
export function anchorsOf(html: string, base: string): Anchor[] {
  const out: Anchor[] = [];
  for (const m of html.matchAll(/<a\b[^>]*href=["']([^"'#][^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    let href = m[1].trim(); try { href = new URL(href, base).toString(); } catch { continue; }
    if (!/^https?:/i.test(href)) continue;
    let label = clean(m[2]).slice(0, 120);
    // a document link with no readable words (an icon, "Download") is labelled by its file name, e.g. "Ad SPCC Chinese Percussion Instructor Oct2026"
    if (/\.(pdf|docx?)(\?|$)/i.test(href) && (label.length < 12 || /^(download|view|pdf|click here|apply|read more|more)\b/i.test(label))) {
      try { const f = decodeURIComponent(new URL(href).pathname.split("/").pop() || "").replace(/\.(pdf|docx?)$/i, "").replace(/[_\-+]+/g, " ").trim(); if (f.length > 5) label = (label && label.length > 2 ? label + " " : "") + f; } catch { /* keep label */ }
    }
    out.push({ label: label.slice(0, 160), href });
  }
  return out;
}

type Loaded = { page: PageResult; text: string } | { fail: "dead" | "blocked" | "needs_browser" | "soft"; note: string };
async function load(url: string, deps: DirectDeps): Promise<Loaded> {
  if (isHomepageUrl(url)) return { fail: "soft", note: "saved link is only the homepage" };
  const p = await deps.fetchPage(url);
  if (!p.ok) return [401, 403, 429].includes(p.status) ? { fail: "blocked", note: `HTTP ${p.status}` } : { fail: "dead", note: p.err || `HTTP ${p.status}` };
  if (/pdf/i.test(p.contentType)) return { fail: "dead", note: "page is a PDF" };
  const text = htmlToText(p.html);
  if (looksBlocked(text) || looksBlocked(p.html.slice(0, 4000))) return { fail: "blocked", note: "the site asks for a browser check" };
  if (isSoftHomepage(url, p.url)) return { fail: "soft", note: `redirects to the homepage (${p.url})` };
  if (text.length < 500) return { fail: "needs_browser", note: `only ${text.length} readable characters (list is probably loaded by JavaScript)` };
  return { page: p, text };
}

export async function runDirectForSchool(school: DirectSchool, prev: DirectState | null | undefined, deps: DirectDeps): Promise<DirectResult> {
  const res: DirectResult = { schoolId: school.id, status: "error", pageUrl: "", jobs: [], tokensIn: 0, tokensOut: 0, pagesRead: 0 };
  const saved = String(school.careersUrl || "").trim();
  if (!saved) return { ...res, status: "no_link", note: "no careers link saved" };
  if (isGroupSitePage(saved)) return { ...res, status: "group_skipped", pageUrl: saved, note: "group site, handled by the group's own engine" };

  // 1. find a working careers page
  const tryUrls = [saved];
  if (prev?.pageUrl && prev.repairedFrom === saved) tryUrls.unshift(prev.pageUrl);
  let loaded: { page: PageResult; text: string } | null = null; let repairedFrom: string | undefined; let lastFail: { fail: "dead" | "blocked" | "needs_browser" | "soft"; note: string } | null = null;
  for (const u of tryUrls) {
    const l = await load(u, deps);
    if ("page" in l) { loaded = { page: l.page, text: l.text }; if (u !== saved) repairedFrom = saved; break; }
    lastFail = { fail: l.fail, note: l.note };
  }
  if (!loaded && lastFail && (lastFail.fail === "dead" || lastFail.fail === "soft")) {
    let home = String(school.website || "").trim();
    if (!/^https?:\/\//i.test(home)) { try { home = new URL(saved).origin; } catch { home = ""; } }
    const hp = home ? await deps.fetchPage(home) : null;
    if (hp && hp.ok) {
      for (const c of rankRepairCandidates(anchorsOf(hp.html, hp.url), hp.url)) {
        const l = await load(c.url, deps);
        if ("page" in l) { loaded = { page: l.page, text: l.text }; repairedFrom = saved; break; }
      }
    }
  }
  if (!loaded) {
    const f = lastFail || { fail: "dead" as const, note: "no page" };
    const status: DirectStatus = f.fail === "blocked" ? "blocked" : f.fail === "needs_browser" ? "needs_browser" : "dead_link";
    return { ...res, status, pageUrl: saved, note: f.note + (status === "dead_link" ? "; no working careers link found on the homepage" : "") };
  }
  const page = loaded.page;
  res.pageUrl = page.url; res.repairedFrom = repairedFrom; res.pagesRead = 1;

  // 2. read the page, its sub-pages and following pages
  let text = loaded.text; let links = anchorsOf(page.html, page.url);
  for (const d of deeperLinks(links, page.url)) {
    const p = await deps.fetchPage(d.href);
    if (p.ok && !/pdf/i.test(p.contentType)) { text += `\n\n--- SUB-PAGE ${d.href} ---\n` + htmlToText(p.html); links = links.concat(anchorsOf(p.html, p.url)); res.pagesRead++; }
  }
  let curHtml = page.html, curUrl = page.url;
  const pg = pagingInfo(text);
  for (let i = 0; i < MAX_FOLLOW_PAGES && (pg ? pg.total > 1 : false); i++) {
    const next = findNextPageUrl(curHtml, curUrl);
    if (!next || next === curUrl) break;
    const p = await deps.fetchPage(next);
    if (!p.ok) break;
    text += `\n\n--- PAGE ${i + 2} ---\n` + htmlToText(p.html); links = links.concat(anchorsOf(p.html, p.url)); res.pagesRead++;
    curHtml = p.html; curUrl = p.url;
  }
  text = text.slice(0, MAX_TEXT_CHARS);
  if (pg && pg.total > 1 && res.pagesRead < pg.total) res.note = `page says "Page ${pg.page} of ${pg.total}" but the next page could not be followed`;

  // 3. unchanged since last time -> no AI
  res.textHash = textHash(DIRECT_RULES_VERSION + "\n" + text);
  if (prev && prev.textHash === res.textHash && (prev.lastStatus === "ok" || prev.lastStatus === "no_jobs" || prev.lastStatus === "unchanged")) {
    return { ...res, status: "unchanged", note: "page text unchanged since the last check" };
  }

  // 4. ask the AI, then check every answer
  const seenHref = new Set<string>();
  // job adverts are often PDF/Word files far down a page full of menu links, so those links go first and are never cut off
  const isDoc = (h: string) => /\.(pdf|docx?)(\?|$)/i.test(h);
  const uniq = links.filter((l) => l.label.length > 2 && !seenHref.has(l.href) && !!seenHref.add(l.href));
  const slimLinks = [...uniq.filter((l) => isDoc(l.href)), ...uniq.filter((l) => !isDoc(l.href))].slice(0, 200);
  const known = new Set<string>(links.map((l) => l.href)); known.add(page.url);
  const ai = await deps.askAI({ schoolName: school.name, pageUrl: page.url, text, links: slimLinks });
  res.tokensIn = ai.tokensIn; res.tokensOut = ai.tokensOut;

  const kept: DirectJob[] = [];
  for (const j of ai.jobs || []) {
    const title = cleanTitle(String(j.title || ""));
    if (title.length < 4 || title.length > 140) continue;
    if (!titleInText(title, text)) continue; // not really on the page
    if (kept.some((k) => sameTitle(k.title, title))) continue;
    let link = chooseApplyUrl(j.applyUrl, page.url, known);
    // A page link that carries this job's own title is the job's own page: it wins over a general link (e.g. a campus page shared by many jobs, UWCSEA)
    // and is used when the AI gave no usable link.
    const found = anchorForTitle(title, links, page.url);
    if (found) { const own = chooseApplyUrl(found, page.url, known); if (own !== page.url) link = own; }
    kept.push({ title, applyUrl: link, closingDate: toIsoDate(j.closingDate), evidence: String(j.evidence || "").slice(0, 160) });
  }
  res.jobs = makeUniqueUrls(kept, page.url);
  if (!res.jobs.length) {
    res.status = links.some((l) => isJobBoardUrl(l.href)) ? "board_only" : "no_jobs";
    if (res.status === "board_only") res.note = "the page lists no jobs of its own and only points to a job board";
    return res;
  }
  res.status = "ok";
  return res;
}

/** Records for Pipeline 1. Source name "School Web" is the existing Direct name (shown as the DIRECT pill). */
export function toRawRecords(school: DirectSchool, r: DirectResult): RawJobRecord[] {
  return r.jobs.map((j) => {
    const own = j.applyUrl.split("#")[0] !== r.pageUrl.split("#")[0];
    return withUwcLabel({
      rawTitle: j.title,
      applyUrl: j.applyUrl,
      directUrl: j.applyUrl, // the Direct pill opens the job's own link when it has one, otherwise the careers page
      source: "School Web",
      sources: ["School Web"],
      sourceUrls: { "School Web": j.applyUrl },
      datePosted: null,
      closingDate: j.closingDate,
      schoolId: school.id,
      schoolName: school.name,
      city: school.city,
      country: school.country,
      matchConfidence: own && hostOf(j.applyUrl) !== "" ? "high" : "medium",
      verificationReasons: [`Direct: read from the school's careers page ${r.pageUrl}`, j.evidence ? `evidence: "${j.evidence}"` : "evidence: title found on page"],
    } as RawJobRecord, j.applyUrl);
  });
}

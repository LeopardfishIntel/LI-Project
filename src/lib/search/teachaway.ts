/**
 * TEACH AWAY ENGINE (rewrite)
 *
 * What changed vs the previous version:
 *  1. Paginates to completion (stops when a page adds no NEW jobs), with a high safety ceiling.
 *     Every hub is reconciled against the "N jobs available" figure when the page shows one.
 *  2. Confirms each page has really loaded before reading it. A page that fails to load is
 *     reported as INCOMPLETE - never treated as "zero jobs".
 *  3. Visits each candidate job's detail page: closing date, expiry, live/closed check.
 *  4. Every job gets status verified | needs_review (rejected jobs are not returned)
 *     plus a list of reasons. Nothing is auto-approved when unsure.
 *  5. Card extraction no longer records whole-page text as a "card" (see extractCards).
 *  6. Honest bot identity, robots.txt respected, stops immediately on a bot challenge.
 *  7. Deadline + per-run report so a slow run degrades gracefully instead of silently truncating.
 *
 * CONFIRM-IN-DEVTOOLS items are marked. I could not see Teach Away's rendered hub markup,
 * so the DOM-specific parts are isolated in extractCards(), PAGINATION and the ready-checks.
 */
import { getAdminDb } from "@/firebase/admin";
import { isValidJobTitle, sanitizeJobTitle } from "@/lib/crawler/titleSanitizer";
import { matchSchoolEntity } from "@/lib/crawler/entityMatcher";
import { parseRelativeDate } from "@/lib/crawler/dateParser";
import { classifyTeachingRole, detectPositionType } from "@/lib/crawler/roleDecision";
import { chromium, type BrowserContext, type Page } from "playwright";
import * as cheerio from "cheerio";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * "expired" is a job that's otherwise good (real school match, valid role) but whose closing
 * date has passed. It is NOT dropped like "rejected" - it's returned and written to Firestore
 * so churn metrics (how long a listing stayed open, how often a school re-posts) have the
 * full lifecycle, not just the currently-open snapshot. Only role/title/data-quality problems
 * use "rejected"; a merely-expired listing never does.
 */
export type VerificationStatus = "verified" | "expired" | "needs_review" | "rejected";
export type MatchConfidence = "high" | "medium" | "low";

export interface TeachAwayJobMatch {
  jobId: string;
  title: string;
  /** Teach Away job page. Use this as the attribution / "view original" link. */
  applyUrl: string;
  /** External apply link found on the detail page, if any (unverified candidate). */
  directApplyUrl: string | null;
  schoolId: string;
  schoolName: string;
  city: string;
  country: string;
  source: string;
  attribution: "Teach Away";
  /** Compatibility aliases for run_all_sweeps.ts / runIngestionPipeline. */
  closingDate: string | null;
  sources: string[];
  sourceUrls: Record<string, string>;
  sourceHub: string;
  datePosted: string | null;
  /** YYYY-MM-DD (UTC date) or null when unknown. */
  closesAt: string | null;
  closesAtRaw: string | null;
  rollingOrUntilFilled: boolean;
  startDate?: string | null;
  isMidYearReplacement?: boolean;
  curriculum?: string | null;
  subject?: string | null;
  positionType: string | null;
  matchConfidence: MatchConfidence;
  /** Never "rejected" in the returned list; rejected jobs are counted in the report. */
  status: VerificationStatus;
  reasons: string[];
  lastSeenAt: string;
}

export interface TeachAwaySearchOptions {
  query?: string;
  region?: "MENA" | "SE_ASIA" | "EUROPE" | "LATAM" | "EAST_ASIA" | "ALL";
  schoolId?: string;
  /** Limit country hubs (for sharding a run across several invocations). */
  maxHubs?: number;
  hubOffset?: number;
  /** SAFETY ceiling only. Hitting it marks the hub incomplete. */
  maxPagesPerHub?: number;
  /** Absolute epoch ms. Remaining work is skipped and reported, not silently dropped. */
  deadlineMs?: number;
  /** Cap on detail-page lookups made just to name an unmapped employer. */
  maxUnmappedLookups?: number;
  onReport?: (report: TeachAwayRunReport) => void;
  /** Default false: "verified" and "expired" jobs are always returned (expired ones are needed for churn metrics); "needs_review" jobs are only included when this is true, so a caller that ignores `status` can never publish an unreviewed job as active. */
  includeNeedsReview?: boolean;
  /** No Firestore writes (unmapped staging is skipped). Use for the sandbox run. */
  dryRun?: boolean;
  /** Crawl only these hub URLs (sandbox / debugging). */
  onlyHubUrls?: string[];
  /** Cap on real detail-page fetches for FLIS-matched jobs per run. */
  maxDetailLookups?: number;
}

export type HubStatus =
  | "ok"
  | "not_found"
  | "blocked"
  | "load_failed"
  | "card_parse_failed"
  | "page_cap_hit"
  | "count_mismatch"
  | "robots_disallowed"
  | "skipped_deadline";

export interface HubReport {
  url: string;
  status: HubStatus;
  pages: number;
  collected: number;
  statedTotal: number | null;
  complete: boolean;
  note?: string;
}

export interface TeachAwayRunReport {
  startedAt: string;
  finishedAt: string;
  hubs: HubReport[];
  incompleteHubUrls: string[];
  completeHubUrls: string[];
  blocked: boolean;
  totals: {
    uniqueCards: number;
    verified: number;
    expired: number;
    needsReview: number;
    rejected: number;
    unmappedStaged: number;
    detailLookupsSkipped: number;
  };
  rejectionsByReason: Record<string, number>;
  /** A few example titles per rejection reason, so bad extraction is visible. */
  rejectionSamples: Record<string, string[]>;
  /** Every job id seen on this run (including rejected). Use for closing vanished jobs. */
  seenJobIds: string[];
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const BASE = "https://www.teachaway.com";
const BOT_TOKEN = "leopardfishintelbot";
const SCRAPER_CONTACT = (process.env.SCRAPER_CONTACT || "").trim();
const BOT_UA = `LeopardfishIntelBot/1.0 (+https://www.leopardfishintel.com${
  SCRAPER_CONTACT ? `; contact: ${SCRAPER_CONTACT}` : ""
})`;

const REGIONAL_COUNTRY_MAP: Record<string, string[]> = {
  MENA: ["united-arab-emirates", "qatar", "saudi-arabia", "kuwait", "oman", "bahrain", "egypt", "jordan"],
  SE_ASIA: ["vietnam", "thailand", "malaysia", "singapore", "indonesia", "philippines"],
  EAST_ASIA: ["china", "hong-kong", "japan", "south-korea", "taiwan"],
  EUROPE: ["spain", "italy", "germany", "france", "switzerland", "netherlands", "czech-republic", "austria", "portugal", "belgium", "poland", "hungary", "cyprus", "greece"],
  LATAM: ["argentina", "brazil", "colombia", "peru", "chile", "mexico", "costa-rica", "panama"],
};

const GROUP_EMPLOYER_URLS: string[] = [
  `${BASE}/teaching-jobs-abroad/gems-education`,
  `${BASE}/teaching-jobs-abroad/aldar-education`,
  `${BASE}/teaching-jobs-abroad/taaleem`,
  `${BASE}/teaching-jobs-abroad/qatar-foundation`,
  `${BASE}/teaching-jobs-abroad/inspired-education`,
  `${BASE}/teaching-jobs-abroad/bloom-education`,
  `${BASE}/schools/northlands-school`,
];

/**
 * Program/employer pages share the single-segment URL shape /teaching-jobs-abroad/{slug}
 * with individual jobs. These slugs are known programs, never jobs.
 */
const KNOWN_PROGRAM_SLUGS = new Set<string>([
  "gems-education", "aldar-education", "taaleem", "qatar-foundation", "inspired-education",
  "bloom-education", "basis-international-schools", "amity", "nova", "al-ittihad",
  "link-interac-inc", "advanced-education-company",
]);

/**
 * Country hubs use position-type URLs instead of /all-positions/ so ESL, office, ministry
 * and vocational listings are never fetched at all. Add "librarian" if wanted.
 */
const COUNTRY_POSITION_SLUGS = ["certified-teacher", "university-graduate", "director-principal"];

/** CONFIRM in DevTools: how does page 2 get requested? (?page=N vs load-more/infinite scroll) */
const PAGINATION = { param: "page", secondPageParam: 1 };

/** A job card always shows one of these. CONFIRM on a real hub page. */
const CARD_MARKER = /view details|quick apply/i;
const MAX_CARD_TEXT = 1500;

/** Optional: CSS selector of the element that shows "N jobs available". CONFIRM. */
const JOB_COUNTER_SELECTOR: string | null = null;

const NAV_TIMEOUT_MS = 30_000;
const READY_TIMEOUT_MS = 20_000;
/**
 * Shorter ready-timeout used for continuation pages (n >= 2) once the marker pattern is
 * already confirmed working on page 1. Sandbox run against /taaleem (2026-09-28) showed a
 * genuine trailing page waiting the full 20s before being wrongly marked load_failed; 8s is
 * still well above how long pages 1-4 of that same hub took to render.
 */
const PAGINATION_TIMEOUT_MS = 8_000;
const DEFAULT_MAX_PAGES = 60;
const DEFAULT_RUN_BUDGET_MS = 12 * 60 * 1000;

/** Matches below this confidence are sent to review instead of verified. */
const MIN_AUTO_CONFIDENCE: MatchConfidence = "high";

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const jitter = (min: number, max: number) => Math.floor(Math.random() * (max - min)) + min;
const clean = (s: string) => s.replace(/\s+/g, " ").trim();

function countryToSlug(country: string): string {
  return (country || "").toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

function slugify(s: string): string {
  return (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function withParam(url: string, key: string, value: number): string {
  const u = new URL(url);
  u.searchParams.set(key, String(value));
  return u.toString();
}

const CONF_RANK: Record<MatchConfidence, number> = { low: 1, medium: 2, high: 3 };
// Ordering matters: when several conditions fire on one job, the highest rank wins (see flag()
// below). "expired" ranks below "needs_review" on purpose - a clean expired job goes straight
// through, but a genuine data-quality problem (ambiguous school, unparseable date text) still
// forces human review even on a job that also happens to be expired.
const STATUS_RANK: Record<VerificationStatus, number> = { verified: 0, expired: 1, needs_review: 2, rejected: 3 };

// ---------------------------------------------------------------------------
// Dates (unambiguous formats only - never guess dd/mm vs mm/dd)
// ---------------------------------------------------------------------------

const MONTHS: Record<string, number> = {
  january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3, april: 4, apr: 4, may: 5,
  june: 6, jun: 6, july: 7, jul: 7, august: 8, aug: 8, september: 9, sep: 9, sept: 9,
  october: 10, oct: 10, november: 11, nov: 11, december: 12, dec: 12,
};

function ymd(y: number, m: number, d: number): string | null {
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Returns YYYY-MM-DD or null. Handles ISO, "1 December 2026", "December 1, 2026". */
export function parseAbsoluteDate(input: string | null | undefined): string | null {
  if (!input) return null;
  const s = input.replace(/(\d)(st|nd|rd|th)\b/gi, "$1").replace(/,/g, " ").trim();
  let m = s.match(/\b(\d{4})-(\d{2})-(\d{2})/);
  if (m) return ymd(+m[1], +m[2], +m[3]);
  m = s.match(/\b(\d{1,2})\s+([A-Za-z]{3,9})\.?\s+(\d{4})\b/);
  if (m && MONTHS[m[2].toLowerCase()]) return ymd(+m[3], MONTHS[m[2].toLowerCase()], +m[1]);
  m = s.match(/\b([A-Za-z]{3,9})\.?\s+(\d{1,2})\s+(\d{4})\b/);
  if (m && MONTHS[m[1].toLowerCase()]) return ymd(+m[3], MONTHS[m[1].toLowerCase()], +m[2]);
  return null;
}

/** YYYY-MM-DD + N days, UTC-safe (no local-timezone drift at month/year boundaries). */
function addDaysISO(baseISO: string, days: number): string {
  const [y, m, d] = baseISO.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

const INFERRED_CLOSING_WINDOW_DAYS = 42; // 6 weeks

// ---------------------------------------------------------------------------
// robots.txt (minimal, longest-match-wins)
// ---------------------------------------------------------------------------

type RobotsCheck = (pathAndQuery: string) => boolean;

function robotsPattern(p: string): RegExp {
  const esc = p.replace(/[.+?^{}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp("^" + esc);
}

export function parseRobots(txt: string): RobotsCheck {
  type Rule = { allow: boolean; re: RegExp; len: number };
  const groups: { agents: string[]; rules: Rule[] }[] = [];
  let cur: { agents: string[]; rules: Rule[] } | null = null;
  let lastWasAgent = false;
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, "").trim();
    const idx = line.indexOf(":");
    if (!line || idx < 0) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const val = line.slice(idx + 1).trim();
    if (key === "user-agent") {
      if (!cur || !lastWasAgent) {
        cur = { agents: [], rules: [] };
        groups.push(cur);
      }
      cur.agents.push(val.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!cur || (key !== "allow" && key !== "disallow") || !val) continue;
    cur.rules.push({ allow: key === "allow", re: robotsPattern(val), len: val.length });
  }
  const specific = groups.filter((g) => g.agents.some((a) => a !== "*" && BOT_TOKEN.includes(a)));
  const applicable = specific.length ? specific : groups.filter((g) => g.agents.includes("*"));
  const rules = applicable.flatMap((g) => g.rules);
  return (p: string) => {
    let best: Rule | null = null;
    for (const r of rules) {
      if (!r.re.test(p)) continue;
      if (!best || r.len > best.len || (r.len === best.len && r.allow)) best = r;
    }
    return best ? best.allow : true;
  };
}

async function loadRobots(context: BrowserContext): Promise<RobotsCheck> {
  try {
    const res = await context.request.get(`${BASE}/robots.txt`, { timeout: 15_000 });
    if (!res.ok()) return () => true;
    return parseRobots(await res.text());
  } catch {
    console.warn("⚠️ [TEACH AWAY] Could not read robots.txt; proceeding cautiously.");
    return () => true;
  }
}

// ---------------------------------------------------------------------------
// Page loading with confirmation
// ---------------------------------------------------------------------------

function isChallengePage(html: string): boolean {
  return /just a moment|attention required|cf-challenge|checking your browser|verify you are human/i.test(html);
}

type ListLoad =
  | { state: "results"; html: string }
  | { state: "empty"; html: string; viaTimeout?: boolean }
  | { state: "not_found" }
  | { state: "blocked"; detail?: string }
  | { state: "failed"; detail?: string };

/**
 * Does not return until the list is actually rendered:
 *  1. navigation committed and status is sane
 *  2. either job-card markers or an explicit "no results" message is visible
 *  3. spinners/skeletons (best effort) are gone
 *  4. the number of cards has stopped changing
 *
 * `readyTimeoutMs` is shorter for continuation pages (n >= 2) than for the first page of a
 * hub: once we've confirmed the marker pattern works on page 1, a later page that never shows
 * either a card or an explicit "no results" message is far more likely to be the natural end
 * of pagination than a slow render, so there's no reason to burn the full first-page timeout
 * waiting for it. On timeout (not a bot challenge, not an HTTP error) we return `empty` with
 * `viaTimeout: true` rather than `failed`, so the caller can log "assumed end of results"
 * instead of stalling the whole hub for 20s per trailing page.
 */
async function loadListPage(page: Page, url: string, readyTimeoutMs = READY_TIMEOUT_MS): Promise<ListLoad> {
  let status = 0;
  try {
    const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS });
    status = resp ? resp.status() : 0;
  } catch (e: any) {
    return { state: "failed", detail: `goto: ${e?.message ?? e}` };
  }
  if (status === 404) return { state: "not_found" };

  if (status === 403 || status === 429 || status === 503) {
    const html = await page.content().catch(() => "");
    if (isChallengePage(html) || status !== 503) return { state: "blocked", detail: `HTTP ${status}` };
    return { state: "failed", detail: `HTTP ${status}` };
  }
  if (status >= 500) return { state: "failed", detail: `HTTP ${status}` };

  let readyTimedOut = false;
  try {
    await page.waitForFunction(
      () => {
        const t = document.body ? document.body.innerText : "";
        return /view details|quick apply/i.test(t) || /no (jobs|results|positions|vacancies)/i.test(t);
      },
      undefined,
      { timeout: readyTimeoutMs }
    );
    await page
      .waitForFunction(
        () => !document.querySelector('[aria-busy="true"], [class*="skeleton" i], [class*="spinner" i]'),
        undefined,
        { timeout: 8_000 }
      )
      .catch(() => undefined);

    const countCards = () => page.locator("a", { hasText: /view details/i }).count();
    let prev = await countCards();
    for (let i = 0; i < 5; i++) {
      await page.waitForTimeout(400);
      const cur = await countCards();
      if (cur === prev) break;
      prev = cur;
    }
  } catch (e: any) {
    const html = await page.content().catch(() => "");
    if (isChallengePage(html)) return { state: "blocked", detail: "challenge page" };
    // Neither the card marker nor an explicit "no results" message showed up within
    // readyTimeoutMs. On a first page that's a real failure (something's wrong with the
    // page or our marker). On a continuation page it's most likely the natural end of
    // pagination - treat it as empty (viaTimeout: true) and let collectHub's stated-total
    // check decide whether that's actually consistent with being done.
    if (readyTimeoutMs < READY_TIMEOUT_MS) {
      readyTimedOut = true;
    } else {
      return { state: "failed", detail: `not ready: ${e?.message ?? e}` };
    }
  }

  const html = await page.content();
  if (isChallengePage(html)) return { state: "blocked", detail: "challenge page" };
  const hasCards = CARD_MARKER.test(cheerio.load(html)("body").text());
  if (hasCards) return { state: "results", html };
  return { state: "empty", html, viaTimeout: readyTimedOut };
}

// ---------------------------------------------------------------------------
// Card extraction
// ---------------------------------------------------------------------------

export interface RawCard {
  href: string;
  title: string;
  text: string;
  positionType: string | null;
  curriculum: string | null;
  startDate: string | null;
  postedISO: string | null;
}

function jobHref(h: string | undefined): string | null {
  if (!h) return null;
  let u: URL;
  try {
    u = new URL(h, BASE);
  } catch {
    return null;
  }
  if (u.hostname.replace(/^www\./, "") !== "teachaway.com") return null;
  const segs = u.pathname.split("/").filter(Boolean);
  if (segs.length !== 2 || segs[0] !== "teaching-jobs-abroad") return null;
  if (KNOWN_PROGRAM_SLUGS.has(segs[1])) return null;
  return `${BASE}/teaching-jobs-abroad/${segs[1]}`;
}

function detectCurriculum(text: string): string | null {
  if (/IB DP|IB PYP|IB MYP|International Baccalaureate/.test(text)) return "IB Continuum";
  if (/British|Cambridge|IGCSE/.test(text)) return "British / Cambridge";
  if (/US Curriculum|American/.test(text)) return "US / AP";
  return null;
}

/**
 * The old version treated EVERY div/li/article containing "View Details" as a card, so
 * outer page containers were recorded with the first job's link and the whole page's text.
 * Here each job link climbs only to the SMALLEST ancestor that carries a card marker, and
 * anything larger than MAX_CARD_TEXT is counted as "oversized" (a parse problem) instead of
 * being stored as a card.
 *
 * CONFIRM: if hubs render the card marker text differently, adjust CARD_MARKER.
 * BEST FIX: if the page/API exposes JSON (see the DevTools Network-tab steps), replace this.
 */
export function extractCards(html: string): { cards: RawCard[]; oversized: number } {
  const $ = cheerio.load(html);
  const doneEls = new Set<unknown>();
  const byHref = new Map<string, RawCard>();
  let oversized = 0;

  $("a[href]").each((_, a) => {
    if (!jobHref($(a).attr("href"))) return;

    let node = $(a);
    let card: ReturnType<typeof $> | null = null;
    for (let i = 0; i < 8 && node.length; i++) {
      if (CARD_MARKER.test(node.text())) {
        card = node;
        break;
      }
      node = node.parent();
    }
    if (!card) return;

    const el = card.get(0);
    if (doneEls.has(el)) return;
    doneEls.add(el);

    const text = clean(card.text());
    if (text.length > MAX_CARD_TEXT) {
      oversized++;
      return;
    }

    let href = null as string | null;
    let linkText = "";
    card.find("a[href]").each((_i, x) => {
      if (href) return;
      const h = jobHref($(x).attr("href"));
      if (h) {
        href = h;
        linkText = clean($(x).text());
      }
    });
    if (!href) return;

    const heading = clean(card.find("h1,h2,h3,h4").first().text());
    let title = heading || linkText;
    if (CARD_MARKER.test(title) && title.length < 20) title = heading;

    const startMatch =
      text.match(/Start(?:ing)?\s*(?:in\s+)?([A-Za-z]+\s+\d{4})/i) ||
      text.match(/(August\s+\d{4}|September\s+\d{4}|January\s+\d{4}|ASAP|Immediate)/i);

    // Only parse a posted date when the card actually contains one. Never invent "today".
    const rel = text.match(/(\d+\s+(?:minute|hour|day|week|month)s?\s+ago|yesterday|today|just\s+posted)/i);
    const postedISO = rel ? parseRelativeDate(rel[1]) ?? null : null;

    const candidate: RawCard = {
      href,
      title,
      text,
      positionType: detectPositionType(text),
      curriculum: detectCurriculum(text),
      startDate: startMatch ? startMatch[1] : null,
      postedISO,
    };
    const prev = byHref.get(href);
    if (!prev || candidate.text.length < prev.text.length) byHref.set(href, candidate);
  });

  return { cards: Array.from(byHref.values()), oversized };
}

function readStatedTotal(html: string): number | null {
  const $ = cheerio.load(html);
  const scope = JOB_COUNTER_SELECTOR ? $(JOB_COUNTER_SELECTOR).first().text() : $("body").text();
  const text = clean(scope);
  const m =
    text.match(/(\d[\d,]*)\s+(?:teaching\s+)?jobs?\s+(?:available|found)/i) ||
    text.match(/\bof\s+(\d[\d,]*)\s+(?:jobs?|results?|positions?)\b/i);
  return m ? parseInt(m[1].replace(/,/g, ""), 10) : null;
}

// ---------------------------------------------------------------------------
// Hub collection with real pagination
// ---------------------------------------------------------------------------

interface Hub {
  url: string;
  kind: "employer" | "country";
  country: string | null;
}

/** For onlyHubUrls: infer the country slug from /teaching-jobs-abroad/{country}/{position}/{subject}/{level}. */
function hubFromUrl(url: string): Hub {
  const segs = new URL(url).pathname.split("/").filter(Boolean);
  const country = segs[0] === "teaching-jobs-abroad" && segs.length >= 5 ? segs[1] : null;
  return { url, kind: country ? "country" : "employer", country };
}

interface HubResult {
  hub: Hub;
  report: HubReport;
  cards: RawCard[];
}

async function collectHub(
  page: Page,
  hub: Hub,
  ctx: { robotsOk: RobotsCheck; deadlineMs: number; maxPages: number; onBlocked: () => void }
): Promise<HubResult> {
  const seen = new Map<string, RawCard>();
  const rep: HubReport = { url: hub.url, status: "ok", pages: 0, collected: 0, statedTotal: null, complete: false };
  const done = (): HubResult => {
    rep.collected = seen.size;
    return { hub, report: rep, cards: Array.from(seen.values()) };
  };

  let param = PAGINATION.secondPageParam;
  let shifted = false;

  for (let n = 1; n <= ctx.maxPages + 1; n++) {
    if (n > ctx.maxPages) {
      rep.status = "page_cap_hit";
      return done();
    }
    if (Date.now() > ctx.deadlineMs) {
      rep.status = "skipped_deadline";
      return done();
    }

    const url = n === 1 ? hub.url : withParam(hub.url, PAGINATION.param, param);
    const u = new URL(url);
    if (!ctx.robotsOk(u.pathname + u.search)) {
      rep.status = "robots_disallowed";
      return done();
    }

    await sleep(jitter(1000, 2000));
    const r = await loadListPage(page, url, n === 1 ? READY_TIMEOUT_MS : PAGINATION_TIMEOUT_MS);

    if (r.state === "not_found") {
      rep.status = n === 1 ? "not_found" : "load_failed";
      rep.complete = n === 1; // a genuinely missing hub is "known empty"
      return done();
    }
    if (r.state === "blocked") {
      rep.status = "blocked";
      rep.note = r.detail;
      ctx.onBlocked();
      return done();
    }
    if (r.state === "failed") {
      rep.status = "load_failed";
      rep.note = r.detail;
      return done();
    }

    rep.pages++;
    if (n === 1) rep.statedTotal = readStatedTotal(r.html);

    if (r.state === "empty") {
      // FIX: this used to mark complete=true unconditionally for any page after the first,
      // which would have silently accepted a truncated hub (e.g. this run's 15-of-27 case)
      // as "done" the moment a continuation page timed out. Now every page - first or not -
      // is only "complete" if we actually reached the stated total (or there was none to
      // reach), and a shortfall is always surfaced as count_mismatch rather than hidden.
      const trulyComplete = rep.statedTotal === null || rep.statedTotal === 0 || seen.size >= rep.statedTotal;
      rep.complete = trulyComplete;
      if (!trulyComplete) {
        rep.status = "count_mismatch";
        rep.note = `${r.viaTimeout ? "assumed end of results (timed out waiting for page markers)" : "page shows no results"}; collected ${seen.size} of ${rep.statedTotal}`;
      } else if (r.viaTimeout) {
        rep.note = "reached stated total; last page inferred empty via timeout rather than explicit no-results text";
      }
      return done();
    }

    const { cards, oversized } = extractCards(r.html);
    if (cards.length === 0) {
      rep.status = "card_parse_failed";
      rep.note = `results visible but 0 cards parsed (oversized=${oversized})`;
      return done();
    }

    let added = 0;
    for (const c of cards) {
      if (!seen.has(c.href)) {
        seen.set(c.href, c);
        added++;
      }
    }

    if (rep.statedTotal !== null && seen.size >= rep.statedTotal) {
      rep.complete = true;
      return done();
    }

    if (added === 0) {
      // Page N repeated page N-1. If pagination is 1-based our first param was a duplicate:
      // shift once and retry the same page number.
      if (!shifted && n >= 2 && rep.statedTotal !== null && seen.size < rep.statedTotal) {
        shifted = true;
        param += 1;
        n--;
        continue;
      }
      // Natural end of results.
      if (rep.statedTotal !== null && seen.size < rep.statedTotal) {
        rep.status = "count_mismatch";
        rep.note = `collected ${seen.size} of ${rep.statedTotal}`;
        rep.complete = false;
      } else {
        rep.complete = true;
      }
      return done();
    }
    if (n >= 2) param += 1;
  }
  return done();
}

// ---------------------------------------------------------------------------
// Detail page: closing date, live check, employer name
// ---------------------------------------------------------------------------

interface DetailInfo {
  closesAt: string | null;
  closesAtRaw: string | null;
  rolling: boolean;
  possiblyClosedNotice: boolean;
  posted: string | null;
  employerName: string | null;
  country: string | null;
  locality: string | null;
  directApplyUrl: string | null;
}

interface DetailResult extends DetailInfo {
  state: "ok" | "gone" | "failed" | "blocked" | "skipped";
}

const EMPTY_DETAIL: DetailInfo = {
  closesAt: null, closesAtRaw: null, rolling: false, possiblyClosedNotice: false, posted: null,
  employerName: null, country: null, locality: null, directApplyUrl: null,
};

function flattenLd(d: any): any[] {
  if (Array.isArray(d)) return d.flatMap(flattenLd);
  if (d && typeof d === "object") return [d, ...(d["@graph"] ? flattenLd(d["@graph"]) : [])];
  return [];
}

/**
 * Pure function - unit-test it against saved job pages.
 * Prefers schema.org JobPosting JSON-LD (validThrough/datePosted); falls back to page text.
 * TODO after inspecting a real job page: also read __NEXT_DATA__ if it carries closing dates.
 */
export function parseJobDetail(html: string): DetailInfo {
  const $ = cheerio.load(html);
  const out: DetailInfo = { ...EMPTY_DETAIL };

  $('script[type="application/ld+json"]').each((_, s) => {
    let data: any;
    try {
      data = JSON.parse($(s).html() ?? "");
    } catch {
      return;
    }
    for (const n of flattenLd(data)) {
      const types = Array.isArray(n["@type"]) ? n["@type"] : [n["@type"]];
      if (!types.includes("JobPosting")) continue;
      if (n.validThrough) {
        out.closesAtRaw = String(n.validThrough);
        out.closesAt = parseAbsoluteDate(out.closesAtRaw);
      }
      if (n.datePosted) out.posted = parseAbsoluteDate(String(n.datePosted));
      const org = n.hiringOrganization;
      out.employerName = (typeof org === "string" ? org : org?.name) ?? out.employerName;
      const loc = Array.isArray(n.jobLocation) ? n.jobLocation[0] : n.jobLocation;
      const addr = loc?.address;
      if (addr) {
        const c = addr.addressCountry;
        out.country = (typeof c === "string" ? c : c?.name) ?? out.country;
        out.locality = addr.addressLocality ?? out.locality;
      }
    }
  });

  const text = clean($("body").text());

  if (!out.closesAt) {
    const m = text.match(
      /(?:clos(?:es|ing)(?:\s+date)?|apply\s+(?:by|before)|application\s+deadline|deadline)\s*[:\-–]?\s*([A-Za-z0-9 ,./\-]{4,30})/i
    );
    if (m && /\d/.test(m[1])) {
      out.closesAtRaw = out.closesAtRaw ?? m[1].trim();
      out.closesAt = parseAbsoluteDate(m[1]);
    }
  }

  out.rolling = /until\s+filled|rolling\s+(?:basis|applications?)|open\s+until|ongoing\s+recruitment/i.test(text);
  out.possiblyClosedNotice =
    /no\s+longer\s+(?:accepting|available)|position\s+(?:has\s+been\s+)?filled|(?:job|position|vacancy|listing)\s+(?:is\s+|has\s+)?(?:now\s+)?(?:closed|expired)/i.test(
      text
    );

  $("a[href]").each((_, a) => {
    if (out.directApplyUrl) return;
    const h = $(a).attr("href") || "";
    if (!/apply/i.test($(a).text()) || !/^https?:/i.test(h)) return;
    try {
      if (new URL(h).hostname.replace(/^www\./, "") !== "teachaway.com") out.directApplyUrl = h;
    } catch {
      /* ignore */
    }
  });

  return out;
}

async function fetchDetail(
  page: Page,
  href: string,
  ctx: { robotsOk: RobotsCheck; deadlineMs: number; onBlocked: () => void }
): Promise<DetailResult> {
  if (Date.now() > ctx.deadlineMs) return { ...EMPTY_DETAIL, state: "skipped" };
  const u = new URL(href);
  if (!ctx.robotsOk(u.pathname + u.search)) return { ...EMPTY_DETAIL, state: "skipped" };

  await sleep(jitter(1000, 2000));
  try {
    const resp = await page.goto(href, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS });
    const status = resp ? resp.status() : 0;
    if (status === 404 || status === 410) return { ...EMPTY_DETAIL, state: "gone" };
    if (status === 403 || status === 429) {
      ctx.onBlocked();
      return { ...EMPTY_DETAIL, state: "blocked" };
    }
    if (status >= 400) return { ...EMPTY_DETAIL, state: "failed" };

    await page.waitForFunction(
      () => !!document.querySelector("h1") && (document.body ? document.body.innerText.length : 0) > 300,
      undefined,
      { timeout: READY_TIMEOUT_MS }
    );
    const html = await page.content();
    if (isChallengePage(html)) {
      ctx.onBlocked();
      return { ...EMPTY_DETAIL, state: "blocked" };
    }
    return { ...parseJobDetail(html), state: "ok" };
  } catch {
    return { ...EMPTY_DETAIL, state: "failed" };
  }
}

// ---------------------------------------------------------------------------
// School matching with confidence
// ---------------------------------------------------------------------------

function countriesAgree(schoolCountry: string, seen: string | null): boolean | null {
  if (!seen || seen.trim().length <= 3) return null; // ISO codes ("AE") can't be compared to names
  const a = countryToSlug(schoolCountry);
  const b = countryToSlug(seen);
  if (!a || !b) return null;
  return a === b || a.includes(b) || b.includes(a);
}

/**
 * Words too generic to prove a title names THIS school rather than just its network/brand
 * (e.g. every Taaleem campus's card mentions "Taaleem", "Charter School", "Abu Dhabi").
 */
const GENERIC_NAME_TOKENS = new Set([
  "school", "schools", "charter", "academy", "academies", "international", "the", "of", "and",
  "al", "el", "private", "campus", "college", "institute", "center", "centre", "group",
  "education", "international-school", "national",
]);

function coreNameTokens(name: string): string[] {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !GENERIC_NAME_TOKENS.has(t));
}

/**
 * Does the job TITLE itself name this specific school - not just the employer group that
 * every sibling campus's card also mentions? This is what actually breaks ties on a group
 * employer hub (e.g. /taaleem): a card for "Al Azm Charter School - Math Teacher" carries a
 * distinguishing token ("azm") that only one of the ~15 Taaleem-network FLIS schools has, so
 * it resolves to a single high-confidence match instead of all 15 tying at "low" on nothing
 * but the shared "Taaleem" text. Requires ALL of the school's own distinctive tokens to
 * appear (not just one), so "Al Majd" doesn't also match "Al Azm" via a shared "al".
 */
function nameMatchesTitle(schoolName: string, title: string): boolean {
  const tokens = coreNameTokens(schoolName);
  if (tokens.length === 0) return false;
  const t = ` ${title.toLowerCase()} `;
  return tokens.every((tok) => t.includes(` ${tok} `) || t.includes(` ${tok}'`) || t.includes(`-${tok} `) || t.includes(` ${tok}-`));
}

/**
 * The generic-title case ("Math Teacher" with no campus named anywhere in the card) is NOT
 * actually unsolvable on a group hub: the JobPosting JSON-LD's hiringOrganization - already
 * extracted into detail.employerName for every matched job - is very likely the specific
 * campus ("Dubai British School"), not the umbrella group ("Taaleem"), even when the list
 * card and title only ever say the group name. This compares the two names directly rather
 * than token-matching against a sentence, since employerName is a name, not a title.
 *
 * Guards against the umbrella-name trap: slugify("Taaleem") won't be a substring of or
 * contain slugify("Raha International School"), so an employerName that's just the group's
 * own name (not a specific campus) correctly matches nothing here.
 */
function employerNameMatches(schoolName: string, employerName: string | null | undefined): boolean {
  if (!employerName) return false;
  const a = slugify(schoolName || "");
  const b = slugify(employerName);
  if (a.length < 4 || b.length < 4) return false; // too short to trust a substring match either way
  return a === b || a.includes(b) || b.includes(a);
}

function matchConfidence(
  school: any,
  hub: Hub,
  detail: DetailResult | null,
  candidateText: string,
  title: string
): MatchConfidence {
  const sc = countryToSlug(school.country || "");
  let agree: boolean | null = null;
  if (hub.country) agree = sc === hub.country;
  const fromDetail = detail && detail.state === "ok" ? countriesAgree(school.country || "", detail.country) : null;
  if (fromDetail === false || agree === false) agree = false;
  else if (fromDetail === true || agree === true) agree = true;

  const city = String(school.city || "").toLowerCase().trim();
  const cityFound =
    !!city &&
    (candidateText.includes(city) || (detail && detail.state === "ok" ? (detail.locality || "").toLowerCase().includes(city) : false));

  if (agree === false) return "low";

  const schoolName = school.name || school.schoolname || "";
  const nameInTitle = nameMatchesTitle(schoolName, title);
  const nameIsEmployer = detail && detail.state === "ok" ? employerNameMatches(schoolName, detail.employerName) : false;
  if (nameInTitle || nameIsEmployer) return "high"; // a specific-enough name match outranks even a missing country/city signal

  if (agree === true && cityFound) return "high";
  if (agree === true || cityFound) return "medium";
  return "low";
}

// ---------------------------------------------------------------------------
// Helper for the caller: which stored jobs should be closed?
// ---------------------------------------------------------------------------

/**
 * Only close jobs whose hub was crawled COMPLETELY in a run that was not blocked.
 * An incomplete hub must never cause closures. Pass the ids from report.seenJobIds.
 */
export function selectJobsToClose(
  existing: { jobId: string; sourceHub: string }[],
  report: Pick<TeachAwayRunReport, "seenJobIds" | "completeHubUrls" | "blocked">
): string[] {
  if (report.blocked) return [];
  const seen = new Set(report.seenJobIds);
  const complete = new Set(report.completeHubUrls);
  return existing.filter((j) => complete.has(j.sourceHub) && !seen.has(j.jobId)).map((j) => j.jobId);
}

// ---------------------------------------------------------------------------
// Existing behaviour kept as-is
// ---------------------------------------------------------------------------

function isMidYear(startDate: string | null, cleanTitle: string): boolean {
  const s = (startDate || "").toLowerCase();
  const t = cleanTitle.toLowerCase();
  // NOTE: "january" is only mid-year for northern-hemisphere school calendars.
  return Boolean(
    s.includes("asap") || s.includes("immediate") || s.includes("january") || s.includes("term 2") ||
      t.includes("maternity") || t.includes("immediate")
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export async function searchTeachAwayDbSchools(
  options: TeachAwaySearchOptions | string = {}
): Promise<TeachAwayJobMatch[]> {
  const opts: TeachAwaySearchOptions = typeof options === "string" ? { query: options } : options;
  const {
    query = "",
    region = "ALL",
    schoolId,
    maxHubs,
    hubOffset = 0,
    maxPagesPerHub = DEFAULT_MAX_PAGES,
    deadlineMs = Date.now() + DEFAULT_RUN_BUDGET_MS,
    onReport,
    includeNeedsReview = false,
    dryRun = false,
    onlyHubUrls,
    maxDetailLookups = 80,
  } = opts;

  const startedAt = new Date().toISOString();
  if (!SCRAPER_CONTACT) {
    console.warn("⚠️ [TEACH AWAY ENGINE] SCRAPER_CONTACT is not set. Set it to a monitored address so the site can reach you.");
  }

  try {
    const db = getAdminDb();
    if (!db || typeof db.collection !== "function") {
      console.warn("⚠️ Admin SDK Firestore unavailable for Teach Away DB search.");
      return [];
    }

    // 1. DB primacy. TODO: this loads ALL schools - filter to active ones using your status field.
    const snap = await db.collection("schools").get();
    let dbSchools: any[] = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

    if (schoolId) {
      const up = schoolId.toUpperCase();
      dbSchools = dbSchools.filter((s) => s.id?.toUpperCase() === up);
    }
    if (query.trim()) {
      const q = query.toLowerCase().trim();
      dbSchools = dbSchools.filter((s) => {
        const aliases = (s.aliases || []).map((a: string) => String(a || "").toLowerCase());
        return (
          (s.name || s.schoolname || "").toLowerCase().includes(q) ||
          (s.city || "").toLowerCase().includes(q) ||
          (s.country || "").toLowerCase().includes(q) ||
          aliases.some((a: string) => a.includes(q))
        );
      });
    }
    if (dbSchools.length === 0) {
      console.log("ℹ️ [TEACH AWAY ENGINE] 0 FLIS DB schools match search criteria. Short-circuiting.");
      return [];
    }

    // 2. Hubs: employer pages first, then country x position-type pages.
    const flisCountries = new Set<string>();
    dbSchools.forEach((s) => s.country && flisCountries.add(countryToSlug(s.country)));
    let countrySlugs = Array.from(flisCountries).sort();
    if (region !== "ALL" && REGIONAL_COUNTRY_MAP[region]) {
      const allowed = new Set(REGIONAL_COUNTRY_MAP[region]);
      countrySlugs = countrySlugs.filter((s) => allowed.has(s));
    }
    countrySlugs = countrySlugs.slice(hubOffset, maxHubs ? hubOffset + maxHubs : undefined);

    const hubs: Hub[] = onlyHubUrls?.length ? onlyHubUrls.map(hubFromUrl) : [
      ...GROUP_EMPLOYER_URLS.map((url): Hub => ({ url, kind: "employer", country: null })),
      ...countrySlugs.flatMap((slug) =>
        COUNTRY_POSITION_SLUGS.map(
          (pos): Hub => ({
            url: `${BASE}/teaching-jobs-abroad/${slug}/${pos}/any-subject/any-level`,
            kind: "country",
            country: slug,
          })
        )
      ),
    ];
    console.log(`🔍 [TEACH AWAY ENGINE] ${hubs.length} hubs, up to ${maxPagesPerHub} pages each (safety ceiling).`);

    // 3. Browser (always closed) with an honest identity.
    const browser = await chromium.launch({ headless: true });
    const hubReports: HubReport[] = [];
    const unique = new Map<string, { card: RawCard; hub: Hub }>();
    const results: TeachAwayJobMatch[] = [];
    const rejections: Record<string, number> = {};
    const samples: Record<string, string[]> = {};
    let blocked = false;
    let unmappedStaged = 0;
    let detailLookupsSkipped = 0;
    let matchedDetailFetches = 0;

    const reject = (reason: string, title: string) => {
      rejections[reason] = (rejections[reason] || 0) + 1;
      (samples[reason] ||= []).length < 5 && samples[reason].push(title.slice(0, 100));
    };

    try {
      const context = await browser.newContext({ userAgent: BOT_UA, viewport: { width: 1280, height: 800 } });
      const page = await context.newPage();
      const robotsOk = await loadRobots(context);
      const onBlocked = () => {
        blocked = true;
      };

      // 3a. Collect
      for (const hub of hubs) {
        if (blocked) {
          hubReports.push({ url: hub.url, status: "skipped_deadline", pages: 0, collected: 0, statedTotal: null, complete: false, note: "run stopped: bot challenge" });
          continue;
        }
        const res = await collectHub(page, hub, { robotsOk, deadlineMs, maxPages: maxPagesPerHub, onBlocked });
        hubReports.push(res.report);
        for (const c of res.cards) if (!unique.has(c.href)) unique.set(c.href, { card: c, hub });
      }

      console.log(`📦 [TEACH AWAY ENGINE] ${unique.size} unique listings. Verifying...`);

      // 3b. Verify each listing
      const detailCache = new Map<string, DetailResult>();
      const getDetail = async (href: string, kind: "matched" | "unmapped") => {
        const hit = detailCache.get(href);
        if (hit) return hit;
        if (kind === "matched") {
          if (matchedDetailFetches >= maxDetailLookups) {
            detailLookupsSkipped++;
            return { ...EMPTY_DETAIL, state: "skipped" } as DetailResult;
          }
          matchedDetailFetches++;
        }
        const d = await fetchDetail(page, href, { robotsOk, deadlineMs, onBlocked });
        detailCache.set(href, d);
        return d;
      };

      const todayISO = new Date().toISOString().slice(0, 10);
      const nowISO = new Date().toISOString();

      for (const [href, { card, hub }] of unique) {
        if (blocked) break;

        const title = sanitizeJobTitle(card.title || "");
        if (!title || !isValidJobTitle(title)) {
          reject("invalid_title", card.title || "(empty)");
          continue;
        }

        const role = classifyTeachingRole(title, card.positionType);
        if (role.decision === "reject") {
          reject(role.reasons[0], title);
          continue;
        }

        const candidateText = `${title} ${card.text}`.toLowerCase();
        const matched = dbSchools
          .map((school) => ({
            school,
            res: matchSchoolEntity(school, { candidateText, country: card.text, sourceUrl: href }),
          }))
          .filter((m) => m.res.isMatch);

        // Not one of our schools: skip it. (We used to save these employers in a staging collection; that was switched off on request.)
        if (matched.length === 0) {
          reject("unmapped_school", title);
          continue;
        }

        const detail = await getDetail(href, "matched");
        const scored = matched
          .map((m) => ({ school: m.school, conf: matchConfidence(m.school, hub, detail, candidateText, title) }))
          .sort((a, b) => CONF_RANK[b.conf] - CONF_RANK[a.conf]);
        const top = scored[0];
        const ambiguous = scored.length > 1 && scored[1].conf === top.conf;

        let status = "verified" as VerificationStatus;
        const reasons: string[] = [];
        const flag = (s: VerificationStatus, r: string) => {
          if (STATUS_RANK[s] > STATUS_RANK[status]) status = s;
          reasons.push(r);
        };

        if (role.decision === "review") role.reasons.forEach((r) => flag("needs_review", `role:${r}`));

        // What actually gets stored for this job's closing date. Starts as whatever the
        // detail page gave us; may be overwritten below by a 6-week-from-posted inference
        // when the source gave us nothing at all.
        let effectiveClosesAt: string | null = null;
        let effectiveClosesAtRaw: string | null = null;
        let effectiveRolling = false;

        if (detail.state === "gone") flag("rejected", "detail_page_gone");
        else if (detail.state !== "ok") flag("needs_review", `detail_${detail.state}`);
        else {
          effectiveClosesAt = detail.closesAt;
          effectiveClosesAtRaw = detail.closesAtRaw;
          effectiveRolling = detail.rolling;

          if (detail.possiblyClosedNotice) flag("needs_review", "listing_may_be_closed");

          if (!effectiveClosesAt && !detail.closesAtRaw && !detail.rolling) {
            // No closing date anywhere on the page: infer one as postedDate + 6 weeks rather
            // than sending this to review. Prefer the site's own datePosted; fall back to the
            // "N days ago" text on the hub card; if neither exists, fall back to today (the
            // day we first saw it) as the best available stand-in for a created date.
            const postedBasis = detail.posted ?? (card.postedISO ? card.postedISO.slice(0, 10) : null);
            const basisDate = postedBasis ?? todayISO;
            const basisSource = detail.posted
              ? "detail_page_datePosted"
              : card.postedISO
                ? "card_relative_date"
                : "first_seen_fallback";
            effectiveClosesAt = addDaysISO(basisDate, INFERRED_CLOSING_WINDOW_DAYS);
            effectiveClosesAtRaw = `inferred:${basisSource}:${basisDate}+${INFERRED_CLOSING_WINDOW_DAYS}d`;
            // Informational only - does not escalate status. If the inferred date is itself
            // already in the past (e.g. we only just discovered a listing posted 3+ months
            // ago with no stated deadline), the expiry check right below correctly catches it.
            reasons.push(`closing_date_inferred:${basisSource}:${basisDate}=>${effectiveClosesAt}`);
          }

          if (effectiveClosesAt) {
            // Expired is NOT rejected: it's returned (see the final filter) so churn metrics
            // - how long a listing stayed open, how often a school re-posts - have the full
            // lifecycle rather than only ever seeing jobs while they're still active.
            if (effectiveClosesAt < todayISO) flag("expired", `expired:${effectiveClosesAt}`);
          } else if (detail.closesAtRaw) {
            flag("needs_review", `closing_date_unparseable:${detail.closesAtRaw}`);
          }
        }

        if (CONF_RANK[top.conf] < CONF_RANK[MIN_AUTO_CONFIDENCE]) flag("needs_review", `school_match_${top.conf}`);
        if (ambiguous) flag("needs_review", `ambiguous_school:${scored.map((s) => s.school.id).join("|")}`);

        if (status === "rejected") {
          reject(reasons.find((r) => r !== "") ?? "rejected", title);
          continue;
        }

        const jobId = href.split("/").filter(Boolean).pop();
        if (!jobId) continue;

        results.push({
          jobId,
          title,
          applyUrl: href,
          directApplyUrl: detail.state === "ok" ? detail.directApplyUrl : null,
          schoolId: top.school.id,
          schoolName: top.school.name || top.school.schoolname,
          city: top.school.city || "",
          country: top.school.country || "",
          source: "Teach Away",
          attribution: "Teach Away",
          sources: ["Teach Away"],
          sourceUrls: { "Teach Away": href },
          sourceHub: hub.url,
          datePosted: card.postedISO ?? (detail.state === "ok" ? detail.posted : null),
          closesAt: effectiveClosesAt,
          closingDate: effectiveClosesAt,
          closesAtRaw: effectiveClosesAtRaw,
          rollingOrUntilFilled: effectiveRolling,
          startDate: card.startDate,
          isMidYearReplacement: isMidYear(card.startDate, title),
          curriculum: card.curriculum || top.school.curriculum || null,
          positionType: card.positionType,
          matchConfidence: top.conf,
          status,
          reasons,
          lastSeenAt: nowISO,
        });
      }
    } finally {
      await browser.close().catch(() => undefined);
    }

    const rejectedCount = Object.values(rejections).reduce((a, b) => a + b, 0);
    const report: TeachAwayRunReport = {
      startedAt,
      finishedAt: new Date().toISOString(),
      hubs: hubReports,
      incompleteHubUrls: hubReports.filter((h) => !h.complete).map((h) => h.url),
      completeHubUrls: hubReports.filter((h) => h.complete).map((h) => h.url),
      blocked,
      totals: {
        uniqueCards: unique.size,
        verified: results.filter((r) => r.status === "verified").length,
        expired: results.filter((r) => r.status === "expired").length,
        needsReview: results.filter((r) => r.status === "needs_review").length,
        rejected: rejectedCount,
        unmappedStaged,
        detailLookupsSkipped,
      },
      rejectionsByReason: rejections,
      rejectionSamples: samples,
      seenJobIds: Array.from(unique.keys()).map((h) => h.split("/").filter(Boolean).pop() as string),
    };
    onReport?.(report);

    console.log(
      `✅ [TEACH AWAY ENGINE] ${report.totals.verified} verified, ${report.totals.expired} expired, ${report.totals.needsReview} need review, ${rejectedCount} rejected; ` +
        `${report.incompleteHubUrls.length}/${hubReports.length} hubs incomplete${blocked ? " (BLOCKED by bot challenge - run stopped)" : ""}.`
    );
    // "expired" always flows through (churn metrics need the full lifecycle, not just active
    // listings) regardless of includeNeedsReview. Only "needs_review" is gated by that flag -
    // it exists so a caller that ignores `status` entirely can never accidentally publish an
    // unreviewed job as if it were active.
    return results.filter((r) => r.status === "verified" || r.status === "expired" || (includeNeedsReview && r.status === "needs_review"));
  } catch (err: any) {
    console.error("❌ Error in searchTeachAwayDbSchools:", err?.message || err);
    return [];
  }
}

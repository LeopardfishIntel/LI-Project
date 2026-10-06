/**
 * LOCK-IN TESTS (Roger, 2026-10-05). These fail if someone changes the agreed behaviour while editing another engine.
 * If a test fails on purpose-built change (for example signing off a new engine), update the test in the same commit so the change is deliberate.
 */
import * as fs from "fs";
import * as path from "path";
import { AUTO_APPROVE_SOURCES, decideReviewStatus, isPlaceholderClosingDate, MAX_FUTURE_CLOSING_DAYS, MAX_STATED_CLOSING_DAYS } from "./jobGate";
import { DRIFT_MIN_USUAL_KEPT, DRIFT_RATIO } from "../crawler/engineDrift";
import { decideRetire } from "./retireRules";

let passed = 0, failed = 0;
function check(name: string, ok: boolean) { if (ok) { passed++; console.log("  PASS: " + name); } else { failed++; console.error("  FAIL: " + name); } }
const src = (p: string) => fs.readFileSync(path.resolve(process.cwd(), p), "utf8");

console.log("Lock-in tests");

// 1. Only GRC is signed off. Signing off another engine must be a deliberate edit of this test.
check("signed-off engines are exactly {GRC, SCHOOL WEB (Direct, high confidence only)}", AUTO_APPROVE_SOURCES.size === 2 && AUTO_APPROVE_SOURCES.has("GRC") && AUTO_APPROVE_SOURCES.has("SCHOOL WEB"));
const now = Date.parse("2026-10-05T00:00:00Z"), D = 864e5;
const good = { matchConfidence: "high", applyUrl: "https://x", closingDateMillis: now + 20 * D, now };
["TES", "Tes", "Teach Away", "Teacher Horizons", "UWC", "Taylors", "Taaleem", "ESF", "School ATS Portal", "Official Website", "Direct"].forEach((s) =>
  check("unsigned engine always goes to pending: " + s, decideReviewStatus({ ...good, source: s }).status === "pending_review"));
check("Direct (School Web), own job link, high -> approved", decideReviewStatus({ ...good, source: "School Web" }).status === "approved");
check("Direct (School Web), careers-page link (medium) -> pending", decideReviewStatus({ ...good, source: "School Web", matchConfidence: "medium" }).status === "pending_review");
check("Direct (School Web), unclear title -> pending", decideReviewStatus({ ...good, source: "School Web", roleUnsure: true }).status === "pending_review");
check("GRC with every check passed is approved", decideReviewStatus({ ...good, source: "GRC" }).status === "approved");
check("GRC is matched in any letter case", decideReviewStatus({ ...good, source: " grc " }).status === "approved");

// 2. Gate numbers
check("max future closing days is 365", MAX_FUTURE_CLOSING_DAYS === 365);
check("stated closing dates beyond 180 days are placeholders", MAX_STATED_CLOSING_DAYS === 180);
check("181 days away is a placeholder", isPlaceholderClosingDate(now + 181 * D, now));
check("179 days away is real", !isPlaceholderClosingDate(now + 179 * D, now));
check("drift: usual kept must be at least 5", DRIFT_MIN_USUAL_KEPT === 5);
check("drift: pause below 40% of usual", DRIFT_RATIO === 0.4);

// 3. Imposed closing date (posted + 42 days) and the placeholder rule stay in the ingestion code
const p1 = src("src/lib/pipelines/pipeline1-ingestion.ts");
check("ingestion imposes posted date + 42 days", /42 \* 24 \* 60 \* 60 \* 1000/.test(p1));
check("ingestion marks imposed dates isRollingDeadline", /isRollingDeadline:\s*!parsedDate\.closingDate/.test(p1));
check("ingestion ignores placeholder closing dates", /isPlaceholderClosingDate\(/.test(p1));
check("ingestion uses the gate for review status", /decideReviewStatus\(/.test(p1));

// 4. Nightly engines: only signed-off engines run; password required on every cron route
const orch = src("src/app/api/cron/sweep-orchestrator/route.ts");
check("orchestrator skips engines that are not signed off", /!isForced && !AUTO_APPROVE_SOURCES\.has\(key\)/.test(orch));
check("orchestrator retires vanished GRC jobs", /planRetireVanished\(/.test(orch) && /applyRetirePlan\(/.test(orch));
check("orchestrator runs the drift check", /recordRunAndCheckDrift\(/.test(orch));
["src/app/api/cron/sweep-orchestrator/route.ts", "src/app/api/daily-sweep/route.ts", "src/app/api/cron/update-inflation/route.ts"].forEach((f) =>
  check("password required: " + f, /await rejectUnlessCron\(request\)/.test(src(f))));
const cronAuth = src("src/lib/cronAuth.ts");
check("no password configured -> everything refused", /if \(!secret\) return false/.test(cronAuth) && /timingSafeEqual/.test(cronAuth));
check("password never stored in the public system collection", !/collection\(["']system["']\)/.test(cronAuth) && /cron_private/.test(cronAuth));
// every cron route must be password-protected, except these known gaps (remove from the list when fixed)
const KNOWN_OPEN = new Set(["daily-link-sweep", "update-rates"]);
fs.readdirSync(path.resolve(process.cwd(), "src/app/api/cron")).forEach((d) => {
  const f = `src/app/api/cron/${d}/route.ts`;
  if (!fs.existsSync(path.resolve(process.cwd(), f))) return;
  check(`cron route is protected (or a known gap): ${d}`, KNOWN_OPEN.has(d) || /rejectUnlessCron\(/.test(src(f)));
});
check("nightly workflow sends the password", /Authorization: Bearer \$\{\{ secrets\.CRON_SECRET \}\}/.test(src(".github/workflows/nightly-engines.yml")));
check("daily sweep workflow sends the password", /Authorization: Bearer \$\{\{ secrets\.CRON_SECRET \}\}/.test(src(".github/workflows/daily-sweep.yml")));

// 5. Retire-vanished rule
const L = "GRC", H = "grcfair.org";
const live = new Set(["https://grcfair.org/job-details/1"]);
const onlyGrc = { source: "GRC", sources: ["GRC"], sourceUrls: { GRC: "https://grcfair.org/job-details/2" }, applyUrl: "https://grcfair.org/job-details/2" };
const grcPlusTes = { source: "GRC", sources: ["GRC", "TES"], sourceUrls: { GRC: "https://grcfair.org/job-details/2", TES: "https://tes.com/j/9" }, applyUrl: "https://grcfair.org/job-details/2" };
const r = (x: any) => decideRetire(x, L, H, live) as any;
check("job not claiming GRC is never touched", r({ source: "TES", sources: ["TES"], applyUrl: "https://tes.com/j/9" }).claims === false);
check("GRC job still live is kept", r({ ...onlyGrc, sourceUrls: { GRC: "https://grcfair.org/job-details/1" }, applyUrl: "https://grcfair.org/job-details/1" }).retire === false);
check("link match ignores case and trailing slash", r({ ...onlyGrc, sourceUrls: { GRC: "HTTPS://GRCFAIR.ORG/job-details/1/" } }).retire === false);
check("GRC-only job that vanished -> delete", r(onlyGrc).action === "delete");
check("GRC job with no GRC link -> retired", r({ source: "GRC", sources: ["GRC"], applyUrl: "https://example.com/a" }).retire === true);
const s = r(grcPlusTes);
check("GRC + TES vanished -> only the GRC pill is stripped", s.action === "strip" && s.boardAfter.source === "TES" && !s.boardAfter.sources.includes("GRC"));
check("stripped job keeps the other source's link", s.boardAfter.applyUrl === "https://tes.com/j/9" && !("GRC" in s.boardAfter.sourceUrls));
check("other source without a link -> delete instead of a broken card", r({ ...grcPlusTes, sourceUrls: { GRC: "https://grcfair.org/job-details/2" } }).action === "delete");
const rv = src("src/lib/pipelines/retireVanished.ts");
check("retire keeps the school-folder copy as expired history", /status: "expired"/.test(rv) && /taken_down_by_source/.test(rv));
check("retire has safety limits of 25 jobs / 25%", /maxCount \?\? 25/.test(rv) && /maxFraction \?\? 0\.25/.test(rv));
check("retire does nothing when the engine returned no jobs", /liveUrls\.length/.test(rv));

// 5b. The old per-school search steps stay switched off (the new Direct engine replaces the school-website one)
const svf = src("src/ai/flows/search-vacancies-flow.ts");
["tes-adaptor", "school-website-adaptor", "board-hub-adaptor", "czech-hub-adaptor"].forEach((n) =>
  check("school refresh does not use the old adaptor: " + n, !new RegExp("adaptors/" + n).test(svf)));
check("school refresh does not call the old search functions", !/runSchoolWebsiteAdaptor\(|runCzechHubAdaptor\(|runBoardHubAdaptor\(|runTesAdaptor\(/.test(svf));

// 5c. New Direct engine: small pilot only, never self-approves
const runner = src("src/lib/search/direct/directRunner.ts");
const pilotMatch = runner.match(/DIRECT_PILOT_IDS: string\[\] = \[([\s\S]*?)\];/);
const pilotIds: string[] = pilotMatch ? (pilotMatch[1].match(/FLIS\d{4}/g) || []) : [];
check("Direct pilot list can be read", pilotIds.length > 0);
check("Direct pilot stays small (40 schools or fewer) until deliberately widened", pilotIds.length <= 40);
["FLIS0017", "FLIS0030", "FLIS0037", "FLIS0028", "FLIS0032", "FLIS0014", "FLIS0222"].forEach((id) => check("Direct pilot leaves out " + id + " (needs browser / board-only)", !pilotIds.includes(id)));
const eng = src("src/lib/search/direct/directEngine.ts");
check("Direct engine never sets a job status itself (the job gate decides)", !/status:\s*["'](approved|pending_review)["']/.test(eng.slice(eng.indexOf("export function toRawRecords"))));
check("Direct engine records use the existing 'School Web' source name", /source: "School Web"/.test(eng));
check("Direct engine asks the AI only through the checked path (titles must be on the page)", /titleInText\(/.test(eng) && /chooseApplyUrl\(/.test(eng));

const adminSrc = src("src/app/admin/page.tsx");
check("admin crawl-log table lists the DIRECT engine", (adminSrc.match(/"TEACHER_HORIZONS", "DIRECT"\]/g) || []).length === 2);
check("Direct runner writes a crawl log named DIRECT", /engine: "DIRECT"/.test(runner));

// 5d. Teach Away no longer saves unmatched employers (collection unmapped_discovered_schools was deleted on request)
check("Teach Away does not write to unmapped_discovered_schools", !/unmapped_discovered_schools/.test(src("src/lib/search/teachaway.ts")));

// 5e. A job already on the board (even worded differently) gets the Direct source as another pill, not a second card
check("ingestion matches existing board jobs with findBoardMatch", /findBoardMatch/.test(p1));
check("a Direct job's own link never creates a Malvern pill", /doc\.directUrl && !incomingIsDirect/.test(p1));

// 5f. The scheduled Direct run is password protected and only ever reads the pilot list
const dRoute = src("src/app/api/cron/direct-engine/route.ts");
check("Direct cron route is password protected", /rejectUnlessCron\(request\)/.test(dRoute) && /if \(denied\) return denied/.test(dRoute));
check("Direct cron route reads at most 25 schools per call", /limit: 25/.test(dRoute));
const dFlow = src(".github/workflows/direct-engine.yml");
check("Direct workflow calls the route with the cron password", /api\/cron\/direct-engine/.test(dFlow) && /secrets\.CRON_SECRET/.test(dFlow));
check("scheduled Direct run only picks from the pilot list", /pickRotation\(DIRECT_PILOT_IDS/.test(runner));

// 6. Board display rules
const sort = src("src/app/featured-jobs/page.tsx");
check("board counts and filters still know the School Web (Direct) source", /SCHOOL WEB/.test(sort) && /DIRECT: direct/.test(sort));
check("board only adds a Direct source to jobs that really have one", /hasRealDirectSource/.test(sort) && /if \(hasRealDirectSource && directCandidate/.test(sort));
check("pending review cards give a Direct job its own Direct link", /pendingHasRealDirect/.test(sort) && /sourceUrlsMap\['Direct'\] = pendingDirectLink/.test(sort));
check("Most Recent sort uses first-added time first", /job\.ingestedAtMillis,\s*job\.createdAtMillis/.test(sort));
check("'DB + Jan' button stays removed", !/handleRunFullSweep|DB \+ Jan/.test(sort));

// 7. TES safeguards (Roger, 2026-10-06)
const tesSearch = src("src/lib/search/tes.ts");
const tesAdaptor = src("src/lib/crawler/adaptors/tes-adaptor.ts");
check("TES search skips schools whose saved TES page is a group page or another school's", /tesSchoolsToSkip\(/.test(tesSearch) && /candidateSchools\.splice/.test(tesSearch));
check("TES clean-up will not remove jobs after a half-loaded read", /purgeLooksSafe\(/.test(tesAdaptor) && /removeMissing && !activeNormalized/.test(tesAdaptor));
check("TES page-reading path checks the hiring organisation", /Rejected hiringOrganization mismatch[^`]*\[\$\{item\.href\}\]/.test(tesAdaptor) && /names no hiring organisation/.test(tesAdaptor));

// 8. Old rejected / merged records are tidied by the daily janitor (Roger, 2026-10-06)
const janitorSrc = src("src/lib/pipelines/pipeline3-janitor.ts");
check("janitor tidies old rejected/merged board records", /tidyRejectedAndMerged\(db, now\)/.test(janitorSrc) && /isTidyable\(/.test(janitorSrc));
check("daily sweep reports tidied records", /tidiedBoardRecords/.test(src("src/app/api/daily-sweep/route.ts")));

console.log(`\nSummary: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);

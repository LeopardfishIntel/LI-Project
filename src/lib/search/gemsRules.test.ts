/**
 * gemsRules.test.ts - locks the GEMS rules: exact company-name matching, which jobs are kept, the apply link, the title cleaner,
 * and that the engine writes nothing itself and sends every job through the normal pipeline and job gate.
 */
import * as fs from "fs";
import * as path from "path";
import { GEMS_SCHOOL_COMPANY_MAP, GEMS_UNREGISTERED_CAMPUSES, normGemsCompany, gemsCampusFor, gemsApplyUrl, gemsJobId, gemsDecide, GEMS_SOURCE } from "./gemsRules";
import { cleanGemsJobTitle } from "../crawler/adaptors/gems-adaptor";

let passed = 0, failed = 0;
function check(name: string, ok: boolean) { if (ok) { passed++; console.log(`  PASS: ${name}`); } else { failed++; console.error(`  FAIL: ${name}`); } }
const read = (p: string) => fs.readFileSync(path.resolve(process.cwd(), p), "utf8");
const NOW = new Date("2026-10-06T10:00:00Z");

// ---- company -> school (exact only) ----
check("source name is GEMS", GEMS_SOURCE === "GEMS");
check("12 mapped campuses", Object.keys(GEMS_SCHOOL_COMPANY_MAP).length === 12);
check("exact name maps", JSON.stringify(gemsCampusFor("GEMS WORLD ACADEMY - DUBAI")) === JSON.stringify({ kind: "mapped", schoolId: "FLIS0026" }));
check("capitals do not matter", (gemsCampusFor("gems world academy - dubai") as any).schoolId === "FLIS0026");
check("a long dash is the same as a short dash", (gemsCampusFor("GEMS WORLD ACADEMY – DUBAI") as any).schoolId === "FLIS0026");
check("spaces round the dash do not matter", (gemsCampusFor("GEMS WORLD ACADEMY-DUBAI") as any).schoolId === "FLIS0026");
check("every mapped campus finds its own school", Object.entries(GEMS_SCHOOL_COMPANY_MAP).every(([id, c]) => (gemsCampusFor(c) as any).schoolId === id));
check("Abu Dhabi campus is not the Dubai school", gemsCampusFor("GEMS WORLD ACADEMY - ABU DHABI").kind === "known_unregistered");
check("Winchester Abu Dhabi is not Winchester Dubai", gemsCampusFor("GEMS WINCHESTER SCHOOL - ABU DHABI").kind === "known_unregistered");
check("Founders Al Mizhar is not Founders Dubai", gemsCampusFor("GEMS FOUNDERS SCHOOL - AL MIZHAR").kind === "known_unregistered");
check("Qatar campus is not a mapped school", gemsCampusFor("GEMS AMERICAN ACADEMY - QATAR").kind === "known_unregistered");
check("an unlisted company is unknown, never guessed", gemsCampusFor("GEMS SCHOOLS IN UAE").kind === "unknown");
check("part of a name does not match", gemsCampusFor("GEMS WORLD ACADEMY").kind === "unknown");
check("a longer name does not match", gemsCampusFor("GEMS WORLD ACADEMY - DUBAI BRANCH").kind === "unknown");
check("empty name", gemsCampusFor("").kind === "none" && gemsCampusFor(undefined).kind === "none");
check("no company is both mapped and unregistered", Object.values(GEMS_SCHOOL_COMPANY_MAP).every((c) => !Array.from(GEMS_UNREGISTERED_CAMPUSES).some((u) => normGemsCompany(u) === normGemsCompany(c))));
check("no two schools share one company name", new Set(Object.values(GEMS_SCHOOL_COMPANY_MAP).map(normGemsCompany)).size === 12);

// ---- apply link and id ----
check("relative link becomes a full link", gemsApplyUrl({ url: "/en/job/teacher-of-maths-5480640" }) === "https://careers.gemseducation.com/en/job/teacher-of-maths-5480640");
check("full job link kept", gemsApplyUrl({ url: "https://careers.gemseducation.com/uae/job/x-12" }) === "https://careers.gemseducation.com/uae/job/x-12");
check("careers home page is not a job link", gemsApplyUrl({ url: "https://careers.gemseducation.com/en/" }) === null);
check("another site is not a job link", gemsApplyUrl({ url: "https://www.gemsedu.com/careers-5" }) === null);
check("no link", gemsApplyUrl({}) === null);
check("job id from the job number", gemsJobId("https://careers.gemseducation.com/en/job/x-5480640") === "gems_5480640" && gemsJobId("https://careers.gemseducation.com/en/") === null);

// ---- keep or leave out ----
const d = (o: any) => gemsDecide({ title: "Teacher of Mathematics", now: NOW, ...o });
check("teacher with a future date is kept", d({ expDate: "2026-11-30 00:00:00", crtDate: "2026-09-20 10:00:00" }).keep && d({ expDate: "2026-11-30 00:00:00" }).closingDate === "2026-11-30");
check("posted date is read", d({ crtDate: "2026-09-20 10:00:00" }).datePosted === "2026-09-20");
check("past closing date is left out", !d({ expDate: "2026-10-01 00:00:00" }).keep);
check("closing today is still kept", d({ expDate: "2026-10-06 00:00:00" }).keep);
check("no closing date is kept, date is null (the gate decides)", d({}).keep && d({}).closingDate === null);
check("unreadable closing date is kept, flagged, date null", d({ expDate: "next week" }).keep && d({ expDate: "next week" }).expUnreadable && d({ expDate: "next week" }).closingDate === null);
check("an impossible date is unreadable", d({ expDate: "2026-02-31" }).closingDate === null);
check("support role is left out", !gemsDecide({ title: "School Bus Driver", now: NOW }).keep && !gemsDecide({ title: "Receptionist", now: NOW }).keep);
check("empty title is left out", !gemsDecide({ title: "  ", now: NOW }).keep);
check("old intake in the title is left out", !gemsDecide({ title: "Maths Teacher - August 2024", now: NOW }).keep);
check("old posting age is left out", !gemsDecide({ title: "Teacher", crtDate: "Posted 2 years ago", now: NOW }).keep);

// ---- title cleaner ----
check("title: plain title unchanged", cleanGemsJobTitle("Teacher of Mathematics") === "Teacher of Mathematics");
check("title: a trailing 's' is NOT stripped (old bug)", cleanGemsJobTitle("Head of Sciences") === "Head of Sciences" && cleanGemsJobTitle("Teacher of Maths") === "Teacher of Maths");
check("title: start-date tail removed", cleanGemsJobTitle("Primary Teacher - August 2027") === "Primary Teacher");
check("title: trailing dash and spaces removed", cleanGemsJobTitle("Arabic Teacher - ") === "Arabic Teacher");
check("title: never longer than 60", cleanGemsJobTitle("A".repeat(100)).length <= 60);

// ---- the engine's source code ----
const eng = read("src/lib/search/gems.ts");
const orch = read("src/app/api/cron/sweep-orchestrator/route.ts");
check("engine: writes nothing itself", !/\.commit\(/.test(eng) && !/\.doc\(/.test(eng) && !/\.batch\(/.test(eng) && !/featured_jobs_cache/.test(eng.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")));
check("engine: no own purge or anomaly writer", !/purgeStaleGemsVacancies/.test(eng) && !/recordSchoolSweepAnomaly/.test(eng));
check("engine: every job carries matchConfidence high", /matchConfidence:\s*"high"/.test(eng));
check("engine: source label is GEMS", /source:\s*GEMS_SOURCE/.test(eng));
check("engine: school comes from the exact company map", /gemsCampusFor\(company\)/.test(eng) && /campus\.schoolId/.test(eng));
check("engine: school name and city come from the registry", /school\.name/.test(eng) && /school\.city/.test(eng));
check("engine: closing date is GEMS's own", /closingDate:\s*dec\.closingDate/.test(eng));
check("engine: unknown company names are reported, not matched", /unknownCampuses\.push/.test(eng));
check("engine: retired schools are never targets", /isRetiredSchool/.test(eng));
check("engine: empty list changes nothing", /raw\.length\) \{[\s\S]{0,200}return out/.test(eng));
check("engine: failure returns nothing", /catch \(err\)[\s\S]{0,120}return \[\]/.test(eng));
check("orchestrator: GEMS vanished jobs are retired after a healthy run", /GEMS:\s*\{\s*label:\s*"GEMS",\s*urlHint:\s*"careers\.gemseducation\.com"/.test(orch));

console.log(`\nSummary: ${passed} passed, ${failed} failed.`);
if (failed) process.exit(1);

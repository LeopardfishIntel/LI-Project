/**
 * grcRules.test.ts - locks GRC's rules (the school-matching and job-keeping rules). Reads source text and runs the pure title cleaner. No network, no database.
 */
import * as fs from "fs";
import * as path from "path";
import { cleanGrcJobTitle } from "../crawler/adaptors/grc-adaptor";

let passed = 0, failed = 0;
function check(name: string, ok: boolean) { if (ok) { passed++; console.log(`  PASS: ${name}`); } else { failed++; console.error(`  FAIL: ${name}`); } }
const read = (p: string) => fs.readFileSync(path.resolve(process.cwd(), p), "utf8");

const adaptor = read("src/lib/crawler/adaptors/grc-adaptor.ts");
const engine = read("src/lib/search/grc.ts");
const wl = read("src/lib/crawler/schoolWhitelist.ts");

// ---- title cleaner ----
check("title: plain title unchanged", cleanGrcJobTitle("High School Math Teacher") === "High School Math Teacher");
check("title: start-date tail removed", cleanGrcJobTitle("Primary Homeroom Teacher - August 2027 start") === "Primary Homeroom Teacher");
check("title: 'Immediate' tail removed", cleanGrcJobTitle("Science Teacher - Immediate start") === "Science Teacher");
check("title: stuck words are split", cleanGrcJobTitle("MathTeacher") === "Math Teacher");
check("title: 'View details' is not a job", cleanGrcJobTitle("View Details") === "");
check("title: 'Open positions' is not a job", cleanGrcJobTitle("Open Positions") === "");
check("title: empty stays empty", cleanGrcJobTitle("") === "");
const long = cleanGrcJobTitle("Middle School Learning Support Specialist and Inclusion Coordinator for the Upper Grades");
check("title: never longer than 60", long.length <= 60);
check("title: cut at a whole word", !/\s$/.test(long) && /(Coordinator|Inclusion|Specialist|and|Support|Learning|School|Middle)$/.test(long));

// ---- school matching: only registry schools, direct matches only ----
check("adaptor: school must be in the registry (isWhitelistedSchool)", /isWhitelistedSchool\(/.test(adaptor) && /if \(!whitelistedSchool\)[\s\S]{0,200}continue/.test(adaptor));
check("adaptor: school is checked by name, website, city and country", /isWhitelistedSchool\(\s*grcSchoolName,\s*grcWebsite,[\s\S]{0,200}grcCity[\s\S]{0,200}(grcCountry|Country)/.test(adaptor));
check("adaptor: school id comes from the registry match, not from GRC", /schoolId:\s*whitelistedSchool\.schoolId/.test(adaptor) && /schoolName:\s*whitelistedSchool\.schoolName/.test(adaptor));
check("adaptor: school confidence is passed on", /matchConfidence:\s*whitelistedSchool\.matchConfidence/.test(adaptor));
check("adaptor: a non-direct match is never 'high'", /whitelistedSchool\.matchConfidence \|\| "medium"/.test(adaptor));
check("whitelist: only exact, alias, legal name or platform id count as a name match", /\["exact", "alias", "legal_name", "platform_id"\]\.includes\(match\.matchType\)/.test(wl));
check("whitelist: no fuzzy or acronym match gives 'high'", !/matchType === "(fuzzy|acronym)"/.test(wl) && !/"(fuzzy|acronym)"[\s\S]{0,40}matchConfidence: "high"/.test(wl));
check("whitelist: same name but different city is only 'medium'", /name_match_city_differs/.test(wl) && /matchConfidence: "medium", matchType: "name_match_city_differs"/.test(wl));
check("whitelist: retired and agency schools are never targets", /isRetiredSchool\(schoolId\)/.test(wl) && /isAgency === true/.test(wl));

// ---- which jobs are kept ----
check("adaptor: only live jobs (Status 0)", /job\.Status !== undefined && job\.Status !== 0[\s\S]{0,60}continue/.test(adaptor));
check("adaptor: support and non-teaching titles are dropped", /isSupportOrNonTeachingRole\(cleanTitle\)/.test(adaptor) && /isSupportOrNonTeachingRole\(rawTitle\)/.test(adaptor));
check("adaptor: job page link is the apply link", /GRC_DETAIL_BASE \+ jobId/.test(adaptor) && /applyUrl:\s*cleanUrl/.test(adaptor));
check("adaptor: same link is never read twice", /seenJobUrls\.has\(cleanUrl\)/.test(adaptor));
check("adaptor: closing date is GRC's own ApplyByDate", /closingDate:\s*closingDateStr/.test(adaptor) && /job\.ApplyByDate/.test(adaptor));
check("adaptor: source is GRC", /source:\s*"GRC"/.test(adaptor));
check("adaptor: if the GRC list fails, nothing is returned (so nothing is retired)", /!response\.ok[\s\S]{0,160}return \[\]/.test(adaptor));

// ---- search layer ----
check("engine: needs school and link", /!r\.schoolId \|\| !r\.applyUrl/.test(engine));
check("engine: support roles dropped again", /isSupportOrNonTeachingRole\(r\.rawTitle\)/.test(engine));
check("engine: passes matchConfidence to the job gate", /matchConfidence:\s*r\.matchConfidence/.test(engine));
check("engine: source is GRC", /source:\s*"GRC"/.test(engine));
check("engine: writes nothing itself", !/\.(set|update|add|delete)\(/.test(engine) && !/collection\(/.test(engine) && !/batch\(/.test(engine));
check("engine: on failure returns nothing", /catch \(err\)[\s\S]{0,120}return \[\]/.test(engine));

console.log(`\nSummary: ${passed} passed, ${failed} failed.`);
if (failed) process.exit(1);

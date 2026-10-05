import { decideReviewStatus } from "./jobGate";
import { detectDrift } from "../crawler/engineDrift";
import { isStrictAcademicTeachingRole, isSupportOrNonTeachingRole } from "../crawler/roleClassifier";

let passed = 0, failed = 0;
function check(name: string, ok: boolean) { if (ok) { passed++; console.log("  PASS: " + name); } else { failed++; console.error("  FAIL: " + name); } }

console.log("Job gate / drift / role tests");
const now = Date.parse("2026-10-05T00:00:00Z"), D = 864e5;
const base = { source: "GRC", matchConfidence: "high", applyUrl: "https://x", closingDateMillis: now + 20 * D, now };
check("GRC, certain match, real date -> approved", decideReviewStatus(base).status === "approved");
check("medium match -> pending", decideReviewStatus({ ...base, matchConfidence: "medium" }).status === "pending_review");
check("no match confidence -> pending", decideReviewStatus({ ...base, matchConfidence: undefined }).status === "pending_review");
check("no link -> pending", decideReviewStatus({ ...base, applyUrl: "" }).status === "pending_review");
check("date 2 years away -> pending", decideReviewStatus({ ...base, closingDateMillis: now + 700 * D }).status === "pending_review");
check("unclear title -> pending", decideReviewStatus({ ...base, roleUnsure: true }).status === "pending_review");
check("engine not signed off -> pending", decideReviewStatus({ ...base, source: "TES" }).status === "pending_review");
check("engine paused by drift -> pending", decideReviewStatus({ ...base, engineQuarantined: true }).status === "pending_review");

check("drift: first run, no usual numbers -> ok", !detectDrift(null, { found: 0, kept: 0 }).drifted);
check("drift: small engine not checked", !detectDrift({ found: 6, kept: 3 }, { found: 0, kept: 0 }).drifted);
check("drift: found nothing -> drifted", detectDrift({ found: 70, kept: 60 }, { found: 0, kept: 0 }).drifted);
check("drift: found 30% of usual -> drifted", detectDrift({ found: 70, kept: 60 }, { found: 20, kept: 18 }).drifted);
check("drift: kept 30% of usual -> drifted", detectDrift({ found: 70, kept: 60 }, { found: 70, kept: 15 }).drifted);
check("drift: normal variation -> ok", !detectDrift({ found: 70, kept: 60 }, { found: 55, kept: 48 }).drifted);

const teaching = ["HS Chemistry", "Secondary Math (Including AP)", "Grade 2 PYP", "Kindergarten PYP", "Middle School Science Faculty", "Lower School Music (Tentative)", "MS/HS Music (Band/Choir/General)", "Business Studies", "SS/ELA", "Math / Science", "Dean of Students", "Director of Secondary School - Bangkok", "Director of College Counseling", "EYFS Leader", "Head of School", "HS Mathematics (IB and AP)", "IB Theory of Kowledge", "Pre-Nursery/Mini&Me", "Visual Arts Facilitator", "Design Technology / Robotics", "Teacher of Maths", "Principal- Primary School"];
teaching.forEach((t) => check("teaching/leadership: " + t, isStrictAcademicTeachingRole(t)));
const notTeaching = ["Head of HR - Prospect", "Director of Technology", "Director of Operations", "Head of Marketing", "Director of Finance", "Director of Admissions", "IT Support Technician", "Faculty Housing Manager", "Business Manager", "ES - Speech Language Pathologist"];
notTeaching.forEach((t) => check("not teaching: " + t, !isStrictAcademicTeachingRole(t)));
["Head of HR - Prospect", "Director of Technology", "Director of Operations", "Head of IT"].forEach((t) => check("rejected as non-academic leadership: " + t, isSupportOrNonTeachingRole(t)));

console.log(`\nSummary: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);

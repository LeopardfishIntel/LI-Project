import { guardianPageState } from "./guardianRules";

let passed = 0, failed = 0;
function check(name: string, ok: boolean) { if (ok) { passed++; console.log("  PASS: " + name); } else { failed++; console.log("  FAIL: " + name); } }

check("page says expired at the top -> expired", guardianPageState(200, " Skip to main content This job has expired DT & Art Instructor Employer AMMAN ACADEMY") === "expired");
check("missing page (404) -> expired", guardianPageState(404, "") === "expired");
check("gone page (410) -> expired", guardianPageState(410, "") === "expired");
check("normal live page -> live", guardianPageState(200, "Skip to main content Computing Teacher Employer ASTON EDUCATION Closing date 30 Oct 2026") === "live");
check("server error (500) is never treated as expired", guardianPageState(500, "This job has expired") === "unknown");
check("blocked (403) is never treated as expired", guardianPageState(403, "") === "unknown");
check("'expired' wording far down the page (e.g. in a footer) is ignored", guardianPageState(200, "x ".repeat(1000) + "This job has expired") === "live");

console.log("\nSummary: " + passed + " passed, " + failed + " failed.");
if (failed) process.exit(1);

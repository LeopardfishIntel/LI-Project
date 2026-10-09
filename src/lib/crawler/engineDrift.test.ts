import { detectDrift, queueCallHadNoWork } from "./engineDriftRules";
let passed = 0, failed = 0;
function check(name: string, ok: boolean) { if (ok) { passed++; console.log("  PASS: " + name); } else { failed++; console.log("  FAIL: " + name); } }
console.log("Engine drift");
check("no schools read and nothing found = no work, not judged", queueCallHadNoWork(0, 0));
check("schools read but nothing found is still judged", !queueCallHadNoWork(10, 0));
check("schools read and jobs found is judged normally", !queueCallHadNoWork(10, 50));
check("a normal run is not drift", !detectDrift({ found: 241, kept: 238 }, { found: 230, kept: 225 }).drifted);
check("found nothing after a real read is drift", detectDrift({ found: 241, kept: 238 }, { found: 0, kept: 0 }).drifted);
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);

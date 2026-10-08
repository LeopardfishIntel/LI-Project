import { isTaaleemNoCampusCompany } from "./taaleem-server";

let passed = 0, failed = 0;
function check(name: string, ok: boolean) { if (ok) { passed++; console.log("  PASS: " + name); } else { failed++; console.error("  FAIL: " + name); } }
console.log("Taaleem: jobs with no campus are left out");

check("'Taaleem' is the group, not a campus", isTaaleemNoCampusCompany("Taaleem"));
check("'Central Office' is not a campus", isTaaleemNoCampusCompany("central office"));
check("'Taaleem Education' is the group", isTaaleemNoCampusCompany(" Taaleem  Education "));
check("an empty company is not a campus", isTaaleemNoCampusCompany(""));
check("a real campus is kept", !isTaaleemNoCampusCompany("Greenfield International School"));
check("a campus that has Taaleem in its name is kept", !isTaaleemNoCampusCompany("Taaleem Dubai British School"));
console.log(`\nSummary: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);

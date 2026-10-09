import { checkIsAdmin } from "./admin";
let passed = 0, failed = 0;
function check(name: string, ok: boolean) { if (ok) { passed++; console.log("  PASS: " + name); } else { failed++; console.log("  FAIL: " + name); } }
console.log("Admin check: one account only");
check("Roger is admin", checkIsAdmin({ email: "roger@leopardfishintel.com" }));
check("capital letters and spaces are fine", checkIsAdmin({ email: "  Roger@LeopardfishIntel.com " }));
check("guest (no user) is not admin", !checkIsAdmin(null));
check("guest with the admin teacher ID is not admin", !checkIsAdmin(null, { teacherId: "FLI007", isAdmin: true, role: "admin", tier: "pro" }, "FLI007"));
check("a name inside another email is not admin", !checkIsAdmin({ email: "fredsmith@gmail.com" }) && !checkIsAdmin({ email: "roger.jones@gmail.com" }) && !checkIsAdmin({ email: "admin@school.org" }));
check("another company address is not admin", !checkIsAdmin({ email: "anyone@leopardfishintel.com" }));
check("pro tier / admin role on a profile does not make admin", !checkIsAdmin({ email: "teacher@gmail.com" }, { tier: "pro", role: "admin", isAdmin: true }));
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);

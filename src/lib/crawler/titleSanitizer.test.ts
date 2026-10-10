import { isValidJobTitle } from "./titleSanitizer";
let passed = 0, failed = 0;
function check(name: string, ok: boolean) { if (ok) { passed++; console.log("  PASS: " + name); } else { failed++; console.log("  FAIL: " + name); } }
console.log("Teaching / leadership title check");
["Headteacher", "Assistant Headteacher Secondary", "Deputy Headteacher", "Head Teacher", "Head of Art Secondary", "Head EYFS", "Teacher of Junior School", "Head of Secondary"]
  .forEach((t) => check("accepted: " + t, isValidJobTitle(t)));
["Expression of interest", "Bursar", "Registrar", "Contact us"].forEach((t) => check("not a teaching job: " + t, !isValidJobTitle(t)));
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);

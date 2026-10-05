import { findBoardMatch } from "./boardMatch";
let passed = 0, failed = 0;
function check(name: string, ok: boolean) { if (ok) { passed++; console.log("  PASS: " + name); } else { failed++; console.error("  FAIL: " + name); } }
console.log("Board match (same job, another source)");
const rows = [
  { id: "a", title: "Teacher of Biology & Environmental Systems & Societies (ESS)", status: "approved", source: "TES", sources: ["TES"] },
  { id: "b", title: "Teacher of Business Management", status: "pending_review", source: "TES", sources: ["TES"] },
  { id: "c", title: "Grade 3 Teacher", status: "approved", source: "GRC", sources: ["GRC"] },
  { id: "d", title: "Grade 3 Teacher", status: "merged", source: "School Web", sources: ["School Web"] },
  { id: "e", title: "Chemistry Teacher", status: "approved", source: "GRC", sources: ["GRC"] },
];
const D = { source: "School Web", sources: ["School Web"] };
check("exact title, any engine", findBoardMatch(rows, { title: "teacher of business management", source: "GRC" })?.id === "b");
check("Direct: different wording of the same job joins the existing card", findBoardMatch(rows, { title: "Teacher of Biology & Environmental Systems & Societies", ...D })?.id === "a");
check("Direct: Grade 3 does not match Grade 4", findBoardMatch([rows[2]], { title: "Grade 4 Teacher", ...D }) === undefined);
check("Direct: unrelated title makes a new card", findBoardMatch(rows, { title: "Teacher of Physics", ...D }) === undefined);
check("two non-Direct engines with different wording stay separate", findBoardMatch(rows, { title: "IGCSE Chemistry Teacher", source: "TES" }) === undefined);
check("a merged row is never matched loosely", findBoardMatch([{ id: "m", title: "Teacher of Biology & Environmental Systems", status: "merged", source: "School Web", sources: ["School Web"] }], { title: "Teacher of Biology & Environmental Systems & Societies (ESS)", ...D }) === undefined);
check("an existing Direct row is matched by a later non-Direct engine with similar wording", findBoardMatch([{ id: "z", title: "Teacher of Biology & ESS", status: "pending_review", source: "School Web", sources: ["School Web"] }], { title: "Teacher of Biology & ESS.", source: "GRC" })?.id === "z");
console.log(`\nSummary: ${passed} passed, ${failed} failed.`);
if (failed) process.exit(1);

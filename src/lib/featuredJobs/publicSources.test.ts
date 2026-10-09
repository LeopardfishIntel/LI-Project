import { isReviewedPublicJob } from "./publicSources";
let passed = 0, failed = 0;
function check(name: string, ok: boolean) { if (ok) { passed++; console.log("  PASS: " + name); } else { failed++; console.log("  FAIL: " + name); } }
console.log("Public feed: reviewed engines only");
["TES", "GRC", "UWC", "ISP", "GEMS", "Taaleem", "GUARDIAN", "SEARCH ASSOCIATES", "School Web", "Official Website", "Direct"].forEach((s) =>
  check("shown: " + s, isReviewedPublicJob({ source: s, applyUrl: "https://x.example/job" })));
["Nord Anglia", "Cognita", "Inspired", "Teach Away", "Globeducate", "Taylors", "ESF", "Malvern College"].forEach((s) =>
  check("hidden: " + s, !isReviewedPublicJob({ source: s, applyUrl: "https://x.example/job" })));
check("shown: Nord Anglia card that also has TES in its sources list", isReviewedPublicJob({ source: "Nord Anglia", sources: ["Nord Anglia", "TES"], applyUrl: "https://nordangliaeducation.com/j" }));
check("hidden: Cognita card with only Cognita sources", !isReviewedPublicJob({ source: "Cognita", sources: ["Cognita"], applyUrl: "https://cognitapeople.csod.com/j" }));
check("shown: unknown source but a TES vacancy link", isReviewedPublicJob({ source: "", applyUrl: "https://www.tes.com/jobs/vacancy/teacher-of-art-123" }));
check("shown: Taaleem school (the board's own group check)", isReviewedPublicJob({ source: "Cognita" }, true));
check("hidden: nothing known", !isReviewedPublicJob({ source: "", applyUrl: "" }));
check("hidden: empty job", !isReviewedPublicJob(null));
console.log("\nSummary: " + passed + " passed, " + failed + " failed.");
if (failed) process.exit(1);

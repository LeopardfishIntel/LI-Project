import { toRawRecords } from "./directEngine";
import { UWC_SCHOOL_IDS, isUwcSchool, withUwcLabel } from "./uwcRules";
import registry from "../../../../public/complete_school_fields_export.json";

let passed = 0, failed = 0;
function check(name: string, ok: boolean) { if (ok) { passed++; console.log("  PASS: " + name); } else { failed++; console.error("  FAIL: " + name); } }
console.log("UWC as a Direct subset");

const result: any = { pageUrl: "https://www.example.edu/careers", jobs: [
  { title: "Teacher of Physics", applyUrl: "https://www.example.edu/careers/physics", closingDate: "2026-11-01", evidence: "x" },
] };
const mk = (id: string) => ({ id, name: "Test School", city: "C", country: "K", careersUrl: result.pageUrl }) as any;

const uwc = toRawRecords(mk("FLIS0005"), result)[0] as any;
check("UWC school: source stays School Web (Direct)", uwc.source === "School Web");
check("UWC school: sources has School Web and UWC", uwc.sources.includes("School Web") && uwc.sources.includes("UWC"));
check("UWC school: UWC pill opens the job's own link", uwc.sourceUrls.UWC === "https://www.example.edu/careers/physics");
check("UWC school: Direct link still kept", uwc.sourceUrls["School Web"] === "https://www.example.edu/careers/physics");
const other = toRawRecords(mk("FLIS0001"), result)[0] as any;
check("other school: no UWC label", !other.sources.includes("UWC") && other.sourceUrls.UWC === undefined);
check("withUwcLabel is not doubled", withUwcLabel(withUwcLabel(uwc, "u"), "u").sources.filter((s: string) => s === "UWC").length === 1);
check("isUwcSchool", isUwcSchool("FLIS0143") && !isUwcSchool("FLIS0001"));
const ids = new Set((registry as any[]).map((s) => s.id ?? s.flis ?? s.FLIS));
check("all UWC codes exist in the registry", UWC_SCHOOL_IDS.every((i) => ids.has(i)));
console.log(`\nSummary: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);

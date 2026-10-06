import { tesSchoolsToSkip, nameFitsSlug, pageIdOf, slugForeignCountry, classifyVacancyPage } from "./tesRules";

let passed = 0, failed = 0;
function check(name: string, ok: boolean) { if (ok) { passed++; console.log(`  PASS: ${name}`); } else { failed++; console.error(`  FAIL: ${name}`); } }
const S = (schoolId: string, name: string, slug: string, org?: string) => ({ schoolId, name, slug, org: org || (slug.match(/-(\d+)$/) || [])[1] });

const all = [
  S("FLIS0318", "Dubai Schools Al Barsha", "taaleem-1058642"), S("FLIS0319", "Dubai School Nad Al Sheba", "taaleem-1058642"), S("FLIS0341", "Jebel Ali School", "taaleem-1058642"),
  S("FLIS0323", "Kings' School Dubai", "kings-education-1058490"), S("FLIS0324", "Kings' School Al Barsha", "kings-education-1058490"),
  S("FLIS0334", "GEMS Jumeirah Primary School", "gems-education-1057361"), S("FLIS0339", "GEMS Winchester School Dubai", "gems-education-1057361"),
  S("FLIS0330", "Dubai International Academy Emirates Hills", "innoventures-education-1066416"), S("FLIS0360", "Raffles International School", "innoventures-education-1066416"),
  S("FLIS0027", "Aldar Academies", "aldar-education-1220983"), S("FLIS0366", "Yasmina British Academy", "aldar-education-1220983"), S("FLIS0368", "Al Mamoura Academy", "aldar-education-1220983"),
  S("FLIS0105", "Sunmarke School", "sunmarke-school-1077790"), S("FLIS0350", "Regent International School", "sunmarke-school-1077790"),
  S("FLIS0026", "GEMS World Dubai", "gems-world-academy-dubai-1060996"), S("FLIS0336", "GEMS Founders School Al Barsha", "gems-founders-school-dubai-1060996"),
  S("FLIS0293", "Dubai English Speaking College", "dubai-english-speaking-school-oud-metha-1059044"), S("FLIS0421", "Dubai English Speaking School (Dubai Oud Metha)", "dubai-english-speaking-school-oud-metha-1059044"),
  S("FLIS0072", "College du Leman", "nord-anglia-education-1065805"), S("FLIS0348", "The English College Dubai", "cognita-middle-east-1262403"),
  // schools that must keep running
  S("FLIS0001", "German Swiss International School", "german-swiss-international-school-1057613"),
  S("FLIS0011", "GD Country Garden", "guangdong-country-garden-school--gcgs--1058223"),
  S("FLIS0036", "New PORG Prague", "porg-prague-1057493"),
  S("FLIS0051", "King's College School Alicante", "king-s-college-school-alicante-1055666"),
  S("FLIS0077", "International School of Düsseldorf", "international-school-of-d-sseldorf-e-v-1056279"),
  S("FLIS0055", "College Alpin Beau Soleil", "coll-ge-alpin-beau-soleil-sa-1057796"),
  S("FLIS0137", "St. Andrews International School Sukhumvit", "st-andrews-international-school-sukhumvit-107-1060428"),
  S("FLIS0153", "Harrow International School Appi", "harrow-international-school-appi-1219867"),
  S("FLIS0320", "Harrow International School Abu Dhabi", "taaleem-1058642"),
];
const skipped = new Set(tesSchoolsToSkip(all).map((s) => s.schoolId));
for (const id of ["FLIS0318", "FLIS0319", "FLIS0341", "FLIS0320"]) check(`Taaleem group page: ${id} skipped`, skipped.has(id));
for (const id of ["FLIS0323", "FLIS0324", "FLIS0334", "FLIS0339", "FLIS0330", "FLIS0360"]) check(`group page: ${id} skipped`, skipped.has(id));
for (const id of ["FLIS0027", "FLIS0366", "FLIS0368"]) check(`Aldar group page: ${id} skipped`, skipped.has(id));
check("Regent International does not borrow Sunmarke's page", skipped.has("FLIS0350"));
check("Sunmarke School keeps its own page", !skipped.has("FLIS0105"));
check("GEMS Founders does not borrow GEMS World Dubai's page", skipped.has("FLIS0336"));
check("GEMS World Dubai keeps its page", !skipped.has("FLIS0026"));
check("Dubai English Speaking College does not borrow the Oud Metha page", skipped.has("FLIS0293"));
check("Dubai English Speaking School Oud Metha keeps it", !skipped.has("FLIS0421"));
check("College du Leman (Nord Anglia group page) skipped", skipped.has("FLIS0072"));
check("The English College Dubai (Cognita group page) skipped", skipped.has("FLIS0348"));
for (const id of ["FLIS0001", "FLIS0011", "FLIS0036", "FLIS0051", "FLIS0077", "FLIS0055", "FLIS0137", "FLIS0153"]) check(`own page school ${id} keeps running`, !skipped.has(id));
check("fit: clear match is 1", nameFitsSlug("Sunmarke School", "sunmarke-school-1077790") === 1);
check("fit: no match is 0", nameFitsSlug("Regent International School", "sunmarke-school-1077790") === 0);
check("page id from slug", pageIdOf({ schoolId: "x", name: "x", slug: "taaleem-1058642" }) === "1058642");
check("page id falls back to org", pageIdOf({ schoolId: "x", name: "x", org: "123456" }) === "123456");
const U = "United Arab Emirates";
check("UAE school: '-dubai-' link is home (the 2026-10-06 Sunmarke fault)", slugForeignCountry("https://www.tes.com/jobs/vacancy/key-stage-1-teacher-january-2027-sunmarke-school-dubai-2266116", U) === null);
check("UAE school: '-united-arab-emirates-' link is home", slugForeignCountry("https://www.tes.com/jobs/vacancy/primary-arabic-teacher-a-immediate-start-united-arab-emirates-2243809", U) === null);
check("UAE school: '-uae-' link is home", slugForeignCountry("https://www.tes.com/jobs/vacancy/teacher-of-music-dubai-uae-2341050", U) === null);
check("Singapore school: '-dubai-' link is foreign", slugForeignCountry("https://www.tes.com/jobs/vacancy/teacher-dubai-2341050", "Singapore") === "dubai");
check("Bahrain school: '-united-arab-emirates-' link is foreign (the British School of Bahrain mix-up)", slugForeignCountry("https://www.tes.com/jobs/vacancy/ks2-primary-teacher-maternity-cover-united-arab-emirates-2332441", "Bahrain") === "united-arab-emirates");
check("Korea school: '-korea-republic-of-' link is home", slugForeignCountry("https://www.tes.com/jobs/vacancy/elementary-school-grade-2-classroom-teacher-korea-republic-of-2344223", "South Korea") === null);
check("Singapore school: '-singapore-' link is home", slugForeignCountry("https://www.tes.com/jobs/vacancy/class-teacher-infant-school-singapore-2348923", "Singapore") === null);
check("link naming no country is never foreign", slugForeignCountry("https://www.tes.com/jobs/vacancy/myp-individuals-and-society-teacher-seoul-2344978", "South Korea") === null);
check("school with no country on file: nothing is rejected", slugForeignCountry("https://www.tes.com/jobs/vacancy/x-dubai-1", "") === null);
check("page not found -> gone", classifyVacancyPage({ status: 404, hasJobPosting: false }) === "gone");
check("page gone (410) -> gone", classifyVacancyPage({ status: 410, hasJobPosting: false }) === "gone");
check("page loads with a job, not closed -> live (keep it)", classifyVacancyPage({ status: 200, hasJobPosting: true, validThroughMs: Date.now() + 86400000 }) === "live");
check("page loads with a job, no closing date -> live", classifyVacancyPage({ status: 200, hasJobPosting: true }) === "live");
check("page loads, closing date passed -> gone", classifyVacancyPage({ status: 200, hasJobPosting: true, validThroughMs: Date.now() - 86400000 }) === "gone");
check("page loads with no job data -> unknown (never removed)", classifyVacancyPage({ status: 200, hasJobPosting: false }) === "unknown");
check("blocked (403) -> unknown", classifyVacancyPage({ status: 403, hasJobPosting: false }) === "unknown");
check("network trouble (status 0) -> unknown", classifyVacancyPage({ status: 0, hasJobPosting: false }) === "unknown");
console.log(`\nSummary: ${passed} passed, ${failed} failed.`);
if (failed) process.exit(1);

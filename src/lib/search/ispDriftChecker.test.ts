import assert from "node:assert";
import {
  analyzeIspDrift,
  extractWorkdayJobId,
  SchoolRecord,
  CachedJobDoc,
  LiveWorkdayJob,
  SubcollectionJobDoc,
} from "./ispDriftChecker";

console.log("▶ Running ISP Drift Checker Unit Tests...");

// 1. Test JR number extraction
assert.strictEqual(extractWorkdayJobId("https://internationalschools.wd3.myworkdayjobs.com/.../Art-Teacher_JR214452"), "JR214452");
assert.strictEqual(extractWorkdayJobId("/job/Some-School/Role_JR211468-1"), "JR211468-1");
assert.strictEqual(extractWorkdayJobId({ bulletFields: ["Full Time", "JR214158"] }), "JR214158");
assert.strictEqual(extractWorkdayJobId({ externalPath: "/job/Slug/Title_JR999999" }), "JR999999");
console.log("  ✔ extractWorkdayJobId passed.");

// 2. Fixed Mock Data setup
const mockSchools: SchoolRecord[] = [
  {
    id: "FLIS0204",
    name: "Tenby International School Setia Eco Park",
    city: "Shah Alam",
    country: "Malaysia",
    group: "ISP",
    aliases: ["Tenby Setia Eco Park", "ISP", "TIS"], // Has 2 bad aliases: "ISP" (generic) and "TIS" (<4 chars)
  },
  {
    id: "FLIS0355",
    name: "The Aquila School",
    city: "Dubai",
    country: "United Arab Emirates",
    group: "ISP",
    aliases: ["Aquila School Dubai"],
  },
];

const mockLiveJobs: LiveWorkdayJob[] = [
  // 1. Correct live job (matches FLIS0204, present & approved in cache)
  {
    title: "Mathematics Teacher",
    externalPath: "/job/Tenby-Setia-Eco-Park-International-Malaysia-Shah-Alam/Mathematics-Teacher_JR214452",
    bulletFields: ["JR214452"],
  },
  // 2. Correct live job (matches FLIS0355, present & approved in cache)
  {
    title: "Primary Teacher",
    externalPath: "/job/The-Aquila-School-United-Arab-Emirates-Dubai/Primary-Teacher_JR214158",
    bulletFields: ["JR214158"],
  },
  // 3. Missing live job (matches FLIS0355, but NOT present in cache)
  {
    title: "Science Teacher",
    externalPath: "/job/The-Aquila-School-United-Arab-Emirates-Dubai/Science-Teacher_JR214999",
    bulletFields: ["JR214999"],
  },
  // 4. Unapproved live job (matches FLIS0204, present in cache but status is 'pending')
  {
    title: "Music Teacher",
    externalPath: "/job/Tenby-Setia-Eco-Park-International-Malaysia-Shah-Alam/Music-Teacher_JR214888",
    bulletFields: ["JR214888"],
  },
  // 5. Unmatched school slug (does not match any FLIS school)
  {
    title: "Spanish Teacher",
    externalPath: "/job/Colegio-San-Patricio-Spain-Madrid/Spanish-Teacher_JR214777",
    bulletFields: ["JR214777"],
  },
  // 6. Live job for misattributed test case (present in live Workday, but attached to wrong school in cache)
  {
    title: "Aquila Drama Teacher",
    externalPath: "/job/The-Aquila-School-United-Arab-Emirates-Dubai/Drama-Teacher_JR214333",
    bulletFields: ["JR214333"],
  },
];

const mockCachedFeaturedJobs: CachedJobDoc[] = [
  // Correctly attributed approved jobs
  {
    docId: "doc_correct_1",
    schoolId: "FLIS0204",
    title: "Mathematics Teacher",
    applyUrl: "https://internationalschools.wd3.myworkdayjobs.com/ISPCareers/job/Tenby-Setia-Eco-Park-International-Malaysia-Shah-Alam/Mathematics-Teacher_JR214452",
    status: "approved",
  },
  {
    docId: "doc_correct_2",
    schoolId: "FLIS0355",
    title: "Primary Teacher",
    applyUrl: "https://internationalschools.wd3.myworkdayjobs.com/ISPCareers/job/The-Aquila-School-United-Arab-Emirates-Dubai/Primary-Teacher_JR214158",
    status: "approved",
  },
  // Misattributed job: Slug is for Aquila (FLIS0355), but doc is attached to FLIS0204
  {
    docId: "doc_misattributed_1",
    schoolId: "FLIS0204",
    title: "Aquila Drama Teacher",
    applyUrl: "https://internationalschools.wd3.myworkdayjobs.com/ISPCareers/job/The-Aquila-School-United-Arab-Emirates-Dubai/Drama-Teacher_JR214333",
    status: "approved",
  },
  // Stale job: Approved in cache, but JR210111 is no longer in live Workday API list
  {
    docId: "doc_stale_1",
    schoolId: "FLIS0204",
    title: "Old Chemistry Teacher",
    applyUrl: "https://internationalschools.wd3.myworkdayjobs.com/ISPCareers/job/Tenby-Setia-Eco-Park-International-Malaysia-Shah-Alam/Old-Chemistry_JR210111",
    status: "approved",
  },
  // Unapproved job in cache (matches JR214888)
  {
    docId: "doc_unapproved_1",
    schoolId: "FLIS0204",
    title: "Music Teacher",
    applyUrl: "https://internationalschools.wd3.myworkdayjobs.com/ISPCareers/job/Tenby-Setia-Eco-Park-International-Malaysia-Shah-Alam/Music-Teacher_JR214888",
    status: "pending",
  },
];

const mockSubcollectionJobs: SubcollectionJobDoc[] = [
  // Subcollection correct
  {
    schoolId: "FLIS0204",
    docId: "sub_correct_1",
    title: "Mathematics Teacher",
    applyUrl: "https://internationalschools.wd3.myworkdayjobs.com/ISPCareers/job/Tenby-Setia-Eco-Park-International-Malaysia-Shah-Alam/Mathematics-Teacher_JR214452",
    status: "approved",
  },
  // Subcollection misattributed: on FLIS0204, but slug is EcoHill campus / Aquila
  {
    schoolId: "FLIS0204",
    docId: "sub_misattributed_1",
    title: "Aquila English Teacher",
    applyUrl: "https://internationalschools.wd3.myworkdayjobs.com/ISPCareers/job/The-Aquila-School-United-Arab-Emirates-Dubai/English-Teacher_JR214555",
    status: "approved",
  },
];

// Run analysis
const result = analyzeIspDrift({
  schools: mockSchools,
  featuredJobs: mockCachedFeaturedJobs,
  liveWorkdayJobs: mockLiveJobs,
  subcollectionJobs: mockSubcollectionJobs,
});

// Verify Check A: Misattributed
assert.strictEqual(result.counts.misattributed, 1, "Should detect exactly 1 misattributed featured job");
assert.strictEqual(result.misattributed[0].docId, "doc_misattributed_1");
assert.strictEqual(result.misattributed[0].matchedSchoolId, "FLIS0355");
console.log("  ✔ Check A (Misattributed) passed.");

// Verify Check B: Stale
assert.strictEqual(result.counts.stale, 1, "Should detect exactly 1 stale featured job");
assert.strictEqual(result.stale[0].jr, "JR210111");
console.log("  ✔ Check B (Stale) passed.");

// Verify Check C: Missing & Unapproved
assert.strictEqual(result.counts.missing, 1, "Should detect exactly 1 missing live job (JR214999)");
assert.strictEqual(result.missing[0].jr, "JR214999");
assert.strictEqual(result.counts.unapproved, 1, "Should detect exactly 1 unapproved live job (JR214888)");
assert.strictEqual(result.unapproved[0].jr, "JR214888");
console.log("  ✔ Check C (Missing & Unapproved) passed.");

// Verify Check D: Unmatched Schools
assert.strictEqual(result.counts.unmatchedSchools, 1, "Should detect 1 unmatched school slug");
assert.strictEqual(result.unmatchedSchoolGroups[0].slug, "Colegio-San-Patricio-Spain-Madrid");
console.log("  ✔ Check D (Unmatched Schools) passed.");

// Verify Check E: Alias Hygiene
assert.strictEqual(result.counts.badAliases, 2, "Should detect 2 bad aliases ('ISP' generic and 'TIS' <4 chars)");
console.log("  ✔ Check E (Alias Hygiene) passed.");

// Verify Check F: Subcollection Misattributed
assert.strictEqual(result.counts.subcollectionMisattributed, 1, "Should detect 1 subcollection misattributed job");
assert.strictEqual(result.subcollectionMisattributed[0].docId, "sub_misattributed_1");
console.log("  ✔ Check F (Subcollection Misattributed) passed.");

console.log("🎉 All ISP Drift Checker Unit Tests Passed Successfully!");

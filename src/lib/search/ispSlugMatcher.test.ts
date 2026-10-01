/**
 * Unit tests for Workday ISP Slug School Matching.
 */

import { matchIspWorkdaySlug, extractIspWorkdaySchoolName } from './ispSlugMatcher';
import { SchoolEntity } from '../crawler/entityMatcher';

function runTests() {
  console.log('🧪 Running Workday ISP Slug School Matcher Unit Tests...');
  let passed = 0;
  let failed = 0;

  function assertEqual(actual: any, expected: any, testName: string) {
    const actStr = actual ? actual.id : null;
    const expStr = expected;
    if (actStr === expStr) {
      console.log(`  ✅ PASS: ${testName} -> ${actStr || "no school"}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      console.error(`     Expected: ${expStr}`);
      console.error(`     Actual:   ${actStr}`);
      failed++;
    }
  }

  // Reference DB school fixtures
  const dbSchools: SchoolEntity[] = [
    {
      id: "FLIS0204",
      name: "Tenby International School Setia Eco Park",
      schoolname: "Tenby International School Setia Eco Park",
      city: "Shah Alam",
      country: "Malaysia",
      aliases: ["Tenby Setia Eco Park", "Tenby Schools Setia Eco Park"]
    },
    {
      id: "FLIS0281",
      name: "Park House English School",
      schoolname: "Park House English School",
      city: "Doha",
      country: "Qatar",
      aliases: ["Doha Park House English School"]
    },
    {
      id: "FLIS0355",
      name: "The Aquila School",
      schoolname: "The Aquila School",
      city: "Dubai",
      country: "United Arab Emirates",
      aliases: ["Aquila Dubai", "Aquila Dubailand"]
    }
  ];

  // Test Case 1: Tenby-Setia-Eco-Park-International-Malaysia-Shah-Alam -> FLIS0204
  assertEqual(
    matchIspWorkdaySlug("Tenby-Setia-Eco-Park-International-Malaysia-Shah-Alam", dbSchools),
    "FLIS0204",
    "Tenby-Setia-Eco-Park-International-Malaysia-Shah-Alam -> FLIS0204 (Tenby International School Setia Eco Park)"
  );

  // Test Case 2: Tenby-Setia-Eco-Park-National-Malaysia-Shah-Alam -> no school
  assertEqual(
    matchIspWorkdaySlug("Tenby-Setia-Eco-Park-National-Malaysia-Shah-Alam", dbSchools),
    null,
    "Tenby-Setia-Eco-Park-National-Malaysia-Shah-Alam -> no school"
  );

  // Test Case 3: Tenby-Setia-Eco-Gardens-Intl-School-Malaysia-Pekan-Nanas -> no school
  assertEqual(
    matchIspWorkdaySlug("Tenby-Setia-Eco-Gardens-Intl-School-Malaysia-Pekan-Nanas", dbSchools),
    null,
    "Tenby-Setia-Eco-Gardens-Intl-School-Malaysia-Pekan-Nanas -> no school"
  );

  // Test Case 4: Tenby-Penang-National-Malaysia-Penang -> no school
  assertEqual(
    matchIspWorkdaySlug("Tenby-Penang-National-Malaysia-Penang", dbSchools),
    null,
    "Tenby-Penang-National-Malaysia-Penang -> no school"
  );

  // Test Case 5: Tenby-Ipoh-International-Malaysia-Ipoh -> no school
  assertEqual(
    matchIspWorkdaySlug("Tenby-Ipoh-International-Malaysia-Ipoh", dbSchools),
    null,
    "Tenby-Ipoh-International-Malaysia-Ipoh -> no school"
  );

  // Test Case 6: Tenby-International-School-Setia-EcoHill-Malaysia-Semenyih -> no school
  assertEqual(
    matchIspWorkdaySlug("Tenby-International-School-Setia-EcoHill-Malaysia-Semenyih", dbSchools),
    null,
    "Tenby-International-School-Setia-EcoHill-Malaysia-Semenyih -> no school"
  );

  // Test Case 7: Real slug for The Aquila School from featured_jobs_cache -> FLIS0355
  const aquilaRealUrl = "https://internationalschools.wd3.myworkdayjobs.com/en-US/ISPCareers/job/The-Aquila-School-United-Arab-Emirates-Dubai/Islamic-teacher_JR214495";
  assertEqual(
    matchIspWorkdaySlug(aquilaRealUrl, dbSchools),
    "FLIS0355",
    "a slug for The Aquila School (The-Aquila-School-United-Arab-Emirates-Dubai) -> FLIS0355"
  );

  // Test Case 8: Real slug for Park House English School from featured_jobs_cache -> FLIS0281
  const parkHouseRealUrl = "https://internationalschools.wd3.myworkdayjobs.com/en-US/ISPCareers/job/Park-House-English-School-Qatar-Doha/Assistant-Head-Teacher_JR211833";
  assertEqual(
    matchIspWorkdaySlug(parkHouseRealUrl, dbSchools),
    "FLIS0281",
    "a slug for Park House English School (Park-House-English-School-Qatar-Doha) -> FLIS0281"
  );

  // Test Case 9: Lynn-Rose-Heights (Canada) -> no school
  assertEqual(
    matchIspWorkdaySlug("Lynn-Rose-Heights", dbSchools),
    null,
    "Lynn-Rose-Heights (Canada) -> no school"
  );

  // Additional check: helper extracts readable school name from slug
  const extractedName = extractIspWorkdaySchoolName("Tenby-Setia-Eco-Park-National-Malaysia-Shah-Alam");
  if (extractedName === "Tenby Setia Eco Park National Malaysia Shah Alam") {
    console.log("  ✅ PASS: extractIspWorkdaySchoolName correctly cleans slug");
    passed++;
  } else {
    console.error(`  ❌ FAIL: extractIspWorkdaySchoolName got "${extractedName}"`);
    failed++;
  }

  console.log(`\n📊 ISP Slug Matcher Test Summary: ${passed} passed, ${failed} failed.\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();

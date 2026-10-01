/**
 * Unit tests for job card pill resolution and deduplication logic.
 */

import { resolvePillDeduplication, JobPill } from './pillResolver';

function runTests() {
  console.log('🧪 Running Job Card Pill Resolution Unit Tests...');
  let passed = 0;
  let failed = 0;

  function assertEqual(actual: any, expected: any, testName: string) {
    const actStr = JSON.stringify(actual);
    const expStr = JSON.stringify(expected);
    if (actStr === expStr) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      console.error(`     Expected: ${expStr}`);
      console.error(`     Actual:   ${actStr}`);
      failed++;
    }
  }

  // 1. ISP pill + Direct pill, same url -> only ISP
  const test1Input: JobPill[] = [
    { key: "DIRECT", label: "Direct", url: "https://internationalschools.wd3.myworkdayjobs.com/ispcareers/job/123" },
    { key: "ISP", label: "ISP", url: "https://internationalschools.wd3.myworkdayjobs.com/ispcareers/job/123" }
  ];
  const test1Expected: JobPill[] = [
    { key: "ISP", label: "ISP", url: "https://internationalschools.wd3.myworkdayjobs.com/ispcareers/job/123" }
  ];
  assertEqual(resolvePillDeduplication(test1Input), test1Expected, "ISP pill + Direct pill, same url -> only ISP");

  // 2. ISP pill + Direct pill, different url -> both
  const test2Input: JobPill[] = [
    { key: "DIRECT", label: "Direct", url: "https://school-official-website.edu/jobs/math" },
    { key: "ISP", label: "ISP", url: "https://internationalschools.wd3.myworkdayjobs.com/ispcareers/job/123" }
  ];
  const test2Expected: JobPill[] = [
    { key: "DIRECT", label: "Direct", url: "https://school-official-website.edu/jobs/math" },
    { key: "ISP", label: "ISP", url: "https://internationalschools.wd3.myworkdayjobs.com/ispcareers/job/123" }
  ];
  assertEqual(resolvePillDeduplication(test2Input), test2Expected, "ISP pill + Direct pill, different url -> both");

  // 3. Direct only -> Direct
  const test3Input: JobPill[] = [
    { key: "DIRECT", label: "Direct", url: "https://school-official-website.edu/jobs/math" }
  ];
  const test3Expected: JobPill[] = [
    { key: "DIRECT", label: "Direct", url: "https://school-official-website.edu/jobs/math" }
  ];
  assertEqual(resolvePillDeduplication(test3Input), test3Expected, "Direct only -> Direct");

  // 4. Cognita pill + Direct pill, same url -> only Cognita
  const test4Input: JobPill[] = [
    { key: "DIRECT", label: "Direct", url: "https://cognitapeople.csod.com/ux/ats/careersite/1/requisition/456" },
    { key: "COGNITA", label: "Cognita", url: "https://cognitapeople.csod.com/ux/ats/careersite/1/requisition/456" }
  ];
  const test4Expected: JobPill[] = [
    { key: "COGNITA", label: "Cognita", url: "https://cognitapeople.csod.com/ux/ats/careersite/1/requisition/456" }
  ];
  assertEqual(resolvePillDeduplication(test4Input), test4Expected, "Cognita pill + Direct pill, same url -> only Cognita");

  console.log(`\n📊 Pill Resolver Test Summary: ${passed} passed, ${failed} failed.\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();

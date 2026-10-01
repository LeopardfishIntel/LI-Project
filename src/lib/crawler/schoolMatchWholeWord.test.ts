import { isSchoolMatch } from './schoolMatchWholeWord';

function runTests() {
  console.log('🧪 Running Whole-Word School Matcher Unit Tests...');
  let passed = 0;
  let failed = 0;

  function assertEqual(actual: boolean, expected: boolean, testName: string) {
    if (actual === expected) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} (Expected ${expected}, got ${actual})`);
      failed++;
    }
  }

  // Case 1: "Tenby International School Setia Eco Park" MATCHES text "Tenby International School Setia Eco Park is hiring"
  assertEqual(
    isSchoolMatch("Tenby International School Setia Eco Park", "Tenby International School Setia Eco Park is hiring"),
    true,
    'Tenby International School Setia Eco Park MATCHES text "Tenby International School Setia Eco Park is hiring"'
  );

  // Case 2: "Tenby International School Setia Eco Park" MATCHES url "https://x.com/tenby-international-school-setia-eco-park/jobs"
  assertEqual(
    isSchoolMatch("Tenby International School Setia Eco Park", "https://x.com/tenby-international-school-setia-eco-park/jobs"),
    true,
    'Tenby International School Setia Eco Park MATCHES url "https://x.com/tenby-international-school-setia-eco-park/jobs"'
  );

  // Case 3: "Tenby International School Setia Eco Park" does NOT match "Tenby Ipoh International"
  assertEqual(
    isSchoolMatch("Tenby International School Setia Eco Park", "Tenby Ipoh International"),
    false,
    'Tenby International School Setia Eco Park does NOT match "Tenby Ipoh International"'
  );

  // Case 4: "Park House English School" MATCHES text "Park House English School Doha"
  assertEqual(
    isSchoolMatch("Park House English School", "Park House English School Doha"),
    true,
    'Park House English School MATCHES text "Park House English School Doha"'
  );

  // Case 5: "International School of Stavanger" does NOT match "Mississauga"
  assertEqual(
    isSchoolMatch("International School of Stavanger", "Mississauga"),
    false,
    'International School of Stavanger does NOT match "Mississauga"'
  );

  console.log(`\n📊 Whole-Word School Matcher Test Summary: ${passed} passed, ${failed} failed.\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();

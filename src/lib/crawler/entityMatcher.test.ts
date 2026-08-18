import { 
  matchSchoolEntity, 
  calculateJaroWinkler, 
  extractAcronym, 
  validatePhaseMatching, 
  SchoolEntity 
} from './entityMatcher';

function runTests() {
  console.log('🧪 Running School Entity Matcher & Disambiguation Unit Tests...');
  let passed = 0;
  let failed = 0;

  function assertEqual(actual: any, expected: any, testName: string) {
    if (JSON.stringify(actual) === JSON.stringify(expected)) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      console.error(`     Expected: ${JSON.stringify(expected)}`);
      console.error(`     Actual:   ${JSON.stringify(actual)}`);
      failed++;
    }
  }

  const viennaSchool: SchoolEntity = {
    name: 'Vienna International School',
    schoolname: 'Vienna International School',
    city: 'Vienna',
    country: 'Austria',
    aliases: ["VIS", "Vienna Intl School", "VIS Vienna"],
    tesEmployerSlug: 'vienna-international-school-1065',
    tesOrganizationId: 'tes_org_9988'
  };

  // 1. Exact match
  const r1 = matchSchoolEntity(viennaSchool, {
    candidateText: 'Vienna International School'
  });
  assertEqual(r1.isMatch, true, 'Exact canonical name matches');
  assertEqual(r1.matchType, 'exact', 'Match type is exact');

  // 2. Alias match: "Vienna Intl School"
  const r2 = matchSchoolEntity(viennaSchool, {
    candidateText: "Teacher of Mathematics at Vienna Intl School"
  });
  assertEqual(r2.isMatch, true, 'Alias "Vienna Intl School" matches');
  assertEqual(r2.matchType, 'alias', 'Match type is alias');

  // 3. Acronym with Geographic Context: "VIS Vienna"
  const r3 = matchSchoolEntity(viennaSchool, {
    candidateText: 'Secondary Science Teacher at VIS Vienna'
  });
  assertEqual(r3.isMatch, true, 'Acronym "VIS" with city context matches');

  // 4. Platform ID / Slug Match
  const r4 = matchSchoolEntity(viennaSchool, {
    candidateText: 'Secondary Math Teacher',
    sourceUrl: 'https://www.tes.com/jobs/employer/vienna-international-school-1065'
  });
  assertEqual(r4.isMatch, true, 'TES Employer Slug matches');
  assertEqual(r4.matchType, 'platform_id', 'Match type is platform_id');

  // 5. Fuzzy Match with minor typographical or article variation
  const r5 = matchSchoolEntity(viennaSchool, {
    candidateText: 'The Vienna International School Austria'
  });
  assertEqual(r5.isMatch, true, 'Fuzzy match handles "The ... Austria" padding');
  assertEqual(r5.score >= 0.85, true, 'Fuzzy score exceeds 0.85 threshold');

  // 6. City-Leak Prevention (Near-Match Rejection)
  // Target: "Vienna International School"
  // Candidate: "American International School of Vienna" (Different school in the same city!)
  const r6 = matchSchoolEntity(viennaSchool, {
    candidateText: 'American International School of Vienna'
  });
  assertEqual(r6.isMatch, false, 'Anti-Leak: Rejects American International School in same city');
  assertEqual(r6.matchType, 'none', 'Anti-Leak: Match type is none');

  // 7. City-Leak Prevention: Danube International School Vienna
  const r7 = matchSchoolEntity(viennaSchool, {
    candidateText: 'Danube International School Vienna'
  });
  assertEqual(r7.isMatch, false, 'Anti-Leak: Rejects Danube International School in same city');

  // 8. Phase Matching Validation: Secondary-only school rejects primary vacancy
  const secondaryOnlySchool = { isSecondaryOnly: true };
  const phase1 = validatePhaseMatching(secondaryOnlySchool, 'Early Years & Primary Homeroom Teacher');
  assertEqual(phase1.isPhaseValid, false, 'Phase validation rejects primary role for secondary-only school');

  const phase2 = validatePhaseMatching(secondaryOnlySchool, 'IB DP High School Physics Teacher');
  assertEqual(phase2.isPhaseValid, true, 'Phase validation accepts secondary role for secondary-only school');

  console.log(`\n📊 Entity Matcher Test Summary: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();

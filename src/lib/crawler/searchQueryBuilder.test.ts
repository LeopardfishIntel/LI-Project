import { 
  formatSiteOperator, 
  formatGroundingSiteQuery, 
  buildTier1Queries, 
  buildTier2Queries, 
  buildTier3SubjectQueries 
} from './searchQueryBuilder';

function runTests() {
  console.log('🧪 Running Search Query Builder Unit Tests...');
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

  // Test 1: formatSiteOperator with deep path
  assertEqual(
    formatSiteOperator('tes.com/jobs/vacancy'),
    { rawDomain: 'tes.com/jobs/vacancy', rootDomain: 'tes.com', pathKeyword: 'jobs/vacancy' },
    'formatSiteOperator splits domain and subpath'
  );

  // Test 2: formatSiteOperator with https and root domain only
  assertEqual(
    formatSiteOperator('https://www.schrole.com/'),
    { rawDomain: 'https://www.schrole.com/', rootDomain: 'schrole.com', pathKeyword: null },
    'formatSiteOperator handles https, www, and trailing slash'
  );

  // Test 3: formatGroundingSiteQuery - Vienna International School with deep path
  assertEqual(
    formatGroundingSiteQuery('Vienna International School', 'tes.com/jobs/vacancy'),
    '"Vienna International School" site:tes.com "jobs/vacancy"',
    'Rule 1: "Vienna International School" site:tes.com/jobs/vacancy -> "Vienna International School" site:tes.com "jobs/vacancy"'
  );

  // Test 4: formatGroundingSiteQuery - Vienna International School with employer path
  assertEqual(
    formatGroundingSiteQuery('Vienna International School', 'tes.com/jobs/employer'),
    '"Vienna International School" site:tes.com "jobs/employer"',
    'Rule 2: "Vienna International School" site:tes.com/jobs/employer -> "Vienna International School" site:tes.com "jobs/employer"'
  );

  // Test 5: Tier 1 School Web queries
  const tier1 = buildTier1Queries('Vienna International School', 'vis.ac.at');
  assertEqual(
    tier1,
    [
      '"Vienna International School" vacancies',
      '"Vienna International School" career',
      '"Vienna International School" jobs',
      'site:vis.ac.at vacancies',
      'site:vis.ac.at jobs',
    ],
    'Tier 1 queries match expected format'
  );

  // Test 6: Tier 2 Dedicated Portals queries
  const tier2 = buildTier2Queries('Vienna International School');
  assertEqual(
    tier2.includes('"Vienna International School" site:tes.com "jobs/vacancy"'),
    true,
    'Tier 2 includes site:tes.com "jobs/vacancy"'
  );
  assertEqual(
    tier2.includes('"Vienna International School" site:tes.com "jobs/employer"'),
    true,
    'Tier 2 includes site:tes.com "jobs/employer"'
  );
  assertEqual(
    tier2.includes('"Vienna International School" site:schrole.com'),
    true,
    'Tier 2 includes site:schrole.com without path'
  );

  // Test 7: Tier 3 Subject-Specific queries
  const tier3 = buildTier3SubjectQueries('Vienna International School', ['Mathematics', 'Science']);
  assertEqual(
    tier3,
    [
      '"Vienna International School" "Mathematics"',
      '"Vienna International School" "Science"',
    ],
    'Tier 3 subject queries match expected format'
  );

  console.log(`\n📊 Test Summary: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();

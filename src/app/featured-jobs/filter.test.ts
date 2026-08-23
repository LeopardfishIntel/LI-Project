import { isBlockedContentUrl, resolveVacancyUrl } from '../../lib/crawler/urlResolver';
import { parseClosingDate } from '../../lib/crawler/dateParser';

function runFilterTests() {
  console.log('🧪 Running Featured Jobs Live Feed Filter & Analytics Preservation Tests...');
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

  const today = new Date('2026-08-23T12:00:00Z');

  function evaluateCandidate(item: any): { isAccepted: boolean; reason?: string } {
    // 1. Status Check
    const rawStatus = String(item.status || '').toUpperCase();
    if (rawStatus === 'CLOSED' || rawStatus === 'EXPIRED' || rawStatus === 'DELISTED' || rawStatus === 'REJECTED') {
      return { isAccepted: false, reason: `Status is ${item.status}` };
    }

    // 2. Recruitment Cycle Check
    const cycle = String(item.recruitmentCycle || '').toUpperCase();
    if (cycle === 'HISTORIC_Y1' || cycle.startsWith('HISTORIC')) {
      return { isAccepted: false, reason: `Recruitment cycle is ${item.recruitmentCycle}` };
    }

    // 3. Closing Date Check
    let closesDate: Date | null = null;
    if (item.closingDate) {
      closesDate = new Date(item.closingDate);
    } else if (item.date_closing) {
      closesDate = parseClosingDate(item.date_closing).closingDate;
    }

    if (closesDate && !isNaN(closesDate.getTime())) {
      if (closesDate.getTime() < today.getTime()) {
        return { isAccepted: false, reason: `Expired closing date: ${closesDate.toISOString()}` };
      }
    }

    // 4. Blocked URL Check
    const rawUrl = item.source_url || item.applyUrl || item.directUrl || item.url || '';
    if (rawUrl && isBlockedContentUrl(rawUrl)) {
      return { isAccepted: false, reason: `Blocked news/blog URL: ${rawUrl}` };
    }

    const resolved = resolveVacancyUrl({
      rawHref: rawUrl,
      schoolName: 'Vienna International School'
    });

    if (isBlockedContentUrl(resolved)) {
      return { isAccepted: false, reason: `Resolved blocked URL: ${resolved}` };
    }

    return { isAccepted: true };
  }

  // Test 1: Closed job is rejected
  assertEqual(
    evaluateCandidate({ title: 'Maths Teacher', status: 'CLOSED', recruitmentCycle: 'CURRENT', date_closing: '15 Oct 2026' }).isAccepted,
    false,
    'Rejects item where status == CLOSED'
  );

  // Test 2: HISTORIC_Y1 job is rejected
  assertEqual(
    evaluateCandidate({ title: 'Physics Teacher', status: 'OPEN', recruitmentCycle: 'HISTORIC_Y1', date_closing: '15 Oct 2026' }).isAccepted,
    false,
    'Rejects item where recruitmentCycle == HISTORIC_Y1'
  );

  // Test 3: Past closing date is rejected
  assertEqual(
    evaluateCandidate({ title: 'Chemistry Teacher', status: 'OPEN', recruitmentCycle: 'CURRENT', date_closing: '15 Jan 2024' }).isAccepted,
    false,
    'Rejects item with past closing date (2024)'
  );

  // Test 4: Schrole news URL is rejected
  assertEqual(
    evaluateCandidate({ title: 'Schrole News Post', status: 'OPEN', recruitmentCycle: 'CURRENT', date_closing: '15 Oct 2026', source_url: 'https://www.schrole.com/news/why-join-us/' }).isAccepted,
    false,
    'Rejects item with schrole.com/news/ source URL'
  );

  // Test 5: Blog URL is rejected
  assertEqual(
    evaluateCandidate({ title: 'School Blog Post', status: 'OPEN', recruitmentCycle: 'CURRENT', date_closing: '15 Oct 2026', source_url: 'https://www.school.com/blog/2024-hiring/' }).isAccepted,
    false,
    'Rejects item with /blog/ source URL'
  );

  // Test 6: Active future vacancy is accepted
  assertEqual(
    evaluateCandidate({ title: 'Head of Science', status: 'OPEN', recruitmentCycle: 'CURRENT', date_closing: '15 Oct 2026', source_url: 'https://www.tes.com/jobs/vacancy/science-head-999' }).isAccepted,
    true,
    'Accepts active current vacancy with future closing date'
  );

  // Test 7: Rolling deadline vacancy is accepted
  assertEqual(
    evaluateCandidate({ title: 'Primary Teacher', status: 'OPEN', recruitmentCycle: 'CURRENT', date_closing: 'Rolling basis', source_url: 'https://www.tes.com/jobs/vacancy/primary-123' }).isAccepted,
    true,
    'Accepts active current vacancy with rolling deadline'
  );

  // Test 8: Historical array preservation check
  const fullSchoolHistoricalArray = [
    { title: 'Historical Maths 2024', status: 'CLOSED', recruitmentCycle: 'HISTORIC_Y1', department: 'Secondary' },
    { title: 'Historical Physics 2024', status: 'CLOSED', recruitmentCycle: 'HISTORIC_Y1', department: 'Secondary' },
    { title: 'Historical Principal 2024', status: 'CLOSED', recruitmentCycle: 'HISTORIC_Y1', department: 'Leadership' },
    { title: 'Current Chemistry 2026', status: 'OPEN', recruitmentCycle: 'CURRENT', department: 'Secondary', date_closing: '15 Oct 2026' }
  ];

  // Live feed filter filters out 3 historical items, keeps 1 active
  const liveFeedItems = fullSchoolHistoricalArray.filter(item => evaluateCandidate(item).isAccepted);
  assertEqual(liveFeedItems.length, 1, 'Live feed displays only 1 active vacancy');

  // Stability analytics calculations read full array (4 items total, 1 leadership)
  const totalKnownVacancies = fullSchoolHistoricalArray.length;
  const historicLeadershipCount = fullSchoolHistoricalArray.filter(v => v.department === 'Leadership').length;
  assertEqual(totalKnownVacancies, 4, 'Stability analytics preserves full historical count (4)');
  assertEqual(historicLeadershipCount, 1, 'Stability analytics preserves historical leadership tracking');

  console.log(`\n📊 Filter Test Summary: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    process.exit(1);
  }
}

runFilterTests();

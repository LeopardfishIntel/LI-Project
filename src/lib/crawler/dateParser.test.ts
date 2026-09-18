import { 
  parseClosingDate, 
  triageVacancyLifecycle, 
  isRollingDeadlineString,
  parseRelativeDate
} from './dateParser';

function runTests() {
  console.log('🧪 Running Date Parser & Lifecycle Triage Unit Tests...');
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

  // 1. Textual Date: "15 Oct 2026"
  const r1 = parseClosingDate('15 Oct 2026');
  assertEqual(r1.isRollingDeadline, false, '15 Oct 2026 is not rolling');
  assertEqual(r1.closingDate?.getFullYear(), 2026, '15 Oct 2026 year is 2026');
  assertEqual(r1.closingDate?.getMonth(), 9, '15 Oct 2026 month is Oct (9)');
  assertEqual(r1.closingDate?.getDate(), 15, '15 Oct 2026 day is 15');
  assertEqual(r1.closingDate?.getHours(), 23, '15 Oct 2026 hour is 23 (End of Day)');

  // 2. Textual Date with ordinal and prefix: "Closing Date: Friday 12th December 2025 at 12:00 noon GMT"
  const r2 = parseClosingDate('Closing Date: Friday 12th December 2025 at 12:00 noon GMT');
  assertEqual(r2.isRollingDeadline, false, 'Complex phrase is parsed');
  assertEqual(r2.closingDate?.getDate(), 12, '12th Dec day is 12');
  assertEqual(r2.closingDate?.getMonth(), 11, '12th Dec month is 11 (Dec)');
  assertEqual(r2.closingDate?.getFullYear(), 2025, '12th Dec year is 2025');

  // 3. Date Range: "10 - 24 October 2026" -> picks upper bound 24
  const r3 = parseClosingDate('10 - 24 October 2026');
  assertEqual(r3.isRollingDeadline, false, 'Date range is not rolling');
  assertEqual(r3.closingDate?.getDate(), 24, 'Date range selects closing upper bound 24');
  assertEqual(r3.closingDate?.getMonth(), 9, 'Date range month is Oct (9)');

  // 4. Date Range: "October 10 to 28, 2026"
  const r4 = parseClosingDate('October 10 to 28, 2026');
  assertEqual(r4.closingDate?.getDate(), 28, 'Date range selects closing upper bound 28');
  assertEqual(r4.closingDate?.getMonth(), 9, 'Date range month is Oct');

  // 5. Smart US vs European Disambiguation:
  // European unambiguous: 25/08/2026
  const rEU = parseClosingDate('25/08/2026');
  assertEqual(rEU.closingDate?.getDate(), 25, '25/08/2026 day is 25');
  assertEqual(rEU.closingDate?.getMonth(), 7, '25/08/2026 month is Aug (7)');

  // US unambiguous: 08/25/2026
  const rUS = parseClosingDate('08/25/2026');
  assertEqual(rUS.closingDate?.getDate(), 25, '08/25/2026 day is 25');
  assertEqual(rUS.closingDate?.getMonth(), 7, '08/25/2026 month is Aug (7)');

  // Ambiguous: 10/05/2026 -> Defaults to EU (10th May)
  const rAmb = parseClosingDate('10/05/2026');
  assertEqual(rAmb.closingDate?.getDate(), 10, '10/05/2026 defaults to EU day 10');
  assertEqual(rAmb.closingDate?.getMonth(), 4, '10/05/2026 defaults to EU month May (4)');

  // 6. 2-Digit Short Year: "15/10/26" or "15-Oct-26"
  const rShort1 = parseClosingDate('15/10/26');
  assertEqual(rShort1.closingDate?.getFullYear(), 2026, '15/10/26 resolves to 2026');

  const rShort2 = parseClosingDate('15-Oct-26');
  assertEqual(rShort2.closingDate?.getFullYear(), 2026, '15-Oct-26 resolves to 2026');

  // 7. ISO Date: "2026-10-15"
  const rISO = parseClosingDate('2026-10-15');
  assertEqual(rISO.isRollingDeadline, false, '2026-10-15 is parsed');
  assertEqual(rISO.closingDate?.getFullYear(), 2026, '2026-10-15 year is 2026');

  // 8. Rolling Deadline Phrases
  const rollingPhrases = [
    'Rolling basis',
    'Until filled',
    'Open until filled',
    'ASAP',
    'Ongoing',
    'Immediate start',
    'TBD',
  ];

  for (const phrase of rollingPhrases) {
    const res = parseClosingDate(phrase);
    assertEqual(res.isRollingDeadline, true, `Phrase "${phrase}" is recognized as rolling`);
    assertEqual(res.closingDate, null, `Phrase "${phrase}" has closingDate null`);
  }

  // 9. Lifecycle Triage: Future Date -> approved
  const refDate = new Date('2026-08-18T12:00:00Z');
  const triageFuture = triageVacancyLifecycle('15 Oct 2026', null, refDate);
  assertEqual(triageFuture.status, 'approved', 'Future date resolves to approved');
  assertEqual(triageFuture.isRollingDeadline, false, 'Future date is not rolling');

  // 10. Lifecycle Triage: Past Date -> expired
  const triagePast = triageVacancyLifecycle('15 Jan 2025', null, refDate);
  assertEqual(triagePast.status, 'expired', 'Past date resolves to expired');

  // 11. Lifecycle Triage: 45-day rolling staleness rule
  // Case A: Recent rolling job (10 days old) -> approved
  const tenDaysAgo = new Date(refDate.getTime() - 10 * 24 * 60 * 60 * 1000);
  const triageRecentRolling = triageVacancyLifecycle('Rolling basis', tenDaysAgo, refDate);
  assertEqual(triageRecentRolling.status, 'approved', 'Recent rolling vacancy is approved');
  assertEqual(triageRecentRolling.isStaleRolling, false, 'Recent rolling is not stale');

  // Case B: Stale rolling job (50 days old) -> expired
  const fiftyDaysAgo = new Date(refDate.getTime() - 50 * 24 * 60 * 60 * 1000);
  const triageStaleRolling = triageVacancyLifecycle('Rolling basis', fiftyDaysAgo, refDate);
  assertEqual(triageStaleRolling.status, 'expired', 'Old rolling vacancy (>45d) is expired');
  assertEqual(triageStaleRolling.isStaleRolling, true, 'Old rolling is marked stale');

  // 12. Relative Date Parser
  const relResult = parseRelativeDate('Posted 3 days ago');
  assertEqual(typeof relResult, 'string', 'parseRelativeDate returns an ISO string');

  console.log(`\n📊 Date Parser Test Summary: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();

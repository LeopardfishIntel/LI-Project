import { 
  parseClosingDate, 
  triageVacancyLifecycle, 
  isRollingDeadlineString,
  isPastAcademicIntake,
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
  const rEU = parseClosingDate('25/08/2026');
  assertEqual(rEU.closingDate?.getDate(), 25, '25/08/2026 day is 25');
  assertEqual(rEU.closingDate?.getMonth(), 7, '25/08/2026 month is Aug (7)');

  const rUS = parseClosingDate('08/25/2026');
  assertEqual(rUS.closingDate?.getDate(), 25, '08/25/2026 day is 25');
  assertEqual(rUS.closingDate?.getMonth(), 7, '08/25/2026 month is Aug (7)');

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

  // 8. Rolling / Unlimited Deadline Phrases
  const rollingPhrases = [
    'Rolling basis',
    'Until filled',
    'Open until filled',
    'Unlimited',
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

  // 9. Past Academic Intake & Year Mentions
  const refDate = new Date('2026-08-18T12:00:00Z');
  const pastCheck1 = isPastAcademicIntake('Islamic B Teacher - August 2025', refDate);
  assertEqual(pastCheck1.isPast, true, 'August 2025 is detected as past intake');

  const futureCheck = isPastAcademicIntake('Teacher of Mathematics - August 2026', refDate);
  assertEqual(futureCheck.isPast, false, 'August 2026 is detected as active intake');

  const futureCheck2 = isPastAcademicIntake('Head of Science - August 2027', refDate);
  assertEqual(futureCheck2.isPast, false, 'August 2027 is detected as active intake');

  const relAgeStale = isPastAcademicIntake('Posted 2 years ago', refDate);
  assertEqual(relAgeStale.isPast, true, 'Posted 2 years ago is detected as expired relative age');

  const relAgeFresh = isPastAcademicIntake('Posted 3 days ago', refDate);
  assertEqual(relAgeFresh.isPast, false, 'Posted 3 days ago is detected as fresh');

  // 10. Lifecycle Triage: Past intake title -> expired
  const triageTitlePast = triageVacancyLifecycle('Unlimited', null, refDate, 'Islamic B Teacher - August 2025');
  assertEqual(triageTitlePast.status, 'expired', 'Past intake in title triggers expired triage');

  // 11. Lifecycle Triage: 42-day rolling staleness rule
  // Case A: Recent rolling job (10 days old) -> approved
  const tenDaysAgo = new Date(refDate.getTime() - 10 * 24 * 60 * 60 * 1000);
  const triageRecentRolling = triageVacancyLifecycle('Rolling basis', tenDaysAgo, refDate);
  assertEqual(triageRecentRolling.status, 'approved', 'Recent rolling vacancy (10d) is approved');
  assertEqual(triageRecentRolling.isStaleRolling, false, 'Recent rolling is not stale');

  // Case B: Stale rolling job (45 days old > 42 days) -> expired
  const fortyFiveDaysAgo = new Date(refDate.getTime() - 45 * 24 * 60 * 60 * 1000);
  const triageStaleRolling = triageVacancyLifecycle('Rolling basis', fortyFiveDaysAgo, refDate);
  assertEqual(triageStaleRolling.status, 'expired', 'Rolling vacancy older than 42 days is expired');
  assertEqual(triageStaleRolling.isStaleRolling, true, 'Rolling vacancy is marked stale');

  // 12. Relative Date Parser with Years
  const relResult = parseRelativeDate('Posted 3 days ago');
  assertEqual(typeof relResult, 'string', 'parseRelativeDate returns an ISO string');

  const relYearResult = parseRelativeDate('Posted 2 years ago');
  assertEqual(typeof relYearResult, 'string', 'parseRelativeDate parses years');

  console.log(`\n📊 Date Parser Test Summary: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();

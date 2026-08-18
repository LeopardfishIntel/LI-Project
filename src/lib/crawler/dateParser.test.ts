import { 
  parseClosingDate, 
  triageVacancyLifecycle, 
  isRollingDeadlineString 
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

  // 2. Textual Date with ordinal: "15th October 2026"
  const r2 = parseClosingDate('15th October 2026');
  assertEqual(r2.isRollingDeadline, false, '15th October 2026 is parsed');
  assertEqual(r2.closingDate?.getDate(), 15, '15th October 2026 day is 15');

  // 3. European Slash Date: "15/10/2026"
  const r3 = parseClosingDate('15/10/2026');
  assertEqual(r3.isRollingDeadline, false, '15/10/2026 is parsed');
  assertEqual(r3.closingDate?.getDate(), 15, '15/10/2026 day is 15');
  assertEqual(r3.closingDate?.getMonth(), 9, '15/10/2026 month is Oct (9)');

  // 4. ISO Date: "2026-10-15"
  const r4 = parseClosingDate('2026-10-15');
  assertEqual(r4.isRollingDeadline, false, '2026-10-15 is parsed');
  assertEqual(r4.closingDate?.getFullYear(), 2026, '2026-10-15 year is 2026');

  // 5. Rolling Deadline Phrases
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

  // 6. Missing / Unparseable Date defaults to Rolling & Pending
  const unparseable = parseClosingDate('Gibberish 123 !');
  assertEqual(unparseable.isRollingDeadline, true, 'Unparseable string defaults to rolling');
  assertEqual(unparseable.closingDate, null, 'Unparseable string has null date');

  // 7. Lifecycle Triage: Future Date -> pending_review
  const refDate = new Date('2026-08-18T12:00:00Z');
  const triageFuture = triageVacancyLifecycle('15 Oct 2026', refDate);
  assertEqual(triageFuture.status, 'pending_review', 'Future date resolves to pending_review');
  assertEqual(triageFuture.isRollingDeadline, false, 'Future date is not rolling');

  // 8. Lifecycle Triage: Past Date -> expired
  const triagePast = triageVacancyLifecycle('15 Jan 2025', refDate);
  assertEqual(triagePast.status, 'expired', 'Past date resolves to expired');

  // 9. Lifecycle Triage: Rolling deadline phrase -> forces pending_review (never expired)
  const triageRolling = triageVacancyLifecycle('Rolling basis', refDate);
  assertEqual(triageRolling.status, 'pending_review', 'Rolling basis forces pending_review');
  assertEqual(triageRolling.isRollingDeadline, true, 'Rolling basis sets isRollingDeadline: true');

  // 10. Lifecycle Triage: Empty/Null string -> forces pending_review
  const triageEmpty = triageVacancyLifecycle(null, refDate);
  assertEqual(triageEmpty.status, 'pending_review', 'Null string forces pending_review');

  console.log(`\n📊 Date Parser Test Summary: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();

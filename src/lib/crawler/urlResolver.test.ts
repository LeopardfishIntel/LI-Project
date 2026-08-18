import { 
  sanitizeUrl, 
  hasTemplatePlaceholder, 
  isGenericRootUrl, 
  resolveVacancyUrl, 
  extractUrlFromScrapedString 
} from './urlResolver';

function runTests() {
  console.log('🧪 Running URL Resolver & Sanitizer Unit Tests...');
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

  // 1. Sanitization: Strips tracking params while retaining structural paths & required IDs
  const rawWithTracking = 'https://www.tes.com/jobs/vacancy/maths-teacher-vienna-123456?utm_source=google&utm_medium=cpc&ref=search&source=feed&fbclid=IwAR123#utm_campaign=hiring';
  assertEqual(
    sanitizeUrl(rawWithTracking),
    'https://www.tes.com/jobs/vacancy/maths-teacher-vienna-123456',
    'sanitizeUrl strips utm_*, ref, source, fbclid, and tracking hashes'
  );

  // 2. Preserves valid functional query parameters (e.g. search keywords or pagination)
  const functionalUrl = 'https://www.tes.com/jobs/browse/international?keywords=Vienna%20International%20School&utm_source=jobalert';
  assertEqual(
    sanitizeUrl(functionalUrl),
    'https://www.tes.com/jobs/browse/international?keywords=Vienna+International+School',
    'sanitizeUrl preserves keywords parameter while removing utm_source'
  );

  // 3. Template Placeholder Detection
  assertEqual(
    hasTemplatePlaceholder('https://www.tes.com/jobs/vacancy/[slug]-[id]'),
    true,
    'hasTemplatePlaceholder detects [slug]-[id]'
  );
  assertEqual(
    hasTemplatePlaceholder('https://www.tes.com/jobs/vacancy/<job-id>'),
    true,
    'hasTemplatePlaceholder detects <job-id>'
  );
  assertEqual(
    hasTemplatePlaceholder('https://www.tes.com/jobs/vacancy/maths-teacher-123'),
    false,
    'hasTemplatePlaceholder allows concrete URLs'
  );

  // 4. sanitizeUrl returns null on broken template placeholders
  assertEqual(
    sanitizeUrl('https://www.tes.com/jobs/vacancy/[slug]-[id]'),
    null,
    'sanitizeUrl rejects template placeholder strings'
  );

  // 5. Generic Root URL Detection
  assertEqual(
    isGenericRootUrl('https://www.tes.com/jobs/browse/international'),
    true,
    'isGenericRootUrl identifies bare TES international directory'
  );
  assertEqual(
    isGenericRootUrl('https://www.tes.com/jobs/browse/international?keywords=Vienna'),
    false,
    'isGenericRootUrl allows parameterized school search'
  );

  // 6. Sequential Fallback Hierarchy (Tier 1 advert present)
  const resolvedDirect = resolveVacancyUrl({
    rawHref: 'https://www.tes.com/jobs/vacancy/physics-teacher-9999?utm_source=crawler',
    employerHref: 'https://www.tes.com/jobs/employer/vienna-school-100',
    schoolName: 'Vienna International School'
  });
  assertEqual(
    resolvedDirect,
    'https://www.tes.com/jobs/vacancy/physics-teacher-9999',
    'resolveVacancyUrl prioritizes valid raw Tier 1 advert link'
  );

  // 7. Sequential Fallback Hierarchy (Tier 1 missing / generic root -> falls back to Tier 2 employer hub)
  const resolvedEmployer = resolveVacancyUrl({
    rawHref: 'https://www.tes.com/jobs/browse/international',
    employerHref: 'https://www.tes.com/jobs/employer/vienna-school-100',
    schoolName: 'Vienna International School'
  });
  assertEqual(
    resolvedEmployer,
    'https://www.tes.com/jobs/employer/vienna-school-100',
    'resolveVacancyUrl falls back to Tier 2 employer hub when Tier 1 is generic'
  );

  // 8. Sequential Fallback Hierarchy (Tier 1 & Tier 2 missing -> falls back to school keywords search)
  const resolvedSearch = resolveVacancyUrl({
    rawHref: null,
    employerHref: null,
    schoolName: 'Vienna International School',
    sourceName: 'TES'
  });
  assertEqual(
    resolvedSearch,
    'https://www.tes.com/jobs/browse/international?keywords=Vienna%20International%20School',
    'resolveVacancyUrl falls back to parameterized TES search without guessing slugs'
  );

  // 9. extractUrlFromScrapedString parses double pipe formatted strings
  const parsedString = extractUrlFromScrapedString('Teacher of Maths (Aug 2026; Posted: 15 Apr 2026; Closes: 13 May 2026) - TES || https://www.tes.com/jobs/vacancy/maths-12345?ref=crawler');
  assertEqual(
    parsedString,
    {
      cleanJobString: 'Teacher of Maths (Aug 2026; Posted: 15 Apr 2026; Closes: 13 May 2026) - TES',
      extractedUrl: 'https://www.tes.com/jobs/vacancy/maths-12345'
    },
    'extractUrlFromScrapedString extracts clean text and sanitized destination URL'
  );

  console.log(`\n📊 URL Resolver Test Summary: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();

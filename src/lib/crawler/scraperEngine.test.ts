import { checkIsBlocked, scrapePage, closeScraperEngine } from './scraperEngine';

async function runTests() {
  console.log('🧪 Running Stealth Scraper Engine Unit Tests...');
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

  // 1. checkIsBlocked detects 403 & 429
  assertEqual(checkIsBlocked(403, '<html>Forbidden</html>'), true, 'checkIsBlocked flags HTTP 403');
  assertEqual(checkIsBlocked(429, '<html>Too many requests</html>'), true, 'checkIsBlocked flags HTTP 429');

  // 2. checkIsBlocked detects Cloudflare challenge signatures
  assertEqual(checkIsBlocked(200, '<html><head><title>Just a moment...</title></head></html>'), true, 'checkIsBlocked flags Cloudflare "Just a moment..."');
  assertEqual(checkIsBlocked(200, '<div>Attention Required! | Cloudflare</div>'), true, 'checkIsBlocked flags Cloudflare attention');
  assertEqual(checkIsBlocked(200, '<div>Access Denied | Imperva</div>'), true, 'checkIsBlocked flags Imperva block');

  // 3. checkIsBlocked allows clean 200 HTML
  assertEqual(checkIsBlocked(200, '<html><head><title>Vienna International School Vacancies</title></head><body><h1>Careers</h1></body></html>'), false, 'checkIsBlocked allows valid HTML');

  // 4. Test scrapePage rendering with data: URI SPA content
  const rawHtml = `<!DOCTYPE html><html><head><title>Mock School Portal</title></head><body><div id="root"><h1>Careers at Mock International School</h1><a href="https://www.tes.com/jobs/vacancy/teacher-of-maths-1001?utm_source=feed">Teacher of Maths</a><a href="https://www.tes.com/jobs/employer/mock-school-99">Employer Hub</a></div></body></html>`;
  const mockSpaHtml = `data:text/html;charset=utf-8,${encodeURIComponent(rawHtml)}`;

  console.log('  Testing Playwright stealth rendering...');
  const result = await scrapePage(mockSpaHtml, { timeoutMs: 10000, maxRetries: 0 });

  assertEqual(result.success, true, 'scrapePage returns success: true on valid page');
  assertEqual(result.title, 'Mock School Portal', 'scrapePage extracts page title');
  assertEqual(result.textContent.includes('Careers at Mock International School'), true, 'scrapePage extracts text content');
  assertEqual(result.isBlocked, false, 'scrapePage isBlocked is false');
  assertEqual(result.links.length, 2, 'scrapePage extracts anchor links');
  assertEqual(
    result.links[0].href,
    'https://www.tes.com/jobs/vacancy/teacher-of-maths-1001',
    'scrapePage sanitizes tracking params on extracted links'
  );

  await closeScraperEngine();

  console.log(`\n📊 Scraper Engine Test Summary: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

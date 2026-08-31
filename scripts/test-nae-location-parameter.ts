import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testNaeLocationParameter() {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const citiesToTest = ['Abu Dhabi', 'Dubai', 'Geneva', 'Madrid', 'Budapest', 'Warsaw', 'Prague', 'Doha', 'Chengdu'];

  console.log('🔍 [NORD ANGLIA SAP SUCCESSFACTORS LOCATION SEARCH TEST]\n');

  for (const city of citiesToTest) {
    const searchUrl = `https://careers.nordangliaeducation.com/search/?q=&locationsearch=${encodeURIComponent(city)}`;
    console.log(`📌 Searching: "${city}" => URL: ${searchUrl}`);

    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(1000);

    const jobLinks = await page.$$eval('a[href*="/job/"]', links =>
      links.map(a => ({ title: (a.textContent || '').trim(), href: (a as HTMLAnchorElement).href }))
    );

    // Filter unique URLs
    const unique = new Map<string, string>();
    jobLinks.forEach(j => {
      if (j.title && !j.title.includes('View all Vacancies') && !unique.has(j.href)) {
        unique.set(j.href, j.title);
      }
    });

    console.log(`   ✅ Found ${unique.size} direct vacancy link(s) for "${city}":`);
    Array.from(unique.entries()).slice(0, 5).forEach(([href, title], i) => {
      console.log(`      [${i + 1}] "${title}" => ${href}`);
    });
    console.log('');
  }

  await browser.close();
}

testNaeLocationParameter().catch(console.error);

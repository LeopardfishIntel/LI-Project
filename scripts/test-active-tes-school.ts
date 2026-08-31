import { chromium } from 'playwright';

async function testActiveTesSchool() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const testUrls = [
    'https://www.tes.com/jobs/employer/dulwich-college-beijing-1057433',
    'https://www.tes.com/jobs/employer/the-british-school-in-tokyo-1057325',
    'https://www.tes.com/jobs/employer/the-british-international-school-riyadh-1057688'
  ];

  for (const url of testUrls) {
    console.log(`\nNavigating to ${url}...`);
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const jobLinks = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="/jobs/vacancy/"]'));
      return links.map(a => ({
        title: (a.textContent || '').trim(),
        href: (a as HTMLAnchorElement).href,
      }));
    });

    console.log(`Discovered ${jobLinks.length} job vacancy links on TES:`);
    jobLinks.forEach((j, idx) => console.log(`  ${idx + 1}. "${j.title}" -> ${j.href}`));
  }

  await browser.close();
}

testActiveTesSchool().catch(console.error);

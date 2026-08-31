import { chromium } from 'playwright';

async function inspectTesPage() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const url = 'https://www.tes.com/jobs/employer/st-gilgen-international-school-1057170';
  console.log(`Navigating to ${url}...`);

  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  const title = await page.title();
  console.log(`Page title: ${title}`);

  // Find job links (e.g. href containing /jobs/vacancy/)
  const jobLinks = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a[href*="/jobs/vacancy/"]'));
    return links.map(a => ({
      text: (a.textContent || '').trim(),
      href: (a as HTMLAnchorElement).href,
    }));
  });

  console.log(`Discovered ${jobLinks.length} job links on TES page:`);
  console.dir(jobLinks);

  await browser.close();
}

inspectTesPage().catch(console.error);

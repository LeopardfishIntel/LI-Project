import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { scrapePage } from '../src/lib/crawler/scraperEngine';

async function inspectNordAngliaSuccessFactors() {
  const sampleUrls = [
    'https://careers.nordangliaeducation.com',
    'https://jobs.nordangliaeducation.com/search/',
    'https://www.nordangliaeducation.com/careers/search-and-apply',
  ];

  console.log('🔍 [INSPECT NORD ANGLIA SAP SUCCESSFACTORS PORTAL]\n');

  for (const url of sampleUrls) {
    console.log(`📌 Testing URL: ${url}`);
    const res = await scrapePage(url, { timeoutMs: 15000, blockResources: false });
    console.log(`  • Success: ${res.success}`);
    console.log(`  • Final URL: ${res.finalUrl || 'N/A'}`);
    console.log(`  • Links Found: ${res.links.length}`);
    console.log(`  • HTML Length: ${res.html?.length || 0}\n`);

    if (res.html) {
      const { chromium } = await import('playwright');
      const browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        const finalUrl = page.url();
        console.log(`  🌐 Playwright Final Resolved URL: ${finalUrl}`);
        
        const pageTitle = await page.title();
        console.log(`  Title: "${pageTitle}"`);

        const jobLinks = await page.evaluate(() => {
          const links = Array.from(document.querySelectorAll('a[href*="/job/"], a[href*="/job-invite/"], a[href*="jobId"], table tr a, .jobTitle a'));
          return links.map(a => ({ title: (a.textContent || '').trim(), href: (a as HTMLAnchorElement).href }));
        });

        console.log(`  📌 Discovered Job Links (${jobLinks.length}):`);
        jobLinks.slice(0, 10).forEach((l, i) => {
          console.log(`     [${i + 1}] "${l.title}" => ${l.href}`);
        });

      } catch (err: any) {
        console.log(`  ⚠️ Playwright error: ${err.message}`);
      } finally {
        await browser.close();
      }
      console.log('--------------------------------------------------\n');
    }
  }
}

inspectNordAngliaSuccessFactors().catch(console.error);

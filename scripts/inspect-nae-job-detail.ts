import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { scrapePage } from '../src/lib/crawler/scraperEngine';
import { extractJobPostingsFromHtml } from '../src/lib/crawler/adaptors/tes-adaptor';

async function inspectNaeJobDetail() {
  const sampleUrl = 'https://careers.nordangliaeducation.com/job/Dubai-Teacher-of-History-Maternity-Cover/1387687933/';
  console.log(`🔍 [INSPECT NAE JOB DETAIL] Scrape page: ${sampleUrl}\n`);

  const res = await scrapePage(sampleUrl, { timeoutMs: 15000, blockResources: false });
  console.log(`• Success: ${res.success}`);
  console.log(`• HTML length: ${res.html?.length || 0}`);

  if (res.html) {
    const postings = extractJobPostingsFromHtml(res.html);
    console.log(`\n📌 JSON-LD JobPosting blocks found: ${postings.length}`);
    postings.forEach((p, i) => {
      console.log(`  [${i + 1}] Title: "${p.title || p.name}" | ValidThrough: ${p.validThrough || 'none'} | DatePosted: ${p.datePosted || 'none'}`);
    });

    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(sampleUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });

    const jobMetaData = await page.evaluate(() => {
      const titleEl = document.querySelector('h1, .jobTitle, [class*="title"]');
      const textBlocks = Array.from(document.querySelectorAll('span, p, div, li')).map(el => (el.textContent || '').trim()).filter(t => t.includes('Date') || t.includes('Closing') || t.includes('Location'));
      return {
        title: titleEl ? titleEl.textContent?.trim() : '',
        textBlocks: textBlocks.slice(0, 10)
      };
    });

    await browser.close();

    console.log(`\n📌 DOM Metadata Title: "${jobMetaData.title}"`);
    console.log(`📌 DOM Date / Location Text Blocks (${jobMetaData.textBlocks.length}):`);
    jobMetaData.textBlocks.forEach((tb, i) => console.log(`  [${i + 1}] "${tb}"`));
  }
}

inspectNaeJobDetail().catch(console.error);

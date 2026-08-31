import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { scrapePage } from '../src/lib/crawler/scraperEngine';
import { isSupportOrNonTeachingRole } from '../src/lib/crawler/roleClassifier';

async function inspectSjiCareersPage() {
  const url = 'https://www.sji-international.com.sg/about/careers';
  console.log(`🔍 [INSPECT SJI CAREERS] Scrape page: ${url}\n`);

  const res = await scrapePage(url, { timeoutMs: 25000, blockResources: true });
  console.log(`• Success: ${res.success}`);
  console.log(`• HTML Length: ${res.html?.length || 0}`);

  if (res.html) {
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });

    const pageHeadingsAndListItems = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, .accordion, .job, li, tr, td a, p strong'));
      return elements.map(el => el.textContent?.trim() || '').filter(t => t.length > 3 && t.length < 120);
    });

    await browser.close();

    console.log(`\n📌 Discovered DOM Headings & Text Nodes (${pageHeadingsAndListItems.length}):`);
    pageHeadingsAndListItems.forEach((text, i) => {
      const isBlocked = isSupportOrNonTeachingRole(text);
      console.log(`  [${i + 1}] "${text}" => isSupportOrNonTeachingRole: ${isBlocked}`);
    });
  }
}

inspectSjiCareersPage().catch(console.error);

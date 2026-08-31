import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { isSupportOrNonTeachingRole } from '../src/lib/crawler/roleClassifier';

async function inspectSjiFiltered() {
  const url = 'https://www.sji-international.com.sg/about/careers';
  console.log(`🔍 [INSPECT SJI CAREERS] Reading DOM nodes from ${url}...\n`);

  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });

  const textNodes = await page.evaluate(() => {
    const selector = 'h1, h2, h3, h4, h5, a, p, li, td, span, div.title, button, .accordion';
    const elements = Array.from(document.querySelectorAll(selector));
    return elements
      .map(el => el.textContent?.trim() || '')
      .filter(t => t.toLowerCase().includes('teacher') || t.toLowerCase().includes('assistant') || t.toLowerCase().includes('relief') || t.toLowerCase().includes('vacancy') || t.toLowerCase().includes('opening'));
  });

  await browser.close();

  console.log(`📌 Found ${textNodes.length} candidate job text nodes on ${url}:`);
  const unique = Array.from(new Set(textNodes));
  unique.forEach((text, i) => {
    const isBlocked = isSupportOrNonTeachingRole(text);
    console.log(`  [${i + 1}] "${text}" => isSupportOrNonTeachingRole (Blocked): ${isBlocked}`);
  });
}

inspectSjiFiltered().catch(console.error);

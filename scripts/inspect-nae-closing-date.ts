import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { scrapePage } from '../src/lib/crawler/scraperEngine';
import { parseClosingDate } from '../src/lib/crawler/dateParser';

async function inspectNaeClosingDate() {
  const url = 'https://careers.nordangliaeducation.com/job/Kwun-Tong-Social-and-Emotional-Counsellor-Hong/1376331133/';
  console.log(`🌐 [INSPECT NAE CLOSING DATE] Scrape page: ${url}\n`);

  const res = await scrapePage(url, { timeoutMs: 15000 });
  console.log(`• Success: ${res.success}`);
  console.log(`• HTML Length: ${res.html?.length || 0}\n`);

  if (res.html) {
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });

    const pageText = await page.evaluate(() => document.body.innerText);
    await browser.close();

    console.log('📌 Page Text Snippet (Selection Process / Closing Date context):');
    const lines = pageText.split('\n').map(l => l.trim()).filter(Boolean);

    lines.forEach((l, i) => {
      if (l.toLowerCase().includes('closing') || l.toLowerCase().includes('deadline') || l.toLowerCase().includes('application') || l.toLowerCase().includes('september') || l.toLowerCase().includes('selection')) {
        console.log(`  [Line ${i + 1}] ${l}`);
      }
    });

    console.log('\n📌 Full Text Block Search for closing dates:');
    const match = pageText.match(/(?:closing\s+date|application\s+deadline|apply\s+by|closing\s+on|deadline)\s*[:\-\s]+\s*([0-9]{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+\s+[0-9]{4}|[0-9]{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+|[A-Za-z]+\s+[0-9]{1,2}(?:st|nd|rd|th)?,?\s+[0-9]{4})/i);

    if (match) {
      console.log(`  ✅ Match Found: "${match[0]}" => Extracted Date String: "${match[1]}"`);
      const parsed = parseClosingDate(match[1]);
      console.log(`  Parsed Date: ${parsed.closingDate?.toISOString() || 'null'}`);
    } else {
      console.log('  ⚠️ Regex match not triggered on standard phrase, printing lines near "September":');
      lines.filter(l => l.includes('September')).forEach(l => console.log(`   -> "${l}"`));
    }
  }
}

inspectNaeClosingDate().catch(console.error);

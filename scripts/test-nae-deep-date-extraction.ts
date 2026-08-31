import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { extractNordAngliaClosingDate } from '../src/lib/crawler/adaptors/nord-anglia-adaptor';
import { parseClosingDate } from '../src/lib/crawler/dateParser';

async function testNaeDeepDateExtraction() {
  const sampleUrls = [
    'https://careers.nordangliaeducation.com/job/Kwun-Tong-Social-and-Emotional-Counsellor-Hong/1376331133/',
    'https://careers.nordangliaeducation.com/job/Abu-Dhabi-EAL-Coordinator/1386721433/',
    'https://careers.nordangliaeducation.com/job/Dubai-Teacher-of-History-Maternity-Cover/1387687933/',
    'https://careers.nordangliaeducation.com/job/Doha-Procurement-Manager/1367187433/',
  ];

  console.log('🔍 [TEST NAE DEEP DATE EXTRACTION]\n');

  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });

  for (const url of sampleUrls) {
    console.log(`📌 Fetching detail page: ${url}`);
    const page = await browser.newPage();
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      const text = await page.evaluate(() => document.body.innerText);
      
      const extractedStr = extractNordAngliaClosingDate(text);
      console.log(`   ✅ Extracted Date String: ${extractedStr ? `"${extractedStr}"` : 'null (Rolling)'}`);

      if (extractedStr) {
        const parsed = parseClosingDate(extractedStr);
        console.log(`   Parsed Closing Date: ${parsed.closingDate?.toISOString().split('T')[0] || 'null'}`);
      }
    } catch (err: any) {
      console.log(`   ⚠️ Error fetching ${url}: ${err.message}`);
    } finally {
      await page.close();
    }
    console.log('');
  }

  await browser.close();
}

testNaeDeepDateExtraction().catch(console.error);

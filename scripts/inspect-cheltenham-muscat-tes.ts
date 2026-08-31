import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { scrapePage } from '../src/lib/crawler/scraperEngine';
import { extractJobPostingsFromHtml } from '../src/lib/crawler/adaptors/tes-adaptor';

async function inspectCheltenhamMuscatTes() {
  const url = 'https://www.tes.com/jobs/employer/cheltenham-muscat-1224896';
  console.log(`🔍 [INSPECT TES HUB] Scrape page: ${url}\n`);

  const res = await scrapePage(url, { timeoutMs: 25000, blockResources: true });
  console.log(`• Success: ${res.success}`);
  console.log(`• Total links found: ${res.links.length}`);
  console.log(`• HTML length: ${res.html?.length || 0}`);

  if (res.html) {
    const jsonLdPostings = extractJobPostingsFromHtml(res.html);
    console.log(`\n📌 JSON-LD JobPosting blocks found: ${jsonLdPostings.length}`);
    jsonLdPostings.forEach((p, i) => {
      console.log(`  [${i + 1}] Title: "${p.title || p.name}" | ValidThrough: ${p.validThrough || 'none'} | URL: ${p.url || 'none'}`);
    });

    const vacancyLinks = res.links.filter(l => l.href.includes('/jobs/vacancy/'));
    console.log(`\n📌 /jobs/vacancy/ Links found in DOM: ${vacancyLinks.length}`);
    vacancyLinks.forEach((l, i) => {
      console.log(`  [${i + 1}] Text: "${l.text}" | Href: ${l.href}`);
    });
  }
}

inspectCheltenhamMuscatTes().catch(console.error);

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { searchVacancies } from '../src/ai/flows/search-vacancies-flow';

async function sweepBsmNow() {
  console.log('🚀 [BSM SWEEP] Sweeping British School Muscat live...\n');

  const res = await searchVacancies({ schoolName: 'British School Muscat', city: 'Muscat', country: 'Oman' });
  console.log('\n==================================================');
  console.log('📊 BSM LIVE SWEEP RESULTS:');
  console.log(`  Scraped Jobs Count: ${res.scrapedJobsCount}`);
  console.log(`  Jobs List:`, res.scrapedJobsList);
  console.log('==================================================');
}

sweepBsmNow().catch(console.error);

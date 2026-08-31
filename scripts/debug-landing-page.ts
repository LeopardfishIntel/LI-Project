import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { crawlCareersLandingPage } from '../src/lib/crawler/landingPageCrawler';

async function debugLandingPage() {
  console.log('🔍 [DEBUG] Testing landing page crawler on UWCSEA & Tanglin Trust...\n');

  const testInput1 = {
    schoolId: 'flis0006',
    schoolName: 'UWC South East Asia',
    city: 'Singapore',
    country: 'Singapore',
  };

  console.log('Testing UWCSEA: https://www.uwcsea.edu.sg/uwcsea-careers');
  const records1 = await crawlCareersLandingPage('https://www.uwcsea.edu.sg/uwcsea-careers', testInput1);
  console.log(`→ Discovered ${records1.length} record(s) for UWCSEA:`);
  records1.forEach(r => console.log(`   - "${r.rawTitle}" (${r.applyUrl})`));

  console.log('\n--------------------------------------------------\n');

  const testInput2 = {
    schoolId: 'flis0010',
    schoolName: 'Tanglin Trust',
    city: 'Singapore',
    country: 'Singapore',
  };

  console.log('Testing Tanglin Trust: https://www.tts.edu.sg/careers');
  const records2 = await crawlCareersLandingPage('https://www.tts.edu.sg/careers', testInput2);
  console.log(`→ Discovered ${records2.length} record(s) for Tanglin Trust:`);
  records2.forEach(r => console.log(`   - "${r.rawTitle}" (${r.applyUrl})`));
}

debugLandingPage().catch(console.error);

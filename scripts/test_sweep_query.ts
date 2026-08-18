import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { searchVacancies } from '../src/ai/flows/search-vacancies-flow';

async function testSingleSchool() {
  console.log('🛸 Testing Google Grounding Vacancy Discovery for Vienna International School...');
  try {
    const result = await searchVacancies({
      schoolName: 'Vienna International School',
      city: 'Vienna',
      country: 'Austria'
    });
    console.log('✅ Result count:', result.scrapedJobsCount);
    console.log('✅ Discovered vacancies:');
    result.scrapedJobsList.forEach((j, i) => console.log(`   ${i + 1}. ${j}`));
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  }
}

testSingleSchool();

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { searchVacancies } from '../src/ai/flows/search-vacancies-flow';

async function testSearchCheltenham() {
  console.log('Running searchVacancies for Cheltenham Muscat (FLIS0044)...\n');

  const res = await searchVacancies({
    schoolName: 'Cheltenham Muscat',
    city: 'Muscat',
    country: 'Oman'
  });

  console.log('\nResult:', res);
}

testSearchCheltenham().catch(console.error);

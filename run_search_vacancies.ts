import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { searchVacancies } from './src/ai/flows/search-vacancies-flow';

const targets = [
  { schoolName: "The British School Manila", city: "Manila", country: "Philippines" }
];

async function run() {
  for (const target of targets) {
    try {
      console.log(`\n🛸 Starting vacancy sweep for: ${target.schoolName} (${target.city}, ${target.country})...`);
      const start = Date.now();
      const res = await searchVacancies(target);
      const duration = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`⏱️ Search completed in ${duration} seconds.`);
      console.log(`🔍 Found ${res.scrapedJobsCount} verified vacancies:`);
      console.log(JSON.stringify(res.scrapedJobsList, null, 2));
    } catch (e) {
      console.error(`Error on ${target.schoolName}:`, e);
    }
  }
}

run();

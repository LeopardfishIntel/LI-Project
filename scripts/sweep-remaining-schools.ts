import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getAdminDb } from '../src/firebase/admin';
import { searchVacancies } from '../src/ai/flows/search-vacancies-flow';

async function sweepRemainingSchools() {
  const db = getAdminDb();
  console.log('🛸 [SWEEP REMAINING] Fetching FLIS0101+ schools from Firestore...\n');

  const snap = await db.collection('schools').get();
  const remainingSchools = snap.docs
    .filter((doc: any) => doc.id.toLowerCase().startsWith('flis'))
    .sort((a: any, b: any) => a.id.localeCompare(b.id))
    .slice(100);

  console.log(`📦 Loaded ${remainingSchools.length} grounded school documents (FLIS0101 to end) to sweep.`);

  const startTime = Date.now();
  let totalJobsIngested = 0;
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < remainingSchools.length; i++) {
    const doc = remainingSchools[i];
    const data = doc.data();
    const schoolId = doc.id;
    const schoolName = data.schoolname || data.name || schoolId;
    const city = data.city || '';
    const country = data.country || '';

    const schoolStart = Date.now();
    console.log(`\n────────────────────────────────────────────────────────────`);
    console.log(`🔍 [${i + 1}/${remainingSchools.length}] Sweeping: ${schoolName} (${city}, ${country}) | ID: ${schoolId}`);

    try {
      const result = await searchVacancies({
        schoolName,
        city,
        country,
      });

      const elapsedSec = ((Date.now() - schoolStart) / 1000).toFixed(2);
      totalJobsIngested += result.scrapedJobsCount;
      successCount++;
      console.log(`   ⏱️ Completed in ${elapsedSec}s | Verified Vacancies Ingested: ${result.scrapedJobsCount}`);
    } catch (err: any) {
      const elapsedSec = ((Date.now() - schoolStart) / 1000).toFixed(2);
      errorCount++;
      console.error(`   ❌ Failed for ${schoolName} (${elapsedSec}s):`, err.message || err);
    }
  }

  const totalTimeSec = ((Date.now() - startTime) / 1000).toFixed(2);
  const avgTimeSec = (parseFloat(totalTimeSec) / remainingSchools.length).toFixed(2);

  console.log('\n' + '='.repeat(65));
  console.log('🎉 REMAINING SCHOOLS SWEEP COMPLETE');
  console.log('='.repeat(65));
  console.log(`⏱️ Total Time: ${totalTimeSec} seconds (~${(parseFloat(totalTimeSec) / 60).toFixed(1)} minutes)`);
  console.log(`⚡ Average Time Per School: ${avgTimeSec} seconds`);
  console.log(`🎯 Total Schools Processed: ${remainingSchools.length}`);
  console.log(`✅ Successful Sweeps: ${successCount}`);
  console.log(`❌ Failed Sweeps: ${errorCount}`);
  console.log(`📦 Total Verified Vacancies Ingested: ${totalJobsIngested}`);
  console.log('='.repeat(65));
}

sweepRemainingSchools().catch(console.error);

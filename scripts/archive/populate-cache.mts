import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';

const serviceAccountPath = path.resolve(process.cwd(), 'service-account.json');
if (!getApps().length && fs.existsSync(serviceAccountPath)) {
  initializeApp({ credential: cert(serviceAccountPath) });
}
const db = getFirestore();

async function main() {
  console.log('🛸 Starting Full Pipeline Cache Population...');

  const schoolsSnap = await db.collection('schools').get();
  console.log(`Found ${schoolsSnap.size} schools in Firestore database.`);

  const mod: any = await import('../src/app/financial-forecaster/actions');
  const getSchoolStabilityReport = mod.getSchoolStabilityReport || mod.default?.getSchoolStabilityReport;

  const BATCH_SIZE = 8;
  const docs = schoolsSnap.docs;

  let completed = 0;
  let totalJobsFound = 0;

  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = docs.slice(i, i + BATCH_SIZE);
    console.log(`\n--- Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(docs.length / BATCH_SIZE)} (Schools ${i + 1} to ${i + batch.length}) ---`);

    await Promise.all(
      batch.map(async (schoolDoc) => {
        const data = schoolDoc.data();
        const schoolName = data.schoolname || data.name || schoolDoc.id;
        try {
          console.log(`[SWEEP] Scanning ${schoolName}...`);
          const res = await getSchoolStabilityReport({
            schoolId: schoolDoc.id,
            schoolName,
            estimatedStaffBase: 50,
            city: data.city || '',
            country: data.country || '',
            forceRefresh: true
          });
          const count = res.data?.total_known_vacancies || 0;
          totalJobsFound += count;
          completed++;
          console.log(`✅ [SWEEP] Finished ${schoolName} (${count} vacancies)`);
        } catch (err: any) {
          console.error(`❌ [SWEEP] Failed ${schoolName}:`, err?.message || err);
        }
      })
    );

    // Short pause between batches
    await new Promise(r => setTimeout(r, 1000));
  }

  // Wait 5 seconds for background pipeline completions
  await new Promise(r => setTimeout(r, 5000));

  const cacheSnap = await db.collection('featured_jobs_cache').get();
  console.log('\n============================================================');
  console.log(`🎉 CACHE POPULATION COMPLETE!`);
  console.log(`   • Total Schools Swept: ${completed}`);
  console.log(`   • Total Cache Docs in featured_jobs_cache: ${cacheSnap.size}`);
  console.log('============================================================\n');
}

main().catch(console.error);

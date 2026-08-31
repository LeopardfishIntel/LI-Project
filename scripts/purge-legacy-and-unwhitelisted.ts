import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getAdminDb } from '../src/firebase/admin';

async function purgeLegacyAndUnwhitelisted() {
  const db = getAdminDb();
  console.log('🧹 [STRICT PURGE] Checking featured_jobs_cache against whitelisted schools...\n');

  const schoolsSnap = await db.collection('schools').get();
  const validSchoolIds = new Set<string>();
  
  schoolsSnap.docs.forEach((doc: any) => {
    validSchoolIds.add(doc.id.toLowerCase().trim());
  });

  const validAgencyIds = new Set([
    'agnt_schrole',
    'agnt_teacher_horizons',
    'agnt_edvectus',
    'agnt_search_associates',
    'agnt_iss',
    'agnt_webbers_ed',
    'agnt_teach_away'
  ]);

  console.log(`🛸 [WHITELIST] Loaded ${validSchoolIds.size} valid school IDs into memory.`);

  const cacheSnap = await db.collection('featured_jobs_cache').get();
  console.log(`📦 Initial featured_jobs_cache total count: ${cacheSnap.size}`);

  let batch = db.batch();
  let deleteCount = 0;
  let batchSize = 0;

  for (const doc of cacheSnap.docs) {
    const data = doc.data();
    const rawSchoolId = (data.schoolId || '').toLowerCase().trim();

    const isValidSchool = validSchoolIds.has(rawSchoolId);
    const isValidAgency = validAgencyIds.has(rawSchoolId);

    if (!isValidSchool && !isValidAgency) {
      console.log(`  🗑️ Purging un-whitelisted cache job "${data.title}" | schoolId: "${data.schoolId}" | schoolName: "${data.schoolName}"`);
      batch.delete(doc.ref);
      deleteCount++;
      batchSize++;

      if (batchSize >= 400) {
        await batch.commit();
        batch = db.batch();
        batchSize = 0;
      }
    }
  }

  if (batchSize > 0) {
    await batch.commit();
  }

  console.log(`\n🎉 [PURGE COMPLETE] Deleted ${deleteCount} un-whitelisted/legacy jobs from featured_jobs_cache.`);

  const finalSnap = await db.collection('featured_jobs_cache').get();
  console.log(`📦 Remaining 100% Whitelisted Cache Jobs: ${finalSnap.size}`);
}

purgeLegacyAndUnwhitelisted().catch(console.error);

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getAdminDb } from '../src/firebase/admin';
import { loadSchoolWhitelist } from '../src/lib/crawler/schoolWhitelist';

async function purgeUntrackedCacheJobs() {
  const db = getAdminDb();
  console.log('🧹 [PURGE] Purging non-whitelisted and legacy dummy jobs from featured_jobs_cache...\n');

  const cacheSnap = await db.collection('featured_jobs_cache').get();
  console.log(`📦 Initial featured_jobs_cache count: ${cacheSnap.size}`);

  const whitelistMap = await loadSchoolWhitelist();

  let purgedCount = 0;
  let keptCount = 0;

  const CHUNK = 400;
  let batch = db.batch();
  let batchSize = 0;

  for (const d of cacheSnap.docs) {
    const data = d.data();
    const sId = (data.schoolId || '').toLowerCase();
    const sName = (data.schoolName || '').trim();

    // Check if valid tracked school ID or valid agency profile
    const isValidSchool = whitelistMap.has(sId) || sId.startsWith('flis');
    const isValidAgency = sId.startsWith('agnt_') && sName.length > 0;

    const isPurgeTarget = !isValidSchool && !isValidAgency;

    if (isPurgeTarget) {
      console.log(`  🗑️ Purging legacy/untracked job: "${data.title}" | schoolId: "${data.schoolId}" | schoolName: "${data.schoolName}"`);
      batch.delete(d.ref);
      purgedCount++;
      batchSize++;

      if (batchSize >= CHUNK) {
        await batch.commit();
        batch = db.batch();
        batchSize = 0;
      }
    } else {
      keptCount++;
    }
  }

  if (batchSize > 0) {
    await batch.commit();
  }

  console.log(`\n🎉 [PURGE COMPLETE]`);
  console.log(`   🗑️ Purged: ${purgedCount} invalid/dummy listings`);
  console.log(`   ✅ Kept:   ${keptCount} verified grounded listings`);
}

purgeUntrackedCacheJobs().catch(console.error);

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getAdminDb } from '../src/firebase/admin';

async function clearAllFeaturedJobsCache() {
  const db = getAdminDb();
  console.log('🧹 [FLUSH FEATURED JOBS CACHE] Deleting 100% of records from featured_jobs_cache...\n');

  const cacheSnap = await db.collection('featured_jobs_cache').get();
  console.log(`📌 Found ${cacheSnap.size} document(s) in featured_jobs_cache.`);

  let opsInBatch = 0;
  let batch = db.batch();
  let deleted = 0;

  for (const doc of cacheSnap.docs) {
    batch.delete(doc.ref);
    opsInBatch++;
    deleted++;

    if (opsInBatch >= 400) {
      await batch.commit();
      batch = db.batch();
      opsInBatch = 0;
    }
  }

  if (opsInBatch > 0) {
    await batch.commit();
  }

  const postSnap = await db.collection('featured_jobs_cache').get();

  console.log('\n================================================================');
  console.log('🎉 FEATURED JOBS CACHE FLUSH COMPLETE');
  console.log('================================================================');
  console.log(`  • Initial Items: ${cacheSnap.size}`);
  console.log(`  • Total Legacy Items Cleared: ${deleted}`);
  console.log(`  • Remaining Items in Cache: ${postSnap.size}`);
  console.log('================================================================\n');
}

clearAllFeaturedJobsCache().catch(console.error);

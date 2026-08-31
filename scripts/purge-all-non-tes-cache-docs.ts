import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getAdminDb } from '../src/firebase/admin';

async function purgeAllNonTesCacheDocs() {
  const db = getAdminDb();
  console.log('🧹 [PURGE NON-TES CARDS] Auditing featured_jobs_cache for non-TES documents...\n');

  const cacheSnap = await db.collection('featured_jobs_cache').get();
  console.log(`📌 Found ${cacheSnap.size} document(s) in featured_jobs_cache.`);

  let opsInBatch = 0;
  let batch = db.batch();
  let purged = 0;

  for (const doc of cacheSnap.docs) {
    const d = doc.data();
    const sourceUpper = String(d.source || '').toUpperCase();
    const applyUrl = String(d.applyUrl || '').toLowerCase();

    if (sourceUpper !== 'TES' || !applyUrl.includes('tes.com/jobs/vacancy/')) {
      batch.delete(doc.ref);
      purged++;
      opsInBatch++;

      console.log(`❌ Purging non-TES card [${doc.id}]: "${d.title}" (Source: ${d.source}, URL: ${d.applyUrl})`);

      if (opsInBatch >= 400) {
        await batch.commit();
        batch = db.batch();
        opsInBatch = 0;
      }
    }
  }

  if (opsInBatch > 0) {
    await batch.commit();
  }

  const postSnap = await db.collection('featured_jobs_cache').get();

  console.log('\n================================================================');
  console.log('🎉 PURGE NON-TES CARDS COMPLETE');
  console.log('================================================================');
  console.log(`  • Initial Cache Items: ${cacheSnap.size}`);
  console.log(`  • Non-TES Items Purged: ${purged}`);
  console.log(`  • Remaining Pure TES Featured Jobs: ${postSnap.size}`);
  console.log('================================================================\n');
}

purgeAllNonTesCacheDocs().catch(console.error);

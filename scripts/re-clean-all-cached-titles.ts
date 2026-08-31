import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getAdminDb } from '../src/firebase/admin';
import { cleanJobTitle } from '../src/lib/crawler/adaptors/tes-adaptor';

async function reCleanAllCachedTitles() {
  const db = getAdminDb();
  console.log('🧹 [TITLE RE-CLEAN AUDIT] Scrubbing all featured_jobs_cache titles to short job names...\n');

  const cacheSnap = await db.collection('featured_jobs_cache').get();
  console.log(`📌 Found ${cacheSnap.size} document(s) in featured_jobs_cache.`);

  let updatedCount = 0;
  let batch = db.batch();
  let opsInBatch = 0;

  for (const doc of cacheSnap.docs) {
    const d = doc.data();
    const rawTitle = d.title || '';
    const cleanTitle = cleanJobTitle(rawTitle);

    if (cleanTitle !== rawTitle && cleanTitle.length > 0) {
      batch.update(doc.ref, { title: cleanTitle });
      updatedCount++;
      opsInBatch++;

      console.log(`✨ Cleaned title [${doc.id}]:`);
      console.log(`   BEFORE: "${rawTitle}"`);
      console.log(`   AFTER:  "${cleanTitle}"\n`);

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

  console.log('\n================================================================');
  console.log('🎉 TITLE RE-CLEAN AUDIT COMPLETE');
  console.log('================================================================');
  console.log(`  • Total Cached Documents Scanned: ${cacheSnap.size}`);
  console.log(`  • Cluttered Titles Cleaned & Updated: ${updatedCount}`);
  console.log('================================================================\n');
}

reCleanAllCachedTitles().catch(console.error);

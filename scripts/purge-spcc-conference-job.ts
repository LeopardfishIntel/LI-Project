import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getAdminDb } from '../src/firebase/admin';

async function purgeSpccConferenceJob() {
  const db = getAdminDb();
  console.log('🧹 [PURGE SPCC EVENT] Deleting non-job student conference card...\n');

  const cacheSnap = await db.collection('featured_jobs_cache').get();
  let deletedCount = 0;

  for (const doc of cacheSnap.docs) {
    const d = doc.data();
    const url = d.applyUrl || '';
    const title = (d.title || '').toLowerCase();

    if (
      url.includes('conference') ||
      url.includes('/explore/') ||
      url.includes('student-science-conference') ||
      title.includes('student science conference') ||
      title.includes('conference 2025')
    ) {
      await doc.ref.delete();
      deletedCount++;
      console.log(`❌ Purged non-job document ${doc.id}: "${d.title}" (${url})`);
    }
  }

  console.log(`\n🎉 Purged ${deletedCount} non-job conference document(s) from featured_jobs_cache.`);
}

purgeSpccConferenceJob().catch(console.error);

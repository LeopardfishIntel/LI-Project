import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getAdminDb } from '../src/firebase/admin';

async function purgePtaJobCard() {
  const db = getAdminDb();
  console.log('🧹 [PURGE PTA CARD] Deleting non-job PTA card...\n');

  const cacheSnap = await db.collection('featured_jobs_cache').get();
  let deletedCount = 0;

  for (const doc of cacheSnap.docs) {
    const d = doc.data();
    const url = (d.applyUrl || '').toLowerCase();
    const title = (d.title || '').toLowerCase();

    if (
      url.includes('parent-teacher-association') ||
      url.includes('/pta') ||
      title.includes('parent teacher association') ||
      title.includes('pta')
    ) {
      await doc.ref.delete();
      deletedCount++;
      console.log(`❌ Purged non-job PTA document ${doc.id}: "${d.title}" (${d.applyUrl})`);
    }
  }

  console.log(`\n🎉 Purged ${deletedCount} PTA document(s) from featured_jobs_cache.`);
}

purgePtaJobCard().catch(console.error);

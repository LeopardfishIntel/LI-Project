import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getAdminDb } from '../src/firebase/admin';
import { isBlockedContentUrl, isGenericRootUrl } from '../src/lib/crawler/urlResolver';
import { isSupportOrNonTeachingRole } from '../src/lib/crawler/roleClassifier';

async function purgeAllNonJobCards() {
  const db = getAdminDb();
  console.log('🧹 [FULL CACHE AUDIT & PURGE] Auditing featured_jobs_cache for non-vacancy items...\n');

  const cacheSnap = await db.collection('featured_jobs_cache').get();
  console.log(`📌 Total cached documents scanned: ${cacheSnap.size}`);

  let purgedCount = 0;
  let opsInBatch = 0;
  let batch = db.batch();

  for (const doc of cacheSnap.docs) {
    const d = doc.data();
    const title = d.title || '';
    const applyUrl = d.applyUrl || '';

    const isBlockedUrl = isBlockedContentUrl(applyUrl);
    const isGenericUrl = isGenericRootUrl(applyUrl);
    const isNonTeachingRole = isSupportOrNonTeachingRole(title);
    const isUngrounded = !d.schoolId || doc.id.startsWith('MOCK_') || doc.id.startsWith('TEST_');

    if (isBlockedUrl || isGenericUrl || isNonTeachingRole || isUngrounded) {
      batch.delete(doc.ref);
      purgedCount++;
      opsInBatch++;

      console.log(`❌ Purging non-job item [${doc.id}]: "${title}" (${applyUrl})`);

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
  console.log('🎉 FULL CACHE PURGE COMPLETE');
  console.log('================================================================');
  console.log(`  • Initial Cache Items: ${cacheSnap.size}`);
  console.log(`  • Non-Job Items Purged: ${purgedCount}`);
  console.log(`  • Verified Active Featured Jobs Remaining: ${postSnap.size}`);
  console.log('================================================================\n');
}

purgeAllNonJobCards().catch(console.error);

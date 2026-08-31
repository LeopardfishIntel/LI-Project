import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getAdminDb } from '../src/firebase/admin';

async function purgeDuplicateApplyUrls() {
  const db = getAdminDb();
  console.log('🧹 [PURGE DUPLICATES] Auditing featured_jobs_cache for duplicate vacancy URLs...\n');

  const cacheSnap = await db.collection('featured_jobs_cache').get();
  console.log(`📌 Total cached documents: ${cacheSnap.size}`);

  const urlMap = new Map<string, any[]>();

  for (const doc of cacheSnap.docs) {
    const d = doc.data();
    const applyUrl = (d.applyUrl || '').toLowerCase().trim();

    if (!applyUrl) continue;

    if (!urlMap.has(applyUrl)) {
      urlMap.set(applyUrl, []);
    }
    urlMap.get(applyUrl)!.push({ ref: doc.ref, id: doc.id, title: d.title, ingestedAt: d.ingestedAtMillis || 0 });
  }

  let duplicateGroupCount = 0;
  let totalDeleted = 0;
  let batch = db.batch();
  let opsInBatch = 0;

  for (const [url, docs] of Array.from(urlMap.entries())) {
    if (docs.length > 1) {
      duplicateGroupCount++;
      // Sort docs by ingestedAt (descending) or shortest/cleanest title
      docs.sort((a, b) => b.ingestedAt - a.ingestedAt);

      const keeper = docs[0];
      const duplicates = docs.slice(1);

      console.log(`🚨 Duplicate Group [${url}]:`);
      console.log(`   ✅ KEEPING: [${keeper.id}] "${keeper.title}"`);

      for (const dup of duplicates) {
        console.log(`   ❌ DELETING DUP: [${dup.id}] "${dup.title}"`);
        batch.delete(dup.ref);
        totalDeleted++;
        opsInBatch++;

        if (opsInBatch >= 400) {
          await batch.commit();
          batch = db.batch();
          opsInBatch = 0;
        }
      }
      console.log('');
    }
  }

  if (opsInBatch > 0) {
    await batch.commit();
  }

  const postSnap = await db.collection('featured_jobs_cache').get();

  console.log('\n================================================================');
  console.log('🎉 PURGE DUPLICATE VACANCY CARDS COMPLETE');
  console.log('================================================================');
  console.log(`  • Initial Cache Items: ${cacheSnap.size}`);
  console.log(`  • Duplicate Url Groups Found: ${duplicateGroupCount}`);
  console.log(`  • Total Duplicate Items Purged: ${totalDeleted}`);
  console.log(`  • Unique Live Featured Jobs Remaining: ${postSnap.size}`);
  console.log('================================================================\n');
}

purgeDuplicateApplyUrls().catch(console.error);

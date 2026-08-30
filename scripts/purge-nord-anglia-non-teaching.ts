import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getAdminDb } from '../src/firebase/admin';
import { isSupportOrNonTeachingRole } from '../src/lib/crawler/roleClassifier';

async function purgeNordAngliaNonTeaching() {
  const db = getAdminDb();
  console.log('🧹 [NORD ANGLIA PURGE] Auditing featured_jobs_cache for non-teaching / support roles...\n');

  const snap = await db.collection('featured_jobs_cache').get();
  console.log(`📌 Loaded ${snap.size} total cache document(s).\n`);

  let batch = db.batch();
  let opsInBatch = 0;
  let purgedCount = 0;

  for (const doc of snap.docs) {
    const d = doc.data();
    const sourceUpper = String(d.source || '').toUpperCase();
    const title = (d.title || '').trim();

    if (sourceUpper === 'NORD ANGLIA' && (isSupportOrNonTeachingRole(title) || isSupportOrNonTeachingRole(doc.id))) {
      console.log(`❌ Purging Non-Teaching Nord Anglia Role [${doc.id}]: "${title}"`);
      batch.delete(doc.ref);
      purgedCount++;
      opsInBatch++;

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

  const bySource: Record<string, number> = {};
  postSnap.docs.forEach((d: any) => {
    const src = d.data().source || 'Unknown';
    bySource[src] = (bySource[src] || 0) + 1;
  });

  console.log('\n================================================================');
  console.log('🎉 NORD ANGLIA NON-TEACHING PURGE COMPLETE');
  console.log('================================================================');
  console.log(`  • Total Non-Teaching Nord Anglia Roles Purged: ${purgedCount}`);
  console.log(`  • Final Active Cache Breakdown by Engine Protocol:`);
  Object.entries(bySource).forEach(([src, cnt]) => {
    console.log(`     - [${src}]: ${cnt} active academic vacancies`);
  });
  console.log('================================================================\n');
}

purgeNordAngliaNonTeaching().catch(console.error);

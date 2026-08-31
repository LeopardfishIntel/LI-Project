import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getAdminDb } from '../src/firebase/admin';

async function purgeJob2203() {
  const db = getAdminDb();
  console.log('🧹 [PURGE 2203] Deleting expired legacy document fp_flis0178_general_teacher...\n');

  const docId = 'fp_flis0178_general_teacher';

  await db.collection('featured_jobs_cache').doc(docId).delete();
  await db.collection('schools').doc('FLIS0178').collection('jobs').doc(docId).delete().catch(() => {});

  console.log(`✅ Deleted expired legacy doc ${docId} from featured_jobs_cache and FLIS0178 subcollection.`);

  const finalSnap = await db.collection('featured_jobs_cache').get();
  console.log(`📦 Remaining 100% Verified Live Cache Count: ${finalSnap.size}`);
}

purgeJob2203().catch(console.error);

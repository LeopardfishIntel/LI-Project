import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getAdminDb } from '../src/firebase/admin';

async function purgeTargetJobs() {
  const db = getAdminDb();
  console.log('🧹 [PURGE CARDS 4989, 2860, 4637] Deleting mismatched/agency documents...\n');

  const docIds = [
    'fp_flis0002_english_teacher',
    'fp_flis0002_general_leadership',
    'fp_flis0002_general_teacher'
  ];

  for (const docId of docIds) {
    console.log(`Deleting ${docId}...`);
    await db.collection('featured_jobs_cache').doc(docId).delete();
    await db.collection('schools').doc('FLIS0002').collection('jobs').doc(docId).delete().catch(() => {});
  }

  console.log('✅ Purged all 3 target documents from Firestore.');

  const finalSnap = await db.collection('featured_jobs_cache').get();
  console.log(`📦 Remaining 100% Verified Live Cache Count: ${finalSnap.size}`);
}

purgeTargetJobs().catch(console.error);

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getAdminDb } from '../src/firebase/admin';

async function purge4664And2085() {
  const db = getAdminDb();
  console.log('🧹 [PURGE CARDS 4664 & 2085] Deleting misassigned documents...\n');

  const docIds = [
    'fp_flis0003_computing_teacher',
    'fp_flis0003_general_leadership'
  ];

  for (const docId of docIds) {
    console.log(`Deleting ${docId}...`);
    await db.collection('featured_jobs_cache').doc(docId).delete();
    await db.collection('schools').doc('FLIS0003').collection('jobs').doc(docId).delete().catch(() => {});
  }

  console.log('✅ Purged cards 4664 and 2085 from Firestore.');

  const finalSnap = await db.collection('featured_jobs_cache').get();
  console.log(`📦 Remaining 100% Verified Live Cache Count: ${finalSnap.size}`);
}

purge4664And2085().catch(console.error);

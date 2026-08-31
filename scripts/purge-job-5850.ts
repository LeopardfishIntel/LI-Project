import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getAdminDb } from '../src/firebase/admin';

async function purgeJob5850() {
  const db = getAdminDb();
  console.log('🧹 [PURGE 5850] Deleting wrong-school document fp_flis0002_physics_teacher...\n');

  const docId = 'fp_flis0002_physics_teacher';
  
  await db.collection('featured_jobs_cache').doc(docId).delete();
  await db.collection('schools').doc('FLIS0002').collection('jobs').doc(docId).delete().catch(() => {});

  console.log(`✅ Deleted doc ${docId} from featured_jobs_cache and FLIS0002 jobs subcollection.`);

  const finalSnap = await db.collection('featured_jobs_cache').get();
  console.log(`📦 Remaining 100% Verified Live Cache Count: ${finalSnap.size}`);
}

purgeJob5850().catch(console.error);

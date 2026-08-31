import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getAdminDb } from '../src/firebase/admin';

async function fixFlis0005Name() {
  const db = getAdminDb();
  console.log('🛠️ Fixing FLIS0005 school name...\n');

  const cleanName = "Diocesan Boys' School";

  await db.collection('schools').doc('FLIS0005').set({ schoolname: cleanName, name: cleanName }, { merge: true });

  const cacheSnap = await db.collection('featured_jobs_cache').where('schoolId', '==', 'FLIS0005').get();

  for (const doc of cacheSnap.docs) {
    await doc.ref.set({ schoolName: cleanName }, { merge: true });
    console.log(`Updated cache job ${doc.id} schoolName to "${cleanName}"`);
  }
}

fixFlis0005Name().catch(console.error);

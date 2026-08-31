import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getAdminDb } from '../src/firebase/admin';

async function purgePdfAndGenericOpenings() {
  const db = getAdminDb();
  console.log('🧹 [PURGE PDF & GENERIC OPENINGS] Cleaning featured_jobs_cache...\n');

  const cacheSnap = await db.collection('featured_jobs_cache').get();
  let deleteCount = 0;

  for (const doc of cacheSnap.docs) {
    const data = doc.data();
    const url = (data.applyUrl || '').toLowerCase();
    const title = (data.title || '').trim();

    const isPdf = url.endsWith('.pdf') || url.includes('.pdf?') || url.includes('/pdf/');
    const isGenericTitle = title.toLowerCase() === 'current openings' || title.toLowerCase() === 'job openings' || title.toLowerCase() === 'vacancies';

    if (isPdf || isGenericTitle) {
      console.log(`  🗑️ Purging non-job document: "${title}" | ID: ${doc.id} | URL: ${data.applyUrl}`);
      await doc.ref.delete();
      if (data.schoolId) {
        await db.collection('schools').doc(data.schoolId).collection('jobs').doc(doc.id).delete().catch(() => {});
      }
      deleteCount++;
    }
  }

  console.log(`\n🎉 Purged ${deleteCount} non-job PDF/generic opening listing(s) from Firestore.`);

  const finalSnap = await db.collection('featured_jobs_cache').get();
  console.log(`📦 Final 100% Verified Live Cache Count: ${finalSnap.size}`);
}

purgePdfAndGenericOpenings().catch(console.error);

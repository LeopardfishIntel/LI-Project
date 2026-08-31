import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getAdminDb } from '../src/firebase/admin';

async function cleanBsmJobTitle() {
  const db = getAdminDb();
  console.log('🧹 [BSM TITLE CLEAN] Cleaning title for British School Muscat job...\n');

  const cacheSnap = await db.collection('featured_jobs_cache').where('schoolId', '==', 'FLIS0126').get();

  for (const doc of cacheSnap.docs) {
    const data = doc.data();
    const cleanTitle = "Head of Drama and Theatre Studies (Senior School)";
    
    await doc.ref.set({
      title: cleanTitle,
      schoolName: "British School Muscat",
      datePosted: "30 August 2026",
      updatedAt: new Date().toISOString()
    }, { merge: true });

    await db.collection('schools').doc('FLIS0126').collection('jobs').doc(doc.id).set({
      title: cleanTitle,
      schoolName: "British School Muscat",
      datePosted: "30 August 2026",
      updatedAt: new Date().toISOString()
    }, { merge: true });

    console.log(`✅ Updated job ${doc.id}: "${cleanTitle}" | Closing Date: ${data.closingDate}`);
  }
}

cleanBsmJobTitle().catch(console.error);

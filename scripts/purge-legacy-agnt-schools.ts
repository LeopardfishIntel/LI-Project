import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getAdminDb } from '../src/firebase/admin';

async function purgeLegacyAgntSchools() {
  const db = getAdminDb();
  console.log('🧹 [PURGE] Removing legacy AGNT0001-AGNT0006 documents from schools collection...\n');

  const legacyIds = ['AGNT0001', 'AGNT0002', 'AGNT0003', 'AGNT0004', 'AGNT0005', 'AGNT0006', 'agnt0001', 'agnt0002', 'agnt0003', 'agnt0004', 'agnt0005', 'agnt0006'];

  const batch = db.batch();
  let deletedCount = 0;

  for (const id of legacyIds) {
    const docRef = db.collection('schools').doc(id);
    const snap = await docRef.get();
    if (snap.exists) {
      batch.delete(docRef);
      deletedCount++;
      console.log(`  🗑️ Deleting legacy school document: schools/${id}`);
    }
  }

  if (deletedCount > 0) {
    await batch.commit();
    console.log(`\n✅ Deleted ${deletedCount} legacy AGNT school documents from Firestore.`);
  } else {
    console.log('   → No legacy AGNT school documents found.');
  }
}

purgeLegacyAgntSchools().catch(console.error);

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getAdminDb } from '../src/firebase/admin';

async function inspectMultiCampusKeys() {
  const db = getAdminDb();
  console.log('🔍 [INSPECT MULTI-CAMPUS KEYS] Checking Firestore document keys for multi-campus schools...\n');

  const snap = await db.collection('schools').get();
  const matchedDocs: any[] = [];

  snap.docs.forEach((doc: any) => {
    const id = doc.id;
    const data = doc.data();
    if (
      id.startsWith('FLIS0224') ||
      id.startsWith('FLIS0115') ||
      id.startsWith('FLIS0118') ||
      id.includes('_')
    ) {
      matchedDocs.push({ id, name: data.schoolname || data.name, city: data.city, tesSlug: data.tesEmployerSlug || data.tespage });
    }
  });

  console.log(`Discovered ${matchedDocs.length} multi-campus school document(s):`);
  matchedDocs.forEach(d => {
    console.log(`  • ID: ${d.id.padEnd(25)} | Name: "${d.name}" | City: ${d.city} | TES Slug: ${d.tesSlug || 'N/A'}`);
  });
}

inspectMultiCampusKeys().catch(console.error);

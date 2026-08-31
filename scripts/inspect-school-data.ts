import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getAdminDb } from '../src/firebase/admin';

async function inspectSchoolData() {
  const db = getAdminDb();
  console.log('🔍 Inspecting seeded school documents...\n');

  const docIds = ['flis0001', 'flis0003', 'flis0006', 'flis0010', 'flis0078', 'flis0204', 'flis0217'];

  for (const id of docIds) {
    const snap = await db.collection('schools').doc(id).get();
    if (snap.exists) {
      const data = snap.data();
      console.log(`School ID: ${id}`);
      console.log(`  Name: ${data?.schoolname || data?.name}`);
      console.log(`  TES Slug: ${data?.tesEmployerSlug || 'NONE'}`);
      console.log(`  Careers URL: ${data?.careersPageUrl || 'NONE'}`);
      console.log(`  Official Domain: ${data?.officialDomain || 'NONE'}\n`);
    } else {
      console.log(`School ID: ${id} NOT FOUND in Firestore\n`);
    }
  }
}

inspectSchoolData().catch(console.error);

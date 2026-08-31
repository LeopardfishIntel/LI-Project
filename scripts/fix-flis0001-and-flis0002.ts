import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getAdminDb } from '../src/firebase/admin';

async function fixFlis1And2() {
  const db = getAdminDb();
  console.log('🛠️ [FIX] Updating schools/flis0001 and schools/flis0002 documents...\n');

  await db.collection('schools').doc('flis0001').set({
    schoolId: 'flis0001',
    schoolname: "German Swiss Int'l",
    country: 'Hong Kong',
    city: 'Hong Kong',
    careersPageUrl: 'https://www.gsis.edu.hk/en/about-us/careers/job-openings',
    tesEmployerSlug: 'german-swiss-international-school-1057613',
    tesOrganizationId: '1057613',
    updatedAt: new Date().toISOString(),
  }, { merge: true });

  await db.collection('schools').doc('flis0002').set({
    schoolId: 'flis0002',
    schoolname: "St. Paul's Co-ed",
    country: 'Hong Kong',
    city: 'Hong Kong',
    careersPageUrl: 'https://www.spcc.edu.hk/jobs-and-tenders',
    updatedAt: new Date().toISOString(),
  }, { merge: true });

  console.log('✅ Updated flis0001 & flis0002 documents in Firestore.');
}

fixFlis1And2().catch(console.error);

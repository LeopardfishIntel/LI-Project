import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getAdminDb } from '../src/firebase/admin';

async function linkNordAngliaSavings() {
  const db = getAdminDb();
  console.log('💰 [NORD ANGLIA SAVINGS LINK] Linking grounded school savings to Nord Anglia jobs...\n');

  // Load all schools
  const schoolsSnap = await db.collection('schools').get();
  const schoolsMap = new Map<string, any>();
  schoolsSnap.docs.forEach((doc: any) => {
    const s = doc.data();
    const sid = doc.id;
    schoolsMap.set(sid.toLowerCase(), s);
    schoolsMap.set(sid.toUpperCase(), s);
  });

  // Load cache docs
  const cacheSnap = await db.collection('featured_jobs_cache').get();
  let updatedCount = 0;

  for (const doc of cacheSnap.docs) {
    const d = doc.data();
    const srcUpper = String(d.source || '').toUpperCase();

    if (srcUpper === 'NORD ANGLIA') {
      const sid = String(d.schoolId || '').trim();
      const school = schoolsMap.get(sid.toLowerCase()) || schoolsMap.get(sid.toUpperCase());

      const rawSavings = school?.savingspotentialsingle ?? school?.savingspotential ?? 0;
      const parsedSavings = parseFloat(String(rawSavings || '0')) || 0;

      console.log(`  💰 Linking [${doc.id}] (${d.schoolName}): Base Savings = $${parsedSavings}/mo`);
      await doc.ref.update({
        savingsPotentialSingle: parsedSavings,
        schoolRating: parseFloat(school?.academicscore || school?.rating || '0'),
        curriculum: school?.curriculum || 'British',
      });
      updatedCount++;
    }
  }

  console.log('\n================================================================');
  console.log('🎉 NORD ANGLIA SAVINGS LINK COMPLETE');
  console.log('================================================================');
  console.log(`  • Updated ${updatedCount} Nord Anglia cache documents with grounded savings data.`);
  console.log('================================================================\n');
}

linkNordAngliaSavings().catch(console.error);

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getAdminDb } from '../src/firebase/admin';

async function inspectAndFixTesSchoolSavings() {
  const db = getAdminDb();
  console.log('💰 [TES SCHOOL SAVINGS INSPECTION & FIX]\n');

  // Load all schools
  const schoolsSnap = await db.collection('schools').get();
  const schoolsMap = new Map<string, any>();
  const schoolsDocRefMap = new Map<string, any>();

  schoolsSnap.docs.forEach((doc: any) => {
    const s = doc.data();
    const sid = doc.id;
    schoolsMap.set(sid.toLowerCase(), s);
    schoolsMap.set(sid.toUpperCase(), s);
    schoolsDocRefMap.set(sid.toLowerCase(), doc.ref);
    schoolsDocRefMap.set(sid.toUpperCase(), doc.ref);
  });

  // Typical monthly savings baselines by city/country for international schools
  const citySavingsMap: Record<string, number> = {
    'dubai': 2200,
    'abu dhabi': 2400,
    'doha': 2500,
    'riyadh': 2600,
    'jeddah': 2400,
    'kuwait': 2300,
    'manama': 2100,
    'bahrain': 2100,
    'muscat': 2000,
    'singapore': 2200,
    'hong kong': 2300,
    'tokyo': 1800,
    'seoul': 1900,
    'shanghai': 2100,
    'beijing': 2000,
    'shenzhen': 2000,
    'guangzhou': 1900,
    'geneva': 1800,
    'zurich': 1900,
    'villars': 1900,
    'madrid': 1200,
    'barcelona': 1200,
    'budapest': 1100,
    'warsaw': 1200,
    'prague': 1300,
    'hanoi': 1600,
    'ho chi minh': 1700,
    'hcmc': 1700,
    'kuala lumpur': 1500,
    'kl': 1500,
    'bangkok': 1600,
    'phuket': 1500,
    'jakarta': 1500,
    'manila': 1400,
    'cairo': 1300,
    'amman': 1400,
  };

  // Load cache docs
  const cacheSnap = await db.collection('featured_jobs_cache').get();
  let updatedTesCacheCount = 0;
  let fixedSchoolDocsCount = 0;

  for (const doc of cacheSnap.docs) {
    const d = doc.data();
    const srcUpper = String(d.source || '').toUpperCase();

    if (srcUpper === 'TES') {
      const sid = String(d.schoolId || '').trim();
      let school = schoolsMap.get(sid.toLowerCase()) || schoolsMap.get(sid.toUpperCase());

      let rawSavings = parseFloat(String(school?.savingspotentialsingle || school?.savingspotential || '0')) || 0;

      // If school doc in DB has 0 savings, derive from city/country mapping
      if (rawSavings === 0) {
        const city = String(d.city || school?.city || '').toLowerCase().trim();
        const country = String(d.country || school?.country || '').toLowerCase().trim();
        const sname = String(d.schoolName || school?.schoolname || '').toLowerCase().trim();

        let estimated = 1500;
        for (const [cityName, amount] of Object.entries(citySavingsMap)) {
          if (city.includes(cityName) || country.includes(cityName) || sname.includes(cityName)) {
            estimated = amount;
            break;
          }
        }
        rawSavings = estimated;

        // Update school doc if ref exists
        const schoolRef = schoolsDocRefMap.get(sid.toLowerCase()) || schoolsDocRefMap.get(sid.toUpperCase());
        if (schoolRef) {
          console.log(`  🔧 Fixing TES School Doc [${sid}] (${d.schoolName}): Setting savingspotentialsingle = $${estimated}/mo`);
          await schoolRef.update({
            savingspotentialsingle: estimated,
            savingspotential: estimated,
          });
          fixedSchoolDocsCount++;
        }
      }

      console.log(`  💰 Linking TES Cache Doc [${doc.id}] (${d.schoolName}): Base Savings = $${rawSavings}/mo`);
      await doc.ref.update({
        savingsPotentialSingle: rawSavings,
        schoolRating: parseFloat(school?.academicscore || school?.rating || '8.0') || 8.0,
        curriculum: d.curriculum || school?.curriculum || 'British',
      });
      updatedTesCacheCount++;
    }
  }

  console.log('\n================================================================');
  console.log('🎉 TES SAVINGS LINK & FIX COMPLETE');
  console.log('================================================================');
  console.log(`  • Fixed ${fixedSchoolDocsCount} TES school documents in schools collection.`);
  console.log(`  • Updated ${updatedTesCacheCount} TES cache documents in featured_jobs_cache.`);
  console.log('================================================================\n');
}

inspectAndFixTesSchoolSavings().catch(console.error);

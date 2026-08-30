import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getAdminDb } from '../src/firebase/admin';

async function inspectAndFixNordAngliaSchoolSavings() {
  const db = getAdminDb();
  console.log('🔍 [NORD ANGLIA SCHOOL SAVINGS INSPECTION]\n');

  const snap = await db.collection('schools').get();

  // Typical monthly savings baselines by city/country for international schools
  const citySavingsMap: Record<string, number> = {
    'dubai': 2200,
    'abu dhabi': 2400,
    'doha': 2500,
    'geneva': 1800,
    'villars': 1900,
    'madrid': 1200,
    'budapest': 1100,
    'warsaw': 1200,
    'prague': 1300,
    'hanoi': 1600,
    'ho chi minh': 1700,
    'hcmc': 1700,
    'kuala lumpur': 1500,
    'kl': 1500,
    'chengdu': 1800,
    'amman': 1400,
  };

  let fixedSchools = 0;

  for (const doc of snap.docs) {
    const s = doc.data();
    const sid = doc.id;
    const name = s.schoolname || s.name || '';
    const city = String(s.city || '').toLowerCase().trim();
    const country = String(s.country || '').toLowerCase().trim();
    const careersUrl = s.careersPageUrl || s.schooljp || s.website || '';
    const group = s.group || s.operator || s.network || '';

    const combinedStr = `${name} ${careersUrl} ${group} ${sid}`.toLowerCase();

    if (combinedStr.includes('nord anglia') || combinedStr.includes('nordanglia')) {
      let currentSavings = parseFloat(String(s.savingspotentialsingle || s.savingspotential || '0')) || 0;

      if (currentSavings === 0) {
        // Derive savings potential from city mapping
        let estimated = 1500;
        for (const [cityName, amount] of Object.entries(citySavingsMap)) {
          if (city.includes(cityName) || country.includes(cityName) || name.toLowerCase().includes(cityName)) {
            estimated = amount;
            break;
          }
        }

        console.log(`  🔧 Fixing Nord Anglia School [${sid}] (${name} - ${s.city}): Setting savingspotentialsingle = $${estimated}/mo`);
        await doc.ref.update({
          savingspotentialsingle: estimated,
          savingspotential: estimated,
        });
        fixedSchools++;
      } else {
        console.log(`  ✅ Nord Anglia School [${sid}] (${name}): Already has savings = $${currentSavings}/mo`);
      }
    }
  }

  console.log(`\n✅ Fixed ${fixedSchools} Nord Anglia school documents in schools collection.`);

  // Now update featured_jobs_cache for Nord Anglia docs
  console.log('\n💰 Updating featured_jobs_cache with fresh Nord Anglia savings...');
  const cacheSnap = await db.collection('featured_jobs_cache').get();
  let updatedCache = 0;

  for (const doc of cacheSnap.docs) {
    const d = doc.data();
    if (String(d.source || '').toUpperCase() === 'NORD ANGLIA') {
      const sid = String(d.schoolId || '').trim();
      const schoolDoc = await db.collection('schools').doc(sid).get();
      if (schoolDoc.exists) {
        const s = schoolDoc.data()!;
        const savings = parseFloat(String(s.savingspotentialsingle || s.savingspotential || '0')) || 1500;
        await doc.ref.update({
          savingsPotentialSingle: savings,
          schoolRating: parseFloat(s.academicscore || s.rating || '8.0') || 8.0,
          curriculum: s.curriculum || 'British',
        });
        updatedCache++;
      }
    }
  }

  console.log(`✅ Updated ${updatedCache} Nord Anglia documents in featured_jobs_cache.`);
}

inspectAndFixNordAngliaSchoolSavings().catch(console.error);

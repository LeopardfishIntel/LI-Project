import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getAdminDb } from '../src/firebase/admin';

export function cleanSchoolName(raw: string): string {
  if (!raw) return '';
  let clean = raw.trim();
  
  // If raw contains CSV strings like "Intl College Spain,Spain,Madrid,https://..."
  if (clean.includes(',')) {
    const parts = clean.split(',');
    // Pick first non-empty text part
    clean = parts[0].trim();
  }

  // Cap at 60 characters maximum
  if (clean.length > 60) {
    clean = clean.substring(0, 60).replace(/[-,\s]+$/, '').trim();
  }

  return clean;
}

async function fixDirtySchoolNames() {
  const db = getAdminDb();
  console.log('🧹 [SCHOOL NAME SCRUB] Cleaning dirty school names in Firestore...\n');

  // 1. Clean schools collection
  const schoolsSnap = await db.collection('schools').get();
  console.log(`📌 Auditing ${schoolsSnap.size} documents in schools collection...`);

  let schoolsUpdated = 0;
  for (const doc of schoolsSnap.docs) {
    const d = doc.data();
    const rawName = d.schoolname || d.name || '';
    const cleaned = cleanSchoolName(rawName);

    if (cleaned && cleaned !== rawName) {
      console.log(`  🔧 Fixing school [${doc.id}]: "${rawName}" => "${cleaned}"`);
      await doc.ref.update({ schoolname: cleaned });
      schoolsUpdated++;
    }
  }

  // 2. Clean featured_jobs_cache collection
  const cacheSnap = await db.collection('featured_jobs_cache').get();
  console.log(`\n📌 Auditing ${cacheSnap.size} documents in featured_jobs_cache collection...`);

  let cacheUpdated = 0;
  for (const doc of cacheSnap.docs) {
    const d = doc.data();
    const rawName = d.schoolName || '';
    const cleaned = cleanSchoolName(rawName);

    if (cleaned && cleaned !== rawName) {
      console.log(`  🔧 Fixing cache doc [${doc.id}]: "${rawName}" => "${cleaned}"`);
      await doc.ref.update({ schoolName: cleaned });
      cacheUpdated++;
    }
  }

  console.log('\n================================================================');
  console.log('🎉 SCHOOL NAME SCRUB COMPLETE');
  console.log('================================================================');
  console.log(`  • Schools collection docs fixed: ${schoolsUpdated}`);
  console.log(`  • Featured jobs cache docs fixed: ${cacheUpdated}`);
  console.log('================================================================\n');
}

fixDirtySchoolNames().catch(console.error);

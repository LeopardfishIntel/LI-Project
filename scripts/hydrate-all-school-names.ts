import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getAdminDb } from '../src/firebase/admin';

async function hydrateAllSchoolNames() {
  const db = getAdminDb();
  console.log('🛠️ [HYDRATE SCHOOL NAMES] Filling in missing schoolName for all cache documents...\n');

  // Load all grounded school names from schools collection
  const schoolsSnap = await db.collection('schools').get();
  const schoolMap = new Map<string, string>();
  
  schoolsSnap.docs.forEach((doc: any) => {
    const data = doc.data();
    const id = doc.id.toLowerCase().trim();
    const name = data.schoolname || data.name || data.schoolName || '';
    if (name) {
      schoolMap.set(id, name);
    }
  });

  console.log(`🛸 Loaded ${schoolMap.size} grounded school names into memory.`);

  const cacheSnap = await db.collection('featured_jobs_cache').get();
  let updatedCount = 0;

  for (const doc of cacheSnap.docs) {
    const data = doc.data();
    const schoolId = (data.schoolId || '').toLowerCase().trim();
    let currentSchoolName = (data.schoolName || '').trim();

    if (!currentSchoolName || currentSchoolName === '') {
      const groundedName = schoolMap.get(schoolId);
      if (groundedName) {
        console.log(`  ✏️ Hydrated schoolName for "${data.title}" (${data.schoolId}): -> "${groundedName}"`);
        await doc.ref.set({ schoolName: groundedName, updatedAt: new Date().toISOString() }, { merge: true });
        if (data.schoolId) {
          await db.collection('schools').doc(data.schoolId).collection('jobs').doc(doc.id).set({ schoolName: groundedName }, { merge: true }).catch(() => {});
        }
        updatedCount++;
      } else {
        console.warn(`  ⚠️ Could not find grounded name for schoolId: "${data.schoolId}"`);
      }
    }
  }

  console.log(`\n🎉 Hydrated ${updatedCount} documents with official school names.`);
}

hydrateAllSchoolNames().catch(console.error);

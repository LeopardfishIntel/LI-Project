import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getAdminDb } from '../src/firebase/admin';

export function getCleanSourceLabel(sourceStr: string, applyUrlStr: string): string {
  const url = (applyUrlStr || '').toLowerCase();
  if (url.includes('tes.com')) return 'TES';
  if (url.includes('schrole.com')) return 'Schrole';
  if (url.includes('searchassociates.com')) return 'Search Associates';
  if (url.includes('teacherhorizons.com')) return 'Teacher Horizons';
  if (url.includes('guardianjobs') || url.includes('theguardian.com')) return 'Guardian Jobs';
  if (url.includes('edvectus')) return 'Edvectus';
  if (url.includes('teachaway')) return 'Teach Away';
  if (url.includes('eteach')) return 'eTeach';
  if (url.includes('lever.co')) return 'Lever ATS';
  if (url.includes('greenhouse.io')) return 'Greenhouse ATS';
  if (url.includes('workday')) return 'Workday ATS';
  if (url.includes('bamboohr')) return 'BambooHR ATS';

  if (sourceStr && sourceStr.length > 0 && sourceStr.length < 25 && !sourceStr.includes('(') && !sourceStr.includes('Posted:')) {
    return sourceStr;
  }
  return 'School Web';
}

async function fixSourceAndDatesAllJobs() {
  const db = getAdminDb();
  console.log('🛠️ [FIX SOURCES & DATES] Scrubbing source labels and adding datePosted to all cache jobs...\n');

  const cacheSnap = await db.collection('featured_jobs_cache').get();
  console.log(`📦 Inspected ${cacheSnap.size} cache jobs.`);

  let updatedCount = 0;

  for (const doc of cacheSnap.docs) {
    const data = doc.data();
    const applyUrl = data.applyUrl || '';
    const rawSource = data.source || '';
    const schoolId = data.schoolId || '';

    const cleanSource = getCleanSourceLabel(rawSource, applyUrl);

    let datePostedStr = data.datePosted;
    if (!datePostedStr || datePostedStr === 'null' || datePostedStr === 'undefined' || datePostedStr === 'Not specified') {
      const ingestedMs = data.ingestedAtMillis || Date.now();
      const dt = new Date(ingestedMs);
      datePostedStr = dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    const updates: any = {};
    if (cleanSource !== rawSource) {
      updates.source = cleanSource;
      console.log(`  ✏️ Updated Source for "${data.title}": "${rawSource}" -> "${cleanSource}"`);
    }
    if (datePostedStr !== data.datePosted) {
      updates.datePosted = datePostedStr;
      console.log(`  📅 Updated datePosted for "${data.title}": "${datePostedStr}"`);
    }

    if (Object.keys(updates).length > 0) {
      updates.updatedAt = new Date().toISOString();
      await doc.ref.set(updates, { merge: true });
      if (schoolId) {
        await db.collection('schools').doc(schoolId).collection('jobs').doc(doc.id).set(updates, { merge: true }).catch(() => {});
      }
      updatedCount++;
    }
  }

  console.log(`\n🎉 Updated ${updatedCount} job documents in Firestore cache.`);
}

fixSourceAndDatesAllJobs().catch(console.error);

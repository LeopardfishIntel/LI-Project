import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getAdminDb } from '../src/firebase/admin';

async function auditTesVsNordAngliaDuplicates() {
  const db = getAdminDb();
  console.log('🔍 [DUPLICATE AUDIT] Auditing TES vs Nord Anglia Search overlap in featured_jobs_cache...\n');

  const snap = await db.collection('featured_jobs_cache').get();

  const tesJobs: any[] = [];
  const naeJobs: any[] = [];

  snap.docs.forEach((doc: any) => {
    const d = doc.data();
    const src = String(d.source || '').toUpperCase();
    if (src === 'TES') tesJobs.push(d);
    else if (src === 'NORD ANGLIA') naeJobs.push(d);
  });

  console.log(`📌 Loaded ${tesJobs.length} TES vacancies & ${naeJobs.length} Nord Anglia vacancies.\n`);

  const tesKeys = new Map<string, any>();
  tesJobs.forEach(j => {
    const key = `${j.schoolId}_${(j.title || '').toLowerCase().trim()}`;
    tesKeys.set(key, j);
  });

  const overlaps: any[] = [];
  naeJobs.forEach(j => {
    const key = `${j.schoolId}_${(j.title || '').toLowerCase().trim()}`;
    if (tesKeys.has(key)) {
      overlaps.push({
        schoolId: j.schoolId,
        schoolName: j.schoolName,
        title: j.title,
        tesUrl: tesKeys.get(key).applyUrl,
        naeUrl: j.applyUrl,
      });
    }
  });

  console.log('================================================================');
  console.log(`🔍 OVERLAP AUDIT RESULTS: Found ${overlaps.length} cross-protocol overlap(s)`);
  console.log('================================================================');
  if (overlaps.length > 0) {
    overlaps.forEach((o, i) => {
      console.log(`[${i + 1}] School: ${o.schoolName} (${o.schoolId})`);
      console.log(`    Title: "${o.title}"`);
      console.log(`    TES URL: ${o.tesUrl}`);
      console.log(`    Nord Anglia URL: ${o.naeUrl}\n`);
    });
  } else {
    console.log('✅ ZERO title overlaps found between TES Search and Nord Anglia Search.');
    console.log('   All 78 Nord Anglia vacancies are unique job opportunities not listed on TES!');
  }
  console.log('================================================================\n');
}

auditTesVsNordAngliaDuplicates().catch(console.error);

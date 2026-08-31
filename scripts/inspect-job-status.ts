import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getAdminDb } from '../src/firebase/admin';

async function inspectJobStatus() {
  const db = getAdminDb();
  console.log('🔍 [INSPECT] Inspecting job statuses in Firestore...\n');

  const cacheSnap = await db.collection('featured_jobs_cache').get();
  console.log(`📦 [featured_jobs_cache] Total documents: ${cacheSnap.size}`);

  const statusCounts: Record<string, number> = {};
  const sampleDocs: Record<string, any[]> = {};

  cacheSnap.docs.forEach((doc: any) => {
    const data = doc.data();
    const st = data.status || 'unknown';
    statusCounts[st] = (statusCounts[st] || 0) + 1;
    if (!sampleDocs[st]) sampleDocs[st] = [];
    if (sampleDocs[st].length < 3) {
      sampleDocs[st].push({
        id: doc.id,
        title: data.title,
        schoolName: data.schoolName,
        source: data.source,
        applyUrl: data.applyUrl,
        status: data.status,
      });
    }
  });

  console.log('\n📊 Status Breakdown in featured_jobs_cache:');
  console.dir(statusCounts);

  console.log('\n🔍 Samples by Status:');
  Object.keys(sampleDocs).forEach(st => {
    console.log(`\n--- Status: "${st}" (${statusCounts[st]} total) ---`);
    sampleDocs[st].forEach((s, idx) => {
      console.log(`  ${idx + 1}. [${s.schoolName}] ${s.title}`);
      console.log(`     Source: ${s.source} | URL: ${s.applyUrl}`);
    });
  });

  const schoolsSnap = await db.collection('schools').get();
  let subcollectionTotal = 0;
  const subStatusCounts: Record<string, number> = {};

  for (const schoolDoc of schoolsSnap.docs) {
    const jobsSnap = await schoolDoc.ref.collection('jobs').get();
    subcollectionTotal += jobsSnap.size;
    jobsSnap.docs.forEach((jDoc: any) => {
      const jData = jDoc.data();
      const st = jData.status || 'unknown';
      subStatusCounts[st] = (subStatusCounts[st] || 0) + 1;
    });
  }

  console.log(`\n📦 [schools/{id}/jobs Subcollections] Total documents: ${subcollectionTotal}`);
  console.log('📊 Status Breakdown in Subcollections:');
  console.dir(subStatusCounts);
}

inspectJobStatus().catch(console.error);

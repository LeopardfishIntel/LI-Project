import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getAdminDb } from '../src/firebase/admin';
import { runTesAdaptor } from '../src/lib/crawler/adaptors/tes-adaptor';
import { runIngestionPipeline } from '../src/lib/pipelines/pipeline1-ingestion';

async function sweepTesJobsOnly() {
  const db = getAdminDb();
  console.log('================================================================');
  console.log('🔴 [TES ONLY SWEEP] Purging Cache & Running Direct TES Hub Sweep');
  console.log('================================================================\n');

  // 1. Flush featured_jobs_cache completely
  console.log('🧹 [STAGE 1] Flushing 100% of records from featured_jobs_cache...');
  const cacheSnap = await db.collection('featured_jobs_cache').get();
  let opsInBatch = 0;
  let batch = db.batch();
  let cleared = 0;

  for (const doc of cacheSnap.docs) {
    batch.delete(doc.ref);
    opsInBatch++;
    cleared++;
    if (opsInBatch >= 400) {
      await batch.commit();
      batch = db.batch();
      opsInBatch = 0;
    }
  }
  if (opsInBatch > 0) {
    await batch.commit();
  }
  console.log(`  ✅ Cleared ${cleared} legacy record(s). Cache is now 100% empty.\n`);

  // 2. Fetch all grounded school documents from Firestore
  const schoolsSnap = await db.collection('schools').get();
  console.log(`📌 [STAGE 2] Loaded ${schoolsSnap.size} grounded school document(s) from Firestore.\n`);

  let totalAccepted = 0;
  let totalRejected = 0;
  let totalTesSchoolsQueried = 0;

  for (let i = 0; i < schoolsSnap.docs.length; i++) {
    const doc = schoolsSnap.docs[i];
    const s = doc.data();
    const sid = doc.id;

    const schoolName = s.schoolname || s.name || sid;
    const tesSlug = s.tesEmployerSlug || s.tespage || undefined;
    const tesOrgId = s.tesOrganizationId || s.tesnumber || undefined;

    if (!tesSlug && !tesOrgId) {
      continue; // Skip schools without TES configurations
    }

    totalTesSchoolsQueried++;
    console.log(`[${totalTesSchoolsQueried}] Sweeping TES Hub for ${schoolName} (${sid})...`);

    try {
      const tesRecords = await runTesAdaptor({
        schoolId: sid,
        schoolName,
        city: s.city || '',
        country: s.country || '',
        tesEmployerSlug: tesSlug,
        tesOrganizationId: tesOrgId
      });

      if (tesRecords.length > 0) {
        const res = await runIngestionPipeline(sid, tesRecords);
        totalAccepted += res.accepted;
        totalRejected += res.rejected;
        console.log(`  ✅ TES Accepted: ${res.accepted} | Rejected: ${res.rejected}`);
      } else {
        console.log(`  ✓ 0 active TES vacancies currently listed.`);
      }
    } catch (err: any) {
      console.warn(`  ⚠️ TES Adaptor failed for ${sid}:`, err.message || err);
    }
  }

  const finalCacheSnap = await db.collection('featured_jobs_cache').get();

  console.log('\n================================================================');
  console.log('🎉 TES-ONLY SWEEP COMPLETE');
  console.log('================================================================');
  console.log(`  • Total TES Schools Swept: ${totalTesSchoolsQueried}`);
  console.log(`  • Total Active TES Vacancies Ingested: ${totalAccepted}`);
  console.log(`  • Total Invalid/Expired Vacancies Rejected: ${totalRejected}`);
  console.log(`  • Final Verified Live TES Featured Jobs: ${finalCacheSnap.size}`);
  console.log('================================================================\n');
}

sweepTesJobsOnly().catch(console.error);

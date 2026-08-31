import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getAdminDb } from '../src/firebase/admin';
import { getSourceTier } from '../src/lib/crawler/allowedSourcesRegistry';

async function fixExistingPendingJobs() {
  const db = getAdminDb();
  console.log('🛠️ [FIX] Converting Tier 1 pending_review jobs to approved status...\n');

  // Fix featured_jobs_cache
  const cacheSnap = await db.collection('featured_jobs_cache').get();
  console.log(`📦 Found ${cacheSnap.size} jobs in featured_jobs_cache.`);

  let cacheApprovedCount = 0;
  const batch = db.batch();

  cacheSnap.docs.forEach((d: any) => {
    const data = d.data();
    if (data.status === 'pending_review') {
      const tier = getSourceTier(data.applyUrl || '');
      if (tier === 1) {
        batch.update(d.ref, { status: 'approved' });
        cacheApprovedCount++;
      }
    }
  });

  if (cacheApprovedCount > 0) {
    await batch.commit();
    console.log(`✅ Promoted ${cacheApprovedCount} Tier 1 jobs to "approved" in featured_jobs_cache.`);
  } else {
    console.log('   → No Tier 1 pending jobs found in cache.');
  }

  // Fix subcollections
  const schoolsSnap = await db.collection('schools').get();
  let subApprovedCount = 0;

  for (const schoolDoc of schoolsSnap.docs) {
    const jobsSnap = await schoolDoc.ref.collection('jobs').get();
    if (!jobsSnap.empty) {
      const subBatch = db.batch();
      let hasUpdates = false;

      jobsSnap.docs.forEach((jDoc: any) => {
        const jData = jDoc.data();
        if (jData.status === 'pending_review') {
          const tier = getSourceTier(jData.applyUrl || jData.source_url || '');
          if (tier === 1) {
            subBatch.update(jDoc.ref, { status: 'approved' });
            subApprovedCount++;
            hasUpdates = true;
          }
        }
      });

      if (hasUpdates) {
        await subBatch.commit();
      }
    }
  }

  console.log(`✅ Promoted ${subApprovedCount} Tier 1 jobs to "approved" across school subcollections.`);
}

fixExistingPendingJobs().catch(console.error);

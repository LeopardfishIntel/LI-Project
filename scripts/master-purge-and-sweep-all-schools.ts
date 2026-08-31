import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getAdminDb } from '../src/firebase/admin';
import { runTesAdaptor } from '../src/lib/crawler/adaptors/tes-adaptor';
import { runSchoolWebsiteAdaptor } from '../src/lib/crawler/adaptors/school-website-adaptor';
import { runIngestionPipeline } from '../src/lib/pipelines/pipeline1-ingestion';
import { purgeExpiredAndStaleCacheJobs } from '../src/lib/crawler/automatedCachePurge';

async function masterPurgeAndSweepAllSchools() {
  const db = getAdminDb();
  console.log('================================================================');
  console.log('🚀 [MASTER PURGE & FULL SWEEP] Complete System Cleaning & Verification');
  console.log('================================================================\n');

  // 1. Purge expired/ungrounded jobs from featured_jobs_cache in safe 400-op chunks
  console.log('🧹 [STAGE 1] Executing Automated Cache Purge (Expired & Ungrounded)...');
  const purgeSummary = await purgeExpiredAndStaleCacheJobs();
  console.log(`  • Scanned: ${purgeSummary.scanned}`);
  console.log(`  • Purged Total: ${purgeSummary.purged} (Expired Dates: ${purgeSummary.expiredByDate}, Stale Rolling: ${purgeSummary.expiredByStaleness}, Ungrounded: ${purgeSummary.ungrounded})\n`);

  // 2. Fetch all 494 grounded school documents from Firestore
  const schoolsSnap = await db.collection('schools').get();
  console.log(`📌 [STAGE 2] Loaded ${schoolsSnap.size} grounded school document(s) from Firestore.\n`);

  let totalAccepted = 0;
  let totalRejected = 0;

  for (let i = 0; i < schoolsSnap.docs.length; i++) {
    const doc = schoolsSnap.docs[i];
    const s = doc.data();
    const sid = doc.id;

    // Legacy Field Fallbacks
    const schoolName = s.schoolname || s.name || sid;
    const tesSlug = s.tesEmployerSlug || s.tespage || undefined;
    const tesOrgId = s.tesOrganizationId || s.tesnumber || undefined;
    const careersPageUrl = s.careersPageUrl || s.schooljp || s.website || undefined;

    console.log(`[${i + 1}/${schoolsSnap.size}] Sweeping ${schoolName} (${sid})...`);

    const rawRecords: any[] = [];

    // A. TES Direct Hub Adaptor
    if (tesSlug || tesOrgId) {
      try {
        const tesRecords = await runTesAdaptor({
          schoolId: sid,
          schoolName,
          city: s.city || '',
          country: s.country || '',
          tesEmployerSlug: tesSlug,
          tesOrganizationId: tesOrgId
        });
        rawRecords.push(...tesRecords);
      } catch (err: any) {
        console.warn(`  ⚠️ TES Adaptor failed for ${sid}:`, err.message || err);
      }
    }

    // B. Direct School Careers Webpage Adaptor
    if (careersPageUrl && !careersPageUrl.includes('tes.com')) {
      try {
        const webRecords = await runSchoolWebsiteAdaptor({
          schoolId: sid,
          schoolName,
          city: s.city || '',
          country: s.country || '',
          careersPageUrl
        });
        rawRecords.push(...webRecords);
      } catch (err: any) {
        console.warn(`  ⚠️ Web Adaptor failed for ${sid}:`, err.message || err);
      }
    }

    if (rawRecords.length > 0) {
      const res = await runIngestionPipeline(sid, rawRecords);
      totalAccepted += res.accepted;
      totalRejected += res.rejected;
      console.log(`  ✅ Accepted: ${res.accepted} | Rejected: ${res.rejected}`);
    } else {
      console.log(`  ✓ 0 active vacancies at this moment.`);
    }
  }

  // 3. Post-sweep final cache purge to ensure 100% clean cache
  console.log('\n🧹 [STAGE 3] Running final post-sweep cache audit...');
  await purgeExpiredAndStaleCacheJobs();

  const finalCacheSnap = await db.collection('featured_jobs_cache').get();

  console.log('\n================================================================');
  console.log('🎉 MASTER PURGE & SWEEP COMPLETE');
  console.log('================================================================');
  console.log(`  • Total Schools Swept: ${schoolsSnap.size}`);
  console.log(`  • Total Vacancies Ingested: ${totalAccepted}`);
  console.log(`  • Total Invalid/Expired Vacancies Rejected: ${totalRejected}`);
  console.log(`  • Final Verified Live Featured Jobs: ${finalCacheSnap.size}`);
  console.log('================================================================\n');
}

masterPurgeAndSweepAllSchools().catch(console.error);

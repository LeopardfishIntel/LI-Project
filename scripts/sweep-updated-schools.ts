import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getAdminDb } from '../src/firebase/admin';
import { runTesAdaptor } from '../src/lib/crawler/adaptors/tes-adaptor';
import { runSchoolWebsiteAdaptor } from '../src/lib/crawler/adaptors/school-website-adaptor';
import { runIngestionPipeline } from '../src/lib/pipelines/pipeline1-ingestion';

async function sweepUpdatedSchools() {
  const db = getAdminDb();
  console.log('🚀 [FULL RE-SWEEP] Sweeping updated schools FLIS0001 through FLIS0203...\n');

  const schoolsSnap = await db.collection('schools').get();
  console.log(`📦 Loaded ${schoolsSnap.size} grounded school documents from Firestore.\n`);

  let totalAccepted = 0;
  let totalProcessed = 0;

  for (let i = 0; i < schoolsSnap.docs.length; i++) {
    const doc = schoolsSnap.docs[i];
    const s = doc.data();
    const schoolId = doc.id;
    const schoolName = s.schoolname || s.name || schoolId;
    const city = s.city || '';
    const country = s.country || '';
    const tesOrgId = s.tesOrganizationId || null;
    const tesSlug = s.tesEmployerSlug || null;
    const careersPageUrl = s.careersPageUrl || s.website || null;

    console.log(`[${i + 1}/${schoolsSnap.size}] Sweeping ${schoolName} (${schoolId})...`);

    const rawRecords: any[] = [];

    // 1. TES Direct Hub Adaptor
    if (tesSlug || tesOrgId) {
      try {
        const tesRecords = await runTesAdaptor({
          schoolId,
          schoolName,
          city,
          country,
          tesEmployerSlug: tesSlug || undefined,
          tesOrganizationId: tesOrgId || undefined,
        });
        rawRecords.push(...tesRecords);
      } catch (err: any) {
        console.warn(`  ⚠️ TES Adaptor failed for ${schoolId}:`, err.message || err);
      }
    }

    // 2. Direct Careers Webpage Adaptor
    if (careersPageUrl && !careersPageUrl.includes('tes.com')) {
      try {
        const webRecords = await runSchoolWebsiteAdaptor({
          schoolId,
          schoolName,
          city,
          country,
          careersPageUrl,
        });
        rawRecords.push(...webRecords);
      } catch (err: any) {
        console.warn(`  ⚠️ Web Adaptor failed for ${schoolId}:`, err.message || err);
      }
    }

    if (rawRecords.length > 0) {
      const res = await runIngestionPipeline(schoolId, rawRecords);
      totalAccepted += res.accepted;
      console.log(`  ✅ Accepted ${res.accepted} live vacancy record(s).`);
    } else {
      console.log(`  ✓ 0 live vacancies active.`);
    }

    totalProcessed++;
  }

  console.log('\n' + '='.repeat(65));
  console.log('🎉 FULL RE-SWEEP COMPLETE');
  console.log('='.repeat(65));
  console.log(`📦 Schools Swept: ${totalProcessed}`);
  console.log(`✅ Total Live Vacancies Ingested: ${totalAccepted}`);

  const cacheSnap = await db.collection('featured_jobs_cache').get();
  console.log(`📦 Final Total Featured Jobs Cache Count: ${cacheSnap.size}`);
  console.log('='.repeat(65));
}

sweepUpdatedSchools().catch(console.error);

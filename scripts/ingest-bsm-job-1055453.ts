import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getAdminDb } from '../src/firebase/admin';
import { runTesAdaptor } from '../src/lib/crawler/adaptors/tes-adaptor';
import { runIngestionPipeline } from '../src/lib/pipelines/pipeline1-ingestion';

async function ingestBsm1055453() {
  const db = getAdminDb();
  console.log('🚀 [BSM FIX] Updating FLIS0126 TES slug to "british-school-muscat-1055453" and ingesting live vacancy...\n');

  // 1. Update FLIS0126 document with correct TES org ID and slug
  await db.collection('schools').doc('FLIS0126').set({
    tesOrganizationId: '1055453',
    tesEmployerSlug: 'british-school-muscat-1055453',
    revalidationStatus: 'success',
    updatedAt: new Date().toISOString()
  }, { merge: true });

  console.log('✅ Updated FLIS0126 document in schools collection.');

  // 2. Run TES Adaptor for FLIS0126
  const rawRecords = await runTesAdaptor({
    schoolId: 'FLIS0126',
    schoolName: 'British School Muscat',
    city: 'Muscat',
    country: 'Oman',
    tesEmployerSlug: 'british-school-muscat-1055453',
    tesOrganizationId: '1055453'
  });

  console.log(`🔴 Scraped ${rawRecords.length} raw record(s) from TES employer page 1055453:`, rawRecords);

  // 3. Run Ingestion Pipeline
  const result = await runIngestionPipeline('FLIS0126', rawRecords);
  console.log('\n==================================================');
  console.log('📊 INGESTION RESULTS FOR BSM:');
  console.log(`  Accepted: ${result.accepted}`);
  console.log(`  Rejected: ${result.rejected}`);
  console.log(`  Reasons:`, result.reasons);
  console.log('==================================================');

  const cacheSnap = await db.collection('featured_jobs_cache').get();
  console.log(`📦 Final Total Featured Jobs Cache Count: ${cacheSnap.size}`);
}

ingestBsm1055453().catch(console.error);

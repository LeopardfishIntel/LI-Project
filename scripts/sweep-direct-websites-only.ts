import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getAdminDb } from '../src/firebase/admin';
import { runSchoolWebsiteAdaptor } from '../src/lib/crawler/adaptors/school-website-adaptor';
import { runIngestionPipeline } from '../src/lib/pipelines/pipeline1-ingestion';
import { runJanitorPipeline } from '../src/lib/pipelines/pipeline3-janitor';

// 5 parallel headless workers
const CONCURRENCY = 5;

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const startTime = Date.now();
  console.log('================================================================');
  console.log('🌐 [DIRECT SCHOOL WEBSITES SWEEPER] Starting Live Direct School Crawl...');
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  console.log('⚡ Concurrency: 5 workers | Network Asset Aborting: Active | Invariant SHA-256: Active');
  console.log('================================================================\n');

  const db = getAdminDb();
  if (!db) {
    console.error('❌ Failed to initialize Admin Firestore DB.');
    process.exit(1);
  }

  const schoolsSnap = await db.collection('schools').get();
  const schoolDocs = schoolsSnap.docs.filter((doc: any) => {
    const s = doc.data();
    return Boolean(s.careersPageUrl || s.website);
  });

  console.log(`📦 Loaded ${schoolDocs.length} schools with active direct careers / website URLs.\n`);

  let totalProcessed = 0;
  let totalRawDiscovered = 0;
  let totalAcceptedJobs = 0;
  const discoveredBySchool: Array<{ schoolId: string; schoolName: string; country: string; vacanciesCount: number; titles: string[] }> = [];

  for (let i = 0; i < schoolDocs.length; i += CONCURRENCY) {
    const chunk = schoolDocs.slice(i, i + CONCURRENCY);

    await Promise.allSettled(
      chunk.map(async (doc: any) => {
        const s = doc.data();
        const schoolId = doc.id;
        const schoolName = s.schoolname || s.name || schoolId;
        const city = s.city || '';
        const country = s.country || '';
        const careersPageUrl = s.careersPageUrl || s.website;

        try {
          const webRecords = await runSchoolWebsiteAdaptor({
            schoolId,
            schoolName,
            city,
            country,
            careersPageUrl,
          });

          totalProcessed++;
          totalRawDiscovered += webRecords.length;

          if (webRecords.length > 0) {
            const ingResult = await runIngestionPipeline(schoolId, webRecords);
            const accepted = ingResult.accepted || 0;
            totalAcceptedJobs += accepted;

            if (accepted > 0) {
              discoveredBySchool.push({
                schoolId,
                schoolName,
                country,
                vacanciesCount: accepted,
                titles: webRecords.slice(0, 5).map((r: any) => r.rawTitle || r.title || 'Teaching Role')
              });
              console.log(`  ✅ [${schoolId}] ${schoolName} (${country}): ${accepted} vacancies ingested.`);
            }
          }
        } catch (err: any) {
          totalProcessed++;
          // Fail silently for network timeouts
        }
      })
    );

    const elapsedSec = Math.round((Date.now() - startTime) / 1000);
    console.log(`📈 Progress: ${Math.min(i + CONCURRENCY, schoolDocs.length)}/${schoolDocs.length} schools swept (${elapsedSec}s elapsed)...`);
    await sleep(250);
  }

  console.log('\n================================================================');
  console.log('🧹 [PIPELINE 3 - JANITOR] Syncing cache and recalculating counters...');
  console.log('================================================================');
  const janitorResult = await runJanitorPipeline();
  const cacheSnap = await db.collection('featured_jobs_cache').get();

  const totalDurationSec = Math.round((Date.now() - startTime) / 1000);
  const minutes = Math.floor(totalDurationSec / 60);
  const seconds = totalDurationSec % 60;

  console.log('\n================================================================');
  console.log('📊 [DIRECT WEBSITES SWEEP SUMMARY]');
  console.log(`• Duration: ${minutes}m ${seconds}s`);
  console.log(`• Schools Swept: ${totalProcessed}`);
  console.log(`• Raw Vacancies Discovered: ${totalRawDiscovered}`);
  console.log(`• Accepted Academic Jobs: ${totalAcceptedJobs}`);
  console.log(`• Total Featured Jobs in Platform Cache: ${cacheSnap.size}`);
  console.log('================================================================\n');

  if (discoveredBySchool.length > 0) {
    console.log('Active teaching vacancies discovered on direct school sites:');
    discoveredBySchool.forEach(d => {
      console.log(`• ${d.schoolName} (${d.country}) [${d.schoolId}]: ${d.vacanciesCount} jobs -> ${d.titles.join(', ')}`);
    });
  }
}

main().catch(console.error);

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getAdminDb } from '../src/firebase/admin';
import { runSchoolWebsiteAdaptor } from '../src/lib/crawler/adaptors/school-website-adaptor';
import { runTesAdaptor } from '../src/lib/crawler/adaptors/tes-adaptor';
import { runIngestionPipeline } from '../src/lib/pipelines/pipeline1-ingestion';
import { runJanitorPipeline } from '../src/lib/pipelines/pipeline3-janitor';

// 5 parallel headless workers
const CONCURRENCY = 5;

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function runRotatingWeekdaySweep(forcePartition?: number) {
  const startTime = Date.now();
  const date = new Date();
  const dayOfWeek = date.getDay(); // 0 = Sun, 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat

  // Map Monday(1)->0, Tuesday(2)->1, Wednesday(3)->2, Thursday(4)->3, Friday(5)->4
  // If weekend (0 or 6), default to full 5-day cycle or partition 0
  let partitionIndex = forcePartition !== undefined ? forcePartition : (dayOfWeek >= 1 && dayOfWeek <= 5 ? dayOfWeek - 1 : 0);
  const dayNames = ['Monday (Cohort A)', 'Tuesday (Cohort B)', 'Wednesday (Cohort C)', 'Thursday (Cohort D)', 'Friday (Cohort E)'];

  console.log('================================================================');
  console.log(`🌐 [WEEKDAY ROTATING SWEEPER] Starting 20% Rotating Crawl`);
  console.log(`📅 Execution Day: ${dayNames[partitionIndex]} | Partition: ${partitionIndex + 1}/5`);
  console.log(`⏰ Started at: ${date.toISOString()}`);
  console.log('================================================================\n');

  const db = getAdminDb();
  if (!db) {
    console.error('❌ Failed to initialize Admin Firestore DB.');
    process.exit(1);
  }

  const schoolsSnap = await db.collection('schools').get();
  const allSchools = schoolsSnap.docs
    .filter((doc: any) => !doc.data().isCampusStub)
    .map((doc: any) => ({ id: doc.id, ...doc.data() }));

  // Deterministically sort schools by ID to create stable cohorts
  allSchools.sort((a: any, b: any) => a.id.localeCompare(b.id));

  // Partition into 5 equal 20% cohorts
  const targetCohort = allSchools.filter((_: any, idx: number) => idx % 5 === partitionIndex);

  console.log(`📦 Loaded ${allSchools.length} total recognized schools.`);
  console.log(`🎯 Today's 20% Rotating Cohort: ${targetCohort.length} schools to sweep.\n`);

  let totalProcessed = 0;
  let totalRawDiscovered = 0;
  let totalAcceptedJobs = 0;
  const discoveredBySchool: Array<{ schoolId: string; schoolName: string; country: string; vacanciesCount: number; titles: string[] }> = [];

  for (let i = 0; i < targetCohort.length; i += CONCURRENCY) {
    const chunk = targetCohort.slice(i, i + CONCURRENCY);

    await Promise.allSettled(
      chunk.map(async (school: any) => {
        const schoolId = school.id;
        const schoolName = school.schoolname || school.name || schoolId;
        const city = school.city || '';
        const country = school.country || '';
        const careersPageUrl = school.careersPageUrl || school.website;
        const tesSlug = school.tesEmployerSlug || null;
        const tesOrgId = school.tesOrganizationId || null;

        const rawRecords: any[] = [];

        // 1. Direct Careers Web Portal
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
          } catch {
            // Fail gracefully
          }
        }

        // 2. TES Adaptor (if indexed on TES)
        if (tesSlug || tesOrgId) {
          try {
            const tesRecords = await runTesAdaptor({
              schoolId,
              schoolName,
              city,
              country,
              tesEmployerSlug: tesSlug || undefined,
              tesOrganizationId: tesOrgId || undefined
            });
            rawRecords.push(...tesRecords);
          } catch {
            // Fail gracefully
          }
        }

        totalProcessed++;
        totalRawDiscovered += rawRecords.length;

        if (rawRecords.length > 0) {
          try {
            const ingResult = await runIngestionPipeline(schoolId, rawRecords);
            const accepted = ingResult.accepted || 0;
            totalAcceptedJobs += accepted;

            if (accepted > 0) {
              discoveredBySchool.push({
                schoolId,
                schoolName,
                country,
                vacanciesCount: accepted,
                titles: rawRecords.slice(0, 5).map((r: any) => r.rawTitle || r.title || 'Teaching Role')
              });
              console.log(`  ✅ [${schoolId}] ${schoolName} (${country}): ${accepted} vacancies ingested.`);
            }
          } catch (err: any) {
            console.warn(`  ⚠️ Ingestion error for ${schoolId}:`, err.message || err);
          }
        }
      })
    );

    const elapsedSec = Math.round((Date.now() - startTime) / 1000);
    console.log(`📈 Progress: ${Math.min(i + CONCURRENCY, targetCohort.length)}/${targetCohort.length} cohort schools swept (${elapsedSec}s elapsed)...`);
    await sleep(250);
  }

  console.log('\n================================================================');
  console.log('🧹 [PIPELINE 3 - JANITOR] Syncing cache and recalculating counters...');
  console.log('================================================================');
  const janitorResult = await runJanitorPipeline();
  const cacheSnap = await db.collection('featured_jobs_cache').get();

  const totalDurationSec = Math.round((Date.now() - startTime) / 1000);

  console.log('\n================================================================');
  console.log(`📊 [ROTATING SWEEP SUMMARY - ${dayNames[partitionIndex]}]`);
  console.log(`• Duration: ${totalDurationSec}s`);
  console.log(`• Cohort Schools Swept: ${totalProcessed} / ${targetCohort.length}`);
  console.log(`• Raw Vacancies Found: ${totalRawDiscovered}`);
  console.log(`• Accepted Teaching Jobs: ${totalAcceptedJobs}`);
  console.log(`• Total Active Featured Jobs in Platform Cache: ${cacheSnap.size}`);
  console.log('================================================================\n');

  if (discoveredBySchool.length > 0) {
    console.log('Active teaching vacancies discovered in this 20% cohort:');
    discoveredBySchool.forEach(d => {
      console.log(`• ${d.schoolName} (${d.country}) [${d.schoolId}]: ${d.vacanciesCount} jobs -> ${d.titles.join(', ')}`);
    });
  }
}

if (require.main === module) {
  runRotatingWeekdaySweep().catch(console.error);
}

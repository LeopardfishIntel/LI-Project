import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getAdminDb, getCollectionDocs } from '../src/firebase/admin';
import { runTesAdaptor } from '../src/lib/crawler/adaptors/tes-adaptor';
import { runSchoolWebsiteAdaptor } from '../src/lib/crawler/adaptors/school-website-adaptor';
import { runIngestionPipeline } from '../src/lib/pipelines/pipeline1-ingestion';
import { runJanitorPipeline } from '../src/lib/pipelines/pipeline3-janitor';

const CONCURRENCY = 4;

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('================================================================');
  console.log('🚀 [JOB SWEEPER ENGINE] Sweeping all recognized international schools (Concurrent)...');
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  console.log('================================================================\n');

  const db = getAdminDb();
  if (!db) {
    console.error('❌ Failed to initialize Admin Firestore DB.');
    process.exit(1);
  }

  const schoolsSnap = await db.collection('schools').get();
  console.log(`📦 Loaded ${schoolsSnap.size} school entities from Firestore.\n`);

  let totalProcessed = 0;
  let totalRawDiscovered = 0;
  let totalAcceptedJobs = 0;
  const discoveredBySchool: Array<{ schoolId: string; schoolName: string; country: string; vacanciesCount: number; titles: string[] }> = [];

  const schoolDocs = schoolsSnap.docs;

  for (let i = 0; i < schoolDocs.length; i += CONCURRENCY) {
    const chunk = schoolDocs.slice(i, i + CONCURRENCY);

    await Promise.allSettled(
      chunk.map(async (doc: any) => {
        const s = doc.data();
        const schoolId = doc.id;
        const schoolName = s.schoolname || s.name || schoolId;
        const city = s.city || '';
        const country = s.country || '';
        const tesOrgId = s.tesOrganizationId || null;
        const tesSlug = s.tesEmployerSlug || null;
        const careersPageUrl = s.careersPageUrl || s.website || null;

        const rawRecords: any[] = [];

        // 1. TES Direct Adaptor
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
            // silent catch
          }
        }

        // 2. Direct School Website Careers Adaptor
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
            // silent catch
          }
        }

        totalProcessed++;
        totalRawDiscovered += rawRecords.length;

        if (rawRecords.length > 0) {
          try {
            const ingResult = await runIngestionPipeline(schoolId, rawRecords);
            totalAcceptedJobs += (ingResult.accepted || 0);

            if (ingResult.accepted > 0) {
              discoveredBySchool.push({
                schoolId,
                schoolName,
                country,
                vacanciesCount: ingResult.accepted,
                titles: rawRecords.slice(0, 5).map(r => r.title)
              });
              console.log(`  ✅ [${schoolId}] ${schoolName} (${country}): ${ingResult.accepted} active vacancies ingested.`);
            }
          } catch (err: any) {
            console.warn(`  ⚠️ Ingestion error for ${schoolId}:`, err.message || err);
          }
        }
      })
    );

    console.log(`📈 Progress: ${Math.min(i + CONCURRENCY, schoolDocs.length)}/${schoolDocs.length} schools swept.`);
    await sleep(500);
  }

  console.log('\n================================================================');
  console.log('🧹 [PIPELINE 3 - JANITOR] Purging expired vacancies and syncing counters...');
  console.log('================================================================');
  const janitorResult = await runJanitorPipeline();
  const cacheSnap = await db.collection('featured_jobs_cache').get();
  console.log(`✨ Janitor complete: Expired purged=${janitorResult.expired}, Promoted=${janitorResult.promoted}, Active Cache Total=${cacheSnap.size}`);

  console.log('\n================================================================');
  console.log('📊 [SWEEP REPORT SUMMARY]');
  console.log(`• Total Schools Swept: ${totalProcessed}`);
  console.log(`• Total Raw Records Found: ${totalRawDiscovered}`);
  console.log(`• Total Accepted Vacancies: ${totalAcceptedJobs}`);
  console.log(`• Total Active Featured Jobs in Platform Cache: ${cacheSnap.size}`);
  console.log('================================================================\n');

  if (discoveredBySchool.length > 0) {
    console.log('Schools with active teaching vacancies:');
    discoveredBySchool.forEach(d => {
      console.log(`- ${d.schoolName} (${d.country}) [${d.schoolId}]: ${d.vacanciesCount} jobs -> ${d.titles.join(', ')}`);
    });
  }
}

main().catch(console.error);

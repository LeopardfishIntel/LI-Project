/**
 * 🛰️ LEOPARDFISH 24-HOUR AUTOMATED DB SWEEP RUNNER
 * Sweeps all schools that have not been updated in the past 24 hours.
 */
import { getCollectionDocs, updateDocument } from '../src/firebase/admin';
import { getSchoolStabilityReport } from '../src/app/financial-forecaster/actions';

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const CONCURRENT_WORKERS = 4;

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function run24HourSweep() {
  console.log(`\n=============================================================`);
  console.log(`🚀 [24H AUTO SWEEP] Starting automated daily school sweep...`);
  console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
  console.log(`=============================================================\n`);

  try {
    const schools = await getCollectionDocs('schools');
    const now = Date.now();

    const staleSchools: any[] = [];
    for (const s of schools) {
      const data = s.data();
      let lastScraped: number | null = null;
      if (data.lastScrapedAt) {
        if (data.lastScrapedAt.seconds) {
          lastScraped = data.lastScrapedAt.seconds * 1000;
        } else {
          lastScraped = new Date(data.lastScrapedAt).getTime();
        }
      }

      if (lastScraped === null || (now - lastScraped) >= TWENTY_FOUR_HOURS_MS) {
        staleSchools.push({
          id: s.id,
          name: data.schoolname || data.name || 'Unknown School',
          city: data.city || '',
          country: data.country || '',
          estimatedStaffBase: data.estimatedStaffBase || 100,
          lastScraped
        });
      }
    }

    console.log(`📊 [24H AUTO SWEEP] Total schools in database: ${schools.length}`);
    console.log(`🎯 [24H AUTO SWEEP] Schools needing 24h refresh: ${staleSchools.length}`);

    if (staleSchools.length === 0) {
      console.log(`✨ All ${schools.length} schools are fresh (<24h old). No sweep needed today.`);
      return;
    }

    // Process in batches with CONCURRENT_WORKERS
    let completed = 0;
    for (let i = 0; i < staleSchools.length; i += CONCURRENT_WORKERS) {
      const chunk = staleSchools.slice(i, i + CONCURRENT_WORKERS);
      console.log(`\n⏳ [BATCH ${Math.floor(i / CONCURRENT_WORKERS) + 1}/${Math.ceil(staleSchools.length / CONCURRENT_WORKERS)}] Sweeping ${chunk.length} schools concurrently...`);
      
      await Promise.allSettled(
        chunk.map(async (school) => {
          try {
            console.log(`  🔍 Sweeping: ${school.name} (${school.id}) [${school.city}, ${school.country}]...`);
            const res = await getSchoolStabilityReport({
              schoolId: school.id,
              schoolName: school.name,
              estimatedStaffBase: school.estimatedStaffBase || 100,
              city: school.city,
              country: school.country,
              forceRefresh: true
            });
            const found = res.data?.vacancies_discovered?.length || 0;
            console.log(`  ✅ [DONE] ${school.name}: ${found} active vacancies indexed.`);
          } catch (err: any) {
            console.error(`  ❌ [FAIL] ${school.name}:`, err?.message || err);
          }
        })
      );

      completed += chunk.length;
      console.log(`📈 Progress: ${completed}/${staleSchools.length} schools processed.`);
      if (i + CONCURRENT_WORKERS < staleSchools.length) {
        await sleep(1500);
      }
    }

    console.log(`\n=============================================================`);
    console.log(`🎉 [24H AUTO SWEEP COMPLETE] Processed ${staleSchools.length} schools.`);
    console.log(`=============================================================\n`);
  } catch (err) {
    console.error(`💥 [24H AUTO SWEEP CRITICAL ERROR]:`, err);
  }
}

// Run immediately if executed directly
if (require.main === module || process.argv[1]?.includes('auto-daily-sweep')) {
  run24HourSweep().catch(console.error);
}

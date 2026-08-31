import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getAdminDb } from '../src/firebase/admin';
import { searchVacancies } from '../src/ai/flows/search-vacancies-flow';

const TEST_TARGETS = [
  { schoolId: 'flis0078', schoolName: 'College du Leman', city: 'Geneva', country: 'Switzerland' },
  { schoolId: 'flis0079', schoolName: 'International School of Brussels', city: 'Brussels', country: 'Belgium' },
  { schoolId: 'flis0204', schoolName: 'St. Gilgen International School', city: 'St. Gilgen', country: 'Austria' },
  { schoolId: 'flis0213', schoolName: 'Vienna International School', city: 'Vienna', country: 'Austria' },
  { schoolId: 'flis0115_jumeira', schoolName: 'Dubai British School (Jumeira)', city: 'Dubai Jumeira', country: 'UAE' },
];

async function clearCacheCollection(): Promise<number> {
  const db = getAdminDb();
  console.log('🧹 [CACHE RESET] Clearing featured_jobs_cache collection...');
  const snap = await db.collection('featured_jobs_cache').get();
  if (snap.empty) {
    console.log('   → featured_jobs_cache is already empty.');
    return 0;
  }

  const CHUNK = 400;
  let deleted = 0;
  for (let i = 0; i < snap.docs.length; i += CHUNK) {
    const batch = db.batch();
    snap.docs.slice(i, i + CHUNK).forEach((d: any) => batch.delete(d.ref));
    await batch.commit();
    deleted += Math.min(CHUNK, snap.docs.length - i);
  }

  console.log(`   ✅ Cleared ${deleted} cache documents from featured_jobs_cache.`);
  return deleted;
}

async function runBenchmarkSweep() {
  console.log('\n🚀 [BENCHMARK SWEEP] Starting cache reset and new pipeline sweep...');
  const startTime = Date.now();

  await clearCacheCollection();

  console.log(`\n🛸 [BENCHMARK SWEEP] Sweeping ${TEST_TARGETS.length} test schools with new pipeline...`);

  let totalJobsFound = 0;
  const results: Array<{ schoolName: string; count: number; timeSec: number; success: boolean }> = [];

  for (const target of TEST_TARGETS) {
    const schoolStart = Date.now();
    try {
      console.log(`\n────────────────────────────────────────────────────────────`);
      console.log(`🔍 [SWEEP] Target: ${target.schoolName} (${target.city}, ${target.country})`);
      const res = await searchVacancies({
        schoolName: target.schoolName,
        city: target.city,
        country: target.country,
      });

      const schoolTimeSec = parseFloat(((Date.now() - schoolStart) / 1000).toFixed(2));
      totalJobsFound += res.scrapedJobsCount;
      results.push({
        schoolName: target.schoolName,
        count: res.scrapedJobsCount,
        timeSec: schoolTimeSec,
        success: true,
      });

      console.log(`   ⏱️ Completed in ${schoolTimeSec}s | Discovered & Ingested: ${res.scrapedJobsCount} verified vacancy/vacancies`);
    } catch (err: any) {
      const schoolTimeSec = parseFloat(((Date.now() - schoolStart) / 1000).toFixed(2));
      console.error(`   ❌ Sweep failed for ${target.schoolName}:`, err.message || err);
      results.push({
        schoolName: target.schoolName,
        count: 0,
        timeSec: schoolTimeSec,
        success: false,
      });
    }
  }

  const totalTimeSec = parseFloat(((Date.now() - startTime) / 1000).toFixed(2));

  console.log('\n' + '='.repeat(65));
  console.log('📊 PERFORMANCE & RELIABILITY BENCHMARK REPORT');
  console.log('='.repeat(65));
  console.log(`⏱️ Total Execution Time: ${totalTimeSec} seconds`);
  console.log(`🎯 Total Target Schools: ${TEST_TARGETS.length}`);
  console.log(`📦 Total Verified Vacancies Ingested: ${totalJobsFound}`);
  console.log(`⚡ Average Time Per School: ${(totalTimeSec / TEST_TARGETS.length).toFixed(2)} seconds\n`);

  console.log('Detailed Breakdown:');
  results.forEach((r, i) => {
    const statusIcon = r.success ? '✅' : '❌';
    console.log(`   ${i + 1}. ${statusIcon} ${r.schoolName.padEnd(42, ' ')} | Jobs: ${String(r.count).padStart(2, ' ')} | Time: ${r.timeSec}s`);
  });
  console.log('='.repeat(65));
}

runBenchmarkSweep().catch(err => {
  console.error('❌ Benchmark execution failed:', err);
  process.exit(1);
});

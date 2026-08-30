import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { exec } from 'child_process';
import { promisify } from 'util';
import { getAdminDb } from '../src/firebase/admin';

const execPromise = promisify(exec);

async function delayMinutes(mins: number) {
  console.log(`⏱️ [SCHEDULER GAP] Waiting ${mins} minutes buffer before launching next search protocol...`);
  await new Promise((resolve) => setTimeout(resolve, mins * 60 * 1000));
}

export async function runMasterSequentialSweep() {
  const startTime = Date.now();
  console.log('\n================================================================');
  console.log(`⏰ [MASTER SCHEDULER] Multi-Engine Sequential Sweep Started at ${new Date().toISOString()}`);
  console.log('================================================================\n');

  // STEP 1: RUN TES SEARCH
  console.log('🔴 [STEP 1/4] Launching Protocol 1: TES Search Engine...');
  try {
    const { stdout, stderr } = await execPromise('npx tsx scripts/sweep-tes-jobs-only.ts');
    console.log('✅ [STEP 1/4 COMPLETE] TES Search output:');
    console.log(stdout.split('\n').slice(-10).join('\n'));
  } catch (err: any) {
    console.error('⚠️ [STEP 1/4 ERROR] TES Search encountered an issue:', err.message);
  }

  // STEP 2: 15-MINUTE BUFFER GAP
  console.log('\n----------------------------------------------------------------');
  await delayMinutes(15);
  console.log('----------------------------------------------------------------\n');

  // STEP 3: RUN NORD ANGLIA SEARCH
  console.log('🦁 [STEP 3/4] Launching Protocol 2: Nord Anglia Search Engine...');
  try {
    const { stdout, stderr } = await execPromise('npx tsx scripts/sweep-nord-anglia-search.ts');
    console.log('✅ [STEP 3/4 COMPLETE] Nord Anglia Search output:');
    console.log(stdout.split('\n').slice(-10).join('\n'));
  } catch (err: any) {
    console.error('⚠️ [STEP 3/4 ERROR] Nord Anglia Search encountered an issue:', err.message);
  }

  // STEP 4: JANITOR PURGE & CACHE AUDIT
  console.log('\n🧹 [STEP 4/4] Executing Janitor Purge & Cache Verification...');
  try {
    const db = getAdminDb();
    const snap = await db.collection('featured_jobs_cache').get();
    const bySource: Record<string, number> = {};
    snap.docs.forEach((d: any) => {
      const src = d.data().source || 'Unknown';
      bySource[src] = (bySource[src] || 0) + 1;
    });

    const elapsedMins = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
    console.log('\n================================================================');
    console.log(`🎉 MASTER MULTI-ENGINE SWEEP COMPLETE in ${elapsedMins} minutes`);
    console.log('================================================================');
    console.log(`  • Total Active Featured Jobs in Cache: ${snap.size}`);
    Object.entries(bySource).forEach(([src, cnt]) => {
      console.log(`     - [${src} Search]: ${cnt} active academic vacancies`);
    });
    console.log('================================================================\n');
  } catch (err: any) {
    console.error('⚠️ [STEP 4/4 ERROR] Janitor audit failed:', err.message);
  }
}

// Allow CLI execution
if (require.main === module) {
  runMasterSequentialSweep().catch(console.error);
}

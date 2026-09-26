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
  console.log('🦁 [STEP 3/5] Launching Protocol 2: Nord Anglia Search Engine...');
  try {
    const { stdout, stderr } = await execPromise('npx tsx scripts/sweep-nord-anglia-search.ts');
    console.log('✅ [STEP 3/5 COMPLETE] Nord Anglia Search output:');
    console.log(stdout.split('\n').slice(-10).join('\n'));
  } catch (err: any) {
    console.error('⚠️ [STEP 3/5 ERROR] Nord Anglia Search encountered an issue:', err.message);
  }

  // STEP 4: 10-MINUTE POST-CRAWL BUFFER
  console.log('\n----------------------------------------------------------------');
  await delayMinutes(10);
  console.log('----------------------------------------------------------------\n');

  // STEP 5: DAILY POST-SWEEP VERIFICATION GUARDIAN
  console.log('🛡️ [STEP 5/5] Launching Daily Post-Sweep Verification Guardian...');
  try {
    const { runDailyJobVerification } = await import('./daily-post-sweep-verification');
    const report = await runDailyJobVerification();
    const elapsedMins = ((Date.now() - startTime) / 1000 / 60).toFixed(2);

    console.log('\n================================================================');
    console.log(`🎉 MASTER MULTI-ENGINE SWEEP & VERIFICATION COMPLETE in ${elapsedMins} mins`);
    console.log('================================================================');
    console.log(`  • Total Active Featured Jobs in Cache: ${report.activeVacanciesTotal}`);
    console.log(`  • Verified Live Postings: ${report.liveVerified}`);
    console.log(`  • Expired Postings Purged: ${report.expiredDatePurged + report.expiredBannersPurged}`);
    console.log(`  • Dead Links / 404s Purged: ${report.deadLinksPurged}`);
    console.log(`  • Geographic Mismatches Purged: ${report.geographicMismatchesPurged}`);
    console.log(`  • Schools Synced with Parity: ${report.syncedSchoolsCount}`);
    console.log('================================================================\n');
  } catch (err: any) {
    console.error('⚠️ [STEP 5/5 ERROR] Post-sweep verification failed:', err.message);
  }
}

// Allow CLI execution
if (require.main === module) {
  runMasterSequentialSweep().catch(console.error);
}

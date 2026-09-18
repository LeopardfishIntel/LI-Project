#!/usr/bin/env npx tsx
/**
 * 🛸 ADMIN SCRIPT: Full Cache Reset + Force Re-Sweep
 *
 * Usage:
 *   npx tsx scripts/reset-and-sweep.mts [--dry-run] [--limit=N]
 *
 * What it does:
 *   1. Clears featured_jobs_cache collection
 *   2. Clears all schools/{id}/jobs subcollections
 *   3. Resets lastScrapedAt on all school documents
 *   4. Triggers scrape workers for all (or --limit=N) schools in parallel
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Args
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const limitArg = args.find(a => a.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : Infinity;

// Init Admin SDK
if (!getApps().length) {
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    path.resolve(process.cwd(), 'service-account.json');
  
  if (fs.existsSync(serviceAccountPath)) {
    initializeApp({ credential: cert(serviceAccountPath) });
    console.log('✅ Firebase Admin SDK initialized from service account file.');
  } else {
    // Try FIREBASE_ADMIN_SDK_CONFIG env var (base64 or JSON string)
    const sdkConfig = process.env.FIREBASE_ADMIN_SDK_CONFIG;
    if (sdkConfig) {
      try {
        const parsed = JSON.parse(
          sdkConfig.startsWith('{') ? sdkConfig : Buffer.from(sdkConfig, 'base64').toString('utf-8')
        );
        initializeApp({ credential: cert(parsed) });
        console.log('✅ Firebase Admin SDK initialized from FIREBASE_ADMIN_SDK_CONFIG env.');
      } catch (e) {
        console.error('❌ Could not parse FIREBASE_ADMIN_SDK_CONFIG:', e);
        process.exit(1);
      }
    } else {
      // Try application default credentials
      initializeApp();
      console.log('✅ Firebase Admin SDK initialized via Application Default Credentials.');
    }
  }
}

const db = getFirestore();

async function deleteBatch(docs: FirebaseFirestore.QueryDocumentSnapshot[]): Promise<void> {
  const CHUNK = 400;
  for (let i = 0; i < docs.length; i += CHUNK) {
    const batch = db.batch();
    docs.slice(i, i + CHUNK).forEach(d => batch.delete(d.ref));
    await batch.commit();
  }
}

async function main() {
  console.log(`\n🛸 RESET + RE-SWEEP ${isDryRun ? '(DRY RUN — no data modified)' : '(LIVE)'}`);
  console.log('='.repeat(60));

  // ── Step 1: Clear featured_jobs_cache ──────────────────────────
  console.log('\n📦 Step 1: Clearing featured_jobs_cache...');
  const cacheSnap = await db.collection('featured_jobs_cache').get();
  console.log(`   → Found ${cacheSnap.size} cache documents.`);
  if (!isDryRun && !cacheSnap.empty) {
    await deleteBatch(cacheSnap.docs);
    console.log(`   ✅ Deleted ${cacheSnap.size} cache documents.`);
  } else if (isDryRun) {
    console.log(`   [DRY RUN] Would delete ${cacheSnap.size} docs.`);
  }

  // ── Step 2: Clear all schools/{id}/jobs subcollections ─────────
  console.log('\n📦 Step 2: Clearing schools/{id}/jobs subcollections...');
  const schoolsSnap = await db.collection('schools').get();
  console.log(`   → Found ${schoolsSnap.size} schools.`);
  let totalJobs = 0;

  const clearOps = schoolsSnap.docs.map(async (schoolDoc) => {
    const jobsSnap = await schoolDoc.ref.collection('jobs').get();
    if (!jobsSnap.empty) {
      totalJobs += jobsSnap.size;
      if (!isDryRun) {
        await deleteBatch(jobsSnap.docs);
      }
    }
  });
  await Promise.all(clearOps);
  console.log(`   ${isDryRun ? '[DRY RUN] Would delete' : '✅ Deleted'} ${totalJobs} job documents across ${schoolsSnap.size} schools.`);

  // ── Step 3: Reset lastScrapedAt on all schools ─────────────────
  console.log('\n📦 Step 3: Resetting lastScrapedAt on all schools...');
  if (!isDryRun) {
    const resetOps = schoolsSnap.docs.map(schoolDoc =>
      schoolDoc.ref.set({
        lastScrapedAt: null,
        isRevalidating: false,
        revalidationStatus: null,
        scrapedJobsCount: 0,
        scrapedJobsList: [],
      }, { merge: true })
    );
    await Promise.all(resetOps);
    console.log(`   ✅ Reset ${schoolsSnap.size} schools.`);
  } else {
    console.log(`   [DRY RUN] Would reset ${schoolsSnap.size} schools.`);
  }

  // ── Step 4: Trigger scrape workers ────────────────────────────
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002';
  const targets = schoolsSnap.docs.slice(0, limit === Infinity ? schoolsSnap.size : limit);
  console.log(`\n🚀 Step 4: Triggering scrape workers for ${targets.length} schools via ${baseUrl}...`);

  if (!isDryRun) {
    let queued = 0;
    let failed = 0;
    for (const schoolDoc of targets) {
      const data = schoolDoc.data();
      try {
        const res = await fetch(`${baseUrl}/api/tasks/scrape-worker`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            schoolId: schoolDoc.id,
            schoolName: data.schoolname || data.name || schoolDoc.id,
            city: data.city || '',
            country: data.country || '',
          }),
        });
        if (res.ok) {
          queued++;
          process.stdout.write(`\r   Queued: ${queued}/${targets.length} schools...`);
        } else {
          failed++;
          console.warn(`\n   ⚠️  ${schoolDoc.id}: HTTP ${res.status}`);
        }
      } catch (err: any) {
        failed++;
        console.warn(`\n   ⚠️  ${schoolDoc.id}: ${err?.message}`);
      }
    }
    console.log(`\n   ✅ Queued: ${queued} | Failed: ${failed}`);
  } else {
    console.log(`   [DRY RUN] Would trigger scrape for ${targets.length} schools.`);
  }

  console.log('\n' + '='.repeat(60));
  if (isDryRun) {
    console.log('🟡 DRY RUN COMPLETE — rerun without --dry-run to apply changes.');
  } else {
    console.log(`✅ RESET COMPLETE.`);
    console.log(`   • Cache cleared: ${cacheSnap.size} docs`);
    console.log(`   • Jobs cleared: ${totalJobs} docs across ${schoolsSnap.size} schools`);
    console.log(`   • Schools queued for sweep: ${targets.length}`);
    console.log(`\n   The new pipeline will populate featured_jobs_cache as each`);
    console.log(`   school sweep completes. Monitor via Firebase Console or`);
    console.log(`   the Featured Jobs page — jobs will appear progressively.`);
  }
}

main().catch(err => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});

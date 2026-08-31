import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getAdminDb } from '../src/firebase/admin';

export function cleanJobTitleStrict(rawTitle: string): string {
  if (!rawTitle) return '';
  let clean = rawTitle.trim();

  // Strip trailing "(Aug 2026; Posted:...)" or "(Jan 2027; Posted:...)" strings
  clean = clean.replace(/\s*\([^)]*Posted:[^)]*\)/gi, '').trim();

  // Strip appended employer/location/opportunity text snippets
  clean = clean.split(/Nadeen School|Cheltenham Muscat|The Opportunity|Due to the|Reports to|Responsibilities|Qualifications/i)[0].trim();

  // Clean trailing dashes or parens
  clean = clean.replace(/-\s*August\s*2026/i, '(August 2026)').trim();
  clean = clean.replace(/-\s*August\s*2027/i, '(August 2027)').trim();
  clean = clean.replace(/\s+/g, ' ');

  return clean;
}

async function purgeExpiredAndMissingApplyUrls() {
  const db = getAdminDb();
  console.log('🧹 [EXPIRED & MISSING APPLY URL PURGE] Scrubbing featured_jobs_cache...\n');

  const cacheSnap = await db.collection('featured_jobs_cache').get();
  console.log(`📦 Initial featured_jobs_cache total count: ${cacheSnap.size}`);

  const todayStr = '2026-08-30';
  const todayMillis = new Date(todayStr).getTime();

  let expiredCount = 0;
  let missingUrlCount = 0;
  let titleCleanedCount = 0;
  let batch = db.batch();
  let batchSize = 0;

  for (const doc of cacheSnap.docs) {
    const data = doc.data();
    const applyUrl = (data.applyUrl || '').trim();
    const closingDate = data.closingDate || null;
    const closingMillis = data.closingDateMillis || null;
    const title = data.title || '';

    // 1. Check Missing Apply URL
    if (!applyUrl || applyUrl === '') {
      console.log(`  🗑️ Purging job with MISSING applyUrl: "${title}" (${doc.id})`);
      batch.delete(doc.ref);
      missingUrlCount++;
      batchSize++;
      continue;
    }

    // 2. Check Expired Closing Date (Closing Date in the past)
    if (closingDate && closingDate < todayStr && !data.isRollingDeadline) {
      console.log(`  🗑️ Purging EXPIRED job (Closed: ${closingDate}): "${title}" (${doc.id})`);
      batch.delete(doc.ref);
      expiredCount++;
      batchSize++;
      continue;
    }

    // 3. Clean Title
    const cleaned = cleanJobTitleStrict(title);
    if (cleaned && cleaned !== title) {
      batch.update(doc.ref, { title: cleaned, updatedAt: new Date().toISOString() });
      titleCleanedCount++;
      batchSize++;
      console.log(`  ✏️ Cleaned Title: "${title}" -> "${cleaned}"`);
    }

    if (batchSize >= 400) {
      await batch.commit();
      batch = db.batch();
      batchSize = 0;
    }
  }

  if (batchSize > 0) {
    await batch.commit();
  }

  console.log('\n' + '='.repeat(65));
  console.log('🎉 EXPIRED & INVALID PURGE COMPLETE');
  console.log('='.repeat(65));
  console.log(`🗑️ Expired Jobs Purged (< ${todayStr}): ${expiredCount}`);
  console.log(`🗑️ Missing Apply URL Jobs Purged: ${missingUrlCount}`);
  console.log(`✏️ Titles Cleaned: ${titleCleanedCount}`);

  const finalSnap = await db.collection('featured_jobs_cache').get();
  console.log(`📦 Final 100% Active Grounded Cache Count: ${finalSnap.size}`);
  console.log('='.repeat(65));
}

purgeExpiredAndMissingApplyUrls().catch(console.error);

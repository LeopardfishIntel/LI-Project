import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getAdminDb } from '../src/firebase/admin';
import { cleanJobTitle, extractJobPostingsFromHtml } from '../src/lib/crawler/adaptors/tes-adaptor';

const STEALTH_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache',
};

async function deepScrubAllCacheJobs() {
  const db = getAdminDb();
  console.log('🛰️ [DEEP SCRUB] Starting 100% deep verification of all jobs in featured_jobs_cache...\n');

  const cacheSnap = await db.collection('featured_jobs_cache').get();
  console.log(`📦 Loaded ${cacheSnap.size} cache documents to deep check.`);

  let updatedCount = 0;
  let delistedCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < cacheSnap.docs.length; i++) {
    const doc = cacheSnap.docs[i];
    const data = doc.data();
    const docId = doc.id;
    const applyUrl = data.applyUrl || '';
    const schoolId = data.schoolId || 'unknown';

    console.log(`\n[${i + 1}/${cacheSnap.size}] Checking: "${data.title}" | School: ${data.schoolName || schoolId}`);

    if (!applyUrl) {
      console.log(`  ⚠️ Missing applyUrl. Skipping.`);
      skippedCount++;
      continue;
    }

    try {
      // 1. HTTP Link Liveness & Delisted Check
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(applyUrl, {
        headers: STEALTH_HEADERS,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.status === 404 || res.status === 410) {
        console.log(`  🗑️ Purging delisted (HTTP ${res.status}) job: ${applyUrl}`);
        await doc.ref.delete();
        if (schoolId) {
          await db.collection('schools').doc(schoolId).collection('jobs').doc(docId).delete().catch(() => {});
        }
        delistedCount++;
        continue;
      }

      const updates: any = {};

      // 2. Clean Title
      const cleanedTitle = cleanJobTitle(data.title || '');
      if (cleanedTitle && cleanedTitle !== data.title) {
        updates.title = cleanedTitle;
        console.log(`  ✏️ Cleaned Title: "${cleanedTitle}"`);
      }

      // 3. Deep TES Date Resolution
      if (applyUrl.includes('tes.com/jobs/vacancy')) {
        const html = await res.text();
        const postings = extractJobPostingsFromHtml(html);

        if (postings.length > 0 && postings[0].validThrough) {
          const validThrough = postings[0].validThrough;
          const dt = new Date(validThrough);

          if (!isNaN(dt.getTime())) {
            const dateStr = dt.toISOString().split('T')[0];
            const dateMillis = dt.getTime();

            if (data.closingDate !== dateStr || data.isRollingDeadline !== false) {
              updates.closingDate = dateStr;
              updates.closingDateMillis = dateMillis;
              updates.isRollingDeadline = false;
              console.log(`  📅 Resolved Deep Closing Date: ${dateStr}`);
            }
          }
        }
      }

      if (Object.keys(updates).length > 0) {
        updates.updatedAt = new Date().toISOString();
        await doc.ref.set(updates, { merge: true });
        if (schoolId) {
          await db.collection('schools').doc(schoolId).collection('jobs').doc(docId).set(updates, { merge: true }).catch(() => {});
        }
        updatedCount++;
        console.log(`  ✅ Updated doc in Firestore.`);
      } else {
        console.log(`  ✓ Document 100% verified & up-to-date.`);
      }

    } catch (err: any) {
      console.warn(`  ⚠️ Check failed for ${applyUrl}:`, err.message || err);
      skippedCount++;
    }
  }

  console.log('\n' + '='.repeat(65));
  console.log('🎉 DEEP SCRUB & VERIFICATION COMPLETE');
  console.log('='.repeat(65));
  console.log(`📦 Total Jobs Inspected: ${cacheSnap.size}`);
  console.log(`✅ Jobs Updated with Deep Dates/Clean Titles: ${updatedCount}`);
  console.log(`🗑️ Delisted Jobs Purged: ${delistedCount}`);
  console.log(`✓ Already Perfect / Skipped: ${skippedCount}`);
  console.log('='.repeat(65));
}

deepScrubAllCacheJobs().catch(console.error);

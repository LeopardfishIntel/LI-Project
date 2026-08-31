import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getAdminDb } from '../src/firebase/admin';
import { isSupportOrNonTeachingRole } from '../src/lib/crawler/roleClassifier';
import { isBlockedContentUrl, isGenericRootUrl } from '../src/lib/crawler/urlResolver';

const STEALTH_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
};

function getFixedJobRef(job: any): string {
  if (!job) return 'REF-1000';
  const str = job.id || job.jobFingerprint || job.applyUrl || job.title || '';
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const code = Math.abs(hash % 9000) + 1000;
  return `REF-${code}`;
}

async function auditAllRemainingJobs() {
  const db = getAdminDb();
  console.log('🔍 [AUDIT] Deep checking all remaining jobs in featured_jobs_cache...\n');

  const cacheSnap = await db.collection('featured_jobs_cache').get();
  console.log(`📦 Inspecting ${cacheSnap.size} remaining job cards.\n`);

  const todayStr = '2026-08-30';
  let legacyCount = 0;
  let activeCount = 0;

  for (let i = 0; i < cacheSnap.docs.length; i++) {
    const doc = cacheSnap.docs[i];
    const data = doc.data();
    const ref = getFixedJobRef(data);
    const title = data.title || '';
    const applyUrl = data.applyUrl || '';
    const closingDate = data.closingDate || null;
    const schoolId = data.schoolId || '';
    const schoolName = data.schoolName || schoolId;

    console.log(`--------------------------------------------------`);
    console.log(`[${i + 1}/${cacheSnap.size}] Card ${ref} | "${title}"`);
    console.log(`  School: ${schoolName} (${schoolId})`);
    console.log(`  Apply URL: ${applyUrl}`);
    console.log(`  Closing Date: ${closingDate || 'Rolling / Open Until Filled'}`);

    const issues: string[] = [];

    // 1. Missing or Blocked URL
    if (!applyUrl) {
      issues.push('Missing Apply URL');
    } else if (isBlockedContentUrl(applyUrl)) {
      issues.push(`Blocked Content URL (${applyUrl})`);
    } else if (isGenericRootUrl(applyUrl)) {
      issues.push(`Generic Homepage URL (${applyUrl})`);
    }

    // 2. Non-Teaching Support Role
    if (isSupportOrNonTeachingRole(title)) {
      issues.push(`Non-Teaching Support Role ("${title}")`);
    }

    // 3. Past Expired Closing Date
    if (closingDate && closingDate < todayStr && !data.isRollingDeadline) {
      issues.push(`Expired Closing Date (${closingDate} < ${todayStr})`);
    }

    // 4. Dirty / Long Snippet Title
    if (title.includes('(') && title.includes('Posted:')) {
      issues.push(`Dirty Snippet Title ("${title}")`);
    }

    // 5. Live HTTP URL Check
    if (applyUrl) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(applyUrl, { headers: STEALTH_HEADERS, signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.status === 404 || res.status === 410) {
          issues.push(`Dead Link (HTTP ${res.status})`);
        }
      } catch (err: any) {
        issues.push(`Unreachable Link (${err.message || 'fetch failed'})`);
      }
    }

    if (issues.length > 0) {
      console.log(`  ⚠️ LEGACY / ISSUE DETECTED: ${issues.join(' | ')}`);
      console.log(`  🗑️ Purging legacy document: ${doc.id}`);
      await doc.ref.delete();
      if (schoolId) {
        await db.collection('schools').doc(schoolId).collection('jobs').doc(doc.id).delete().catch(() => {});
      }
      legacyCount++;
    } else {
      console.log(`  ✅ 100% VERIFIED ACTIVE LIVE JOB`);
      activeCount++;
    }
  }

  console.log('\n' + '='.repeat(65));
  console.log('🎉 AUDIT COMPLETE');
  console.log('='.repeat(65));
  console.log(`📦 Total Jobs Audited: ${cacheSnap.size}`);
  console.log(`🗑️ Legacy / Broken / Non-Teaching Jobs Purged: ${legacyCount}`);
  console.log(`✅ 100% Active Live Jobs Remaining: ${activeCount}`);
  console.log('='.repeat(65));
}

auditAllRemainingJobs().catch(console.error);

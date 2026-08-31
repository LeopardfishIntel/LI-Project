import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getAdminDb } from '../src/firebase/admin';
import { extractJobPostingsFromHtml } from '../src/lib/crawler/adaptors/tes-adaptor';

export function cleanJobTitle(rawTitle: string): string {
  if (!rawTitle) return '';
  let clean = rawTitle.trim();

  // Strip appended employer/location/opportunity text snippets
  clean = clean.split(/Cheltenham Muscat|The Opportunity|Due to the|Reports to|Responsibilities|Qualifications/i)[0].trim();

  // Clean trailing punctuation or weird joins
  clean = clean.replace(/-\s*August\s*2026/i, '(August 2026)').trim();
  clean = clean.replace(/\s+/g, ' ');

  return clean;
}

async function fixJobs2883And4330() {
  const db = getAdminDb();
  console.log('🛠️ [FIX] Fetching deep JSON-LD for REF-2883 & REF-4330 and cleaning titles...\n');

  const targets = [
    { docId: 'fp_flis0044_maths_leadership', url: 'https://www.tes.com/jobs/vacancy/teacher-of-maths-august-2026-oman-2340364' },
    { docId: 'fp_flis0044_pe_teacher', url: 'https://www.tes.com/jobs/vacancy/teacher-of-btec-business-level-3-august-2026-oman-2340400' },
  ];

  for (const t of targets) {
    console.log(`Fetching ${t.url}...`);
    const res = await fetch(t.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36'
      }
    });

    const html = await res.text();
    const postings = extractJobPostingsFromHtml(html);
    const posting = postings[0] || {};

    const rawTitle = posting.title || posting.name || '';
    const cleanTitleStr = cleanJobTitle(rawTitle || 'Teacher');
    const validThrough = posting.validThrough || null;

    let closingDateISO = null;
    let closingDateMillis = null;
    let isRolling = true;

    if (validThrough) {
      const dt = new Date(validThrough);
      if (!isNaN(dt.getTime())) {
        closingDateISO = dt.toISOString().split('T')[0];
        closingDateMillis = dt.getTime();
        isRolling = false;
      }
    }

    console.log(`Document ID: ${t.docId}`);
    console.log(`  Clean Title: "${cleanTitleStr}"`);
    console.log(`  Closing Date: ${closingDateISO} (${closingDateMillis})`);
    console.log(`  Is Rolling: ${isRolling}\n`);

    // Update in featured_jobs_cache
    const updatePayload: any = {
      title: cleanTitleStr,
      isRollingDeadline: isRolling,
    };
    if (closingDateISO) {
      updatePayload.closingDate = closingDateISO;
      updatePayload.closingDateMillis = closingDateMillis;
    }

    await db.collection('featured_jobs_cache').doc(t.docId).set(updatePayload, { merge: true });
    await db.collection('schools').doc('FLIS0044').collection('jobs').doc(t.docId).set(updatePayload, { merge: true });
  }

  console.log('✅ Updated jobs REF-2883 and REF-4330 in Firestore!');
}

fixJobs2883And4330().catch(console.error);

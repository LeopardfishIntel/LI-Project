import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getAdminDb } from '../src/firebase/admin';

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

async function inspectTargetJobs() {
  const db = getAdminDb();
  console.log('🔍 Inspecting jobs REF-4989, REF-2860, and REF-4637...\n');

  const cacheSnap = await db.collection('featured_jobs_cache').get();

  cacheSnap.docs.forEach((doc: any) => {
    const data = doc.data();
    const ref = getFixedJobRef(data);
    if (
      ref.includes('4989') || doc.id.includes('4989') ||
      ref.includes('2860') || doc.id.includes('2860') ||
      ref.includes('4637') || doc.id.includes('4637')
    ) {
      console.log(`Document ID: ${doc.id}`);
      console.log(`  REF Code: ${ref}`);
      console.log(`  Title: "${data.title}"`);
      console.log(`  School ID: "${data.schoolId}"`);
      console.log(`  School Name: "${data.schoolName}"`);
      console.log(`  Source: "${data.source}"`);
      console.log(`  Date Posted: "${data.datePosted}"`);
      console.log(`  Closing Date: "${data.closingDate}"`);
      console.log(`  Apply URL: ${data.applyUrl}\n`);
    }
  });
}

inspectTargetJobs().catch(console.error);

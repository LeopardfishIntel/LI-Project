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

async function findJob3343() {
  const db = getAdminDb();
  console.log('🔍 Searching for job REF-3343...\n');

  const cacheSnap = await db.collection('featured_jobs_cache').get();
  
  cacheSnap.docs.forEach((doc: any) => {
    const data = doc.data();
    const ref = getFixedJobRef(data);
    if (ref.includes('3343') || doc.id.includes('3343')) {
      console.log(`Document ID: ${doc.id}`);
      console.log(`  REF Code: ${ref}`);
      console.log(`  Title: "${data.title}"`);
      console.log(`  School: ${data.schoolName || data.schoolId}`);
      console.log(`  Apply URL: ${data.applyUrl}\n`);
    }
  });
}

findJob3343().catch(console.error);

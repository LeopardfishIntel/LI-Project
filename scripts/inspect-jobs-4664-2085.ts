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

async function inspect4664And2085() {
  const db = getAdminDb();
  console.log('🔍 Inspecting jobs REF-4664 and REF-2085...\n');

  const cacheSnap = await db.collection('featured_jobs_cache').get();

  cacheSnap.docs.forEach((doc: any) => {
    const data = doc.data();
    const ref = getFixedJobRef(data);
    if (ref.includes('4664') || doc.id.includes('4664') || ref.includes('2085') || doc.id.includes('2085')) {
      console.log(`Document ID: ${doc.id}`);
      console.log(`  REF Code: ${ref}`);
      console.log(`  Title: "${data.title}"`);
      console.log(`  School ID: "${data.schoolId}"`);
      console.log(`  School Name: "${data.schoolName}"`);
      console.log(`  Source: "${data.source}"`);
      console.log(`  City: "${data.city}" | Country: "${data.country}"`);
      console.log(`  Apply URL: ${data.applyUrl}\n`);
    }
  });
}

inspect4664And2085().catch(console.error);

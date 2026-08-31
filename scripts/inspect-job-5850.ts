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

async function inspect5850() {
  const db = getAdminDb();
  console.log('🔍 Inspecting job REF-5850...\n');

  const cacheSnap = await db.collection('featured_jobs_cache').get();

  cacheSnap.docs.forEach((doc: any) => {
    const data = doc.data();
    const ref = getFixedJobRef(data);
    if (ref.includes('5850') || doc.id.includes('5850') || data.title.toLowerCase().includes('paul')) {
      console.log(`Document ID: ${doc.id}`);
      console.log(`  REF Code: ${ref}`);
      console.log(`  Title: "${data.title}"`);
      console.log(`  School ID: "${data.schoolId}"`);
      console.log(`  School Name: "${data.schoolName}"`);
      console.log(`  City: "${data.city}" | Country: "${data.country}"`);
      console.log(`  Apply URL: ${data.applyUrl}\n`);
    }
  });
}

inspect5850().catch(console.error);

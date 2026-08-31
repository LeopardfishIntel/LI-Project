import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getAdminDb } from '../src/firebase/admin';

async function inspectFirstJobs() {
  const db = getAdminDb();
  console.log('🔍 [INSPECT] Inspecting top jobs in featured_jobs_cache...\n');

  const cacheSnap = await db.collection('featured_jobs_cache').get();
  console.log(`📦 Total cache documents: ${cacheSnap.size}`);

  cacheSnap.docs.slice(0, 15).forEach((d: any, idx: number) => {
    const data = d.data();
    console.log(`\nJob #${idx + 1}:`);
    console.log(`  ID: ${d.id}`);
    console.log(`  Title: "${data.title}"`);
    console.log(`  School: "${data.schoolName}" (${data.schoolId})`);
    console.log(`  Source: ${data.source}`);
    console.log(`  Apply URL: ${data.applyUrl}`);
    console.log(`  Status: ${data.status}`);
  });
}

inspectFirstJobs().catch(console.error);

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getAdminDb } from '../src/firebase/admin';

async function checkCacheCount() {
  const db = getAdminDb();
  const cacheSnap = await db.collection('featured_jobs_cache').get();
  console.log(`📦 [CURRENT CACHE COUNT] Total featured jobs in cache: ${cacheSnap.size}`);

  const bySchool: Record<string, number> = {};
  cacheSnap.docs.forEach((d: any) => {
    const data = d.data();
    const s = data.schoolName || data.schoolId || 'unknown';
    bySchool[s] = (bySchool[s] || 0) + 1;
  });

  console.log('\nBreakdown by School:');
  console.dir(bySchool);
}

checkCacheCount().catch(console.error);

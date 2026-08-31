import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getAdminDb } from '../src/firebase/admin';

async function verifyFeaturedCacheCounts() {
  const db = getAdminDb();
  console.log('🔍 [CACHE VERIFICATION] Auditing featured_jobs_cache Firestore collection...\n');

  const snap = await db.collection('featured_jobs_cache').get();
  console.log(`📌 Total Cache Documents: ${snap.size}\n`);

  const bySource: Record<string, number> = {};
  let over60Chars = 0;

  snap.docs.forEach((doc: any) => {
    const d = doc.data();
    const src = d.source || 'Unknown';
    bySource[src] = (bySource[src] || 0) + 1;

    const t = d.title || '';
    if (t.length > 60) over60Chars++;
  });

  console.log('================================================================');
  console.log('📊 FEATURED JOBS CACHE BREAKDOWN BY SEARCH PROTOCOL:');
  console.log('================================================================');
  Object.entries(bySource).forEach(([src, count]) => {
    console.log(`  • Engine Protocol [${src}]: ${count} active vacancies`);
  });
  console.log(`\n🔍 Quality Check: Titles exceeding 60 characters = ${over60Chars}`);
  console.log('================================================================\n');
}

verifyFeaturedCacheCounts().catch(console.error);

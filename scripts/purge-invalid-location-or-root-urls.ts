import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getAdminDb } from '../src/firebase/admin';
import { isGenericRootUrl, isBlockedContentUrl } from '../src/lib/crawler/urlResolver';
import { loadSchoolWhitelist } from '../src/lib/crawler/schoolWhitelist';

async function purgeInvalidUrls() {
  const db = getAdminDb();
  console.log('🧹 [PURGE] Purging generic directory URLs, grounding redirect links, and non-whitelisted items...\n');

  const snap = await db.collection('featured_jobs_cache').get();
  console.log(`📦 Initial featured_jobs_cache count: ${snap.size}`);

  const whitelistMap = await loadSchoolWhitelist();

  let purgedCount = 0;
  let keptCount = 0;

  const CHUNK = 400;
  let batch = db.batch();
  let batchSize = 0;

  for (const d of snap.docs) {
    const data = d.data();
    const url = data.applyUrl || '';
    const sId = (data.schoolId || '').toLowerCase();
    const sName = (data.schoolName || '').trim();

    const isGeneric = isGenericRootUrl(url);
    const isBlocked = isBlockedContentUrl(url);
    const isMissingName = !sName && !sId.startsWith('agnt_');
    const isInvalidSchool = !whitelistMap.has(sId) && !sId.startsWith('flis') && !sId.startsWith('agnt_');

    const shouldPurge = isGeneric || isBlocked || isMissingName || isInvalidSchool;

    if (shouldPurge) {
      console.log(`  🗑️ Purging invalid job: "${data.title}" | Reason: generic=${isGeneric}, blocked=${isBlocked}, missingName=${isMissingName}`);
      batch.delete(d.ref);
      purgedCount++;
      batchSize++;

      if (batchSize >= CHUNK) {
        await batch.commit();
        batch = db.batch();
        batchSize = 0;
      }
    } else {
      keptCount++;
    }
  }

  if (batchSize > 0) {
    await batch.commit();
  }

  console.log(`\n🎉 [PURGE COMPLETE]`);
  console.log(`   🗑️ Purged: ${purgedCount} invalid/generic listings`);
  console.log(`   ✅ Kept:   ${keptCount} 100% verified grounded listings`);
}

purgeInvalidUrls().catch(console.error);

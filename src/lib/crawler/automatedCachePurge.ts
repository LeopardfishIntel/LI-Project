/**
 * 🧹 FIX 3.2: AUTOMATED CACHE PURGE ENGINE
 *
 * Executes scheduled and write-time sweeps to delete expired and stale jobs
 * from `featured_jobs_cache` immediately upon reaching their closing date
 * or the 45-day rolling staleness threshold.
 *
 * Enforces safe 400-operation Firestore batch limits.
 */

import { getAdminDb } from "@/firebase/admin";
import { ROLLING_STALENESS_CAP_MS } from "./dateParser";

export interface CachePurgeSummary {
  scanned: number;
  purged: number;
  expiredByDate: number;
  expiredByStaleness: number;
  ungrounded: number;
}

export async function purgeExpiredAndStaleCacheJobs(): Promise<CachePurgeSummary> {
  const db = getAdminDb();
  const cacheSnap = await db.collection('featured_jobs_cache').get();

  const nowMillis = Date.now();
  let purged = 0;
  let expiredByDate = 0;
  let expiredByStaleness = 0;
  let ungrounded = 0;

  let batch = db.batch();
  let opsInBatch = 0;

  for (const doc of cacheSnap.docs) {
    const d = doc.data();

    const isUngrounded = !d.schoolId || doc.id.startsWith('MOCK_') || doc.id.startsWith('TEST_');
    const isExpiredStatus = d.status === 'expired';

    // 1. Explicit closing date expired check (closingDateMillis < today)
    const isExpiredDate = d.closingDateMillis ? d.closingDateMillis < (nowMillis - 86400000) : false;

    // 2. Fix 3.1: Rolling post 45-day staleness check
    const ageMillis = d.ingestedAtMillis ? (nowMillis - d.ingestedAtMillis) : 0;
    const isStaleRolling = Boolean(d.isRollingDeadline && ageMillis > ROLLING_STALENESS_CAP_MS);

    if (isUngrounded || isExpiredStatus || isExpiredDate || isStaleRolling) {
      batch.delete(doc.ref);
      purged++;
      opsInBatch++;

      if (isUngrounded) ungrounded++;
      else if (isExpiredDate || isExpiredStatus) expiredByDate++;
      else if (isStaleRolling) expiredByStaleness++;

      // Safe 400-operation batch commit
      if (opsInBatch >= 400) {
        await batch.commit();
        batch = db.batch();
        opsInBatch = 0;
      }
    }
  }

  if (opsInBatch > 0) {
    await batch.commit();
  }

  console.log(`🧹 [AUTOMATED CACHE PURGE] Scanned: ${cacheSnap.size} | Purged: ${purged} (Expired Dates: ${expiredByDate}, Stale Rolling: ${expiredByStaleness}, Ungrounded: ${ungrounded})`);

  return {
    scanned: cacheSnap.size,
    purged,
    expiredByDate,
    expiredByStaleness,
    ungrounded
  };
}

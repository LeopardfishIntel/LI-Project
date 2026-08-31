/**
 * 🛸 PIPELINE 3 — DAILY JANITOR
 *
 * Background maintenance function called by /api/daily-sweep.
 * Never called on the UI request path — does not block web rendering.
 *
 * Responsibilities (in order):
 *   1. EXPIRE  — Query featured_jobs_cache where closingDateMillis < now AND
 *                status IN ['approved','pending_review']. Mark expired.
 *   2. MIRROR  — Mirror expiry back to schools/{schoolId}/jobs subcollection,
 *                respecting isManualOverride flags.
 *   3. PROMOTE — Scan schools/{schoolId}/jobs for newly admin-approved jobs
 *                and promote their cache document status to 'approved'.
 *
 * Emits a JanitorRunResult for audit logging.
 */

// ─── Public Interfaces ────────────────────────────────────────────────────────

export interface JanitorRunResult {
  expired: number;
  promoted: number;
  mirrorErrors: number;
  errors: string[];
  durationMs: number;
}

// ─── Admin SDK helpers ────────────────────────────────────────────────────────

async function getDb() {
  const { getAdminDb } = await import('@/firebase/admin');
  return getAdminDb();
}

// ─── Step 1 & 2: Expire overdue cache documents + mirror to subcollections ────

async function expireOverdueJobs(db: any, now: number): Promise<{ expired: number; mirrorErrors: number; errors: string[] }> {
  let expired = 0;
  let mirrorErrors = 0;
  const errors: string[] = [];

  if (typeof db.collection !== 'function') {
    errors.push('Admin SDK not available for janitor expiry step.');
    return { expired, mirrorErrors, errors };
  }

  try {
    // Query all non-expired cache docs whose closing date has passed
    const snap = await db.collection('featured_jobs_cache')
      .where('closingDateMillis', '<', now)
      .where('status', 'in', ['approved', 'pending_review'])
      .get();

    if (snap.empty) {
      console.log('🛸 [PIPELINE 3] No overdue jobs to expire.');
      return { expired, mirrorErrors, errors };
    }

    const batch = db.batch();
    const mirrorOps: Promise<void>[] = [];

    snap.docs.forEach((docSnap: any) => {
      const data = docSnap.data();
      // Expire the cache document
      batch.set(docSnap.ref, { status: 'expired' }, { merge: true });
      expired++;

      // Mirror expiry back to the source subcollection
      const schoolId = data.schoolId;
      const jobId = data.id;
      if (schoolId && jobId) {
        const mirrorOp = (async () => {
          try {
            const jobRef = db.collection('schools').doc(schoolId).collection('jobs').doc(jobId);
            const jobSnap = await jobRef.get();
            if (jobSnap.exists) {
              const jobData = jobSnap.data();
              // Respect manual override — don't expire admin-pinned jobs
              if (jobData?.isManualOverride) {
                console.log(`🛸 [PIPELINE 3] Skipping manual override job ${jobId} in school ${schoolId}.`);
                return;
              }
              await jobRef.set({ status: 'expired', lastJanitorRunAt: Date.now() }, { merge: true });
            }
          } catch (err: any) {
            mirrorErrors++;
            errors.push(`mirror:${schoolId}/${jobId}: ${err?.message || String(err)}`);
          }
        })();
        mirrorOps.push(mirrorOp);
      }
    });

    await batch.commit();
    await Promise.all(mirrorOps);

    console.log(`🛸 [PIPELINE 3] Expired ${expired} overdue cache documents.`);
  } catch (err: any) {
    errors.push(`expire_step: ${err?.message || String(err)}`);
  }

  return { expired, mirrorErrors, errors };
}

// ─── Step 3: Promote newly-approved subcollection jobs to cache ───────────────

async function promoteApprovedJobs(db: any): Promise<{ promoted: number; errors: string[] }> {
  let promoted = 0;
  const errors: string[] = [];

  if (typeof db.collection !== 'function') {
    errors.push('Admin SDK not available for janitor promote step.');
    return { promoted, errors };
  }

  try {
    // Find subcollection jobs that are approved but whose cache doc is still pending_review
    const subcollSnap = await db.collectionGroup('jobs')
      .where('status', '==', 'approved')
      .get();

    if (subcollSnap.empty) return { promoted, errors };

    const batch = db.batch();
    let batchSize = 0;

    for (const jobDoc of subcollSnap.docs) {
      const jobData = jobDoc.data();
      const fp = jobData.jobFingerprint || jobData.id;
      if (!fp) continue;

      try {
        const cacheRef = db.collection('featured_jobs_cache').doc(fp);
        const cacheSnap = await cacheRef.get();

        if (!cacheSnap.exists) {
          // Cache doc doesn't exist — create a minimal one so the job appears in feed
          batch.set(cacheRef, {
            id: fp,
            title: jobData.title || '',
            source: jobData.sourceName || jobData.source || '',
            applyUrl: jobData.applyUrl || jobData.source_url || '',
            datePosted: jobData.datePosted || null,
            closingDate: null,
            closingDateMillis: null,
            schoolId: jobDoc.ref.parent?.parent?.id || '',
            schoolName: jobData.schoolName || '',
            city: jobData.city || jobData.analysisData?.city || '',
            country: jobData.country || jobData.analysisData?.country || '',
            status: 'approved',
            ingestedAtMillis: Date.now(),
            isRollingDeadline: true,
          });
          promoted++;
          batchSize++;
        } else {
          const cacheData = cacheSnap.data();
          if (cacheData?.status === 'pending_review') {
            batch.set(cacheRef, { status: 'approved', approvedAtMillis: Date.now() }, { merge: true });
            promoted++;
            batchSize++;
          }
        }

        // Firestore batch limit is 500
        if (batchSize >= 490) {
          await batch.commit();
          batchSize = 0;
        }
      } catch (err: any) {
        errors.push(`promote:${fp}: ${err?.message || String(err)}`);
      }
    }

    if (batchSize > 0) {
      await batch.commit();
    }

    console.log(`🛸 [PIPELINE 3] Promoted ${promoted} jobs to approved in cache.`);
  } catch (err: any) {
    errors.push(`promote_step: ${err?.message || String(err)}`);
  }

  return { promoted, errors };
}

// ─── Main Entry-Point ─────────────────────────────────────────────────────────

/**
 * Runs the daily janitor maintenance cycle.
 * Called by /api/daily-sweep — must not be invoked on the UI request path.
 *
 * @returns JanitorRunResult — audit summary.
 */
export async function runJanitorPipeline(): Promise<JanitorRunResult> {
  const startMs = Date.now();
  console.log('🛸 [PIPELINE 3] Daily Janitor starting...');

  const db = await getDb();
  const now = Date.now();

  const [expireResult, promoteResult] = await Promise.all([
    expireOverdueJobs(db, now),
    promoteApprovedJobs(db),
  ]);

  const durationMs = Date.now() - startMs;
  const result: JanitorRunResult = {
    expired: expireResult.expired,
    promoted: promoteResult.promoted,
    mirrorErrors: expireResult.mirrorErrors,
    errors: [...expireResult.errors, ...promoteResult.errors],
    durationMs,
  };

  console.log(
    `🛸 [PIPELINE 3] Janitor complete | expired=${result.expired} | promoted=${result.promoted} | errors=${result.errors.length} | duration=${durationMs}ms`
  );

  return result;
}

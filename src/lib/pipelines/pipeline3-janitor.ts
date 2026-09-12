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

// ─── Step 4: Auto-sync school openJobsCount counters with active featured jobs ─

async function syncSchoolOpenJobCounters(db: any, now: number): Promise<{ syncedSchools: number; totalActiveJobs: number; errors: string[] }> {
  let syncedSchools = 0;
  let totalActiveJobs = 0;
  const errors: string[] = [];

  if (typeof db.collection !== 'function') return { syncedSchools, totalActiveJobs, errors };

  try {
    const snap = await db.collection('featured_jobs_cache').get();
    const seenUrls = new Set<string>();
    const seenJobKeys = new Set<string>();
    const activeCountsBySchool: Record<string, number> = {};

    snap.docs.forEach((docSnap: any) => {
      const cacheDoc = docSnap.data();
      const rawStatus = String(cacheDoc.status || '').toUpperCase();
      if (rawStatus === 'EXPIRED' || rawStatus === 'CLOSED' || rawStatus === 'REJECTED' || rawStatus === 'PENDING_REVIEW' || rawStatus === 'PENDING') return;
      if (cacheDoc.closingDateMillis && cacheDoc.closingDateMillis < now) return;

      const sourceUpper = String(cacheDoc.source || '').toUpperCase();
      const applyUrlLower = String(cacheDoc.applyUrl || '').toLowerCase();

      const isTes = sourceUpper.includes('TES') || applyUrlLower.includes('tes.com');
      const isNae = sourceUpper.includes('NORD ANGLIA') || applyUrlLower.includes('nordangliaeducation.com');
      const isGrc = sourceUpper.includes('GRC') || applyUrlLower.includes('grcfair.org');
      const isInspired = sourceUpper.includes('INSPIRED') || applyUrlLower.includes('inspirededu.com');
      const isTeachAway = sourceUpper.includes('TEACH AWAY') || applyUrlLower.includes('teachaway.com');
      const isCognita = sourceUpper.includes('COGNITA') || applyUrlLower.includes('cognitapeople.csod.com');
      const isMalvern = sourceUpper.includes('MALVERN') || applyUrlLower.includes('malverncollege');
      const isUwc = sourceUpper.includes('UWC') || sourceUpper.includes('UNITED WORLD COLLEGE') || applyUrlLower.includes('uwc.org');
      const isIsp = sourceUpper.includes('ISP') || sourceUpper.includes('INTERNATIONAL SCHOOLS PARTNERSHIP') || applyUrlLower.includes('internationalschools.wd3.myworkdayjobs.com');
      const isGlobe = sourceUpper.includes('GLOBE') || sourceUpper.includes('GLOBEDUCATE') || applyUrlLower.includes('globeducate');
      const isOfficial = sourceUpper.includes('OFFICIAL') || sourceUpper.includes('WEBSITE') || sourceUpper.includes('DIRECT') || sourceUpper.includes('SCHOOL');

      if (!isTes && !isNae && !isGrc && !isInspired && !isTeachAway && !isCognita && !isMalvern && !isUwc && !isIsp && !isGlobe && !isOfficial) return;

      if (applyUrlLower && seenUrls.has(applyUrlLower)) return;
      if (applyUrlLower) seenUrls.add(applyUrlLower);

      const sIdRaw = (cacheDoc.schoolId || '').trim();
      if (!sIdRaw || sIdRaw.toUpperCase().startsWith('AGNT')) return;

      const sId = sIdRaw.toLowerCase();
      const jobKey = `${sId}_${(cacheDoc.title || '').toLowerCase().trim()}`;
      if (seenJobKeys.has(jobKey)) return;
      seenJobKeys.add(jobKey);

      totalActiveJobs++;
      const upperSid = sId.toUpperCase();
      activeCountsBySchool[upperSid] = (activeCountsBySchool[upperSid] || 0) + 1;
    });

    const schoolSnap = await db.collection('schools').get();
    let batch = db.batch();
    let batchSize = 0;

    for (const docSnap of schoolSnap.docs) {
      const sData = docSnap.data();
      const sId = (sData.schoolId || docSnap.id).toUpperCase().trim();
      const actualCount = activeCountsBySchool[sId] || 0;

      if (sData.openJobsCount !== actualCount) {
        batch.set(docSnap.ref, { openJobsCount: actualCount, lastCountersSyncedAt: now }, { merge: true });
        syncedSchools++;
        batchSize++;
      }

      if (batchSize >= 450) {
        await batch.commit();
        batch = db.batch();
        batchSize = 0;
      }
    }

    if (batchSize > 0) {
      await batch.commit();
    }

    console.log(`🛸 [PIPELINE 3] Synced openJobsCount for ${syncedSchools} schools. Total active featured jobs: ${totalActiveJobs}`);
  } catch (err: any) {
    errors.push(`sync_counters: ${err?.message || String(err)}`);
  }

  return { syncedSchools, totalActiveJobs, errors };
}


export async function runJanitorPipeline(): Promise<JanitorRunResult> {
  const startMs = Date.now();
  console.log('🛸 [PIPELINE 3] Daily Janitor starting...');

  const db = await getDb();
  const now = Date.now();

  const [expireResult, promoteResult] = await Promise.all([
    expireOverdueJobs(db, now),
    promoteApprovedJobs(db),
  ]);

  const syncResult = await syncSchoolOpenJobCounters(db, now);

  const durationMs = Date.now() - startMs;
  const result: JanitorRunResult = {
    expired: expireResult.expired,
    promoted: promoteResult.promoted,
    mirrorErrors: expireResult.mirrorErrors,
    errors: [...expireResult.errors, ...promoteResult.errors, ...syncResult.errors],
    durationMs,
  };

  console.log(
    `🛸 [PIPELINE 3] Janitor complete | expired=${result.expired} | promoted=${result.promoted} | syncedSchools=${syncResult.syncedSchools} | totalActiveFeatured=${syncResult.totalActiveJobs} | duration=${durationMs}ms`
  );

  return result;
}

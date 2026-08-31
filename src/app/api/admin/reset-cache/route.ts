/**
 * 🛸 ADMIN: RESET CACHE & FORCE RE-SWEEP
 *
 * POST /api/admin/reset-cache
 *
 * Performs a full, clean sweep cycle:
 *   1. Clears all documents in `featured_jobs_cache`.
 *   2. Clears all `schools/{id}/jobs` subcollection documents.
 *   3. Resets `lastScrapedAt` on every school document (forces re-sweep).
 *   4. Kicks off the daily-sweep pipeline to re-populate everything.
 *
 * Requires admin authentication (checked via Authorization header with CRON_SECRET_KEY,
 * or a valid admin Firebase ID token).
 *
 * This endpoint is intentionally POST-only and destructive — guard accordingly.
 */

import { NextResponse } from 'next/server';
import { validateCronSecret, getAdminDb, getCollectionDocs, updateDocument } from '@/firebase/admin';

export async function POST(request: Request) {
  // ── Auth Guard ───────────────────────────────────────────────────────────────
  // Accept either cron secret (server-to-server) or admin claim
  const isAuthorizedByCron = validateCronSecret(request);
  if (!isAuthorizedByCron) {
    // Check for admin Firebase ID token
    const authHeader = request.headers.get('authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
      const token = authHeader.substring(7).trim();
      const adminAuth = (await import('firebase-admin')).auth();
      const decoded = await adminAuth.verifyIdToken(token);
      if (!decoded.admin) {
        return NextResponse.json({ error: 'Forbidden — admin claim required' }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
  }

  const body = await request.json().catch(() => ({}));
  const dryRun = body?.dryRun === true;

  const db = getAdminDb();

  if (typeof db.collection !== 'function') {
    return NextResponse.json({ error: 'Admin SDK not available' }, { status: 500 });
  }

  const summary = {
    dryRun,
    cacheDocsDeleted: 0,
    subcollectionJobsDeleted: 0,
    schoolsReset: 0,
    sweepTriggered: false,
    errors: [] as string[],
  };

  try {
    // ── Step 1: Clear featured_jobs_cache ────────────────────────────────────
    console.log('🛸 [RESET] Clearing featured_jobs_cache...');
    const cacheSnap = await db.collection('featured_jobs_cache').get();
    if (!dryRun && !cacheSnap.empty) {
      const BATCH_SIZE = 400;
      for (let i = 0; i < cacheSnap.docs.length; i += BATCH_SIZE) {
        const batch = db.batch();
        cacheSnap.docs.slice(i, i + BATCH_SIZE).forEach((d: any) => batch.delete(d.ref));
        await batch.commit();
      }
    }
    summary.cacheDocsDeleted = cacheSnap.size;
    console.log(`🛸 [RESET] ${dryRun ? '[DRY RUN] Would delete' : 'Deleted'} ${cacheSnap.size} featured_jobs_cache docs.`);

    // ── Step 2: Clear all schools/{id}/jobs subcollections ───────────────────
    console.log('🛸 [RESET] Clearing schools/{id}/jobs subcollections...');
    const schools = await getCollectionDocs('schools');
    let totalJobsDeleted = 0;
    const resetOps: Promise<void>[] = [];

    for (const schoolDoc of schools) {
      const schoolId = schoolDoc.id;
      resetOps.push((async () => {
        try {
          const jobsSnap = await db.collection('schools').doc(schoolId).collection('jobs').get();
          if (!jobsSnap.empty && !dryRun) {
            const BATCH_SIZE = 400;
            for (let i = 0; i < jobsSnap.docs.length; i += BATCH_SIZE) {
              const batch = db.batch();
              jobsSnap.docs.slice(i, i + BATCH_SIZE).forEach((d: any) => batch.delete(d.ref));
              await batch.commit();
            }
          }
          totalJobsDeleted += jobsSnap.size;
        } catch (err: any) {
          summary.errors.push(`schools/${schoolId}/jobs: ${err?.message}`);
        }
      })());
    }

    await Promise.all(resetOps);
    summary.subcollectionJobsDeleted = totalJobsDeleted;
    console.log(`🛸 [RESET] ${dryRun ? '[DRY RUN] Would delete' : 'Deleted'} ${totalJobsDeleted} subcollection job docs.`);

    // ── Step 3: Reset lastScrapedAt on all schools ───────────────────────────
    console.log('🛸 [RESET] Resetting lastScrapedAt on all schools...');
    if (!dryRun) {
      const resetSchoolOps = schools.map((schoolDoc: any) =>
        updateDocument('schools', schoolDoc.id, {
          lastScrapedAt: null,
          isRevalidating: false,
          revalidationStatus: null,
          scrapedJobsCount: 0,
          scrapedJobsList: [],
        }).catch((err: any) => {
          summary.errors.push(`reset/${schoolDoc.id}: ${err?.message}`);
        })
      );
      await Promise.all(resetSchoolOps);
    }
    summary.schoolsReset = schools.length;

    // ── Step 4: Kick off daily sweep (force all) ─────────────────────────────
    if (!dryRun) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      fetch(`${baseUrl}/api/daily-sweep?force=true`, { method: 'GET' })
        .then(() => console.log('🛸 [RESET] Force sweep triggered.'))
        .catch(err => {
          summary.errors.push(`sweep_trigger: ${err?.message}`);
          console.error('🛸 [RESET] Failed to trigger sweep:', err);
        });
      summary.sweepTriggered = true;
    }

    return NextResponse.json({
      success: true,
      message: dryRun
        ? 'Dry run complete. No data was modified.'
        : `Reset complete. ${summary.cacheDocsDeleted} cache docs cleared, ${summary.subcollectionJobsDeleted} job docs cleared, ${schools.length} schools queued for re-sweep.`,
      ...summary,
    });
  } catch (err: any) {
    console.error('🛸 [RESET] Fatal error during reset:', err);
    return NextResponse.json({ success: false, error: err.message, ...summary }, { status: 500 });
  }
}

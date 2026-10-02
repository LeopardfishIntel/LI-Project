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
  skippedProvenanceMismatch?: number;
  mirrorErrors: number;
  errors: string[];
  durationMs: number;
}

import { isPastAcademicIntake, triageVacancyLifecycle } from '@/lib/crawler/dateParser';
import { isValidJobTitle } from '@/lib/crawler/titleSanitizer';
import { isMalvernCampus } from '@/lib/search/malvern';
import { isRetiredSchool } from "@/lib/schools/retiredSchools";

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
    // Query all non-expired cache docs
    const snap = await db.collection('featured_jobs_cache')
      .where('status', 'in', ['approved', 'pending_review'])
      .get();

    if (snap.empty) {
      console.log('🛸 [PIPELINE 3] No active jobs found.');
      return { expired, mirrorErrors, errors };
    }

    const batch = db.batch();
    const mirrorOps: Promise<void>[] = [];

    snap.docs.forEach((docSnap: any) => {
      const data = docSnap.data();
      const rawTitle = data.title || data.rawTitle || '';
      const rawClosing = data.closingDate || data.date_closing;
      const datePosted = data.datePosted || data.date_listed || data.scrapedAt;
      const closingDateMillis = data.closingDateMillis;

      // Evaluate whether overdue, past intake, or stale rolling deadline (>42d)
      let isExpired = false;
      if (closingDateMillis && closingDateMillis < now) {
        isExpired = true;
      } else {
        const triage = triageVacancyLifecycle(rawClosing, datePosted, new Date(now), rawTitle);
        if (triage.status === 'expired') {
          isExpired = true;
        }
      }

      if (!isExpired) return;

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

async function promoteApprovedJobs(db: any): Promise<{ promoted: number; skippedProvenanceMismatch: number; errors: string[] }> {
  let promoted = 0;
  let skippedProvenanceMismatch = 0;
  const errors: string[] = [];

  if (typeof db.collection !== 'function') {
    errors.push('Admin SDK not available for janitor promote step.');
    return { promoted, skippedProvenanceMismatch, errors };
  }

  try {
    // Find subcollection jobs that are approved but whose cache doc is still pending_review
    const subcollSnap = await db.collectionGroup('jobs')
      .where('status', '==', 'approved')
      .get();

    if (subcollSnap.empty) return { promoted, skippedProvenanceMismatch, errors };

    // Preload canonical schools map to guard against orphaned/shifted subcollections
    const schoolsSnap = await db.collection('schools').get();
    const schoolMap = new Map<string, { id: string; name: string; tesEmployerSlug?: string | null }>();
    const otherTesSlugs: Array<{ id: string; name: string; slugPrefix: string }> = [];

    schoolsSnap.docs.forEach((doc: any) => {
      const data = doc.data();
      const id = doc.id;
      const name = data.name || data.schoolname || data.schoolName || '';
      const tesSlug = (data.tesEmployerSlug || '').toLowerCase().trim();
      schoolMap.set(id.toUpperCase(), { id, name, tesEmployerSlug: tesSlug || null });

      if (tesSlug && tesSlug.length > 5) {
        const slugPrefix = tesSlug.replace(/-\d+$/, '');
        if (slugPrefix.length > 6) {
          otherTesSlugs.push({ id, name, slugPrefix });
        }
      }
    });

    const getTokens = (str: string): string[] => {
      return str.toLowerCase().replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter((w) => w.length >= 3);
    };

    const slugMatchesSchoolTokens = (slug: string, schoolName: string): boolean => {
      const nameTokens = getTokens(schoolName);
      if (nameTokens.length === 0) return false;
      const sSet = new Set(getTokens(slug));
      return nameTokens.every((t) => sSet.has(t));
    };

    let batch = db.batch();
    let batchSize = 0;

    for (const jobDoc of subcollSnap.docs) {
      const jobData = jobDoc.data();
      const fp = jobData.jobFingerprint || jobData.id;
      if (!fp) continue;

      const parentSchoolId = (jobDoc.ref.parent?.parent?.id || '').trim();
      const parentSchool = schoolMap.get(parentSchoolId.toUpperCase());

      // Guard 0: retired (merged) schools are never promoted
      if (isRetiredSchool(parentSchoolId)) {
        console.warn(`⛔ [JANITOR GUARD] Skipping promotion for ${fp}: school '${parentSchoolId}' is retired.`);
        skippedProvenanceMismatch++;
        continue;
      }

      // Guard 1: Verify parent school exists in canonical registry
      if (!parentSchool) {
        console.warn(`⚠️ [JANITOR GUARD] Skipping promotion for ${fp}: parent school '${parentSchoolId}' does not exist in canonical registry.`);
        skippedProvenanceMismatch++;
        continue;
      }

      // Guard 2: Stored schoolId check (if present on doc, must match parent)
      if (jobData.schoolId && jobData.schoolId.toUpperCase() !== parentSchoolId.toUpperCase()) {
        console.warn(`⚠️ [JANITOR GUARD] Skipping promotion for ${fp}: stored schoolId '${jobData.schoolId}' does not match path schoolId '${parentSchoolId}'.`);
        skippedProvenanceMismatch++;
        continue;
      }

      try {
        const cacheRef = db.collection('featured_jobs_cache').doc(fp);
        const cacheSnap = await cacheRef.get();
        const cacheData = cacheSnap.exists ? cacheSnap.data() : null;

        // Collect all candidate URLs across primary fields and all sourceUrls
        const urlCandidates: Array<{ label: string; url: string }> = [];
        const addUrl = (label: string, u: any) => {
          if (typeof u === 'string' && u.trim().length > 0) {
            urlCandidates.push({ label, url: u.trim() });
          }
        };
        addUrl('applyUrl', jobData.applyUrl);
        addUrl('directUrl', jobData.directUrl);
        addUrl('url', jobData.url);
        addUrl('link', jobData.link);
        addUrl('source_url', jobData.source_url);
        if (jobData.sourceUrls && typeof jobData.sourceUrls === 'object') {
          for (const [k, v] of Object.entries(jobData.sourceUrls)) {
            addUrl(`sourceUrls.${k}`, v);
          }
        }
        if (cacheData) {
          addUrl('cache.applyUrl', cacheData.applyUrl);
          addUrl('cache.directUrl', cacheData.directUrl);
          if (cacheData.sourceUrls && typeof cacheData.sourceUrls === 'object') {
            for (const [k, v] of Object.entries(cacheData.sourceUrls)) {
              addUrl(`cache.sourceUrls.${k}`, v);
            }
          }
        }

        let provenanceMismatch = false;
        for (const { label, url: rawUrl } of urlCandidates) {
          const lowerUrl = rawUrl.toLowerCase();

          // Guard 3: Synthetic domain mismatch
          const synthMatch = lowerUrl.match(/^https?:\/\/(?:www\.)?([a-z0-9-]+)\.com\/?$/);
          if (
            synthMatch &&
            !lowerUrl.includes('tes.com') &&
            !lowerUrl.includes('teachaway.com') &&
            !lowerUrl.includes('theguardian.com') &&
            !lowerUrl.includes('grcfair.org')
          ) {
            const slug = synthMatch[1];
            const pClean = parentSchool.name.toLowerCase().replace(/[^a-z0-9]/g, '');
            const cleanSlug = slug.replace(/[^a-z0-9]/g, '');
            const isParentContiguous = pClean && (pClean.includes(cleanSlug) || cleanSlug.includes(pClean));
            const isParentTokenMatch = slugMatchesSchoolTokens(slug, parentSchool.name);

            if (!isParentContiguous && !isParentTokenMatch) {
              let matchedOther: any = null;
              for (const s of schoolMap.values()) {
                const sName = s.name.toLowerCase().replace(/[^a-z0-9]/g, '');
                if (sName && (sName.includes(cleanSlug) || cleanSlug.includes(sName))) {
                  matchedOther = s;
                  break;
                }
              }
              if (matchedOther && matchedOther.id.toUpperCase() !== parentSchoolId.toUpperCase()) {
                console.warn(`⚠️ [JANITOR GUARD] Skipping promotion for ${fp}: synthetic domain '${slug}' (from ${label}) belongs to ${matchedOther.id} (${matchedOther.name}), not parent school ${parentSchool.name}.`);
                provenanceMismatch = true;
                break;
              }
            }
          }

          // Guard 4: TES Vacancy URL slug mismatch
          if (lowerUrl.includes('tes.com/jobs/vacancy/')) {
            const parentSlug = parentSchool.tesEmployerSlug ? parentSchool.tesEmployerSlug.toLowerCase() : null;
            const parentSlugPrefix = parentSlug ? parentSlug.replace(/-\d+$/, '') : null;
            const matchesParent = parentSlugPrefix && parentSlugPrefix.length > 6 && lowerUrl.includes(parentSlugPrefix);

            if (!matchesParent) {
              let matchedOther: any = null;
              for (const other of otherTesSlugs) {
                if (other.id.toUpperCase() === parentSchoolId.toUpperCase()) continue;
                if (parentSlugPrefix && other.slugPrefix === parentSlugPrefix) continue; // sister campus sharing slug

                if (lowerUrl.includes(other.slugPrefix)) {
                  matchedOther = other;
                  break;
                }
              }
              if (matchedOther) {
                console.warn(`⚠️ [JANITOR GUARD] Skipping promotion for ${fp}: TES vacancy URL (from ${label}) belongs to ${matchedOther.id} (${matchedOther.name}, slug: ${matchedOther.slugPrefix}), not parent school ${parentSchool.name}.`);
                provenanceMismatch = true;
                break;
              }
            }
          }
        }

        if (provenanceMismatch) {
          skippedProvenanceMismatch++;
          continue;
        }

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
            schoolId: parentSchool.id,
            schoolName: jobData.schoolName || parentSchool.name,
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
          batch = db.batch();
          batchSize = 0;
        }
      } catch (err: any) {
        errors.push(`promote:${fp}: ${err?.message || String(err)}`);
      }
    }

    if (batchSize > 0) {
      await batch.commit();
    }

    console.log(`🛸 [PIPELINE 3] Promoted ${promoted} jobs to approved in cache (${skippedProvenanceMismatch} skipped due to provenance mismatch).`);
  } catch (err: any) {
    errors.push(`promote_step: ${err?.message || String(err)}`);
  }

  return { promoted, skippedProvenanceMismatch, errors };
}

// ─── Main Entry-Point ─────────────────────────────────────────────────────────

/**
 * Runs the daily janitor maintenance cycle.
 * Called by /api/daily-sweep — must not be invoked on the UI request path.
 *
 * @returns JanitorRunResult — audit summary.
 */

// ─── Step 4: Auto-sync school openJobsCount counters with active featured jobs ─

const GENERIC_APPLY_PATH_SEGMENTS = new Set(["", "careers", "jobs", "vacancies", "vacancy", "employment", "work-with-us", "join-us"]);
function isSpecificVacancyUrl(u?: string | null): boolean {
  if (!u) return false;
  try {
    const raw = u.trim();
    const parsed = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
    const segments = parsed.pathname.split('/').filter(Boolean);
    if (segments.length === 0) return false;
    if (segments.length === 1 && GENERIC_APPLY_PATH_SEGMENTS.has(segments[0].toLowerCase())) return false;
    return true;
  } catch {
    return false;
  }
}

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
      if (rawStatus === 'EXPIRED' || rawStatus === 'CLOSED' || rawStatus === 'REJECTED' || rawStatus === 'PENDING_REVIEW' || rawStatus === 'PENDING' || rawStatus === 'MERGED') return;
      if (cacheDoc.closingDateMillis && cacheDoc.closingDateMillis < now) return;

      const title = String(cacheDoc.title || cacheDoc.job_title || '').trim();
      if (!isValidJobTitle(title)) return;

      const sourceUpper = String(cacheDoc.source || cacheDoc.engine || 'Direct').toUpperCase();
      const applyUrlLower = String(cacheDoc.applyUrl || cacheDoc.source_url || '').toLowerCase();

      const isTes = sourceUpper.includes('TES') || applyUrlLower.includes('tes.com');
      const isNae = sourceUpper.includes('NORD ANGLIA') || applyUrlLower.includes('nordanglia.com') || applyUrlLower.includes('nordangliaeducation.com');
      const isGrc = sourceUpper.includes('GRC') || applyUrlLower.includes('grcfair.org');
      const isInspired = sourceUpper.includes('INSPIRED') || applyUrlLower.includes('inspirededu.com');
      const isTeachAway = sourceUpper.includes('TEACH AWAY') || applyUrlLower.includes('teachaway.com');
      const isCognita = sourceUpper.includes('COGNITA') || applyUrlLower.includes('cognitapeople.csod.com');
      const schoolNameUpper = String(cacheDoc.schoolName || cacheDoc.schoolname || cacheDoc.name || "").toUpperCase();
      const schoolGroupUpper = String(cacheDoc.schoolGroup || cacheDoc.group || "").toUpperCase();
      const sIdUpper = String(cacheDoc.schoolId || "").toUpperCase();
      const isMalvern = sourceUpper.includes('MALVERN') || applyUrlLower.includes('malverncollege') || isMalvernCampus(sIdUpper, schoolNameUpper, schoolGroupUpper);
      const isUwc = sourceUpper.includes('UWC') || sourceUpper.includes('UNITED WORLD COLLEGE') || applyUrlLower.includes('uwc.org');
      const isIsp = sourceUpper.includes('ISP') || sourceUpper.includes('INTERNATIONAL SCHOOLS PARTNERSHIP') || applyUrlLower.includes('internationalschools.wd3.myworkdayjobs.com');
      const isGlobe = sourceUpper.includes('GLOBE') || sourceUpper.includes('GLOBEDUCATE') || applyUrlLower.includes('globeducate');
      const isTaylors = sourceUpper.includes('TAYLOR') || applyUrlLower.includes('taylors');
      const isEsf = sourceUpper.includes('ESF') || sourceUpper.includes('ENGLISH SCHOOLS FOUNDATION') || applyUrlLower.includes('esf.edu.hk') || applyUrlLower.includes('esf.org.hk');
      const isGems = sourceUpper.includes('GEMS') || applyUrlLower.includes('gemseducation') || applyUrlLower.includes('gems.ae');
      const isOfficial = sourceUpper.includes('OFFICIAL') || sourceUpper.includes('WEBSITE') || sourceUpper.includes('DIRECT') || sourceUpper.includes('SCHOOL');
      const isGuardian = sourceUpper.includes('GUARDIAN') || applyUrlLower.includes('theguardian.com') || applyUrlLower.includes('guardianjobs');
      const isTaaleem = sIdUpper.startsWith('FLIS0318') || sIdUpper.startsWith('FLIS0319') || sIdUpper.startsWith('FLIS0320') || sIdUpper.startsWith('FLIS0321') || sIdUpper.startsWith('FLIS0322') || ['FLIS0102', 'FLIS0104', 'FLIS0341', 'FLIS0342', 'FLIS0343', 'FLIS0344', 'FLIS0418', 'FLIS0419', 'FLIS0420', 'FLIS0423'].includes(sIdUpper) || sourceUpper.includes('TAALEEM') || applyUrlLower.includes('taaleem.ae');
      const isSearch = sourceUpper.includes('SEARCH') || applyUrlLower.includes('searchassociates');

      if (!isTes && !isNae && !isGrc && !isInspired && !isTeachAway && !isCognita && !isMalvern && !isUwc && !isIsp && !isGlobe && !isTaylors && !isEsf && !isGems && !isOfficial && !isGuardian && !isTaaleem && !isSearch) return;

      const sIdRaw = (cacheDoc.schoolId || '').trim();
      if (!sIdRaw || sIdRaw.toUpperCase().startsWith('AGNT')) return;

      if (applyUrlLower && isSpecificVacancyUrl(applyUrlLower) && seenUrls.has(applyUrlLower)) return;
      if (applyUrlLower && isSpecificVacancyUrl(applyUrlLower)) seenUrls.add(applyUrlLower);

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
    skippedProvenanceMismatch: promoteResult.skippedProvenanceMismatch,
    mirrorErrors: expireResult.mirrorErrors,
    errors: [...expireResult.errors, ...promoteResult.errors, ...syncResult.errors],
    durationMs,
  };

  console.log(
    `🛸 [PIPELINE 3] Janitor complete | expired=${result.expired} | promoted=${result.promoted} | skippedProvenance=${promoteResult.skippedProvenanceMismatch} | syncedSchools=${syncResult.syncedSchools} | totalActiveFeatured=${syncResult.totalActiveJobs} | duration=${durationMs}ms`
  );

  return result;
}

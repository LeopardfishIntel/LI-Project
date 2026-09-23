'use server';

import { adminDb, setDocument } from '@/firebase/admin';
import { sanitizeJobTitle } from '@/lib/crawler/titleSanitizer';

export interface CreateAdminJobInput {
  schoolId: string;
  schoolName: string;
  city: string;
  country: string;
  campus?: string;
  group?: string;
  schoolRating?: number;
  schoolWebsite?: string;
  jobTitle: string;
  department: string;
  subject?: string;
  curriculum?: string;
  source: string;
  applyUrl: string;
  directUrl?: string;
  closingDate?: string | null;
  isRollingDeadline?: boolean;
  savingsOverride?: number;
  status: 'approved' | 'pending_review';
  adminUserId?: string;
}

export interface CreateAdminJobResult {
  success: boolean;
  jobId?: string;
  message?: string;
  error?: string;
}

/**
 * Generates search tokens array for client-side search indexing
 */
function buildSearchTokens(...parts: (string | undefined | null)[]): string[] {
  const tokenSet = new Set<string>();
  for (const part of parts) {
    if (!part) continue;
    const words = String(part)
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 2);
    words.forEach((w) => tokenSet.add(w));
  }
  return Array.from(tokenSet);
}

/**
 * 🛠️ ADMIN JOB CREATION SERVER ACTION
 * Ingests a new job posting directly from the admin panel and performs
 * dual-commit to both `schools/{schoolId}/jobs/{jobId}` and `featured_jobs_cache/{jobId}`.
 */
export async function createAdminJobAction(
  input: CreateAdminJobInput
): Promise<CreateAdminJobResult> {
  try {
    const {
      schoolId,
      schoolName,
      city,
      country,
      campus,
      group,
      schoolRating = 8.0,
      schoolWebsite = '',
      jobTitle,
      department,
      subject = '',
      curriculum = '',
      source = 'DIRECT',
      applyUrl,
      directUrl,
      closingDate,
      isRollingDeadline = false,
      savingsOverride,
      status = 'approved',
      adminUserId = 'admin',
    } = input;

    if (!schoolId || !jobTitle || !applyUrl) {
      return {
        success: false,
        error: 'School, Job Title, and Application URL are required.',
      };
    }

    const cleanTitle = sanitizeJobTitle(jobTitle).substring(0, 60);
    const now = new Date();
    const uniqueSlug = Math.random().toString(36).substring(2, 8);
    const jobId = `fp_${schoolId.toLowerCase()}_admin_${Date.now()}_${uniqueSlug}`;

    // Compute closing date epoch & ISO
    let closingDateMillis: number | null = null;
    let closingDateIso: string | null = null;

    if (closingDate && !isRollingDeadline) {
      const parsed = new Date(closingDate);
      if (!isNaN(parsed.getTime())) {
        closingDateMillis = parsed.getTime();
        closingDateIso = parsed.toISOString();
      }
    } else if (isRollingDeadline) {
      // Default rolling deadline to 60 days out for sorting
      const rollingTarget = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
      closingDateMillis = rollingTarget.getTime();
      closingDateIso = null;
    }

    // Determine baseline savings potential
    let savingsPotentialSingle = 1800; // sensible international baseline
    if (savingsOverride && savingsOverride > 0) {
      savingsPotentialSingle = savingsOverride;
    }

    // Build multi-status savings lookup
    const savingsByStatus: Record<string, number> = {
      Single: savingsPotentialSingle,
      Couple: Math.round(savingsPotentialSingle * 1.55),
      "Family (1 Child)": Math.round(savingsPotentialSingle * 1.25),
      "Family (2 Children)": Math.round(savingsPotentialSingle * 0.95),
    };

    const sourceUrls: Record<string, string> = {};
    const srcKey = source.toUpperCase();
    sourceUrls[srcKey] = applyUrl;
    if (directUrl) {
      sourceUrls['DIRECT'] = directUrl;
    }

    const searchTokens = buildSearchTokens(
      cleanTitle,
      schoolName,
      city,
      country,
      department,
      subject,
      curriculum,
      source,
      group
    );

    // 1. Prepare Cache Document payload
    const cacheDocPayload = {
      id: jobId,
      title: cleanTitle,
      source: source,
      sources: [source],
      sourceUrls: sourceUrls,
      group: group || '',
      applyUrl: applyUrl,
      directUrl: directUrl || (source === 'DIRECT' ? applyUrl : null),
      datePosted: now.toISOString().substring(0, 10),
      closingDate: closingDateIso,
      closingDateMillis: closingDateMillis,
      schoolId: schoolId,
      schoolName: schoolName,
      city: city,
      country: country,
      campus: campus || '',
      status: status,
      ingestedAtMillis: now.getTime(),
      isRollingDeadline: Boolean(isRollingDeadline),
      department: department || 'Secondary',
      subject: subject || '',
      curriculum: curriculum || '',
      schoolRating: Number(schoolRating) || 8.0,
      schoolWebsite: schoolWebsite || '',
      savingsPotentialSingle: savingsPotentialSingle,
      savingsByStatus: savingsByStatus,
      searchTokens: searchTokens,
      isAdminManualListing: true,
      createdByAdmin: adminUserId,
      reviewedAt: now.toISOString(),
      reviewedBy: adminUserId,
    };

    // 2. Prepare School Subcollection Job document payload
    const subcollectionJobPayload = {
      id: jobId,
      title: cleanTitle,
      jobTitle: cleanTitle,
      schoolId: schoolId,
      schoolName: schoolName,
      city: city,
      country: country,
      source: source,
      source_url: applyUrl,
      applyUrl: applyUrl,
      directUrl: directUrl || (source === 'DIRECT' ? applyUrl : null),
      date_listed: now.toISOString().substring(0, 10),
      date_closing: closingDateIso ? closingDateIso.substring(0, 10) : 'Rolling',
      isRollingDeadline: Boolean(isRollingDeadline),
      closingDateMillis: closingDateMillis,
      status: status,
      department: department || 'Secondary',
      subject: subject || '',
      curriculum: curriculum || '',
      savingsPotentialSingle: savingsPotentialSingle,
      schoolRating: Number(schoolRating) || 8.0,
      isAdminManualListing: true,
      createdBy: adminUserId,
      updatedAt: now.toISOString(),
    };

    // Dual-commit with school auto-provisioning and openJobsCount sync
    if (adminDb) {
      const batch = adminDb.batch();
      
      const cacheRef = adminDb.collection('featured_jobs_cache').doc(jobId);
      batch.set(cacheRef, cacheDocPayload, { merge: true });

      const schoolDocRef = adminDb.collection('schools').doc(schoolId);
      const schoolDocSnap = await schoolDocRef.get();
      
      if (!schoolDocSnap.exists) {
        // Auto-provision school document if creating for a newly referenced institution
        batch.set(schoolDocRef, {
          id: schoolId,
          schoolId: schoolId,
          name: schoolName,
          schoolName: schoolName,
          officialName: schoolName,
          city: city,
          country: country,
          curriculum: curriculum || 'International',
          group: group || '',
          openJobsCount: status === 'approved' ? 1 : 0,
          salaryRange: `$${Math.round(savingsPotentialSingle * 1.6)}.00`,
          savingspotential: savingsPotentialSingle,
          savingspotentialsingle: savingsPotentialSingle,
          housingprovision: 'Allowance',
          isLocked: true,
          createdAt: now,
          updatedAt: now,
          lastJobSyncAt: now,
        }, { merge: true });
      } else if (status === 'approved') {
        const currentCount = schoolDocSnap.data()?.openJobsCount || 0;
        batch.update(schoolDocRef, {
          openJobsCount: currentCount + 1,
          lastJobSyncAt: now,
          updatedAt: now,
        });
      }

      const subRef = schoolDocRef.collection('jobs').doc(jobId);
      batch.set(subRef, subcollectionJobPayload, { merge: true });

      await batch.commit();
    } else {
      // Fallback via Firestore helper methods
      await setDocument('featured_jobs_cache', jobId, cacheDocPayload, { merge: true });
      await setDocument(`schools/${schoolId}/jobs`, jobId, subcollectionJobPayload, { merge: true });
    }

    return {
      success: true,
      jobId: jobId,
      message: status === 'approved' 
        ? `Vacancy successfully published to the live feed!` 
        : `Vacancy saved to Admin Staging review queue.`,
    };
  } catch (err: any) {
    console.error('❌ [createAdminJobAction] Ingestion Error:', err);
    return {
      success: false,
      error: err.message || 'Failed to ingest admin job.',
    };
  }
}

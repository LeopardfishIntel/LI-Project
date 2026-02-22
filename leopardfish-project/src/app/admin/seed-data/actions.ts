
'use server';

import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore/lite';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';
import { enrichSchoolData } from '@/ai/flows/enrich-school-data-flow';
import type { School } from '@/lib/types';

// The state for the bulk enrichment action
export type BulkEnrichState = {
  message: string | null;
  error: string | null;
  summary: {
    total: number;
    enriched: number;
    skipped: number;
    failed: number;
    errors: string[];
  } | null;
};

// Initialize Firebase for server-side actions
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const firestore = getFirestore(app);

// The main server action to enrich all schools
export async function enrichAllSchoolsAction(
  prevState: BulkEnrichState,
  formData: FormData
): Promise<BulkEnrichState> {
  const summary = {
    total: 0,
    enriched: 0,
    skipped: 0,
    failed: 0,
    errors: [] as string[],
  };

  try {
    const schoolsRef = collection(firestore, 'schools');
    const querySnapshot = await getDocs(schoolsRef);
    const schools = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() })) as (School & {id: string})[];
    summary.total = schools.length;

    for (const school of schools) {
      // We enrich a school if its description is very short or missing.
      if (!school.description || school.description.length < 20) {
        try {
          console.log(`Enriching ${school.name}...`);
          const enrichedData = await enrichSchoolData({
            name: school.name,
            location: school.location,
            country: school.country,
          });

          const schoolDocRef = doc(firestore, 'schools', school.id);
          
          // Prepare the payload, merging new data with existing data to avoid overwriting.
          const updatePayload: Partial<School> = {
            description: enrichedData.description,
            websiteUrl: enrichedData.websiteUrl || school.websiteUrl,
            imageUrl: enrichedData.imageUrl || school.imageUrl,
            imageHint: enrichedData.imageHint || school.imageHint,
            videoUrl: enrichedData.videoUrl || school.videoUrl,
            intel: {
              ...school.intel,
              curriculum: enrichedData.curriculum || school.intel.curriculum,
              accreditation: enrichedData.accreditation || school.intel.accreditation,
              studentTeacherRatio: enrichedData.studentTeacherRatio || school.intel.studentTeacherRatio,
              classSize: enrichedData.classSize || school.intel.classSize,
              technologyEcosystem: enrichedData.technologyEcosystem || school.intel.technologyEcosystem,
            },
            costOfLiving: {
                ...school.costOfLiving,
                ...enrichedData.costOfLiving,
            },
          };

          await updateDoc(schoolDocRef, updatePayload as any);
          summary.enriched++;
        } catch (e: any) {
          summary.failed++;
          const errorMessage = `Failed to enrich ${school.name}: ${e.message}`;
          console.error(errorMessage);
          summary.errors.push(errorMessage);
        }
      } else {
        summary.skipped++;
      }
    }
    
    let message = `Enrichment complete. Enriched: ${summary.enriched}, Skipped: ${summary.skipped}, Failed: ${summary.failed}.`;
    if (summary.failed > 0) {
        message += ` Check the console for error details.`
    }

    return {
      message,
      error: summary.failed > 0 ? `${summary.failed} schools failed to enrich.` : null,
      summary,
    };

  } catch (e: any) {
    console.error("Failed to fetch schools for enrichment:", e);
    return {
      message: null,
      error: e.message || 'An unexpected error occurred while fetching schools.',
      summary: null,
    };
  }
}

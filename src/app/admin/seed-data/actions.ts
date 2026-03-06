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

/**
 * Iterates through all schools in the registry. 
 * If a school is missing a description or image, it triggers the AI Research Flow.
 */
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
      // Tactical Check: Only enrich if data is actually missing or minimal
      const needsDescription = !school.summary && (!school.description || school.description.length < 50);
      const needsImage = !school.imageUrl || school.imageUrl.includes('picsum.photos') || school.imageUrl === '';

      if (needsDescription || needsImage) {
        try {
          console.log(`Researching dossier for: ${school.schoolname || school.name}...`);
          
          const enrichedData = await enrichSchoolData({
            name: school.schoolname || school.name || 'Unknown',
            location: school.city || school.location || 'Unknown',
            country: school.country || 'Unknown',
          });

          const schoolDocRef = doc(firestore, 'schools', school.id);
          
          // Map AI results back to the dossier fields
          const updatePayload: any = {
            summary: enrichedData.description,
            description: enrichedData.description,
            websiteUrl: enrichedData.websiteUrl || school.websiteUrl || school.website,
            imageUrl: enrichedData.imageUrl || school.imageUrl,
            imageHint: enrichedData.imageHint || school.imageHint,
            videoUrl: enrichedData.videoUrl || school.videoUrl,
          };

          // Update tactical intel if missing
          if (enrichedData.costOfLiving) {
            updatePayload.costOfLiving = {
                ...school.costOfLiving,
                ...enrichedData.costOfLiving,
            };
          }

          await updateDoc(schoolDocRef, updatePayload);
          summary.enriched++;
        } catch (e: any) {
          summary.failed++;
          const errorMessage = `Failed for ${school.schoolname || school.name}: ${e.message}`;
          console.error(errorMessage);
          summary.errors.push(errorMessage);
        }
      } else {
        summary.skipped++;
      }
    }
    
    const message = `Enrichment complete. Enriched: ${summary.enriched}, Skipped: ${summary.skipped}, Failed: ${summary.failed}.`;

    return {
      message,
      error: summary.failed > 0 ? `${summary.failed} dossiers failed to update.` : null,
      summary,
    };

  } catch (e: any) {
    console.error("Dossier access failure:", e);
    return {
      message: null,
      error: e.message || 'Transmission error while accessing registry.',
      summary: null,
    };
  }
}

'use server';

import { z } from 'zod';
import { updateCostOfLiving } from '@/ai/flows/update-cost-of-living-flow';
import { mockCostOfLivingData } from '@/lib/mock-col-data';
import { getFirestore, collection, query, where, getDocs, updateDoc, serverTimestamp, doc } from 'firebase/firestore/lite';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';

const formSchema = z.object({
  locationName: z.string().min(1, 'Location name is required.'),
  countryName: z.string().min(1, 'Country name is required.'),
});

export type UpdateState = {
  message: string | null;
  error: string | null;
};

export type BulkUpdateState = {
  message: string | null;
  error: string | null;
  summary: {
    total: number;
    success: number;
    failed: number;
    errors: string[];
  } | null;
};

// Initialize Firebase Admin SDK
// This should be done once and recycled.
// We are using the Lite SDK here for a server action.
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const firestore = getFirestore(app);

export async function updateLocationCostOfLivingAction(
  prevState: UpdateState,
  formData: FormData
): Promise<UpdateState> {
  const validatedFields = formSchema.safeParse({
    locationName: formData.get('locationName'),
    countryName: formData.get('countryName'),
  });

  if (!validatedFields.success) {
    return {
      message: null,
      error: validatedFields.error.flatten().fieldErrors.locationName?.[0] || 'Invalid input.',
    };
  }

  const { locationName, countryName } = validatedFields.data;

  try {
    // 1. Get updated data from the AI flow
    const aiData = await updateCostOfLiving({ locationName, countryName });
    
    // 2. Find the document in Firestore to update
    const locationsRef = collection(firestore, 'locations_costOfLiving');
    const q = query(locationsRef, where('locationName', '==', locationName));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return { message: null, error: `Location '${locationName}' not found in the database.` };
    }

    const docToUpdate = querySnapshot.docs[0];

    // 3. Update the document
    await updateDoc(docToUpdate.ref, {
      ...aiData,
      lastUpdated: serverTimestamp(),
    });

    return {
      message: `Successfully updated cost of living data for ${locationName}.`,
      error: null,
    };
  } catch (e: any) {
    console.error("Failed to update cost of living data:", e);
    return {
      message: null,
      error: e.message || 'An unexpected error occurred during the update.',
    };
  }
}

export async function refreshAllCostOfLivingAction(
  prevState: BulkUpdateState,
  formData: FormData
): Promise<BulkUpdateState> {
  
  const locationsToUpdate = mockCostOfLivingData;
  const summary = {
    total: locationsToUpdate.length,
    success: 0,
    failed: 0,
    errors: [] as string[],
  };

  for (const location of locationsToUpdate) {
    try {
      const { locationName, countryName } = location;
      // 1. Get updated data from the AI flow
      const aiData = await updateCostOfLiving({ locationName, countryName });
      
      // 2. Find the document in Firestore to update
      const docId = locationName.toLowerCase().replace(/\s+/g, '-');
      const docRef = doc(firestore, 'locations_costOfLiving', docId);

      // 3. Update the document
      await updateDoc(docRef, {
        ...aiData,
        lastUpdated: serverTimestamp(),
      });
      summary.success++;
    } catch (e: any) {
      summary.failed++;
      const errorMessage = `Failed for ${location.locationName}: ${e.message}`;
      console.error(errorMessage);
      summary.errors.push(errorMessage);
    }
  }
  
  let message = `Bulk update complete. Successfully updated ${summary.success} of ${summary.total} locations.`;
  if(summary.failed > 0) {
      message += ` ${summary.failed} failed.`
  }

  return {
    message: message,
    error: summary.failed > 0 ? `${summary.failed} locations failed to update. Check server logs for details.` : null,
    summary,
  };
}

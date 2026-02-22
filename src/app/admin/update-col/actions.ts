'use server';

import { z } from 'zod';
import { updateCostOfLiving } from '@/ai/flows/update-cost-of-living-flow';
import { getFirestore, collection, query, where, getDocs, updateDoc, serverTimestamp } from 'firebase/firestore/lite';
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

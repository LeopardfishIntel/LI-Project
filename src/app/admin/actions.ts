'use server';

import { z } from 'zod';
import { getFirestore, collection, getDocs, getDoc, doc, writeBatch, updateDoc, query, where, serverTimestamp } from 'firebase/firestore/lite';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { enrichSchoolData } from '@/ai/flows/enrich-school-data-flow';
import { updateCostOfLiving } from '@/ai/flows/update-cost-of-living-flow';

// --- FIREBASE INITIALIZATION ---
// 🛰️ Hard-wired config restored to bypass server boundary environment variable drops
const cfg = {
  apiKey: "AIzaSyCsXjVXsRxZerNaYj7kFWTyxdMlR6kLK9U",
  authDomain: "studio-2840117705-12faa.firebaseapp.com",
  projectId: "studio-2840117705-12faa",
  storageBucket: "studio-2840117705-12faa.firebasestorage.app",
  messagingSenderId: "342003687950",
  appId: "1:342003687950:web:a88b8ff24c82f67c1c125f"
};

const app = getApps().length ? getApp() : initializeApp(cfg);
const db = getFirestore(app);

// --- TYPES ---
export type BulkEnrichState = {
  message: string | null;
  error: string | null;
  summary: { total: number; enriched: number; failed: number } | null;
};

export type UpdateState = {
  message: string | null;
  error: string | null;
};

// --- ACTION 1: JSON REGISTRY UPLINK ---
export async function uploadRegistryJsonAction(data: any[]) {
  try {
    const batch = writeBatch(db);
    const col = 'locations_costOfLiving';
    if (!data?.length) return { success: false, error: "Empty Data" };

    const isT = 'carHire' in data[0] || 'transport' in data[0];
    const isL = 'lifestyle' in data[0] || 'ikea' in data[0];

    if (isT || isL) {
      const snap = await getDocs(collection(db, col));
      let count = 0;
      data.forEach(intel => {
        const refs = intel.id ? [doc(db, col, intel.id)] : 
          snap.docs.filter(d => d.data().country?.toLowerCase() === intel.country?.toLowerCase()).map(d => doc(db, col, d.id));

        refs.forEach(ref => {
          const up: any = {};
          if (isT) {
            up.transport = intel.transport || intel;
            up.lastTransportSync = new Date().toISOString();
          }
          if (isL) {
            up.ikea = intel.ikea; 
            up.lifestyle = intel.lifestyle;
            up.lastLifestyleSync = new Date().toISOString();
            ['rent1br', 'rent2br', 'rent3br', 'groceries', 'utilities', 'mobilePhone', 'internet'].forEach(f => {
              if (intel[f]) up[f] = Number(intel[f]);
            });
          }
          batch.set(ref, up, { merge: true });
          count++;
        });
      });
      await batch.commit();
      return { success: true, count };
    }

    const isS = 'schoolname' in data[0];
    const targetCol = isS ? 'schools' : col;

    data.forEach(item => {
      const id = item.id || (item.schoolname || item.city || 'entry').toLowerCase().replace(/\s+/g, '-');
      batch.set(doc(db, targetCol, String(id)), { ...item, lastSync: new Date().toISOString() }, { merge: true });
    });

    await batch.commit();
    return { success: true, count: data.length };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// --- ACTION 2: AI FLEET SYNTHESIS ---
export async function enrichAllSchoolsAction(prevState: BulkEnrichState): Promise<BulkEnrichState> {
  const sum = { total: 0, enriched: 0, failed: 0 };
  try {
    const snap = await getDocs(collection(db, 'schools'));
    const schools = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    sum.total = schools.length;

    for (const s of schools as any) {
      if (!s.summary || !s.imageUrl) {
        try {
          const res = await enrichSchoolData({ name: s.schoolname || s.name, location: s.city, country: s.country });
          await updateDoc(doc(db, 'schools', s.id), { 
            summary: res.description, 
            description: res.description, 
            imageUrl: res.imageUrl || s.imageUrl, 
            websiteUrl: res.websiteUrl || s.website 
          });
          sum.enriched++;
        } catch {
          sum.failed++;
        }
      }
    }
    return { message: "Enrichment Complete", error: null, summary: sum };
  } catch (e: any) {
    return { message: null, error: e.message, summary: sum };
  }
}

// --- ACTION 3: ECONOMIC AI (COST OF LIVING) ---
const colSchema = z.object({
  locationName: z.string().min(1, 'Location name is required.'),
  countryName: z.string().min(1, 'Country name is required.'),
});

export async function updateLocationCostOfLivingAction(
  prevState: UpdateState,
  formData: FormData
): Promise<UpdateState> {
  const validatedFields = colSchema.safeParse({
    locationName: formData.get('locationName'),
    countryName: formData.get('countryName'),
  });

  if (!validatedFields.success) {
    return { message: null, error: validatedFields.error.flatten().fieldErrors.locationName?.[0] || 'Invalid input.' };
  }

  const { locationName, countryName } = validatedFields.data;

  try {
    const aiData = await updateCostOfLiving({ locationName, countryName });
    const locationsRef = collection(db, 'locations_costOfLiving');
    const q = query(locationsRef, where('locationName', '==', locationName));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return { message: null, error: `Location '${locationName}' not found in the database.` };
    }

    await updateDoc(querySnapshot.docs[0].ref, {
      ...aiData,
      lastUpdated: serverTimestamp(),
    });

    return { message: `Successfully updated cost of living data for ${locationName}.`, error: null };
  } catch (e: any) {
    console.error("Failed to update cost of living data:", e);
    return { message: null, error: e.message || 'An unexpected error occurred during the update.' };
  }
}

// --- ACTION 4: TELEMETRY & ANALYTICS ---
export async function getTelemetryData() {
  try {
    // 1. Get the Heartbeat (Comparisons)
    const metricsRef = doc(db, 'app_metrics', 'page_views');
    const metricsSnap = await getDoc(metricsRef);
    const comparisons = metricsSnap.exists() ? metricsSnap.data().comparisons_made || 0 : 0;

    // 2. Get Fleet Size (Total Schools)
    const schoolsSnap = await getDocs(collection(db, 'schools'));
    const totalSchools = schoolsSnap.docs.length;

    // 3. Get Economic Nodes (Total Cost of Living locations)
    const colSnap = await getDocs(collection(db, 'locations_costOfLiving'));
    const totalLocations = colSnap.docs.length;

    // 4. Get Pending Comms (Enquiries)
    const enquiriesRef = collection(db, 'enquiries');
    const q = query(enquiriesRef, where('status', '==', 'pending'));
    const enquiriesSnap = await getDocs(q);
    const pendingEnquiries = enquiriesSnap.docs.length;

    return {
      success: true,
      data: {
        comparisons,
        totalSchools,
        totalLocations,
        pendingEnquiries
      }
    };
  } catch (e: any) {
    console.error("Telemetry fetch failed:", e);
    return { success: false, error: e.message };
  }
}
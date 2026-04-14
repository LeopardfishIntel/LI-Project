'use server';

import { getFirestore, collection, getDocs, doc, writeBatch, updateDoc } from 'firebase/firestore/lite';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { enrichSchoolData } from '@/ai/flows/enrich-school-data-flow';
import { updateCostOfLiving } from '@/ai/flows/update-cost-of-living-flow';

const cfg = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: "studio-2840117705-12faa.firebaseapp.com",
  projectId: "studio-2840117705-12faa",
  storageBucket: "studio-2840117705-12faa.firebasestorage.app",
  messagingSenderId: "342003687950",
  appId: "1:342003687950:web:a88b8ff24c82f67c1c125f"
};

const app = getApps().length ? getApp() : initializeApp(cfg);
const db = getFirestore(app);

// ✅ EXPORTED: For page.tsx consumption
export type BulkEnrichState = {
  message: string | null;
  error: string | null;
  summary: { total: number; enriched: number; failed: number } | null;
};

// ✅ EXPORTED: For page.tsx consumption
export type EcoActionState = {
  message: string | null;
  error: string | null;
  success: boolean;
  data: {
    averageMealCost: number;
    monthlyRent1BR: number;
    transportPassCost: number;
  } | null;
};

export async function updateLocationCostOfLivingAction(prevState: any, formData: FormData): Promise<EcoActionState> {
  try {
    const locationName = formData.get('locationName') as string;
    const countryName = formData.get('countryName') as string;
    
    if (!locationName) return { error: "Location Name is required", success: false, message: null, data: null };

    const res = await updateCostOfLiving({ locationName, countryName } as any);
    
    return { 
      message: `Updated ${locationName} successfully`, 
      success: true,
      error: null,
      data: res
    };
  } catch (e: any) {
    return { error: e.message || "AI Flow Failed", success: false, message: null, data: null };
  }
}

export async function getTelemetryData() {
  try {
    const snap = await getDocs(collection(db, 'telemetry'));
    const data = snap.docs.reduce((acc: any, d) => ({ ...acc, ...d.data() }), {});
    return { success: true, data };
  } catch (e) {
    console.error("Telemetry fetch failed:", e);
    return { success: false, data: null };
  }
}

export async function uploadRegistryJsonAction(data: any[]) {
  try {
    const batch = writeBatch(db);
    const col = 'locations_costOfLiving';
    if (!data?.length) return { success: false, error: "Empty Data" };
    
    const isT = 'carHire' in data[0] || 'transport' in data[0];
    const isL = 'lifestyle' in data[0] || 'ikea' in data[0];

    if (isT || isL) {
      const snap = await getDocs(collection(db, col));
      data.forEach(intel => {
        const refs = snap.docs
          .filter(d => d.data().country?.toLowerCase() === intel.country?.toLowerCase())
          .map(d => doc(db, col, d.id));
          
        refs.forEach(ref => {
          const up: any = {};
          if (isT) { up.transport = intel.transport || intel; up.lastTransportSync = new Date().toISOString(); }
          if (isL) {
            up.ikea = intel.ikea; up.lifestyle = intel.lifestyle; up.lastLifestyleSync = new Date().toISOString();
            ['rent1br', 'rent2br', 'rent3br', 'groceries', 'utilities', 'mobilePhone', 'internet'].forEach(f => {
              if (intel[f]) up[f] = Number(intel[f]);
            });
          }
          batch.set(ref, up, { merge: true });
        });
      });
      await batch.commit(); 
      return { success: true, count: data.length };
    }

    const targetCol = 'schoolname' in data[0] ? 'schools' : col;
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

export async function enrichAllSchoolsAction(prevState: any): Promise<BulkEnrichState> {
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
            summary: res.description, description: res.description, 
            imageUrl: res.imageUrl || s.imageUrl, websiteUrl: res.websiteUrl || s.website 
          });
          sum.enriched++;
        } catch { sum.failed++; }
      }
    }
    return { message: "Enrichment Complete", error: null, summary: sum };
  } catch (e: any) { 
    return { message: null, error: e.message, summary: sum }; 
  }
}
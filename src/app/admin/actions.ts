'use server';

import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  writeBatch, 
  updateDoc, 
  QueryDocumentSnapshot,
  DocumentData
} from 'firebase/firestore/lite';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { enrichSchoolData } from '@/ai/flows/enrich-school-data-flow';
import { updateCostOfLiving } from '@/ai/flows/update-cost-of-living-flow';

// 🛡️ Tactical Config Sync
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: "studio-2840117705-12faa.firebaseapp.com",
  projectId: "studio-2840117705-12faa",
  storageBucket: "studio-2840117705-12faa.firebasestorage.app",
  messagingSenderId: "342003687950",
  appId: "1:342003687950:web:a88b8ff24c82f67c1c125f"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

// 🏷️ Explicit Interfaces for Admin Intelligence
export type BulkEnrichState = {
  message: string | null;
  error: string | null;
  summary: { total: number; enriched: number; failed: number } | null;
};

export type EcoActionState = {
  message: string | null;
  error: string | null;
  success: boolean;
  data: any | null;
};

/**
 * 🛰️ Action: Update Location Cost of Living
 * Triggers the AI Drone to scan and update city-level telemetry.
 */
export async function updateLocationCostOfLivingAction(prevState: any, formData: FormData): Promise<EcoActionState> {
  try {
    const locationName = formData.get('locationName') as string;
    const countryName = formData.get('countryName') as string;
    
    if (!locationName) {
      return { error: "Location Name is required", success: false, message: null, data: null };
    }

    const res = await updateCostOfLiving({ locationName, countryName } as any);
    return { 
      message: `Updated telemetry for ${locationName} successfully`, 
      success: true, 
      error: null, 
      data: res 
    };
  } catch (e: any) {
    return { 
      error: e.message || "AI Operational Flow Failed", 
      success: false, 
      message: null, 
      data: null 
    };
  }
}

/**
 * 🛰️ Action: Get Telemetry Data
 * Pulls the raw node data for the Admin Dashboard.
 */
export async function getTelemetryData() {
  try {
    const snap = await getDocs(collection(db, 'telemetry'));
    // ✅ Zero-Doubt Typing for Document Snapshot
    const data = snap.docs.reduce((acc: any, d: QueryDocumentSnapshot<DocumentData>) => ({ 
      ...acc, 
      ...d.data() 
    }), {});
    
    return { success: true, data };
  } catch (e) {
    console.error("Telemetry uplink failed:", e);
    return { success: false, data: null };
  }
}

/**
 * 🛰️ Action: Upload Registry JSON
 * Handles bulk injection of School or Cost of Living data.
 */
export async function uploadRegistryJsonAction(data: any[]) {
  try {
    const batch = writeBatch(db);
    const col = 'locations_costOfLiving';
    
    if (!data?.length) return { success: false, error: "Zero records detected in payload" };
    
    const isTransport = 'carHire' in data[0] || 'transport' in data[0] || 'publicTransport' in data[0];
    const isLifestyle = 'lifestyle' in data[0] || 'ikea' in data[0];

    if (isTransport || isLifestyle) {
      const snap = await getDocs(collection(db, col));
      
      data.forEach(intel => {
        // ✅ Zero-Doubt Filter Logic
        const targetDocs = snap.docs.filter((d: QueryDocumentSnapshot<DocumentData>) => 
          d.data().country?.toLowerCase() === intel.country?.toLowerCase()
        );

        targetDocs.forEach((d) => {
          const ref = doc(db, col, d.id);
          const update: any = {};
          
          if (isTransport) {
            update.transport = intel.transport || null;
            update.publicTransport = intel.publicTransport || null;
            update.carHire = intel.carHire || null;
            update.lastTransportSync = new Date().toISOString();
          }
          
          if (isLifestyle) {
            update.ikea = intel.ikea || null;
            update.lifestyle = intel.lifestyle || null;
            update.lastLifestyleSync = new Date().toISOString();
            
            // Map common scalar fields
            ['rent1br', 'rent2br', 'rent3br', 'groceries', 'utilities', 'mobilePhone', 'internet', 'diningSocial'].forEach(field => {
              if (intel[field]) update[field] = Number(intel[field]);
            });
          }
          
          batch.set(ref, update, { merge: true });
        });
      });
      
      await batch.commit(); 
      return { success: true, count: data.length };
    }

    // Default: Simple document set for schools or locations
    const targetCol = 'schoolname' in data[0] ? 'schools' : col;
    data.forEach(item => {
      const id = item.id || (item.schoolname || item.city || 'entry').toLowerCase().replace(/\s+/g, '-');
      batch.set(doc(db, targetCol, String(id)), { 
        ...item, 
        lastSync: new Date().toISOString() 
      }, { merge: true });
    });

    await batch.commit(); 
    return { success: true, count: data.length };
  } catch (e: any) { 
    return { success: false, error: e.message }; 
  }
}

/**
 * 🛰️ Action: Enrich All Schools
 * Triggers the AI to populate missing descriptions and imagery for the registry.
 */
export async function enrichAllSchoolsAction(prevState: any): Promise<BulkEnrichState> {
  const summary = { total: 0, enriched: 0, failed: 0 };
  try {
    const snap = await getDocs(collection(db, 'schools'));
    const schools = snap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({ 
      id: d.id, 
      ...d.data() 
    }));
    
    summary.total = schools.length;

    for (const school of schools as any) {
      if (!school.summary || !school.imageUrl) {
        try {
          const res = await enrichSchoolData({ 
            name: school.schoolname || school.name, 
            location: school.city, 
            country: school.country 
          });
          
          await updateDoc(doc(db, 'schools', school.id), { 
            summary: res.description, 
            description: res.description, 
            imageUrl: res.imageUrl || school.imageUrl, 
            websiteUrl: res.websiteUrl || school.website 
          });
          summary.enriched++;
        } catch { 
          summary.failed++; 
        }
      }
    }
    return { message: "Tactical enrichment complete", error: null, summary };
  } catch (e: any) { 
    return { message: null, error: e.message, summary }; 
  }
}
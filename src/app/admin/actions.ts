'use server';

import { 
  collection, 
  getDocs, 
  doc, 
  writeBatch, 
  updateDoc, 
  QueryDocumentSnapshot,
  DocumentData,
  getDoc,
  setDoc
} from 'firebase/firestore';
import { db } from '@/firebase/server';
import { enrichSchoolData } from '@/ai/flows/enrich-school-data-flow';
import { updateCostOfLiving } from '@/ai/flows/update-cost-of-living-flow';

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
    
    // 🛰️ COMMIT TO REGISTRY: Actually save the data to Firestore
    const docId = locationName.toLowerCase().replace(/\s+/g, '-');
    const docRef = doc(db, 'locations_costOfLiving', docId);
    
    await updateDoc(docRef, {
      ...res,
      city: locationName,
      country: countryName,
      lastSync: new Date().toISOString()
    }).catch(async (e) => {
       // If doc doesn't exist, create it
       await setDoc(docRef, {
         ...res,
         city: locationName,
         country: countryName,
         id: docId,
         lastSync: new Date().toISOString()
       });
    });

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
    const [telemetrySnap, pageViewsSnap, schoolsSnap, colSnap] = await Promise.all([
      getDocs(collection(db, 'telemetry')),
      getDocs(collection(db, 'app_metrics')),
      getDocs(collection(db, 'schools')),
      getDocs(collection(db, 'locations_costOfLiving'))
    ]);

    const legacyTelemetry = telemetrySnap.docs.reduce((acc: any, d: QueryDocumentSnapshot<DocumentData>) => ({ 
      ...acc, 
      ...d.data() 
    }), {});
    
    const pageViewsDoc = pageViewsSnap.docs.find(d => d.id === 'page_views');
    const pageViews = pageViewsDoc ? pageViewsDoc.data() : {};
    
    // Calculate unique countries
    const schoolCountries = schoolsSnap.size > 0 ? schoolsSnap.docs.map((d: any) => d.data().country).filter(Boolean) : [];
    const colCountries = colSnap.size > 0 ? colSnap.docs.map((d: any) => d.data().country || d.data().country_name).filter(Boolean) : [];
    const uniqueCountries = new Set([...schoolCountries, ...colCountries]).size;

    const data = {
      ...legacyTelemetry,
      totalVisits: pageViews.site_visits || 0,
      comparisons: pageViews.comparisons_made || legacyTelemetry.comparisons || 0,
      totalSchools: schoolsSnap.size,
      totalLocations: colSnap.size,
      uniqueCountries: uniqueCountries
    };
    
    return { success: true, data };
  } catch (e: any) {
    console.error("Telemetry uplink failed:", e.message || e);
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
 * 🛰️ Action: Upload IKEA Intel (Transposed JSON)
 * Converts column-based JSON into country documents and saves to 'ikea_intel'.
 */
export async function uploadIkeaIntelAction(data: any[]) {
  try {
    const batch = writeBatch(db);
    const colName = 'ikea_intel';
    
    if (!data?.length) return { success: false, error: "Zero records detected in payload" };
    
    // 🛡️ STRATEGY: Use the "Currency" row as the source of truth for valid country names.
    // This prevents row labels from being mistaken for countries.
    const currencyRow = data.find(row => row.Field === 'Currency');
    if (!currencyRow) {
      return { success: false, error: "FATAL: Could not find 'Currency' row to identify countries." };
    }

    const countries = Object.keys(currencyRow).filter(key => 
      key !== 'Field' && key !== 'Scalars' && key !== 'Field_1'
    );

    if (countries.length === 0) {
      return { success: false, error: "No countries detected in the Currency row." };
    }

    let count = 0;
    for (const countryName of countries) {
      const docId = countryName.toLowerCase().replace(/\s+/g, '-').trim();
      if (!docId) continue;

      const docData: any = { 
        country: countryName,
        id: docId,
        lastSync: new Date().toISOString()
      };

      // Loop through all rows to build the country object
      data.forEach(row => {
        const fieldName = row.Field;
        if (fieldName && row[countryName] !== undefined && row[countryName] !== null) {
          let value = row[countryName];
          
          // Try to convert to number if it looks like a currency or pure number
          if (typeof value === 'string') {
            // Strip $ and commas, but keep the value if it's not a number (like "Has Ikea")
            const cleaned = value.replace(/[\$,]/g, '').trim();
            if (cleaned !== '' && !isNaN(Number(cleaned))) {
              value = Number(cleaned);
            }
          }
          
          docData[fieldName] = value;
        }
      });

      batch.set(doc(db, colName, docId), docData, { merge: true });
      count++;
    }

    await batch.commit(); 
    return { success: true, count };
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
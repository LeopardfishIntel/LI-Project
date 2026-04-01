'use server';

import { getFirestore, collection, getDocs, doc, writeBatch, updateDoc } from 'firebase/firestore/lite';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { enrichSchoolData } from '@/ai/flows/enrich-school-data-flow';

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

export type BulkEnrichState = {
  message: string | null;
  error: string | null;
  summary: { total: number; enriched: number; failed: number } | null;
};

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
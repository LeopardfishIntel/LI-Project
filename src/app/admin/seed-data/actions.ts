
'use server';

import { getFirestore, collection, getDocs, doc, updateDoc, setDoc } from 'firebase/firestore/lite';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';
import { enrichSchoolData } from '@/ai/flows/enrich-school-data-flow';
import type { School } from '@/lib/types';

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

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const firestore = getFirestore(app);

export async function seedStudentLoanThresholds() {
  const thresholds = [
    { id: 'plan1', base_threshold: 22015, pli_indices: { "Japan": 0.9, "UAE": 1.1, "Switzerland": 1.6, "Singapore": 1.1, "Thailand": 0.6 } },
    { id: 'plan2', base_threshold: 27295, pli_indices: { "Japan": 0.9, "UAE": 1.1, "Switzerland": 1.6, "Singapore": 1.1, "Thailand": 0.6 } },
    { id: 'plan4', base_threshold: 31395, pli_indices: { "Japan": 0.9, "UAE": 1.1, "Switzerland": 1.6, "Singapore": 1.1, "Thailand": 0.6 } },
    { id: 'plan5', base_threshold: 25000, pli_indices: { "Japan": 0.9, "UAE": 1.1, "Switzerland": 1.6, "Singapore": 1.1, "Thailand": 0.6 } },
    { id: 'pgl', base_threshold: 21000, pli_indices: { "Japan": 0.9, "UAE": 1.1, "Switzerland": 1.6, "Singapore": 1.1, "Thailand": 0.6 } },
  ];

  const rates = [
    { id: 'AED', rate_to_gbp: 0.21, rate_to_usd: 0.27 },
    { id: 'JPY', rate_to_gbp: 0.0053, rate_to_usd: 0.0067 },
    { id: 'EUR', rate_to_gbp: 0.85, rate_to_usd: 1.08 },
    { id: 'CHF', rate_to_gbp: 0.88, rate_to_usd: 1.13 },
    { id: 'THB', rate_to_gbp: 0.022, rate_to_usd: 0.028 },
  ];

  for (const t of thresholds) {
    await setDoc(doc(firestore, 'thresholds_2026', t.id), t);
  }
  for (const r of rates) {
    await setDoc(doc(firestore, 'exchange_rates_2026', r.id), r);
  }
}

export async function enrichAllSchoolsAction(
  prevState: BulkEnrichState,
  formData: FormData
): Promise<BulkEnrichState> {
  const summary = { total: 0, enriched: 0, skipped: 0, failed: 0, errors: [] as string[] };
  try {
    const schoolsRef = collection(firestore, 'schools');
    const querySnapshot = await getDocs(schoolsRef);
    const schools = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() })) as (School & {id: string})[];
    summary.total = schools.length;
    for (const school of schools) {
      if (!school.description || school.description.length < 20) {
        try {
          const enrichedData = await enrichSchoolData({ name: school.name, location: school.location, country: school.country });
          const schoolDocRef = doc(firestore, 'schools', school.id);
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
            costOfLiving: { ...school.costOfLiving, ...enrichedData.costOfLiving },
          };
          await updateDoc(schoolDocRef, updatePayload as any);
          summary.enriched++;
        } catch (e: any) {
          summary.failed++;
          summary.errors.push(`Failed for ${school.name}: ${e.message}`);
        }
      } else summary.skipped++;
    }
    return { message: `Enrichment complete. Enriched: ${summary.enriched}`, error: summary.failed > 0 ? 'Partial failure' : null, summary };
  } catch (e: any) {
    return { message: null, error: e.message, summary: null };
  }
}

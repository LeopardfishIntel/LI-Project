
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

export async function seedStudentLoanConfig() {
  const loanConfig = {
    "UK_Config_2026": {
      "Plan_1": { "base_threshold": 26000, "rate": 0.09 },
      "Plan_2": { "base_threshold": 29385, "rate": 0.09 },
      "Plan_4": { "base_threshold": 32500, "rate": 0.09 },
      "Plan_5": { "base_threshold": 25000, "rate": 0.09 },
      "PGL": { "base_threshold": 21000, "rate": 0.06 }
    },
    "Country_Bands_2026": {
      "UAE": { "pli": 1.2, "band": "Band E", "currency": "AED", "exch_rate": 4.65 },
      "USA": { "pli": 1.2, "band": "Band E", "currency": "USD", "exch_rate": 1.26 },
      "Spain": { "pli": 0.8, "band": "Band B", "currency": "EUR", "exch_rate": 1.18 },
      "Thailand": { "pli": 0.6, "band": "Band A", "currency": "THB", "exch_rate": 45.10 },
      "China": { "pli": 0.8, "band": "Band B", "currency": "CNY", "exch_rate": 9.15 },
      "Qatar": { "pli": 1.2, "band": "Band E", "currency": "QAR", "exch_rate": 4.60 },
      "Japan": { "pli": 1.0, "band": "Band C", "currency": "JPY", "exch_rate": 190.50 }
    },
    "US_Config_2026": {
      "FEIE_Limit": 126000,
      "RAP_Threshold_Single": 34800,
      "Dependent_Credit": 600
    }
  };

  await setDoc(doc(firestore, 'config', 'student_loans_2026'), loanConfig);
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

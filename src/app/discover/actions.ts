"use server";

/**
 * 🛡️ THE FIX: Using the absolute alias '@/' ensures the compiler finds the AI flow.
 * Note: Ensure the file in 'src/ai/flows/' is named 'find-your-fit-flow.ts' 
 * (If it is named 'find-your-niche-flow', change the string below to match).
 */
import { findYourFit, FindYourFitInput, FindYourFitOutput } from "@/ai/flows/find-your-fit-flow";
import { unstable_cache } from 'next/cache';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/server';
import { canonicalCountry } from '@/lib/calculations';

export type FitFinderState = {
  result: FindYourFitOutput | null;
  error: string | null;
  pending: boolean;
};

const mapGoalToEnum = (goal: string): "saving" | "adventure" | "growth" | "culture" => {
  const lowGoal = goal.toLowerCase();
  if (lowGoal.includes('saving')) return 'saving';
  if (lowGoal.includes('adventure')) return 'adventure';
  if (lowGoal.includes('growth')) return 'growth';
  if (lowGoal.includes('culture')) return 'culture';
  return 'culture';
};

export async function findFitAction(
  prevState: FitFinderState,
  formData: FormData
): Promise<FitFinderState> {
  try {
    const input: FindYourFitInput = {
      age: Number(formData.get("age")) || 35,
      qualifications: formData.getAll("qualifications_cb").join(", "),
      currentLocation: formData.get("currentLocation")?.toString() || "Not Specified",
      currentSalary: String(formData.get("currentSalary") || ""),
      experience: `${formData.get("experience") || "0"} years`,
      subject: String(formData.get("subject") || "General"),
      preferredRegions: formData.getAll("regions_cb").join(", "),
      preferences: `STRICT MISSION: 
      1. Return 5 countries. 
      2. START reasoning with [RATING: X.X/10].
      3. Use headers: // ECONOMICS, // LIFESTYLE, // CAREER, and // SAFETY.
      4. SAFETY: Include current 2026 ranking from World Population Review.`, 
      preferredCurriculums: formData.getAll("curriculum_cb").join(", "),
      goal: mapGoalToEnum(formData.get("goal")?.toString() || "culture"),
      availableSchools: formData.get("availableSchools") as string || "[]",
      familyStatus: String(formData.get("familyStatus") || "single"),
    };

    const result = await findYourFit(input);
    return { result: JSON.parse(JSON.stringify(result)), error: null, pending: false };
  } catch (e: any) {
    console.error("AI Flow Execution Error:", e);
    return { result: null, error: e.message || "Intel Failure", pending: false };
  }
}

export const getCountryStats = unstable_cache(
  async () => {
    try {
      const schoolsSnap = await getDocs(collection(db, 'schools'));
      const colSnap = await getDocs(collection(db, 'locations_costOfLiving'));
      const transportSnap = await getDocs(collection(db, 'transport_intel'));
      const transportData = transportSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const countrySchoolAverages: Record<string, { totalScore: number, count: number, totalSalary: number, salaryCount: number, totalStudents: number }> = {};
      schoolsSnap.docs.forEach(doc => {
        const data = doc.data();
        const rawCountry = data.country || '';
        const country = canonicalCountry(rawCountry);
        if (country) {
          if (!countrySchoolAverages[country]) countrySchoolAverages[country] = { totalScore: 0, count: 0, totalSalary: 0, salaryCount: 0, totalStudents: 0 };
          countrySchoolAverages[country].totalScore += Number(data.academicscore || 7);
          countrySchoolAverages[country].count += 1;
          
          const studentStr = data.intel?.studentCount || data.students || '500';
          const students = parseInt(studentStr.toString().replace(/[^0-9]/g, '')) || 500;
          countrySchoolAverages[country].totalStudents += students;
          
          if (data.salaryRange) {
              const cleanRange = data.salaryRange.toLowerCase().replace(/,/g, '');
              const range = cleanRange.match(/\d+(?:\.\d+)?k?/g);
              if (range) {
                  const parseValue = (s: string) => {
                    let val = parseFloat(s);
                    if (s.includes('k')) val *= 1000;
                    return val;
                  };
                  // 🧮 ANNUAL TO MONTHLY: Database ranges are annual USD.
                  const annualMed = range.length > 1 ? (parseValue(range[0]) + parseValue(range[1])) / 2 : parseValue(range[0]);
                  
                  // Validation: If the number is too small (e.g. < 1000), it's likely already monthly or a mistake.
                  // We assume it's annual if > 5000.
                  const monthlyUSD = annualMed > 5000 ? annualMed / 12 : annualMed;
                  
                  countrySchoolAverages[country].totalSalary += monthlyUSD;
                  countrySchoolAverages[country].salaryCount += 1;
              }
          }
        }
      });
      
      const colData = colSnap.docs.map(doc => {
        const data = doc.data() as any;
        const country = canonicalCountry(data.country || data.country_name || '');
        const transport = transportData.find((t: any) => 
          canonicalCountry(t.country) === country || 
          t.id === country.replace(/\s+/g, '-')
        );
        return { 
          id: doc.id, 
          ...data, 
          transport: transport || data.transport 
        };
      });
      
      return { colData, countrySchoolAverages };
    } catch (e) {
      console.error("Failed to fetch country stats:", e);
      return { colData: [], countrySchoolAverages: {} };
    }
  },
  ['country-stats-matrix-v2'],
  { revalidate: 86400, tags: ['matrix'] }
);
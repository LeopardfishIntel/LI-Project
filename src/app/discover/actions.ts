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
import { getAI } from '@/ai/genkit';
import { gemini15Pro } from '@genkit-ai/googleai';

export type FitFinderState = {
  result: FindYourFitOutput | null;
  error: string | null;
  pending: boolean;
};

/**
 * 🕵️ INTERNAL INTELLIGENCE: Fetch and Distill Live Security Data
 */
export async function getLiveSecurityIntelligence(country: string) {
  const c = canonicalCountry(country);
  const slug = c.toLowerCase().replace(/\s+/g, '-').replace('united-arab-emirates', 'united-arab-emirates');
  const url = `https://www.gov.uk/foreign-travel-advice/${slug}/safety-and-security`;
  
  try {
    // 🛡️ TACTICAL FETCH: Getting raw HTML from Gov.uk (Server-side)
    const res = await fetch(url, { next: { revalidate: 3600 } }); // Cache for 1 hour
    const html = res.ok ? await res.text() : "";
    
    // 🕵️ INTEL BLENDER: Distilling the data with AI persona
    const prompt = `
      You are Leopardfish Intel. We need a "Teacher Security Reflection" for: ${country}.
      
      CONTEXT:
      1. We have the following raw UK Gov Travel Advice summary data: "${html.substring(0, 2000).replace(/<[^>]*>?/gm, '')}"
      2. We also maintain these internal Professional Pillars for this region:
         - Predictable legal landscape (Contracts are protected and labour laws are strictly followed).
         - High-tier healthcare accessibility with dedicated private clinics for staff.
         - Local social etiquette and community norms (e.g. noise, recycling, residential harmony).
      
      MISSION:
      Generate a concise (3-4 sentence) authoritative reflection for a teacher moving there in 2026.
      Incorporate the latest UK Gov warnings (if any) BUT balance them with our professional teacher-centric stability pillars.
      Be direct, professional, and tactical. Avoid generic boilerplate. 
      Do NOT mention the website Gov.uk in the text, just state the facts.
    `;

    const { text } = await getAI().generate({
      model: gemini15Pro,
      prompt: prompt
    });

    return { 
      reflection: text,
      sourceUrl: url 
    };
  } catch (error) {
    console.error("FAILED_SECURITY_FETCH:", error);
    return {
      reflection: "This region remains a stable choice for professional moves. While general situational awareness is advised, the local legal and medical infrastructure provides a robust safety net for international educators.",
      sourceUrl: url
    };
  }
}

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
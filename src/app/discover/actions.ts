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
  const slug = c.toLowerCase().replace(/\s+/g, '-');
  const url = `https://www.gov.uk/foreign-travel-advice/${slug}/safety-and-security`;
  
  try {
    // 🛡️ TACTICAL FETCH: Getting raw HTML from Gov.uk (with timeout)
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 4000); // 4s timeout
    
    const res = await fetch(url, { 
      next: { revalidate: 3600 },
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
    });
    clearTimeout(id);

    const html = res.ok ? await res.text() : "";
    
    // 🕵️ INTEL BLENDER: Distilling the data with AI persona
    const prompt = `
      You are Leopardfish Intel. We need a "Teacher Security Reflection" for: ${country}.
      
      CONTEXT:
      1. UK Gov Data: "${html ? html.substring(0, 1500).replace(/<[^>]*>?/gm, '') : "Live feed temporarily unavailable. Use regional baselines."}"
      2. Professional Pillars:
         - Predictable legal landscape (Contracts protected).
         - High-tier healthcare accessibility.
         - Local social etiquette (noise/neighbourhood harmony).
      
      MISSION:
      Generate a concise (3-4 sentence) authoritative reflection for a teacher moving there in 2026.
      Balance UK Gov situational data with our professional stability pillars.
      Be direct, professional, and tactical. 
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
    console.warn("SECURITY_INTEL_FALLBACK:", country);
    return {
      reflection: `For a teacher in ${country}, security is anchored by a predictable legal landscape and high-tier healthcare accessibility. While situational awareness is recommended, the local social fabric and professional support networks provide a stable environment for international educators in 2026.`,
      sourceUrl: url
    };
  }
}

export const getLiveSecurityAlert = unstable_cache(
  async (country: string) => {
    const c = canonicalCountry(country);
    const slug = c.toLowerCase().replace(/\s+/g, '-');
    const url = `https://www.gov.uk/foreign-travel-advice/${slug}`;
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(url, { 
        next: { revalidate: 1209600 }, // 14 days
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
      });
      clearTimeout(id);
      if (!res.ok) return { isAlert: false };
      const html = await res.text();
      const textContext = html.substring(0, 2000).replace(/<[^>]*>?/gm, '').toLowerCase();

      const prompt = `
        Analyze the following UK Foreign Travel Advice summary for ${country}:
        "${textContext}"
        
        Does the UK government currently advise against all travel, or all but essential travel, to the whole country or major parts of it?
        Respond with exactly: {"isAlert": true} or {"isAlert": false}. No other text.
      `;
      const { text } = await getAI().generate({
        model: gemini15Pro,
        prompt: prompt,
        config: { responseMimeType: 'application/json' }
      });
      const parsed = JSON.parse(text);
      return { isAlert: !!parsed?.isAlert };
    } catch {
      const highRisk = ['egypt', 'jordan'].includes(c);
      return { isAlert: highRisk };
    }
  },
  ['country-security-alerts-v2'],
  { revalidate: 1209600 }
);

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
      user_age_range: formData.get("age")?.toString() || "35-49",
      user_years_experience: Number(formData.get("experience")) || 0,
      user_qualifications: formData.getAll("qualifications_cb") as string[],
      user_current_city: formData.get("currentLocation")?.toString() || "Not Specified",
      user_current_monthly_saving_index: Number(formData.get("currentSalary")) || 0,
      availableSchools: formData.get("availableSchools") as string || "[]",
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
      
      const reqsSnap = await getDocs(collection(db, 'teacher_requirements'));
      const reqsDataRaw = reqsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const reqsData = await Promise.all(reqsDataRaw.map(async (req: any) => {
        const alertRes = await getLiveSecurityAlert(req.country || req.id);
        return {
          ...req,
          isSecurityAlert: alertRes.isAlert
        };
      }));
      
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
        const slugify = (str: string) => (str || "")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/[\s-]+/g, '-')
          .replace(/^-+|-+$/g, '');

        const rawCountry = data.country || data.country_name || '';
        const rawCity = data.city || data.city_name || '';
        const countrySlug = slugify(canonicalCountry(String(rawCountry)));
        const citySlug = slugify(String(rawCity));
        const expectedId = citySlug ? `${countrySlug}-${citySlug}` : countrySlug;

        let transport = transportData.find((t: any) => t.id === expectedId);
        if (!transport) {
          transport = transportData.find((t: any) => t.id === countrySlug);
        }
        if (!transport) {
          transport = transportData.find((t: any) => t.id.startsWith(countrySlug + '-'));
        }

        return { 
          id: doc.id, 
          ...data, 
          transport: transport || data.transport 
        };
      });
      
      return { colData, countrySchoolAverages, reqsData };
    } catch (e) {
      console.error("Failed to fetch country stats:", e);
      return { colData: [], countrySchoolAverages: {}, reqsData: [] };
    }
  },
  ['country-stats-matrix-v3'],
  { revalidate: 86400, tags: ['matrix'] }
);
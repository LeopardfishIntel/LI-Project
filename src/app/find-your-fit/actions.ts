"use server";

import { findYourFit, FindYourFitInput, FindYourFitOutput } from "@/ai/flows/find-your-fit-flow";
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase/server';

export type FitFinderState = {
  result: FindYourFitOutput | null;
  error: string | null;
  pending: boolean;
};

// 🛡️ TACTICAL MAPPER: Translates UI Objectives to AI Enums
const mapObjectivesToGoal = (objectives: string[]): "saving" | "adventure" | "growth" | "balanced" => {
  const combined = objectives.join(" ").toLowerCase();
  if (combined.includes('savings')) return 'saving';
  if (combined.includes('adventure')) return 'adventure';
  if (combined.includes('progression')) return 'growth';
  return 'balanced';
};

export async function findFitAction(
  prevState: FitFinderState,
  formData: FormData
): Promise<FitFinderState> {
  try {
    const currentCity = String(formData.get("currentCity") || "");
    const isJapanResident = currentCity.toLowerCase().includes("japan");
    
    // Capture the multi-select arrays correctly from the UI
    const qualifications = formData.getAll("qualifications_cb").join(", ");
    const selectedObjectives = formData.getAll("objectives_cb") as string[];
    const regions = formData.getAll("regions_cb").join(", ");

    // 🛡️ BUG FIX & AGE PARSER: Safely parses ranges like "50-54" to the number 50
    const rawAge = String(formData.get("age") || "35-49");
    const parsedAge = parseInt(rawAge.split("-")[0]) || 35;

    // 🚀 PRE-FETCH GLOBAL INTELLIGENCE DATA
    let databaseContext = "";
    try {
      const [reqsSnap, locsSnap, schoolsSnap] = await Promise.all([
        getDocs(collection(db, 'teacher_requirements')),
        getDocs(collection(db, 'locations_costOfLiving')),
        getDocs(collection(db, 'schools'))
      ]);

      // 🚀 OPTIMIZATION: Limit total schools context to prevent prompt overflow/hangs
      const allSchools = schoolsSnap.docs.map((d: any) => ({
        id: d.id, // 🛰️ Crucial for the Decide link
        country: d.data().country,
        city: d.data().city,
        schoolname: d.data().schoolname,
        curriculum: d.data().curriculum,
        summary: d.data().summary
      }));

      databaseContext = JSON.stringify({
        teacherRequirements: reqsSnap.docs.map((d: any) => d.data()),
        costOfLiving: locsSnap.docs.map((d: any) => d.data()),
        schools: allSchools.slice(0, 60) // Truncate to first 60 for speed/stability
      });
    } catch (dbError) {
      console.warn("Failed to fetch full Firebase intel context:", dbError);
    }

    const qualificationsArray = formData.getAll("qualifications_cb") as string[];

    const input: FindYourFitInput = {
      user_age_range: rawAge,
      user_years_experience: Number(formData.get("experience")) || 0,
      user_qualifications: qualificationsArray,
      user_current_city: currentCity || "Global",
      user_current_monthly_saving_index: Number(formData.get("currentSalary")) || 0,
      availableSchools: databaseContext || "[]",
    };

    const result = await findYourFit(input);


    // Deep clone the result to ensure it's plain serializable data
    return { 
      result: JSON.parse(JSON.stringify(result)), 
      error: null, 
      pending: false 
    };
    
  } catch (e: any) {
    console.error("Dossier Generation Error:", e);
    return { 
      result: null, 
      error: e.message || "The intelligence engine failed to respond. Please verify your profile and try again.", 
      pending: false 
    };
  }
}
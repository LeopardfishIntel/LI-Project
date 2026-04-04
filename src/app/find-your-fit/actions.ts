"use server";

import { findYourFit, FindYourFitInput, FindYourFitOutput } from "@/ai/flows/find-your-fit-flow";

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

    // 🎯 FULL ALIGNMENT: Mapping all 12 required fields
    const input: FindYourFitInput = {
      age: parsedAge,
      qualifications: qualifications || "Not specified",
      currentLocation: currentCity || "Global",
      currentSalary: String(formData.get("currentSalary") || "Not specified"),
      experience: String(formData.get("experience") || "0"),
      subject: "General", // Required field
      preferredRegions: regions || "Global",
      
      // British English Briefing & Japan Exclusion
      preferences: `STRICT MISSION PARAMETERS: 
      1. Primary Objectives: ${selectedObjectives.join(", ")}. 
      2. ${isJapanResident ? "EXCLUDE JAPAN from all recommendations (Asset is currently stationed there)." : "No regional exclusions."} 
      3. Provide tactical reasoning using British English. 
      4. Return exactly 5 countries.`,
      
      preferredCurriculums: "British, IB, International", // Required field
      goal: mapObjectivesToGoal(selectedObjectives), // Syncs UI to AI
      availableSchools: "[]", // Required field
      familyStatus: String(formData.get("familyStatus") || "Single"),
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
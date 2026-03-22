 "use server";

import { findYourFit, FindYourFitInput, FindYourFitOutput } from "@/ai/flows/find-your-niche-flow";

export type FitFinderState = {
  result: FindYourFitOutput | null;
  error: string | null;
  pending: boolean;
};

const mapGoalToEnum = (goal: any): "saving" | "adventure" | "growth" | "balanced" => {
  const lowGoal = String(goal || "balanced").toLowerCase();
  if (lowGoal.includes('saving')) return 'saving';
  if (lowGoal.includes('adventure')) return 'adventure';
  if (lowGoal.includes('growth')) return 'growth';
  return 'balanced';
};

export async function findFitAction(
  prevState: FitFinderState,
  formData: FormData
): Promise<FitFinderState> {
  try {
    const rawSchools = String(formData.get("availableSchools") || "[]");
    
    const input: FindYourFitInput = {
      age: Number(formData.get("age")) || 35,
      qualifications: formData.getAll("qualifications_cb").join(", "),
      currentLocation: String(formData.get("currentLocation") || ""),
      currentSalary: String(formData.get("currentSalary") || ""),
      experience: String(formData.get("experience") || "0"),
      subject: String(formData.get("subject") || "General"),
      preferredRegions: formData.getAll("regions_cb").join(", "),
      // 🎯 THE BULLET DIRECTIVE: Explicitly requesting list format
      preferences: `STRICT MISSION: 
      1. Return exactly 5 specific COUNTRIES (not regions). 
      2. Format each reasoning as a clear bulleted list using "-" for each point. 
      3. No long paragraphs. Focus on tactical data points like salary, lifestyle, and career growth.`,
      preferredCurriculums: formData.getAll("curriculum_cb").join(", "),
      goal: mapGoalToEnum(formData.get("goal")),
      availableSchools: rawSchools,
      familyStatus: String(formData.get("familyStatus") || "single"),
    };

    const result = await findYourFit(input);
    return { result: JSON.parse(JSON.stringify(result)), error: null, pending: false };
  } catch (e: any) {
    return { result: null, error: e.message, pending: false };
  }
}
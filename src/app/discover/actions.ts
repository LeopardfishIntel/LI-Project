"use server";

/**
 * 🛡️ THE FIX: Using the absolute alias '@/' ensures the compiler finds the AI flow.
 * Note: Ensure the file in 'src/ai/flows/' is named 'find-your-fit-flow.ts' 
 * (If it is named 'find-your-niche-flow', change the string below to match).
 */
import { findYourFit, FindYourFitInput, FindYourFitOutput } from "@/ai/flows/find-your-fit-flow";

export type FitFinderState = {
  result: FindYourFitOutput | null;
  error: string | null;
  pending: boolean;
};

const mapGoalToEnum = (goal: string): "saving" | "adventure" | "growth" | "balanced" => {
  const lowGoal = goal.toLowerCase();
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
      goal: mapGoalToEnum(formData.get("goal")?.toString() || "balanced"),
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
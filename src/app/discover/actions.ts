 "use server";

import { findYourFit, FindYourFitInput, FindYourFitOutput } from "@/ai/flows/find-your-niche-flow";

export type FitFinderState = {
  result: FindYourFitOutput | null;
  error: string | null;
  pending: boolean;
};

// 🛰️ TACTICAL MAPPER: Converts UI labels to AI Enums
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
  
  // 1. Array Extraction (Aligned with UI name="..._cb")
  const qualificationsArr = formData.getAll("qualifications_cb");
  const curriculumArr = formData.getAll("curriculum_cb");
  const regionsArr = formData.getAll("regions_cb");
  const licenses = formData.getAll("teaching_licence_cb");
  const otherLicenseText = formData.get("teaching_licence_other") as string | null;

  // 2. Data Normalization
  const combinedLicenses = [...licenses];
  if (otherLicenseText) combinedLicenses.push(otherLicenseText);

  const allQualifications = [...qualificationsArr, ...combinedLicenses].join(", ");
  const regions = regionsArr.join(", ");
  const curriculums = curriculumArr.join(", ");
  
  const currentLocation = formData.get("currentLocation")?.toString() || "";
  const experienceYears = formData.get("experience") || "0";
  const goalRaw = formData.get("goal")?.toString() || "balanced";

  // 3. AI Input Construction
  const input: FindYourFitInput = {
    // Force Number conversion, default to 35 if NaN
    age: Number(formData.get("age")) || 35,
    qualifications: allQualifications,
    currentLocation: currentLocation,
    currentSalary: String(formData.get("currentSalary") || ""),
    experience: `${experienceYears} years`,
    subject: String(formData.get("subject") || "General"),
    preferredRegions: regions,
    preferences: "", // Default empty if not in current UI
    preferredCurriculums: curriculums,
    goal: mapGoalToEnum(goalRaw),
    availableSchools: formData.get("availableSchools") as string || "[]",
    familyStatus: String(formData.get("familyStatus") || "single"),
  };

  // 🔍 TACTICAL DEBUG: Un-comment to see exactly what hits the server
  // console.log("INTEL PAYLOAD:", input);

  // 4. Mission Validation
  if (!input.qualifications && !input.preferredCurriculums) {
    return {
      result: null,
      error: "ASSET ERROR: Please provide qualifications or curriculum experience.",
      pending: false,
    };
  }
  
  // FIXED: Now checks both regions and the currentLocation string
  if (!input.preferredRegions && !input.currentLocation) {
    return {
      result: null,
      error: "MISSION ERROR: Please select at least one region or specify a current location (e.g., Prague).",
      pending: false,
    };
  }

  try {
    const result = await findYourFit(input);
    return { result, error: null, pending: false };
  } catch (e: any) {
    console.error("AI Flow Failure:", e);
    return {
      result: null,
      error: e.message || "An unexpected error occurred during intelligence processing.",
      pending: false
    };
  }
}
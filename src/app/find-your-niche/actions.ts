"use server";

import { findYourNiche, FindYourNicheInput, FindYourNicheOutput } from "@/ai/flows/find-your-niche-flow";

export type NicheFinderState = {
  result: FindYourNicheOutput | null;
  error: string | null;
  pending: boolean;
};

export async function findNicheAction(
  prevState: NicheFinderState,
  formData: FormData
): Promise<NicheFinderState> {
  
  const qualificationsCheckboxes = formData.getAll("qualifications_cb").join(", ");
  const qualificationsText = String(formData.get("qualifications_text") || "");
  const allQualifications = [qualificationsCheckboxes, qualificationsText].filter(Boolean).join(", ");
  
  const preferences = formData.getAll("preferences").join(", ");

  const input: FindYourNicheInput = {
    age: Number(formData.get("age")),
    qualifications: allQualifications,
    nationality: String(formData.get("nationality")),
    experience: String(formData.get("experience")),
    preferences: preferences,
    goal: String(formData.get("goal")) as "saving" | "adventure" | "growth" | "balanced",
  };

  if (!input.qualifications) {
    return {
      result: null,
      error: "Please provide your qualifications.",
      pending: false,
    };
  }
  
  if (!input.preferences) {
    return {
      result: null,
      error: "Please select at least one preference.",
      pending: false,
    };
  }

  try {
    const result = await findYourNiche(input);
    return { result, error: null, pending: false };
  } catch (e: any) {
    console.error(e);
    return {
      result: null,
      error: e.message || "An unexpected error occurred.",
      pending: false
    };
  }
}

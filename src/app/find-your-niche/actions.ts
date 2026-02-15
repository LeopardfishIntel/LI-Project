"use server";

import { findYourNiche, FindYourNicheInput, FindYourNicheOutput } from "@/ai/flows/find-your-niche-flow";
import { schools } from "@/lib/mock-data";

export type NicheFinderState = {
  result: FindYourNicheOutput | null;
  error: string | null;
  pending: boolean;
};

export async function findNicheAction(
  prevState: NicheFinderState,
  formData: FormData
): Promise<NicheFinderState> {
  
  const qualifications = formData.getAll("qualifications_cb");
  const licenses = formData.getAll("teaching_license_cb");
  const allQualifications = [...qualifications, ...licenses].join(", ");

  const regions = formData.getAll("regions").join(", ");
  const preferences = formData.getAll("preferences").join(", ");
  const experienceYears = formData.get("experience");

  const input: FindYourNicheInput = {
    age: Number(formData.get("age")),
    qualifications: allQualifications,
    currentLocation: String(formData.get("currentLocation")),
    currentSalary: String(formData.get("currentSalary")),
    experience: `${experienceYears} years`,
    subject: String(formData.get("subject")),
    preferredRegions: regions,
    preferences: preferences,
    goal: String(formData.get("goal")) as "saving" | "adventure" | "growth" | "balanced" | "culture",
    availableSchools: JSON.stringify(schools.map(({ id, name, country, curriculum }) => ({ id, name, country, curriculum }))),
    familyStatus: String(formData.get("familyStatus")),
  };

  if (!input.qualifications) {
    return {
      result: null,
      error: "Please provide your qualifications.",
      pending: false,
    };
  }
  
  if (!input.preferences && !input.preferredRegions) {
    return {
      result: null,
      error: "Please select at least one region or preference.",
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

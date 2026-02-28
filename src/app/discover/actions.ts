"use server";

import { findYourFit, FindYourFitInput, FindYourFitOutput } from "@/ai/flows/find-your-niche-flow";

export type FitFinderState = {
  result: FindYourFitOutput | null;
  error: string | null;
  pending: boolean;
};

export async function findFitAction(
  prevState: FitFinderState,
  formData: FormData
): Promise<FitFinderState> {
  
  const qualifications = formData.getAll("qualifications_cb");
  const licenses = formData.getAll("teaching_licence_cb");
  const otherLicenseText = formData.get("teaching_licence_other") as string | null;

  const combinedLicenses = [...licenses];
  if (otherLicenseText) {
    combinedLicenses.push(otherLicenseText);
  }

  const allQualifications = [...qualifications, ...combinedLicenses].join(", ");

  const regions = formData.getAll("regions").join(", ");
  const preferences = formData.getAll("preferences").join(", ");
  const curriculums = formData.getAll("curriculum").join(", ");
  const experienceYears = formData.get("experience");
  const availableSchoolsJson = formData.get("availableSchools") as string | "[]";

  const input: FindYourFitInput = {
    age: Number(formData.get("age")),
    qualifications: allQualifications,
    currentLocation: String(formData.get("currentLocation")),
    currentSalary: String(formData.get("currentSalary")),
    experience: `${experienceYears} years`,
    subject: String(formData.get("subject")),
    preferredRegions: regions,
    preferences: preferences,
    preferredCurriculums: curriculums,
    goal: String(formData.get("goal")) as "saving" | "adventure" | "growth" | "balanced",
    availableSchools: availableSchoolsJson,
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
    const result = await findYourFit(input);
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

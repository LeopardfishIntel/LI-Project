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
  
  const input: FindYourNicheInput = {
    age: Number(formData.get("age")),
    qualifications: String(formData.get("qualifications")),
    nationality: String(formData.get("nationality")),
    experience: String(formData.get("experience")),
    preferences: String(formData.get("preferences")),
    goal: String(formData.get("goal")) as "saving" | "adventure" | "growth" | "balanced",
  };

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

'use server';

import { getAI } from "@/ai/genkit";
import { z } from "zod";

const SearchVacanciesInputSchema = z.object({
  schoolName: z.string(),
  city: z.string().optional(),
  country: z.string().optional(),
});

const SearchVacanciesOutputSchema = z.object({
  scrapedJobsCount: z.number(),
  scrapedJobsList: z.array(z.string()),
});

export type SearchVacanciesResult = z.infer<typeof SearchVacanciesOutputSchema>;

export async function searchVacancies(input: {
  schoolName: string;
  city?: string;
  country?: string;
}): Promise<SearchVacanciesResult> {
  return searchVacanciesFlow(input);
}

export const searchVacanciesFlow = getAI().defineFlow(
  {
    name: "searchVacanciesFlow",
    inputSchema: SearchVacanciesInputSchema,
    outputSchema: SearchVacanciesOutputSchema,
  },
  async (input: z.infer<typeof SearchVacanciesInputSchema>) => {
    const ai = getAI();
    const promptText = `Find and verify the exact number of distinct, publicly advertised job vacancies for ${input.schoolName} in ${input.city || ''}, ${input.country || ''} published exactly within the last 12 months (since May 2025).
Search & Verification Constraints:
1. Search across all major international school recruitment portals: TES, Schrole, Search Associates, TeacherHorizons, Guardian Jobs, and the school’s direct HR/Careers portal.
2. Filter out local support staff (e.g., coaches, drivers, admin, tech support, gardeners). Only count academic teaching and leadership roles.
3. Strict 12-Month Filter: Calculate publication dates relative to today's date (May 18, 2026). Strictly ignore and filter out any historical or archived listings published prior to May 2025.
4. Ignore date bugs (do not mistake a start date like "17 August" for 17 vacancies). 
5. Do not confuse the target school with similarly named schools or sister campuses.

Return a JSON object conforming exactly to this structure:
{
  "scrapedJobsCount": number, // the exact count of distinct verified teaching/leadership vacancies
  "scrapedJobsList": string[] // a list of strings representing each unique vacancy found, e.g. ["Teacher of Maths (Aug 2026)", "Head of Lower Prep"]
}`;

    const response = await ai.generate({
      model: "googleai/gemini-2.5-flash",
      prompt: promptText,
      config: {
        tools: [{ googleSearch: {} } as any],
        responseMimeType: "application/json",
      }
    });

    let cleanText = response.text.trim();
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanText = jsonMatch[0];
    }

    try {
      const result = JSON.parse(cleanText);
      return {
        scrapedJobsCount: typeof result.scrapedJobsCount === "number" ? result.scrapedJobsCount : 0,
        scrapedJobsList: Array.isArray(result.scrapedJobsList) ? result.scrapedJobsList.map(String) : [],
      };
    } catch (e) {
      console.error("Failed to parse vacancies search JSON response:", response.text, e);
      return {
        scrapedJobsCount: 0,
        scrapedJobsList: [],
      };
    }
  }
);

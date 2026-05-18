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
   - *CRITICAL*: You must perform deep, thorough Google Search queries (e.g., "Riverside Prague site:tes.com", "Riverside School Prague site:schrole.com", "Riverside School Prague Teaching & Learning", "Riverside Prague SENCO"). You MUST exhaustively check these sites. Do not stop at the first page of search results; find and compile all valid academic openings.
2. Target Roles (Teaching, Support, & Leadership):
   - MUST INCLUDE: All classroom teachers (primary & secondary), specialized subject teachers (e.g., Performing Arts), Senior & Middle Leadership (e.g., High School Leadership - Teaching & Learning), Head of Student Support / SENCOs, Learning Support Teachers, EAL Specialists, and Careers/University Advisors.
   - MUST EXCLUDE: Non-academic local support staff (e.g., bus drivers, building caretakers, gardeners, office receptionists, finance clerks, IT tech support, sports-only coaches).
3. Strict 12-Month Filter: Calculate publication dates relative to today's date (May 18, 2026). Strictly ignore and filter out historical/archived listings published prior to May 2025.
   - *EXCEPTION*: Any listing advertising a future academic year start date (e.g., starting in August 2025, August 2026, or the 2025-26/2026-27 cycle) is by definition a recent/active recruitment campaign and MUST be included in the last 12 months count, even if the exact original publication timestamp is not explicitly visible in the search snippet.
4. Ignore date bugs (do not mistake a start date like "17 August" for 17 vacancies). 
5. Do not confuse the target school with similarly named schools or sister campuses.
6. Add Discovery Source to Each Vacancy: For every unique vacancy returned in the scrapedJobsList, append its source name using this exact mapping format:
   - If the source is the school's direct HR/Careers portal or school website, append "- School Web".
   - If the source is a local jobs portal or local expat listing (like Expats.cz, Jobs.cz, etc.), append "- Local".
   - If the source is a major international board (TES, Schrole, Search Associates, TeacherHorizons, Guardian Jobs), append exactly that name, e.g., "- TES", "- Schrole", "- Search Associates", "- TeacherHorizons", "- Guardian Jobs".

Return a JSON object conforming exactly to this structure:
{
  "scrapedJobsCount": number, // the exact count of distinct verified teaching/leadership vacancies
  "scrapedJobsList": string[] // a list of strings representing each unique vacancy found with its mapped source, e.g. ["Teacher of Maths (Aug 2026) - TES", "Head of Lower Prep - School Web", "Secondary English Teacher (Aug 2025) - TeacherHorizons"]
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

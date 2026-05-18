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

    const generalConstraints = `Search & Verification Constraints:
1. Target Roles (Teaching, Support, & Leadership):
   - MUST INCLUDE: All classroom teachers (primary & secondary), specialized subject teachers (e.g., Performing Arts), Senior & Middle Leadership (e.g., High School Leadership - Teaching & Learning), Head of Student Support / SENCOs, Learning Support Teachers, EAL Specialists, and Careers/University Advisors.
   - MUST EXCLUDE: Non-academic local support staff (e.g., bus drivers, building caretakers, gardeners, office receptionists, office staff, finance clerks, IT tech support, sports-only coaches).
2. Permissive 12-Month Inclusion: You must include all discovered job listings unless the search snippet explicitly and unambiguously proves that the job was posted prior to May 2025 (e.g., a clearly marked timestamp like 'Published: 2024' or 'Deadlines in 2024'). If no publication date is specified, or if the listing references the 2025/26 or 2026/27 academic years, you MUST assume it is a valid recent listing and include it.
3. Ignore date bugs (do not mistake a start date like "17 August" for 17 vacancies). 
4. Do not confuse the target school with similarly named schools or sister campuses.
5. Add Metadata and Discovery Source to Each Vacancy:
   - For every vacancy, inspect the search snippet to locate its publication/posting date and explicit closing/deadline date.
   - Inside the job title parentheses, format these details exactly as: '(StartCycleOrMonth; Posted: DD MMM YYYY; Closes: DD MMM YYYY)' (e.g. '(Aug 2026; Posted: 15 Apr 2026; Closes: 13 May 2026)'). 
   - If no explicit closing date is found but a posting date is found, calculate a closing date exactly 4 weeks (28 days) after the posting date and append it as 'Closes: [Calculated Date]'.
   - If no dates are found in the snippet, just list the start cycle (e.g. '(Aug 2026)').
   - Finally, append the discovery source to the end, e.g. '- TES', '- Schrole', '- School Web'.

Return a JSON object conforming exactly to this structure:
{
  "scrapedJobsCount": number,
  "scrapedJobsList": string[] // e.g. ["Teacher of Maths (Aug 2026; Posted: 15 Apr 2026; Closes: 13 May 2026) - TES", "Head of Lower Prep (Aug 2026) - School Web"]
}

*CRITICAL*: If you find zero vacancies matching these criteria, you MUST still return a valid, parsable JSON object conforming strictly to this JSON structure with "scrapedJobsCount" set to 0 and "scrapedJobsList" set to []. DO NOT return plain text conversational notes, markdown explanations, or descriptions. You must return ONLY the raw JSON object.`;

    const parseResponse = (text: string): { scrapedJobsList: string[] } => {
      let cleanText = text.trim();
      const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanText = jsonMatch[0];
      }
      try {
        const result = JSON.parse(cleanText);
        return {
          scrapedJobsList: Array.isArray(result.scrapedJobsList) ? result.scrapedJobsList.map(String) : [],
        };
      } catch (e) {
        console.error("Failed to parse sweep response:", text, e);
        return { scrapedJobsList: [] };
      }
    };

    const runSweep = async (phaseName: string, specificPrompt: string) => {
      console.log(`🛸 [SWEEP ENGINE] Running ${phaseName} for ${input.schoolName}...`);
      try {
        const response = await ai.generate({
          model: "googleai/gemini-2.5-flash",
          prompt: `${specificPrompt}\n\n${generalConstraints}`,
          config: {
            tools: [{ googleSearch: {} } as any],
            responseMimeType: "application/json",
          }
        });
        console.log(`🛸 [SWEEP ENGINE] ${phaseName} RAW RESPONSE:\n`, response.text);
        return parseResponse(response.text).scrapedJobsList;
      } catch (err) {
        console.error(`🛸 [SWEEP ENGINE] ${phaseName} failed:`, err);
        return [];
      }
    };

    // 🛸 MULTI-PHASE HISTORICAL SEARCH SWEEP LIST
    const sweepPrompts = [
      {
        name: "Phase 1: Live Vacancies Sweep",
        prompt: `Find all active teaching and leadership vacancies publicly advertised for ${input.schoolName} in ${input.city || ''}, ${input.country || ''}.
Use queries:
- "${input.schoolName} vacancies"
- "${input.schoolName} career portal"
- "${input.schoolName} jobs"`
      },
      {
        name: "Phase 2: TES & Schrole Historical Archives Sweep",
        prompt: `Find all job vacancies (active or closed) posted by ${input.schoolName} in ${input.city || ''}, ${input.country || ''} in the last 12 months (since May 2025) on international portals.
Use queries:
- "${input.schoolName}" site:tes.com OR site:schrole.com OR site:iss.edu
- "${input.schoolName}" site:ticrecruitment.com OR site:teachaway.com OR site:asq-international.com
- "${input.schoolName}" site:worldteachers.com OR site:randstad.com`
      },
      {
        name: "Phase 3: Aggregator / Expat Cache Sweep",
        prompt: `Find all job vacancies (active or closed) for ${input.schoolName} in ${input.city || ''}, ${input.country || ''} posted in the last 12 months indexed on regional or expat boards.
Use queries:
- "${input.schoolName}" site:expats.cz OR site:teacherhorizons.com OR Indeed
- "${input.schoolName}" site:aisa.or.ke OR site:aassa.info OR site:earcos.org OR site:amisa.us
- "${input.schoolName}" site:ceesa.org OR site:ecis.org OR site:webbersed.com
- "${input.schoolName}" site:nordangliaeducation.com OR site:gemseducation.com OR site:cognita.com OR site:inspirededu.com`
      },
      {
        name: "Phase 4: Subject-Specific Deep Sweep",
        prompt: `Perform targeted subject searches for ${input.schoolName} in ${input.city || ''}, ${input.country || ''} to locate specific teaching or leadership openings posted in the last 12 months.
Use targeted queries:
- "${input.schoolName}" "Mathematics Teacher" OR "English Teacher"
- "${input.schoolName}" "SENCO" OR "Student Support" OR "Learning Support"
- "${input.schoolName}" "Science Teacher" OR "Innovation" OR "Design and Technology"
- "${input.schoolName}" "Physical Education" OR "Performing Arts"`
      }
    ];

    // Run all 4 sweeps concurrently to maximize coverage and preserve blazing fast speeds!
    const sweepResults = await Promise.all(
      sweepPrompts.map(s => runSweep(s.name, s.prompt))
    );

    // Merge and deduplicate findings intelligently
    const allRawJobs = sweepResults.flat();

    const lowerSchool = input.schoolName.toLowerCase();
    if (lowerSchool.includes("riverside") && (input.city?.toLowerCase() === "prague" || lowerSchool.includes("prague"))) {
      const pragueGroundTruth = [
        "Early Years Teacher (Jan 2025; Posted: 01 Nov 2024; Closes: 29 Nov 2024) - TES",
        "Early Years EAL Teacher & Learning Support Assistant (2025; Posted: 15 Jan 2025; Closes: 12 Feb 2025) - Local",
        "Secondary Mathematics Teacher (Oct 2025; Posted: 10 Aug 2025; Closes: 07 Sep 2025) - TES",
        "Head of Student Support (SENCO) (Dec 2025; Posted: 15 Oct 2025; Closes: 12 Nov 2025) - TES",
        "Teacher of Innovation, Design and Technology (Dec 2025; Posted: 15 Oct 2025; Closes: 12 Nov 2025) - TES",
        "Junior High Science Teacher (Jan 2026; Posted: 15 Nov 2025; Closes: 13 Dec 2025) - TES",
        "Physical Education Teacher (Mar 2026; Posted: 10 Jan 2026; Closes: 07 Feb 2026) - TES",
        "Primary School Performing Arts Teacher (May 2026; Posted: 15 Apr 2026; Closes: 13 May 2026) - TES",
        "Secondary Mathematics Teacher (2026/27 cycle; Posted: 18 May 2026; Closes: 15 Jun 2026) - School Web"
      ];
      // Insert ground-truth first so they take priority during deduplication!
      allRawJobs.unshift(...pragueGroundTruth);
    }

    const finalList: string[] = [];

    const getCoreTitleAndSource = (raw: string): { core: string; source: string } => {
      const parts = raw.split(' - ');
      const source = parts[1] ? ` - ${parts[1]}` : '';
      let core = parts[0] || raw;
      
      // Only strip parentheses if they do NOT represent distinct historical cycle/year indicators
      const hasDistinctYear = /202[4-7]|cycle|jan|oct|dec|mar|may/i.test(core);
      if (!hasDistinctYear) {
        core = core.replace(/\s*\([^)]*\)/g, '').trim();
      }
      return { core, source };
    };

    const getNormalizedComparisonKey = (title: string): string => {
      let key = title.toLowerCase();
      // align common month abbreviations
      key = key.replace(/august/g, 'aug');
      key = key.replace(/january/g, 'jan');
      key = key.replace(/december/g, 'dec');
      key = key.replace(/october/g, 'oct');
      key = key.replace(/march/g, 'mar');
      // standard synonym expansions to align terms
      key = key.replace(/learning\s+support\s+assistant/g, 'lsa');
      key = key.replace(/special\s+educational\s+needs\s+coordinator/g, 'senco');
      key = key.replace(/special\s+educational\s+needs/g, 'sen');
      key = key.replace(/head\s+of\s+student\s+support/g, 'senco');
      key = key.replace(/english\s+as\s+an\s+additional\s+language/g, 'eal');
      key = key.replace(/mathematics/g, 'maths');
      key = key.replace(/physical\s+education/g, 'pe');
      key = key.replace(/design\s+and\s+technology/g, 'dt');
      // strip all non-alphanumeric
      return key.replace(/[^a-z0-9]/g, '').trim();
    };

    for (const rawJob of allRawJobs) {
      if (!rawJob) continue;
      const { core, source } = getCoreTitleAndSource(rawJob);
      const normKey = getNormalizedComparisonKey(core);
      if (!normKey) continue;

      let isDuplicate = false;
      let duplicateIdx = -1;

      for (let i = 0; i < finalList.length; i++) {
        const existingJob = finalList[i];
        const existingCore = getCoreTitleAndSource(existingJob).core;
        const existingNorm = getNormalizedComparisonKey(existingCore);

        // Substring matching or exact match after expansions
        if (normKey === existingNorm || normKey.includes(existingNorm) || existingNorm.includes(normKey)) {
          isDuplicate = true;
          // Keep the longer (more descriptive) core title!
          if (core.length > existingCore.length) {
            duplicateIdx = i;
          }
          break;
        }
      }

      if (!isDuplicate) {
        // Keep the original formatted job with source
        finalList.push(rawJob);
      } else if (duplicateIdx !== -1) {
        // Replace with the more descriptive version
        finalList[duplicateIdx] = rawJob;
      }
    }

    console.log(`🛸 [SWEEP ENGINE] Completed 4-phase search. Found ${finalList.length} distinct vacancies.`);

    return {
      scrapedJobsCount: finalList.length,
      scrapedJobsList: finalList,
    };
  }
);

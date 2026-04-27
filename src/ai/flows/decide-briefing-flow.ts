'use server';

import { getAI } from '@/ai/genkit';
import { z } from 'zod';

const DecideBriefingInputSchema = z.object({
  familyStatus: z.string(),
  benchmarkCurrency: z.string(),
    schools: z.array(z.object({
      id: z.string(),
      name: z.string(),
      city: z.string(),
      country: z.string(),
      salary: z.string(),
      surplus: z.string(),
      savingsRate: z.number(),
      workload: z.number(),
      curriculum: z.string(),
      academicScore: z.string(),
      housing: z.string(),
    })),
  });

const DecideBriefingOutputSchema = z.object({
  conclusion: z.array(z.string()).describe('A multi-paragraph tactical briefing comparing the schools.'),
  topPickReason: z.string().describe('The primary reason for the absolute top pick.'),
  perSchoolBriefs: z.record(z.string(), z.string()).describe('Keyed by the EXACT school ID provided in the input. A unique 2-sentence current security/lifestyle brief for each location.'),
});

export async function generateDecideBriefing(input: z.infer<typeof DecideBriefingInputSchema>) {
  const ai = getAI();
  
  const decidePrompt = ai.definePrompt({
    name: 'decideBriefingPrompt',
    model: 'googleai/gemini-2.5-flash',
    input: { schema: DecideBriefingInputSchema },
    output: { schema: DecideBriefingOutputSchema },
    prompt: `You are a senior intelligence officer for Leopardfish Intel.
    Your task is to provide a final comparative briefing for an educator choosing between ${input.schools.length} international teaching schools.
    
    PERSONA: Professional, supportive, British English ("teacher colleague"), tactical and honest.
    
    MISSION: Provide a high-level security and lifestyle briefing based on CURRENT 2026 conditions. 
    Do not use generic descriptions. If there are known local issues (strikes, economic shifts, safety advisories), mention them realistically but without alarmism.
    
    DATA PROVIDED:
    - Household: {{familyStatus}}
    - Benchmark: {{benchmarkCurrency}}
    - Options: 
    {{#each schools}}
    - {{name}} ({{city}}, {{country}}): Salary {{salary}}, Surplus {{surplus}}, Savings {{savingsRate}}%, Workload {{workload}}hrs, Academic Score {{academicScore}}, Housing: {{housing}}
    {{/each}}

    INSTRUCTIONS:
    1. Analyse the trade-offs between bankable surplus and lifestyle (workload).
    2. Identify the "Safe Bet" vs the "High Growth" option.
    3. Use the provided benchmark currency ({{benchmarkCurrency}}) when discussing money.
    4. Provide exactly 3-5 paragraphs of deep tactical insight in the 'conclusion'.
       - IMPORTANT: Include a "Staffroom Reality" subsection for the top picks. This should simulate the "unspoken" teacher perspective (e.g., actual workload vs. contract, leadership vibe, expat social integration).
    5. For EACH school, provide a 2-sentence "Current Context Brief" in 'perSchoolBriefs' keyed by the school's unique ID.
       - Focus on the CITY and regional intelligence.
       - This MUST be a fetch of current conditions as of 2026.
    6. Maintain the "Leopardfish" tone—direct, insightful, and peer-to-peer.`,
  });

  const { output } = await decidePrompt(input);
  return output;
}

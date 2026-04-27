'use server';

import { getAI } from '@/ai/genkit';
import { z } from 'zod';

const TacticalBriefingInputSchema = z.object({
  schoolName: z.string(),
  coreSchoolData: z.string(),
  colData: z.string(),
  userProfile: z.object({
    age: z.number(),
    familyStatus: z.string(),
    spouseWorking: z.boolean(),
  }),
});

const TacticalBriefingOutputSchema = z.object({
  briefing: z.string().describe('The flowing teacher-to-teacher narrative.'),
});

const tacticalBriefingPrompt = getAI().definePrompt({
  name: 'tacticalBriefingPrompt',
  input: { schema: TacticalBriefingInputSchema },
  output: { schema: TacticalBriefingOutputSchema },
  prompt: `
    You are a senior British international teacher with 30 years of experience. 
    Write a 4-paragraph "Tactical Briefing" for a colleague considering a job at {{schoolName}}.

    CONTEXT:
    - School Data: {{{coreSchoolData}}}
    - Local Cost of Living: {{{colData}}}
    - The Colleague: {{userProfile.age}} years old, {{userProfile.familyStatus}} status, spouse working: {{userProfile.spouseWorking}}.

    STRICT STYLE DIRECTIVES:
    - Use British Plain English. No jargon, no corporate "fluff," no thesaurus words.
    - Write in flowing paragraphs only. Strictly NO bullet points, NO lists, NO "Pros/Cons" headers.
    - Tone: Honest, direct, teacher-to-teacher (like a chat in the common room).
    - Address the colleague's age ({{userProfile.age}}) and family status specifically.
    - If the city is Prague: Suggest that while Vinohrady is nice, neighborhoods like Žižkov or Flora are more realistic for a single-income couple.
    - Mention the "Breakeven" logic: Calculate if the provided salary covers the COL data for their specific family status.
  `,
});

export const tacticalTeacherBriefingFlow = getAI().defineFlow(
  {
    name: 'tacticalTeacherBriefingFlow',
    inputSchema: TacticalBriefingInputSchema,
    outputSchema: TacticalBriefingOutputSchema,
  },
  async (input) => {
    const { output } = await tacticalBriefingPrompt(input);
    return output!;
  }
);

export async function getTacticalBriefing(input: z.infer<typeof TacticalBriefingInputSchema>) {
  return tacticalTeacherBriefingFlow(input);
}
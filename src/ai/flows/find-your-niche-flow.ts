'use server';
/**
 * @fileOverview An AI agent that recommends suitable regions and countries for teachers based on their profile and preferences.
 *
 * - findYourNiche - A function that handles the teacher profile matching process.
 * - FindYourNicheInput - The input type for the findYourNiche function.
 * - FindYourNicheOutput - The return type for the findYourNiche function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const FindYourNicheInputSchema = z.object({
  age: z.number().describe('The teacher\'s age.'),
  qualifications: z
    .string()
    .describe(
      'A detailed description of the teacher\'s educational qualifications (e.g., "B.Ed, Master\'s in English, TEFL certified").'
    ),
  nationality: z
    .string()
    .describe('The teacher\'s nationality (e.g., "US", "UK", "Canadian").'),
  experience: z
    .string()
    .describe(
      'A detailed description of the teacher\'s teaching experience (e.g., "5 years teaching high school science", "3 years teaching primary school in China").'
    ),
  subject: z.string().describe('The primary subject the teacher teaches (e.g., "High School Physics", "Primary English").'),
  preferences: z
    .string()
    .describe(
      'A detailed description of the teacher\'s preferences for a teaching location (e.g., "warm climate, good work-life balance, high savings potential, strong expat community").'
    ),
  goal: z.enum(["saving", "adventure", "growth", "balanced"]).describe("The teacher's primary goal for their next move. Options are 'saving', 'adventure', 'growth', or 'balanced'."),
});
export type FindYourNicheInput = z.infer<typeof FindYourNicheInputSchema>;

const FindYourNicheOutputSchema = z.object({
  recommendations: z.array(
    z.object({
      name: z
        .string()
        .describe('The name of the recommended region or country.'),
      reasoning: z
        .string()
        .describe(
          'The reasoning for this recommendation, explaining how it aligns with the teacher\'s profile and preferences.'
        ),
    })
  ),
});
export type FindYourNicheOutput = z.infer<typeof FindYourNicheOutputSchema>;

export async function findYourNiche(
  input: FindYourNicheInput
): Promise<FindYourNicheOutput> {
  return findYourNicheFlow(input);
}

const prompt = ai.definePrompt({
  name: 'findYourNichePrompt',
  input: { schema: FindYourNicheInputSchema },
  output: { schema: FindYourNicheOutputSchema },
  prompt: `You are an expert career advisor specializing in international teaching opportunities. Your task is to analyze a teacher's profile and preferences, then recommend suitable regions or countries for them to teach in.

Provide clear, concise recommendations along with detailed reasoning for each, explaining how the location aligns with the teacher's qualifications, experience, age, nationality, specific preferences and primary goal.

Crucially, your recommendations must take into account common visa and immigration requirements for the teacher's nationality. For example, do not recommend a country where it is notoriously difficult for a teacher of that nationality to get a work visa.

Teacher Profile:
- Age: {{{age}}}
- Qualifications: {{{qualifications}}}
- Nationality: {{{nationality}}}
- Experience: {{{experience}}}
- Subject: {{{subject}}}
- Preferences: {{{preferences}}}
- Primary Goal: {{{goal}}}`,
});

const findYourNicheFlow = ai.defineFlow(
  {
    name: 'findYourNicheFlow',
    inputSchema: FindYourNicheInputSchema,
    outputSchema: FindYourNicheOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);

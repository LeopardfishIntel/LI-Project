'use server';
/**
 * @fileOverview An AI agent that recommends suitable regions and countries for teachers based on their profile and preferences.
 *
 * - findYourNiche - A function that handles the teacher profile matching process.
 * - FindYourNicheInput - The input type for the findYourNiche function.
 * - FindYourNicheOutput - The return type for the findYourNiche function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const FindYourNicheInputSchema = z.object({
  age: z.number().describe("The teacher's age."),
  qualifications: z
    .string()
    .describe(
      'A detailed description of the teacher\'s educational qualifications (e.g., "B.Ed, Master\'s in English, TEFL certified").'
    ),
  currentLocation: z.string().describe("The teacher's current location (e.g., 'London, UK').").optional(),
  currentSalary: z.string().describe("The teacher's current annual salary (e.g., '$50,000 USD').").optional(),
  experience: z
    .string()
    .describe(
      'A detailed description of the teacher\'s teaching experience (e.g., "5 years teaching high school science", "3 years teaching primary school in China").'
    ),
  subject: z.string().describe('The primary subject the teacher teaches (e.g., "High School Physics", "Primary English").'),
  preferredRegions: z.string().describe("A comma-separated list of the teacher's preferred geographic regions (e.g., 'Southeast Asia, Europe').").optional(),
  preferences: z
    .string()
    .describe(
      'A detailed description of the teacher\'s preferences for a teaching location (e.g., "warm climate, good work-life balance, high savings potential, strong expat community").'
    ),
  goal: z.enum(["saving", "adventure", "growth", "balanced", "culture"]).describe("The teacher's primary goal for their next move. Options are 'saving', 'adventure', 'growth', 'balanced', or 'culture'. 'culture' prioritizes locations with rich history, arts, and vibrant city life (e.g., Prague, Berlin)."),
  availableSchools: z.string().describe("A JSON string representing an array of available schools. Each school object has properties like id, name, country, and curriculum."),
  familyStatus: z.string().describe("The teacher's family status (e.g., 'single', 'couple', 'family with children'). This is crucial for considering housing and dependent benefits."),
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
      recommendedSchools: z.array(z.object({
          id: z.string().describe("The ID of the recommended school."),
          name: z.string().describe("The name of the recommended school."),
          reasoning: z.string().describe("A brief reason why this specific school is a good fit.")
      })).describe("A list of specific schools from the provided list that are in this region/country and are a good fit.").optional(),
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
  prompt: `You are an expert career advisor specializing in international teaching opportunities. Your task is to analyze a teacher's profile and preferences, then recommend suitable regions or countries for them to teach in. Consider their preferred regions strongly when making recommendations. A key reason teachers seek new roles is career stagnation (78% of movers); pay close attention to the teacher's 'growth' goal and suggest locations or specific schools with strong professional development or leadership pathways.

Provide clear, concise recommendations along with detailed reasoning for each, explaining how the location aligns with the teacher's qualifications, experience, age, specific preferences, primary goal, and family status. Do not recommend the teacher's current location.

You can use the teacher's current salary as a benchmark for what might be an attractive offer, but do not make it the primary factor unless their goal is 'saving'.

After recommending a region/country, you MUST look at the list of available schools and recommend specific schools from that list that are located in the recommended region/country. Base your school recommendations on the teacher's subject and qualifications, connecting them to the school's curriculum. For example, a teacher with a US State Teaching License might be a good fit for a school with an American curriculum. Your reasoning for recommending a school should be brief and mention this connection.

Teacher Profile:
- Age: {{{age}}}
- Family Status: {{{familyStatus}}}
- Qualifications: {{{qualifications}}}
- Experience: {{{experience}}}
- Subject: {{{subject}}}
- Current Location: {{{currentLocation}}}
- Current Salary: {{{currentSalary}}}
- Preferred Regions: {{{preferredRegions}}}
- Preferences: {{{preferences}}}
- Primary Goal: {{{goal}}}

Available Schools (JSON format):
{{{availableSchools}}}`,
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

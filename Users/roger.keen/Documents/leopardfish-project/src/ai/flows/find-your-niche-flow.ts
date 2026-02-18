
'use server';
/**
 * @fileOverview An AI agent that recommends suitable regions and countries for teachers based on their profile and preferences.
 *
 * - findYourNook - A function that handles the teacher profile matching process.
 * - FindYourNookInput - The input type for the findYourNook function.
 * - FindYourNookOutput - The return type for the findYourNook function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const FindYourNookInputSchema = z.object({
  age: z.number().describe("Your age."),
  qualifications: z
    .string()
    .describe(
      'A detailed description of your educational qualifications (e.g., "B.Ed, Master\'s in English, TEFL certified").'
    ),
  currentLocation: z.string().describe("Your current location (e.g., 'London, UK').").optional(),
  currentSalary: z.string().describe("Your current annual salary (e.g., '$50,000 USD').").optional(),
  experience: z
    .string()
    .describe(
      'A detailed description of your teaching experience (e.g., "5 years teaching high school science", "3 years teaching primary school in China").'
    ),
  subject: z.string().describe('The primary subject you teach (e.g., "High School Physics", "Primary English").'),
  preferredRegions: z.string().describe("A comma-separated list of your preferred geographic regions (e.g., 'Southeast Asia, Europe').").optional(),
  preferences: z
    .string()
    .describe(
      'A detailed description of your preferences for a teaching location (e.g., "warm climate, good work-life balance, high savings potential, strong expat community").'
    ),
  preferredCurriculums: z.string().describe("A comma-separated list of your preferred curriculum (e.g., 'UK, IB').").optional(),
  goal: z.enum(["saving", "adventure", "growth", "balanced"]).describe("Your primary goal for your next move. Options are 'saving', 'adventure', 'growth', or 'balanced'."),
  availableSchools: z.string().describe("A JSON string representing an array of available schools. Each school object has properties like id, name, country, and curriculum."),
  familyStatus: z.string().describe("Your family status (e.g., 'single', 'couple', 'family with children'). This is crucial for considering housing and dependent benefits."),
});
export type FindYourNookInput = z.infer<typeof FindYourNookInputSchema>;

const FindYourNookOutputSchema = z.object({
  recommendations: z.array(
    z.object({
      name: z
        .string()
        .describe('The name of the recommended region or country.'),
      reasoning: z
        .string()
        .describe(
          'The reasoning for this recommendation, explaining how it aligns with your profile and preferences.'
        ),
      recommendedSchools: z.array(z.object({
          id: z.string().describe("The ID of the recommended school."),
          name: z.string().describe("The name of the recommended school."),
          reasoning: z.string().describe("A brief reason why this specific school is a good fit.")
      })).describe("A list of specific schools from the provided list that are in this region/country and are a good fit.").optional(),
    })
  ),
});
export type FindYourNookOutput = z.infer<typeof FindYourNookOutputSchema>;

export async function findYourNook(
  input: FindYourNookInput
): Promise<FindYourNookOutput> {
  return findYourNookFlow(input);
}

const findYourNookPrompt = ai.definePrompt({
  name: 'findYourNookPrompt',
  input: { schema: FindYourNookInputSchema },
  output: { schema: FindYourNookOutputSchema },
  prompt: `You are an expert career advisor specializing in international teaching opportunities. Your task is to analyze a teacher's profile and preferences, then recommend suitable regions or countries for them to teach in. Consider their preferred regions and curriculums strongly when making recommendations. A key reason teachers seek new roles is career stagnation (78% of movers); pay close attention to your 'growth' goal and suggest locations or specific schools with strong professional development or leadership pathways.

Provide clear, concise recommendations along with detailed reasoning for each, explaining how the location aligns with your qualifications, experience, age, specific preferences, primary goal, and familyStatus. Do not recommend your current location. When referring to my experience, please use descriptive British English (e.g., 'a teacher with considerable experience') rather than quoting the exact number of years.

You can use your current salary as a benchmark for what might be an attractive offer, but do not make it the primary factor unless your goal is 'saving'.

After recommending a region/country, you MUST look at the list of available schools and recommend specific schools from that list that are located in the recommended region/country. Base your school recommendations on your subject and qualifications, connecting them to the school's curriculum. For example, a teacher with a US State Teaching License might be a good fit for a school with a US curriculum. Your reasoning for recommending a school should be brief and mention this connection.

Your Profile:
- Age: {{{age}}}
- Family Status: {{{familyStatus}}}
- Qualifications: {{{qualifications}}}
- Experience: {{{experience}}}
- Subject: {{{subject}}}
- Current Location: {{{currentLocation}}}
- Current Salary: {{{currentSalary}}}
- Preferred Regions: {{{preferredRegions}}}
- Preferred Curriculums: {{{preferredCurriculums}}}
- Preferences: {{{preferences}}}
- Primary Goal: {{{goal}}}

Available Schools (JSON format):
{{{availableSchools}}}`,
});

const findYourNookFlow = ai.defineFlow(
  {
    name: 'findYourNookFlow',
    inputSchema: FindYourNookInputSchema,
    outputSchema: FindYourNookOutputSchema,
  },
  async (input) => {
    const { output } = await findYourNookPrompt(input);
    return output!;
  }
);

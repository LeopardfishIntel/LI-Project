
'use server';
/**
 * @fileOverview This file provides an AI-powered flow to generate a comparative
 * analysis of multiple schools based on their data.
 *
 * - aiSchoolComparison - A function that orchestrates the generation of the comparison.
 * - AiSchoolComparisonInput - The input type for the function.
 * - AiSchoolComparisonOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const SchoolDataSchema = z.object({
  schoolName: z.string().describe('The name of the school.'),
  coreSchoolData: z
    .string()
    .describe(
      'Key data points about the school (salary, housing, savings, benefits, non-contact time, tech ecosystem, etc.) in a structured format.'
    ),
});

const AiSchoolComparisonInputSchema = z.object({
  schools: z.array(SchoolDataSchema).describe('An array of school data objects to be compared.'),
  teacherProfile: z.string().describe('A summary of your profile and preferences to contextualize the recommendation. e.g., "A teacher with 10 years experience looking for high savings potential and good work-life balance."')
});
export type AiSchoolComparisonInput = z.infer<
  typeof AiSchoolComparisonInputSchema
>;

const AiSchoolComparisonOutputSchema = z.object({
  bestFit: z.object({
      schoolName: z.string().describe("The name of the school that is the best fit for the user."),
      reasoning: z.string().describe("A combined analysis that first provides a high-level summary comparing the schools and their trade-offs, and then explains why the recommended school is the best fit for the user's profile. This should be addressed directly to the user and include a disclaimer to verify all information with the schools directly."),
  }),
  schoolBreakdowns: z.array(z.object({
      schoolName: z.string().describe('The name of the school.'),
      summary: z.string().describe("A brief summary of the school's unique characteristics."),
  })),
});
export type AiSchoolComparisonOutput = z.infer<
  typeof AiSchoolComparisonOutputSchema
>;

export async function aiSchoolComparison(
  input: AiSchoolComparisonInput
): Promise<AiSchoolComparisonOutput> {
  return aiSchoolComparisonFlow(input);
}

const comparisonPrompt = ai.definePrompt({
  name: 'aiSchoolComparisonPrompt',
  input: {schema: AiSchoolComparisonInputSchema},
  output: {schema: AiSchoolComparisonOutputSchema},
  prompt: `You are an expert education consultant. Your task is to provide a comparative analysis of the following schools based on my data and recommend the best fit for me. Address me, the user, directly in your response.

My Profile:
{{{teacherProfile}}}

Schools to Compare:
{{#each schools}}
- School Name: {{{schoolName}}}
  Core Data: {{{coreSchoolData}}}
{{/each}}

Instructions for your response:
1.  **Analysis and Recommendation:** This should be for the 'reasoning' field in the 'bestFit' output.
    -   Start with a high-level summary comparing the schools. Focus on the main trade-offs for me (e.g., "School A offers you a tax-free salary and high savings, but a more demanding work environment, while School B is in a culturally rich location with a better work-life balance but lower savings potential.").
    -   Then, based on my profile, explain why you are recommending one specific school as the best fit.
    -   When mentioning my experience, please use descriptive British English (e.g., 'a teacher with considerable experience') rather than quoting the exact number of years.
    -   Conclude your reasoning with a clear reminder for me to verify all data and metrics directly with the schools, as packages and benefits can change.
2.  **Individual Breakdowns:** For each school, provide a brief, objective summary for the 'schoolBreakdowns' output, derived directly from the data provided.
`,
});

const aiSchoolComparisonFlow = ai.defineFlow(
  {
    name: 'aiSchoolComparisonFlow',
    inputSchema: AiSchoolComparisonInputSchema,
    outputSchema: AiSchoolComparisonOutputSchema,
  },
  async input => {
    const {output} = await comparisonPrompt(input);
    return output!;
  }
);

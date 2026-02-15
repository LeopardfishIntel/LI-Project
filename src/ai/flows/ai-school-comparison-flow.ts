'use server';
/**
 * @fileOverview This file provides an AI-powered flow to generate a comparative
 * analysis of multiple schools based on their data and teacher reviews.
 *
 * - aiSchoolComparison - A function that orchestrates the generation of the comparison.
 * - AiSchoolComparisonInput - The input type for the function.
 * - AiSchoolComparisonOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SchoolDataSchema = z.object({
  schoolName: z.string().describe('The name of the school.'),
  coreSchoolData: z
    .string()
    .describe(
      'Key data points about the school (salary, housing, savings, etc.) in a structured format.'
    ),
  teacherReviews: z
    .string()
    .describe(
      'A collection of anonymized teacher reviews for the school, concatenated into a single string.'
    ),
});

export const AiSchoolComparisonInputSchema = z.object({
  schools: z.array(SchoolDataSchema).describe('An array of school data objects to be compared.'),
  teacherProfile: z.string().describe('A summary of the teacher\'s profile and preferences to contextualize the recommendation. e.g., "A teacher with 10 years experience looking for high savings potential and good work-life balance."')
});
export type AiSchoolComparisonInput = z.infer<
  typeof AiSchoolComparisonInputSchema
>;

export const AiSchoolComparisonOutputSchema = z.object({
  overallSummary: z
    .string()
    .describe(
      "A high-level summary comparing the key differences between the schools."
    ),
  bestFit: z.object({
      schoolName: z.string().describe("The name of the school that is the best fit for the teacher."),
      reasoning: z.string().describe("The reasoning for why this school is the best fit, based on the teacher's profile."),
  }),
  schoolBreakdowns: z.array(z.object({
      schoolName: z.string().describe('The name of the school.'),
      summary: z.string().describe("A brief summary of the school's unique characteristics."),
      pros: z.array(z.string()).describe('A list of common advantages of the school.'),
      cons: z.array(z.string()).describe('A list of common disadvantages of the school.'),
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
  prompt: `You are an expert education consultant. Your task is to provide a comparative analysis of the following schools based on the provided data and teacher reviews. You must also recommend the best fit for the teacher based on their profile.

Teacher Profile:
{{{teacherProfile}}}

Schools to Compare:
{{#each schools}}
- School Name: {{{schoolName}}}
  Core Data: {{{coreSchoolData}}}
  Reviews: {{{teacherReviews}}}
{{/each}}

Instructions:
1.  **Overall Summary:** Write a high-level summary that compares the schools. Focus on the main trade-offs (e.g., "School A offers a tax-free salary and high savings, but a more demanding work environment, while School B is in a culturally rich location with a better work-life balance but lower savings potential.").
2.  **Best Fit Recommendation:** Based on the provided Teacher Profile, identify which school is the best fit and provide clear, actionable reasoning.
3.  **Individual Breakdowns:** For each school, provide a brief summary, a list of pros, and a list of cons. These should be directly derived from the data and reviews provided.
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

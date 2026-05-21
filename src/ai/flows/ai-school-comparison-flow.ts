
'use server';
/**
 * @fileOverview This file provides an AI-powered flow to generate a comparative
 * analysis of multiple schools based on their data.
 *
 * - aiSchoolComparison - A function that orchestrates the generation of the comparison.
 * - AiSchoolComparisonInput - The input type for the function.
 * - AiSchoolComparisonOutput - The return type for the function.
 */

import { getAI } from '@/ai/genkit';
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
  teacherProfile: z.string().describe('A summary of your profile and preferences to contextualise the recommendation. e.g., "A teacher with 10 years experience looking for high savings potential and good work-life balance."')
});
export type AiSchoolComparisonInput = z.infer<
  typeof AiSchoolComparisonInputSchema
>;

const AiSchoolComparisonOutputSchema = z.object({
  bestFit: z.object({
      schoolName: z.string().describe("The name of the school that is the best fit for the user."),
      verdictSections: z.array(z.object({
          heading: z.string().describe("A short, descriptive heading for this part of the analysis (e.g., 'Financial strategy', 'Mission fit')."),
          content: z.string().describe("The detailed paragraph for this section.")
      })).describe("A broken-down analysis of why this school is the best fit, categorised into logical sections."),
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

const comparisonPrompt = getAI().definePrompt({
  name: 'aiSchoolComparisonPrompt',
  input: {schema: AiSchoolComparisonInputSchema},
  output: {schema: AiSchoolComparisonOutputSchema},
  prompt: `You are an expert education consultant for Leopardfish Intel. Your task is to provide a comparative analysis of the following schools and recommend the best fit. 

My Profile:
{{{teacherProfile}}}

Schools to Compare:
{{#each schools}}
- School Name: {{{schoolName}}}
  Core Data: {{{coreSchoolData}}}
{{/each}}

Instructions for your response:
1.  **Analysis & Recommendation (Best Fit):**
    -   Identify the single best fit school.
    -   Break your reasoning into 3-4 logical paragraphs.
    -   Provide a short, punchy heading for each paragraph (e.g., 'Financial landscape', 'Institutional mission', 'Regional lifestyle').
    -   When mentioning my experience, please use descriptive British English (e.g., 'a teacher with considerable experience') rather than quoting the exact number of years.
    -   Conclude the final paragraph with a clear reminder to verify all data directly with the schools.
2.  **Individual Breakdowns:** For each school, provide a brief, objective summary (1-2 sentences) derived directly from the data.

Tone: Professional, authoritative, and direct. Use British English spelling (e.g., 'programme', 'analysing', 'categorise', 'licence'). No all caps in paragraph content.
`,
});

const aiSchoolComparisonFlow = getAI().defineFlow(
  {
    name: 'aiSchoolComparisonFlow',
    inputSchema: AiSchoolComparisonInputSchema,
    outputSchema: AiSchoolComparisonOutputSchema,
  },
  async (input: AiSchoolComparisonInput) => {
    const {output} = await comparisonPrompt(input);
    return output!;
  }
);

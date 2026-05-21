'use server';
/**
 * @fileOverview This file provides an AI-powered flow to generate a summary
 * of school insights, including pros and cons, based on school data and teacher reviews.
 *
 * - aiSchoolInsightsSummary - A function that orchestrates the generation of school insights.
 * - AiSchoolInsightsSummaryInput - The input type for the aiSchoolInsightsSummary function.
 * - AiSchoolInsightsSummaryOutput - The return type for the aiSchoolInsightsSummary function.
 */

import { getAI } from '@/ai/genkit';
import {z} from 'zod';

const AiSchoolInsightsSummaryInputSchema = z.object({
  schoolName: z.string().describe('The name of the school.'),
  coreSchoolData: z
    .string()
    .describe(
      'Key data points about the school, such as salary, housing, savings potential, etc., in a structured format (e.g., JSON string or detailed text).'+
      'Example: {"salary": "$50,000 - $70,000 USD/year", "housing": "Provided, 2-bedroom apartment", "savingsPotential": "High", "location": "Tokyo, Japan", "curriculum": "IB", "studentTeacherRatio": "1:12", "classSize": "18"}'
    ),
  teacherReviews: z
    .string()
    .describe(
      'A collection of anonymized teacher reviews, concatenated into a single string.'+
      'Example: "Review 1: Great school, supportive admin. Review 2: Workload is heavy. Review 3: Excellent benefits package."'
    ),
});
export type AiSchoolInsightsSummaryInput = z.infer<
  typeof AiSchoolInsightsSummaryInputSchema
>;

const AiSchoolInsightsSummaryOutputSchema = z.object({
  summary: z
    .string()
    .describe(
      "An overall summary of the school's unique characteristics and overall teacher experience."
    ),
  pros: z
    .array(z.string())
    .describe('A list of common advantages or positive aspects of the school.'),
  cons: z
    .array(z.string())
    .describe('A list of common disadvantages or negative aspects of the school.'),
});
export type AiSchoolInsightsSummaryOutput = z.infer<
  typeof AiSchoolInsightsSummaryOutputSchema
>;

export async function aiSchoolInsightsSummary(
  input: AiSchoolInsightsSummaryInput
): Promise<AiSchoolInsightsSummaryOutput> {
  return aiSchoolInsightsSummaryFlow(input);
}

const aiSchoolInsightsSummaryPrompt = getAI().definePrompt({
  name: 'aiSchoolInsightsSummaryPrompt',
  input: {schema: AiSchoolInsightsSummaryInputSchema},
  output: {schema: AiSchoolInsightsSummaryOutputSchema},
  prompt: `You are an expert education consultant tasked with summarizing key insights about a school.

Generate a concise summary, and identify common pros and cons based on the provided school data and teacher reviews for {{schoolName}}.

Core School Data:
{{{coreSchoolData}}}

Teacher Reviews:
{{{teacherReviews}}}

Instructions:
1.  Provide an overall summary that highlights the school's unique characteristics and overall teacher experience.
2.  Extract common positive themes to form a list of 'pros'.
3.  Extract common negative themes or challenges to form a list of 'cons'.
4.  Ensure the response is factual and directly derived from the provided information. If no specific pros or cons are clearly identifiable, state that.
`,
});

const aiSchoolInsightsSummaryFlow = getAI().defineFlow(
  {
    name: 'aiSchoolInsightsSummaryFlow',
    inputSchema: AiSchoolInsightsSummaryInputSchema,
    outputSchema: AiSchoolInsightsSummaryOutputSchema,
  },
  async (input: AiSchoolInsightsSummaryInput) => {
    const {output} = await aiSchoolInsightsSummaryPrompt(input);
    return output!;
  }
);

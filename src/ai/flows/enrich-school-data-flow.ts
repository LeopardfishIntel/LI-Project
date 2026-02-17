'use server';
/**
 * @fileOverview An AI flow to enrich school data using its name and location.
 *
 * - enrichSchoolData - A function to get details about a school.
 * - EnrichSchoolDataInput - Input for the function.
 * - EnrichSchoolDataOutput - Output for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const EnrichSchoolDataInputSchema = z.object({
  name: z.string().describe('The name of the school.'),
  location: z.string().describe('The city where the school is located.'),
  country: z.string().describe('The country where the school is located.'),
});
export type EnrichSchoolDataInput = z.infer<typeof EnrichSchoolDataInputSchema>;

const EnrichSchoolDataOutputSchema = z.object({
    description: z.string().describe("A brief, engaging description of the school, suitable for a directory listing."),
    websiteUrl: z.string().url().describe("The official website URL of the school."),
    curriculum: z.string().describe("The primary curriculum or curriculums offered (e.g., 'IB', 'AP', 'British')."),
    accreditation: z.string().describe("Key accreditation bodies (e.g., 'CIS', 'WASC', 'NEASC')."),
    studentTeacherRatio: z.string().describe("The student-to-teacher ratio, if available (e.g., '10:1').").optional(),
    classSize: z.coerce.number().describe("The average class size.").optional(),
    technologyEcosystem: z.string().describe("A brief summary of the school's technology integration (e.g., '1:1 iPads K-12', 'Google Workspace for Education').").optional(),
});
export type EnrichSchoolDataOutput = z.infer<typeof EnrichSchoolDataOutputSchema>;

export async function enrichSchoolData(
  input: EnrichSchoolDataInput
): Promise<EnrichSchoolDataOutput> {
  return enrichSchoolDataFlow(input);
}

const enrichSchoolDataPrompt = ai.definePrompt({
  name: 'enrichSchoolDataPrompt',
  input: {schema: EnrichSchoolDataInputSchema},
  output: {schema: EnrichSchoolDataOutputSchema},
  prompt: `You are an expert education researcher. Your task is to find publicly available information for the following school and return it in the specified format.

School Name: {{{name}}}
Location: {{{location}}}, {{{country}}}

Please research online and provide the following details. If a specific piece of information cannot be found, omit it from your response for optional fields.
- A brief, engaging description of the school.
- The official website URL.
- The primary curriculum.
- Key accreditations.
- Student-teacher ratio (if available).
- Average class size (if available).
- A summary of their technology ecosystem (if available).
`,
});

const enrichSchoolDataFlow = ai.defineFlow(
  {
    name: 'enrichSchoolDataFlow',
    inputSchema: EnrichSchoolDataInputSchema,
    outputSchema: EnrichSchoolDataOutputSchema,
  },
  async input => {
    const {output} = await enrichSchoolDataPrompt(input);
    return output!;
  }
);

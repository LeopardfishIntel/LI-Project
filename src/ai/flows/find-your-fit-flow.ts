'use server';
/**
 * @fileOverview Intelligence flow for Teacher-Location matching.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// 1. Define the Input Schema
const FindYourFitInputSchema = z.object({
  age: z.any().describe("User age bracket."),
  qualifications: z.any().describe('Teaching qualifications (e.g. PGCE, QTS).'),
  currentLocation: z.string().describe("User's current city/country.").optional(),
  currentSalary: z.string().describe("Current annual salary for benchmarking.").optional(),
  experience: z.string().describe('Years of professional teaching experience.'),
  subject: z.string().describe('Primary teaching subject.').optional(),
  preferredRegions: z.any().describe("Target regions selected by the user.").optional(),
  preferences: z.any().describe('Mission objectives and specific user constraints.').optional(),
  preferredCurriculums: z.string().describe("Preferred school curriculums.").optional(),
  goal: z.string().describe("The primary driver for the move.").optional(),
  availableSchools: z.string().describe("JSON string of current vacancies.").optional(),
  familyStatus: z.string().describe("Family status for benefit/visa analysis."),
});

export type FindYourFitInput = z.infer<typeof FindYourFitInputSchema>;

// 2. Define the Output Schema
const FindYourFitOutputSchema = z.object({
  recommendations: z.array(
    z.object({
      name: z.string().describe('Recommended country or region.'),
      reasoning: z.string().describe('Tactical reasoning in British English.'),
      recommendedSchools: z.array(z.object({
          id: z.string(),
          name: z.string(),
          reasoning: z.string()
      })).optional(),
    })
  ),
});

export type FindYourFitOutput = z.infer<typeof FindYourFitOutputSchema>;

// 3. The System Prompt
const findYourFitPrompt = ai.definePrompt({
  name: 'findYourFitPrompt',
  // 🚀 EXPLICIT MODEL OVERRIDE
  model: 'googleai/gemini-3.1-flash-lite-preview', 
  input: { schema: FindYourFitInputSchema },
  output: { schema: FindYourFitOutputSchema },
  prompt: `You are an expert career adviser specialising in international teaching opportunities. 
  
  TASK: Analyse the teacher's profile and recommend 5 suitable countries.
  
  CONSTRAINTS:
  - If the "Current Location" is Japan, you MUST NOT recommend Japan.
  - Use descriptive British English (e.g., 'considerable experience', 'suitable honours') rather than just numbers.
  - Recommendations must be formatted as bullet points in the reasoning section.
  
  User Profile:
  - Age: {{{age}}}
  - Family Status: {{{familyStatus}}}
  - Qualifications: {{{qualifications}}}
  - Experience: {{{experience}}} Years
  - Subject: {{{subject}}}
  - Current Location: {{{currentLocation}}}
  - Target Regions: {{{preferredRegions}}}
  - Objectives: {{{preferences}}}

  Available Schools:
  {{{availableSchools}}}`,
});

// 4. The Flow Execution
export const findYourFit = ai.defineFlow(
  {
    name: 'findYourFitFlow',
    inputSchema: FindYourFitInputSchema,
    outputSchema: FindYourFitOutputSchema,
  },
  async (input) => {
    const { output } = await findYourFitPrompt(input);
    if (!output) throw new Error("Dossier generation failed: Empty AI response.");
    return output;
  }
);
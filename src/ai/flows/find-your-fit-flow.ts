'use server';
/**
 * @fileOverview Intelligence flow for Teacher-Location matching.
 */

import { getAI } from '@/ai/genkit';
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
      fitScore: z.number().describe('Fit percentage score from 0.0 to 9.9.'),
      executiveSummary: z.string().describe('A warm, colleague-to-colleague summary of why this is a strong match.'),
      objectiveAlignment: z.string().describe('Specific, short reason why this country fulfills their chosen Mission Objectives (Savings, Career Progression, Adventure, or Balance).'),
      visaAndAgeRequirements: z.string().describe('Explicit focus on max/min age limits, degree, and licensing rules based on the provided Firebase data.'),
      lifestyleAndSafety: z.string().describe('Honest pros/cons regarding safety and expat life for their specific family status.'),
      recommendedSchools: z.array(z.object({
          id: z.string(),
          name: z.string(),
          reasoning: z.string().describe('Why this specific school fits.')
      })).describe('List of top matching schools (up to 10 if available).').optional(),
    })
  ),
});

export type FindYourFitOutput = z.infer<typeof FindYourFitOutputSchema>;

// 4. The Flow Execution
export async function findYourFit(input: FindYourFitInput) {
  const ai = getAI();
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Define the prompt dynamically inside the function
  const findYourFitPrompt = ai.definePrompt({
    name: 'findYourFitPrompt',
    model: 'googleai/gemini-2.5-flash',
    input: { schema: FindYourFitInputSchema },
    output: { schema: FindYourFitOutputSchema },
    prompt: `You are an expert career adviser specialising in international teaching opportunities. Speak in a warm, prospective teacher colleague tone using British English.
    
    TASK: Analyse the teacher's profile and the Global Intelligence Database to recommend up to 5 suitable countries (minimum 3).
    
    CONSTRAINTS & RULES:
    - TARGET REGIONS: You MUST strictly filter your recommendations to ONLY include countries within the user's Target Regions ({{{preferredRegions}}}). If Target Regions is 'Global' or empty, you may recommend anywhere.
    - If the "Current Location" is Japan, you MUST NOT recommend Japan.
    - Use descriptive British English (e.g., 'considerable experience', 'suitable honours').
    - Your tone should be supportive and professional ("peer-to-peer").
    - FIT SCORE: Assign a realistic fit score between 0.0 and 9.9 based on the alignment of their objectives, experience, and the country's offerings.
    - OBJECTIVES MATCH: You MUST provide a specific, short reason why this country directly satisfies their selected Mission Objectives ({{{preferences}}}). Explain how it fulfills multiple objectives if provided.
    - VISA & AGE: You MUST explicitly locate the specific country within the "teacherRequirements" section of the database. Extract the EXACT max age limit, minimum degree requirements, and years of experience needed for a visa in that country. 
    - GENDER VISA RULES: We do not know the user's gender. If the database specifies different age limits or rules for males and females (e.g. max_age_m and max_age_f), you MUST quote both.
    - SCHOOLS: Include up to 10 matching schools from the "schools" section of the database for each country. If there are fewer, list all that match. Ensure these schools are actually located in the recommended country.
    - SAFETY: Address current safety and lifestyle specifically for their family status ({{{familyStatus}}}).
    
    User Profile:
    - Age: {{{age}}}
    - Family Status: {{{familyStatus}}}
    - Qualifications: {{{qualifications}}}
    - Experience: {{{experience}}} Years
    - Subject: {{{subject}}}
    - Current Location: {{{currentLocation}}}
    - Target Regions: {{{preferredRegions}}}
    - Objectives: {{{preferences}}}

    Global Intelligence Database (Cost of Living, Requirements, Schools):
    {{{availableSchools}}}`,
  });

  const { output } = await findYourFitPrompt(input);
  if (!output) throw new Error("Dossier generation failed: Empty AI response.");
  return output;
}
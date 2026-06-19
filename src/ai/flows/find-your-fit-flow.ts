'use server';
/**
 * @fileOverview Intelligence flow for Teacher-Location matching and data validation.
 */

import { getAI } from '@/ai/genkit';
import { z } from 'zod';

// 1. Define the Input Schema
const FindYourFitInputSchema = z.object({
  user_age_range: z.string().describe("User age range bracket (e.g., '35-49')."),
  user_years_experience: z.number().describe("Years of teaching experience."),
  user_qualifications: z.array(z.string()).describe("Qualifications array."),
  user_current_city: z.string().describe("User's current city."),
  user_current_monthly_saving_index: z.number().describe("Monthly saving index."),
  availableSchools: z.string().describe("JSON string of cost of living and requirements database context.").optional(),
});

export type FindYourFitInput = z.infer<typeof FindYourFitInputSchema>;

// 2. Define the Output Schema (Zod Alignment)
const FindYourFitOutputSchema = z.object({
  recommendations: z.array(
    z.object({
      countryName: z.string().describe("Recommended country Name."),
      monthlySavingIndex: z.string().describe("Estimated monthly saving index (e.g., '£2,403')."),
      savingsScore: z.number().describe("Savings score from 0.0 to 9.9."),
      careerScore: z.number().describe("Career score from 0.0 to 9.9."),
      cultureScore: z.number().describe("Culture score from 0.0 to 9.9."),
      hasBarrier: z.boolean().describe("True if the user has a statutory barrier/hurdle for a working visa in this country."),
      barrierMessage: z.string().describe("Populate ONLY if hasBarrier is true. Max 120 words. No fluff. Dictate exactly what the statutory hurdle or restriction is.")
    })
  )
});

export type FindYourFitOutput = z.infer<typeof FindYourFitOutputSchema>;

// 3. The Flow Execution
export async function findYourFit(input: FindYourFitInput) {
  const ai = getAI();
  
  // Define the prompt dynamically inside the function
  const findYourFitPrompt = ai.definePrompt({
    name: 'findYourFitPrompt',
    model: 'googleai/gemini-2.5-flash',
    input: { schema: FindYourFitInputSchema },
    output: { schema: FindYourFitOutputSchema },
    prompt: `You are a cold, precise data validation script. Speak only in exact data analysis terms. You are forbidden from generating generic descriptive paragraphs.

INPUTS:
- user_age_range: "{{user_age_range}}"
- user_years_experience: {{user_years_experience}}
- user_qualifications: {{user_qualifications}}
- user_current_city: "{{user_current_city}}"
- user_current_monthly_saving_index: {{user_current_monthly_saving_index}}

DATABASE CONTEXT (teacherRequirements, locations_costOfLiving, and schools data):
{{{availableSchools}}}

TASK:
For every country processed in the matching database context, you must run three strict rule checks against the 'teacherRequirements' database schema and return up to 5 recommended countries.

STRICT RULE CHECKS:

A. VISA AGE GATE RULE:
Compare the user's age range (user_age_range) against the destination country's "max_age_m" and "max_age_f" values in the database.
- Determine the upper limit of the user's age bracket:
  - '25-34' is 34
  - '35-49' is 49
  - '50-54' is 54
  - '55-60' is 60
  - '61-64' is 64
  - '65+' is 75 (or upper retirement age)
- Compare this upper limit to the destination country's max_age_m and max_age_f.
- If the upper limit is within 5 years of the legal retirement limit (either max_age_m or max_age_f), or exceeds it, you MUST set hasBarrier to TRUE.
- If hasBarrier is TRUE, populate barrierMessage with a short, clinical explanation of the Ministry of Education's retirement rules for new foreign working visas in that country.

B. EXPERIENCE GATE RULE:
Compare the user's experience (user_years_experience) against the destination country's required experience. Use the "exp_years_Req" property from the database schema (or parse the minimum required years from "exp_notes" if "exp_years_Req" is not defined or is 0).
- If the user's input tenure (user_years_experience) is less than the statutory requirement to clear a legal teaching visa in that country, you MUST set hasBarrier to TRUE.
- If hasBarrier is TRUE, populate barrierMessage detailing the non-negotiable legal experience deficit.

C. NATIONALITY / PERMIT REGISTRY ROUTE RULE:
- If the user's qualifications (user_qualifications) includes 'SA_SACE', 'SA SACE', or 'None' (case-insensitive, matching with or without underscores/spaces) and the destination country's region in the database is 'Europe', you MUST set hasBarrier to TRUE.
- If hasBarrier is TRUE, populate barrierMessage specifying that severe non-EU labor market market-testing requirements apply, creating a highly restrictive path for corporate work permit sponsorships.

SCORE ASSIGNMENTS:
- savingsScore: Assign a float score from 0.0 to 9.9 based on cost of living and monthly savings index.
- careerScore: Assign a float score from 0.0 to 9.9 based on academic score and career density.
- cultureScore: Assign a float score from 0.0 to 9.9 based on culture/lifestyle index.
- monthlySavingIndex: Provide a string representation of estimated monthly savings, e.g., '£2,403', or '$1,500', converted appropriately based on country finance.

Ensure the output is strictly in the specified JSON format. No fluff. No markdown wrapping outside the schema.`
  });

  const { output } = await findYourFitPrompt(input);
  if (!output) throw new Error("Dossier generation failed: Empty AI response.");
  return output;
}
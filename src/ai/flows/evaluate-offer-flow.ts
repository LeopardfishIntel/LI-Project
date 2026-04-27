'use server';
/**
 * @fileOverview An AI-powered flow to generate a tactical SWOT analysis and overall score of a specific contract offer.
 *
 * - evaluateOffer - A function that handles the deep-dive SWOT analysis and scoring of an offer.
 * - EvaluateOfferInput - The input type for the evaluateOffer function.
 * - EvaluateOfferOutput - The return type for the evaluateOffer function.
 */

import { getAI } from '@/ai/genkit';
import {z} from 'zod';

const EvaluateOfferInputSchema = z.object({
  schoolName: z.string().describe('The name of the school offering the contract.'),
  location: z.string().describe('The city where the school is located.'),
  country: z.string().describe('The country where the school is located.'),
  monthlySavings: z.number().describe('The projected monthly savings in the local currency.'),
  currency: z.string().describe('The currency of the savings.'),
  familyStatus: z.string().describe('The family status of the teacher (e.g., Single, Couple, Family).'),
});
export type EvaluateOfferInput = z.infer<typeof EvaluateOfferInputSchema>;

const EvaluateOfferOutputSchema = z.object({
  strengths: z.string().describe('Core advantages of this offer, focusing on savings and benefits.'),
  weaknesses: z.string().describe('Potential downsides or areas where the offer is less competitive.'),
  opportunities: z.string().describe('Strategic growth or lifestyle opportunities presented by this move.'),
  threats: z.string().describe('Critical warnings, US/UK travel advice, or institutional red flags.'),
  overallScore: z.number().min(0).max(10).describe('A tactical score out of 10 based on universal international teacher expectations.'),
});
export type EvaluateOfferOutput = z.infer<typeof EvaluateOfferOutputSchema>;

export async function evaluateOffer(input: EvaluateOfferInput): Promise<EvaluateOfferOutput> {
  return evaluateOfferFlow(input);
}

const evaluateOfferPrompt = getAI().definePrompt({
  name: 'evaluateOfferPrompt',
  input: {schema: EvaluateOfferInputSchema},
  output: {schema: EvaluateOfferOutputSchema},
  prompt: `You are a high-level recruitment intelligence analyst for Leopardfish Intel. Your task is to provide a tactical SWOT analysis and an overall quantitative score on a potential teaching contract.

Input Dossier:
- School: {{{schoolName}}}
- Location: {{{location}}}, {{{country}}}
- Projected Net Savings: {{{monthlySavings}}} {{{currency}}} per month
- Family Status: {{{familyStatus}}}

Instructions:
1. **Strengths**: Analyse the financial and institutional "wins". Is the savings capacity strong for this family status? Is the school a known market leader or Top global (Elite) institution?
2. **Weaknesses**: Identify where the offer might be "treading water". Are there high local costs that eat into the package? Is the savings capacity weak compared to regional Top global benchmarks?
3. **Opportunities**: Comment on the strategic move. Does this city offer exceptional travel links or career growth pathways? Is there a lifestyle "bonus" (e.g., climate, culture)?
4. **Threats**: This is critical intelligence. You MUST check for and report on prevailing regional risks. Include current UK (FCDO) or US (State Dept) travel advice if applicable. Mention institutional red flags (e.g., currency volatility in {{{country}}}, visa complexity, or reported institutional delays).
5. **Overall Score**: Calculate an overall tactical score out of 10 based on universal international teacher expectations (Savings potential, housing quality, health benefits, and regional stability). 
   - A 10.0 is an elite, low-risk, high-savings package. 
   - A 1.0 is a high-risk, negative-savings package.
   - Be consistent across all schools. 
   - Weight the score against the provided family status (e.g., $1000 savings for a family of 4 is much weaker than $1000 for a single person).
   - Return as a number to 1 decimal place.

Tone: Professional, direct, and authoritative. Use British English.`,
});

const evaluateOfferFlow = getAI().defineFlow(
  {
    name: 'evaluateOfferFlow',
    inputSchema: EvaluateOfferInputSchema,
    outputSchema: EvaluateOfferOutputSchema,
  },
  async input => {
    const {output} = await evaluateOfferPrompt(input);
    return output!;
  }
);

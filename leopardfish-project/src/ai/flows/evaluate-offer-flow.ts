
'use server';
/**
 * @fileOverview An AI-powered flow to generate a tactical analysis of a specific contract offer.
 *
 * - evaluateOffer - A function that handles the deep-dive analysis of an offer.
 * - EvaluateOfferInput - The input type for the evaluateOffer function.
 * - EvaluateOfferOutput - The return type for the evaluateOffer function.
 */

import {ai} from '@/ai/genkit';
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
  savingsAnalysis: z.string().describe('Analysis of the savings capacity and wealth-building potential.'),
  marketComparison: z.string().describe('A brief comparison to other schools and typical packages in that area.'),
  cityFit: z.string().describe('Insights on why this city might be a good fit for the user.'),
  warnings: z.string().describe('Notable warnings, US/UK travel advice, or institutional red flags.'),
});
export type EvaluateOfferOutput = z.infer<typeof EvaluateOfferOutputSchema>;

export async function evaluateOffer(input: EvaluateOfferInput): Promise<EvaluateOfferOutput> {
  return evaluateOfferFlow(input);
}

const evaluateOfferPrompt = ai.definePrompt({
  name: 'evaluateOfferPrompt',
  input: {schema: EvaluateOfferInputSchema},
  output: {schema: EvaluateOfferOutputSchema},
  prompt: `You are a high-level recruitment intelligence analyst for Leopardfish Intel. Your task is to provide a tactical verdict on a potential teaching contract.

Input Dossier:
- School: {{{schoolName}}}
- Location: {{{location}}}, {{{country}}}
- Projected Net Savings: {{{monthlySavings}}} {{{currency}}} per month
- Family Status: {{{familyStatus}}}

Instructions:
1. **Savings Capacity Analysis**: Evaluate if the projected savings are strong, moderate, or weak for this specific region and family status. Mention wealth-building potential over a 2-year cycle.
2. **Market Comparison (Intelligence)**: Briefly compare this offer to typical "Tier 1" and "Tier 2" packages in {{{location}}}. Is this school a market leader or a baseline provider?
3. **Lifestyle & Strategic Fit**: Comment on why {{{location}}} is a desirable target for an educator. Mention one or two local highlights (climate, culture, or travel links).
4. **Tactical Warnings & Advisories**: Check for any obvious warnings. This MUST include a summary of current US (State Dept) or UK (FCDO) travel advice if applicable, and any known institutional "Red Flags" for schools in {{{country}}} (e.g., visa delays, housing inconsistencies).

Tone: Professional, direct, and authoritative. Use British English.
`,
});

const evaluateOfferFlow = ai.defineFlow(
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

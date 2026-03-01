'use server';
/**
 * @fileOverview An AI-powered flow to generate a tactical SWOT analysis of a specific contract offer.
 *
 * - evaluateOffer - A function that handles the deep-dive SWOT analysis of an offer.
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
  strengths: z.string().describe('Core advantages of this offer, focusing on savings and benefits.'),
  weaknesses: z.string().describe('Potential downsides or areas where the offer is less competitive.'),
  opportunities: z.string().describe('Strategic growth or lifestyle opportunities presented by this move.'),
  threats: z.string().describe('Critical warnings, US/UK travel advice, or institutional red flags.'),
});
export type EvaluateOfferOutput = z.infer<typeof EvaluateOfferOutputSchema>;

export async function evaluateOffer(input: EvaluateOfferInput): Promise<EvaluateOfferOutput> {
  return evaluateOfferFlow(input);
}

const evaluateOfferPrompt = ai.definePrompt({
  name: 'evaluateOfferPrompt',
  input: {schema: EvaluateOfferInputSchema},
  output: {schema: EvaluateOfferOutputSchema},
  prompt: `You are a high-level recruitment intelligence analyst for Leopardfish Intel. Your task is to provide a tactical SWOT analysis on a potential teaching contract.

Input Dossier:
- School: {{{schoolName}}}
- Location: {{{location}}}, {{{country}}}
- Projected Net Savings: {{{monthlySavings}}} {{{currency}}} per month
- Family Status: {{{familyStatus}}}

Instructions:
1. **Strengths**: Analyse the financial and institutional "wins". Is the savings capacity strong for this family status? Is the school a known market leader?
2. **Weaknesses**: Identify where the offer might be "treading water". Are there high local costs that eat into the package? Is the savings capacity weak compared to regional Tier 1 benchmarks?
3. **Opportunities**: Comment on the strategic move. Does this city offer exceptional travel links or career growth pathways? Is there a lifestyle "bonus" (e.g., climate, culture)?
4. **Threats**: This is critical intelligence. You MUST check for and report on prevailing regional risks. Include current UK (FCDO) or US (State Dept) travel advice if applicable. Mention institutional red flags (e.g., currency volatility in {{{country}}}, visa complexity, or reported institutional delays).

Tone: Professional, direct, and authoritative. Use British English.`,
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

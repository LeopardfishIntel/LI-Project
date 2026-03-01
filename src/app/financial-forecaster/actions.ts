'use server';

import { evaluateOffer, type EvaluateOfferInput, type EvaluateOfferOutput } from '@/ai/flows/evaluate-offer-flow';

/**
 * Generates a tactical SWOT analysis of a potential teaching contract offer.
 * 
 * @param input - The contract offer parameters (school, location, savings, etc.)
 * @returns An object containing the generated SWOT data or an error message.
 */
export async function getOfferTacticalVerdict(input: EvaluateOfferInput): Promise<{ data: EvaluateOfferOutput | null; error: string | null; }> {
    try {
        const data = await evaluateOffer(input);
        return { data, error: null };
    } catch (e: any) {
        console.error("AI Verdict Generation Failed:", e);
        return { data: null, error: e.message || "Uplink failure during verdict generation." };
    }
}

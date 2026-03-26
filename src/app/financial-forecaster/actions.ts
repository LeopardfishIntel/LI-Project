 'use server';

import { evaluateOffer, type EvaluateOfferInput, type EvaluateOfferOutput } from '@/ai/flows/evaluate-offer-flow';

/**
 * Generates a tactical SWOT analysis of a potential teaching contract offer.
 * * @param input - The contract offer parameters (school, location, savings, etc.)
 * @returns An object containing the generated SWOT data or an error message.
 */
export async function getOfferTacticalVerdict(input: EvaluateOfferInput): Promise<{ data: EvaluateOfferOutput | null; error: string | null; }> {
    try {
        // 🛡️ Data validation check before sending to AI
        if (!input.schoolName || !input.location) {
            throw new Error("Incomplete intelligence: School and Location data required.");
        }

        const data = await evaluateOffer(input);
        return { data, error: null };
    } catch (e: any) {
        // 🕵️ Log the full trace for the developer, but return a clean string to the UI
        console.error("AI Verdict Generation Failed:", e);
        
        return { 
            data: null, 
            error: typeof e === 'string' ? e : e.message || "Uplink failure during verdict generation. Intelligence pipeline is offline." 
        };
    }
}
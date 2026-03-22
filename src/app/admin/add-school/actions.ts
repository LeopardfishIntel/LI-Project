 'use server';

import { enrichSchoolData, type EnrichSchoolDataOutput } from '@/ai/flows/enrich-school-data-flow';

/**
 * STRATEGIC ENRICHMENT ACTION
 * Interfaces with the AI Flow to populate school dossiers with high-fidelity intel.
 */
export async function getEnrichedSchoolData(input: any): Promise<{ data: EnrichSchoolDataOutput | null; error: string | null; }> {
    try {
        // Protocol: Pass input directly to the flow
        const data = await enrichSchoolData(input);
        
        return { 
            data: data as EnrichSchoolDataOutput, 
            error: null 
        };
    } catch (e: any) {
        console.error("ADMIN_ACTION_FAILURE:", e);
        return { 
            data: null, 
            error: e.message || "Intelligence synthesis interrupted." 
        };
    }
}
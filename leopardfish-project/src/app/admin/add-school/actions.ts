'use server';

import { enrichSchoolData, EnrichSchoolDataInput, EnrichSchoolDataOutput } from '@/ai/flows/enrich-school-data-flow';

export async function getEnrichedSchoolData(input: EnrichSchoolDataInput): Promise<{ data: EnrichSchoolDataOutput | null; error: string | null; }> {
    try {
        const data = await enrichSchoolData(input);
        return { data, error: null };
    } catch (e: any) {
        console.error(e);
        return { data: null, error: e.message || "An unexpected error occurred." };
    }
}

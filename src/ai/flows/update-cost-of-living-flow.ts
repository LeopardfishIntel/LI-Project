'use server';
/**
 * @fileOverview An AI flow to update cost of living data for a specific location.
 *
 * - updateCostOfLiving - A function to get fresh cost of living data.
 * - UpdateCostOfLivingInput - Input for the function.
 * - UpdateCostOfLivingOutput - Output for the function.
 */

import { getAI } from '@/ai/genkit';
import {z} from 'zod';

const UpdateCostOfLivingInputSchema = z.object({
  locationName: z.string().describe('The name of the city or location.'),
  countryName: z.string().describe('The country where the location is.'),
});
export type UpdateCostOfLivingInput = z.infer<
  typeof UpdateCostOfLivingInputSchema
>;

// This schema is based on the LocationCostOfLiving entity in backend.json
const UpdateCostOfLivingOutputSchema = z.object({
    diningSocial: z.coerce.number().describe("Estimated average cost of a meal at a mid-range restaurant in USD."),
    rent1br: z.coerce.number().describe("Estimated average monthly rent for a 1-bedroom apartment in the city center in USD."),
    rent2br: z.coerce.number().describe("Estimated average monthly rent for a 2-bedroom apartment in the city center in USD."),
    rent3br: z.coerce.number().describe("Estimated average monthly rent for a 3-bedroom apartment in the city center in USD."),
    currencyCode: z.string().describe("The official ISO 3-letter currency code for the location (e.g. 'EUR', 'AED', 'THB', 'GBP')."),
    publicTransport: z.coerce.number().describe("Estimated monthly cost for a public transport pass (Bus/Metro) in USD."),
    carPurchase: z.coerce.number().describe("Estimated monthly cost for car ownership (fuel, insurance, maintenance) in USD."),
    utilities: z.coerce.number().describe("Estimated average monthly cost for basic utilities (electricity, heating, cooling, water, garbage) in USD."),
    internet: z.coerce.number().describe("Estimated average monthly cost for internet service in USD."),
    mobilePhone: z.coerce.number().describe("Estimated average monthly cost for a single mobile phone plan in USD."),
    childcare: z.coerce.number().describe("Estimated average monthly cost for childcare (e.g., kindergarten or preschool) in USD.").optional(),
    groceries: z.coerce.number().describe("An index comparing grocery prices to a reference city, converted to a monthly USD estimate (approx $400 base)."),
    localPurchasingPowerIndex: z.coerce.number().describe("An index indicating the relative purchasing power of residents in the location."),
    uncoveredMedical: z.coerce.number().describe("Estimated average monthly out-of-pocket medical and dental expenses in USD per person.").optional(),
    vehicleInsuranceMaint: z.coerce.number().describe("Estimated average monthly cost for vehicle maintenance, insurance, and registration in USD.").optional(),
    dataReliabilityScore: z.coerce.number().describe("A score from 1-10 on how confident we are in this data.").default(8),
});
export type UpdateCostOfLivingOutput = z.infer<typeof UpdateCostOfLivingOutputSchema>;

export async function updateCostOfLiving(
  input: UpdateCostOfLivingInput
): Promise<UpdateCostOfLivingOutput> {
  return updateCostOfLivingFlow(input);
}

const updateCostOfLivingPrompt = getAI().definePrompt({
  name: 'updateCostOfLivingPrompt',
  input: {schema: UpdateCostOfLivingInputSchema},
  output: {schema: UpdateCostOfLivingOutputSchema},
  prompt: `You are an expert data researcher. Your task is to find the latest public cost-of-living information for the specified location and return it in the requested JSON format.

Location: {{{locationName}}}, {{{countryName}}}

When researching, prioritize information from the following reputable websites: Numbeo.com, Expatistan.com. You may use other high-quality public sources if necessary.

Please research online and provide the most recent estimates for the following data points, in USD.

- Average Meal Cost (mid-range restaurant - map to 'diningSocial')
- Monthly Rent (1-bedroom apartment, city center - map to 'rent1br')
- Monthly Rent (2-bedroom apartment, city center - map to 'rent2br')
- Monthly Rent (3-bedroom apartment, city center - map to 'rent3br')
- Local Currency Code (3-letter uppercase ISO code - map to 'currencyCode')
- Monthly Public Transport Pass (Bus/Metro - map to 'publicTransport')
- Monthly Car Ownership Cost (Fuel, Insurance, Basic maintenance - map to 'carPurchase')
- Monthly Utilities (basic - map to 'utilities')
- Monthly Internet (map to 'internet')
- Monthly Mobile Phone Plan (map to 'mobilePhone')
- Monthly Childcare (optional - map to 'childcare')
- Monthly Groceries Estimate (approx $400 base - map to 'groceries')
- Local Purchasing Power Index
- Estimated out-of-pocket monthly medical and dental expenses (map to 'uncoveredMedical')
- Average monthly vehicle maintenance, insurance, and registration (map to 'vehicleInsuranceMaint')
- Restaurant Price Index (map to 'diningSocial' fallback)
`,
});

const updateCostOfLivingFlow = getAI().defineFlow(
  {
    name: 'updateCostOfLivingFlow',
    inputSchema: UpdateCostOfLivingInputSchema,
    outputSchema: UpdateCostOfLivingOutputSchema,
  },
  async (input: UpdateCostOfLivingInput) => {
    const {output} = await updateCostOfLivingPrompt(input);
    return output!;
  }
);

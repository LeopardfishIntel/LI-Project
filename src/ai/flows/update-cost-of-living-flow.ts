'use server';
/**
 * @fileOverview An AI flow to update cost of living data for a specific location.
 *
 * - updateCostOfLiving - A function to get fresh cost of living data.
 * - UpdateCostOfLivingInput - Input for the function.
 * - UpdateCostOfLivingOutput - Output for the function.
 */

import {ai} from '@/ai/genkit';
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
    averageMealCost: z.coerce.number().describe("Estimated average cost of a meal at a mid-range restaurant in USD."),
    monthlyRent1BR: z.coerce.number().describe("Estimated average monthly rent for a 1-bedroom apartment in the city center in USD."),
    transportPassCost: z.coerce.number().describe("Estimated monthly cost for a public transport pass in USD."),
    utilitiesMonthly: z.coerce.number().describe("Estimated average monthly cost for basic utilities (electricity, heating, cooling, water, garbage) in USD."),
    internetMonthly: z.coerce.number().describe("Estimated average monthly cost for internet service in USD."),
    childcareMonthly: z.coerce.number().describe("Estimated average monthly cost for childcare (e.g., kindergarten or preschool) in USD.").optional(),
    localPurchasingPowerIndex: z.coerce.number().describe("An index indicating the relative purchasing power of residents in the location."),
    groceriesIndex: z.coerce.number().describe("An index comparing grocery prices to a reference city."),
    restaurantPriceIndex: z.coerce.number().describe("An index comparing restaurant prices to a reference city."),
});
export type UpdateCostOfLivingOutput = z.infer<typeof UpdateCostOfLivingOutputSchema>;

export async function updateCostOfLiving(
  input: UpdateCostOfLivingInput
): Promise<UpdateCostOfLivingOutput> {
  return updateCostOfLivingFlow(input);
}

const updateCostOfLivingPrompt = ai.definePrompt({
  name: 'updateCostOfLivingPrompt',
  input: {schema: UpdateCostOfLivingInputSchema},
  output: {schema: UpdateCostOfLivingOutputSchema},
  prompt: `You are an expert data researcher. Your task is to find the latest public cost-of-living information for the specified location and return it in the requested JSON format.

Location: {{{locationName}}}, {{{countryName}}}

Please research online and provide the most recent estimates for the following data points, in USD.

- Average Meal Cost (mid-range restaurant)
- Monthly Rent (1-bedroom apartment, city center)
- Monthly Transport Pass
- Monthly Utilities (basic)
- Monthly Internet
- Monthly Childcare (optional)
- Local Purchasing Power Index
- Groceries Index
- Restaurant Price Index
`,
});

const updateCostOfLivingFlow = ai.defineFlow(
  {
    name: 'updateCostOfLivingFlow',
    inputSchema: UpdateCostOfLivingInputSchema,
    outputSchema: UpdateCostOfLivingOutputSchema,
  },
  async input => {
    const {output} = await updateCostOfLivingPrompt(input);
    return output!;
  }
);

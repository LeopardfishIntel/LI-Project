
'use server';
/**
 * @fileOverview A school disambiguation flow for high-accuracy verification.
 *
 * - disambiguateSchool - A function that handles the disambiguation process.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const DisambiguateSchoolInputSchema = z.object({
  user_input_school: z.string().describe('The name of the school as entered by the user.'),
  user_input_city: z.string().describe('The city where the school is located.'),
});
export type DisambiguateSchoolInput = z.infer<typeof DisambiguateSchoolInputSchema>;

const DisambiguateSchoolOutputSchema = z.object({
  is_ambiguous: z.boolean().describe('Whether the name matches multiple known entities.'),
  suggestions: z.array(z.string()).describe('List of known branches or similar schools if ambiguous.'),
  canonical_name: z.string().describe('The official, typo-corrected canonical name of the school.'),
  message_to_user: z.string().describe('Professional tactical feedback for the user.'),
});
export type DisambiguateSchoolOutput = z.infer<typeof DisambiguateSchoolOutputSchema>;

export async function disambiguateSchool(input: DisambiguateSchoolInput): Promise<DisambiguateSchoolOutput> {
  return disambiguateSchoolFlow(input);
}

const prompt = ai.definePrompt({
  name: 'disambiguateSchoolPrompt',
  input: { schema: DisambiguateSchoolInputSchema },
  output: { schema: DisambiguateSchoolOutputSchema },
  prompt: `Act as a data validator for an international school database. The user has inputted: '{{user_input_school}}' in the city of '{{user_input_city}}'.

Instructions:
1. **Check for Ambiguity**: If the name matches multiple known entities (e.g., 'GEMS'), identify all known branches in that city (e.g., GEMS Founders, GEMS Wellington, GEMS Modern).
2. **Verification**: If the name is nearly correct but has a typo (e.g., 'Gems Fonders'), provide the canonical official name.
3. **Tone**: If ambiguous, the message to the user MUST be: 'Multiple intelligence signatures detected for {{user_input_school}}. Please specify the exact branch to ensure data integrity.' 
4. **Professionalism**: Maintain a crisp, professional intelligence analyst tone.

Output: Return a JSON object with is_ambiguous, suggestions, canonical_name, and message_to_user.`,
});

export const disambiguateSchoolFlow = ai.defineFlow(
  {
    name: 'disambiguateSchoolFlow',
    inputSchema: DisambiguateSchoolInputSchema,
    outputSchema: DisambiguateSchoolOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);

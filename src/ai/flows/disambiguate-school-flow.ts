
'use server';
/**
 * @fileOverview A school disambiguation and database cross-reference flow.
 *
 * - disambiguateSchool - A function that handles the disambiguation process against a master registry.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const DisambiguateSchoolInputSchema = z.object({
  user_input_school: z.string().describe('The name of the school as entered by the user.'),
  user_input_city: z.string().describe('The city where the school is located.'),
  verified_registry: z.array(z.object({
    id: z.string(),
    name: z.string(),
  })).describe('The master list of verified schools in this city/region.'),
});
export type DisambiguateSchoolInput = z.infer<typeof DisambiguateSchoolInputSchema>;

const DisambiguateSchoolOutputSchema = z.object({
  is_ambiguous: z.boolean().describe('Whether the name matches multiple known entities.'),
  is_new_entity: z.boolean().describe('Whether no match was found in the database.'),
  suggestions: z.array(z.string()).describe('List of known branches or similar schools if ambiguous.'),
  canonical_name: z.string().describe('The official, typo-corrected canonical name of the school.'),
  school_id: z.string().optional().describe('The unique ID from the master registry.'),
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
  prompt: `Act as a data validator for an international school database. 
The user has inputted: '{{user_input_school}}' in the city of '{{user_input_city}}'.

Master Registry Context:
{{#each verified_registry}}
- ID: {{id}}, Name: {{name}}
{{/each}}

Instructions:
1. **Compare Input**: Compare '{{user_input_school}}' against our verified registry of schools. Find the best semantic match even if the user used a nickname or acronym.
2. **Ambiguity Check**: If the name matches multiple known entities (e.g., 'GEMS'), identify all known branches.
3. **Extract ID**: If a high-confidence match is found, extract the unique School_ID from the registry and set canonical_name.
4. **New Entity Detection**: If no high-confidence match exists, flag this as 'is_new_entity: true' and prompt the user to provide the school's official website URL for agent verification.
5. **Typos**: If the name is nearly correct but has a typo, provide the canonical official name.
6. **Tone**: Maintain a professional intelligence analyst tone.

Output Requirements:
- If ambiguous: message_to_user = 'Multiple intelligence signatures detected for {{user_input_school}}. Please specify the exact branch to ensure data integrity.'
- If match found: message_to_user = 'Match found: [Name] detected. Please confirm signal.'
- If new entity: message_to_user = 'NEW_ENTITY_DETECTION: Signature not in local database. Please provide official website URL for agent verification.'`,
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

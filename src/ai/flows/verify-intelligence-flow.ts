
'use server';
/**
 * @fileOverview Editorial verification flow for Leopardfish Intel.
 *
 * - verifyIntelligence - Polishes raw reports and extracts metadata tags.
 */

import { getAI } from '@/ai/genkit';
import { z } from 'zod';

const VerifyIntelligenceInputSchema = z.object({
  content: z.string().describe('The clean intel text from the staging area.'),
  category: z.string().describe('The user-selected category.'),
});
export type VerifyIntelligenceInput = z.infer<typeof VerifyIntelligenceInputSchema>;

const VerifyIntelligenceOutputSchema = z.object({
  polished_text: z.string().describe('The final, grammatically correct intel narrative.'),
  location: z.string().describe('The specific city or country mentioned.'),
  organisation: z.string().describe('The school or recruitment entity mentioned.'),
  intel_type: z.string().describe('Classification (e.g., Housing, Salary, Conduct).'),
  tags: z.array(z.string()).describe('A list of descriptive tags for the dossier.'),
});
export type VerifyIntelligenceOutput = z.infer<typeof VerifyIntelligenceOutputSchema>;

export async function verifyIntelligence(input: VerifyIntelligenceInput): Promise<VerifyIntelligenceOutput> {
  return verifyIntelligenceFlow(input);
}

const editorPrompt = getAI().definePrompt({
  name: 'verifyIntelPrompt',
  input: { schema: VerifyIntelligenceInputSchema },
  output: { schema: VerifyIntelligenceOutputSchema },
  prompt: `You are the Lead Editor for Leopardfish Intel. I have approved this pending report for final verification and publication.

Instructions:
1. **Final Polish**: Correct minor grammatical errors and improve flow while maintaining the teacher's original authentic tone. Use British English spelling.
2. **Metadata Extraction**:
   - Identify the 'location' (City/Country).
   - Identify the 'organisation' (The specific school name or recruitment agency).
   - Classify the 'intel_type' based on the core issue.
   - Generate a list of search-optimised 'tags'.

Raw Report:
Category: {{{category}}}
Content: {{{content}}}`,
});

export const verifyIntelligenceFlow = getAI().defineFlow(
  {
    name: 'verifyIntelFlow',
    inputSchema: VerifyIntelligenceInputSchema,
    outputSchema: VerifyIntelligenceOutputSchema,
  },
  async (input: VerifyIntelligenceInput) => {
    const { output } = await editorPrompt(input);
    return output!;
  }
);

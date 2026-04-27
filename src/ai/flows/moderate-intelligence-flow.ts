
'use server';
/**
 * @fileOverview A security moderation flow for Leopardfish Intel submissions.
 *
 * - moderateIntelligence - A function that handles the moderation process.
 * - ModerateIntelligenceInput - The input type for the moderation function.
 * - ModerateIntelligenceOutput - The return type for the moderation function.
 */

import { getAI } from '@/ai/genkit';
import { z } from 'zod';

const ModerateIntelligenceInputSchema = z.object({
  content: z.string().describe('The raw intel narrative.'),
});
export type ModerateIntelligenceInput = z.infer<typeof ModerateIntelligenceInputSchema>;

const ModerateIntelligenceOutputSchema = z.object({
  status: z.enum(['pending', 'auto_rejected']).describe('The moderation status.'),
  clean_text: z.string().describe('The redacted and cleaned intel narrative.'),
  safety_flags: z.array(z.string()).describe('List of safety concerns identified (e.g., Defamation, PII, Bias, Inappropriate Language).'),
  confidence_score: z.number().min(0).max(100).describe('Confidence score from 0-100 based on detail and professionalism.'),
  suspect_bias: z.string().optional().describe('Analysis of potential emotional or professional bias detected in the report.'),
  ratified_data_points: z.array(z.string()).optional().describe('Data points from the report that appear to align with known institutional standards.'),
});
export type ModerateIntelligenceOutput = z.infer<typeof ModerateIntelligenceOutputSchema>;

export async function moderateIntelligence(input: ModerateIntelligenceInput): Promise<ModerateIntelligenceOutput> {
  return moderateIntelligenceFlow(input);
}

const prompt = getAI().definePrompt({
  name: 'moderateIntelPrompt',
  input: { schema: ModerateIntelligenceInputSchema },
  output: { schema: ModerateIntelligenceOutputSchema },
  prompt: `You are a professional security moderator and editorial filter for Leopardfish Intel. Analyse the following field report submission.

Instructions:
1. **Filter & Clean**: Redact and remove any inappropriate language or malicious personal attacks. 
2. **PII Detection**: Scan for and redact real names of individuals, private phone numbers, or email addresses using [REDACTED].
3. **Bias Detection**: Highlight any suspect bias (e.g., extremely emotional language that might cloud factual reporting).
4. **Data Ratification**: Identify specific data points (salaries, benefits, policies) and cross-reference them against general institutional standards to see if they are 'ratifiable'.
5. **Auto-Rejection**: If the report is pure hate speech, nonsensical gibberish, or dangerous unredacted PII, set status to 'auto_rejected'.
6. **Final Verdict**: Assign a 'confidence_score' (0-100) based on professionalism and evidence-led detail. Set status to 'pending' for staging.

Submission Payload:
{{{content}}}`,
});

export const moderateIntelligenceFlow = getAI().defineFlow(
  {
    name: 'moderateIntelFlow',
    inputSchema: ModerateIntelligenceInputSchema,
    outputSchema: ModerateIntelligenceOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);


'use server';
/**
 * @fileOverview A security moderation flow for Leopardfish Intel submissions.
 *
 * - moderateIntelligence - A function that handles the moderation process.
 * - ModerateIntelligenceInput - The input type for the moderation function.
 * - ModerateIntelligenceOutput - The return type for the moderation function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ModerateIntelligenceInputSchema = z.object({
  content: z.string().describe('The raw intel narrative.'),
});
export type ModerateIntelligenceInput = z.infer<typeof ModerateIntelligenceInputSchema>;

const ModerateIntelligenceOutputSchema = z.object({
  status: z.enum(['pending', 'auto_rejected']).describe('The moderation status.'),
  clean_text: z.string().describe('The redacted and cleaned intel narrative.'),
  safety_flags: z.array(z.string()).describe('List of safety concerns identified (e.g., Defamation, PII, Gibberish).'),
  confidence_score: z.number().min(0).max(100).describe('Confidence score from 0-100 based on detail and professionalism.'),
});
export type ModerateIntelligenceOutput = z.infer<typeof ModerateIntelligenceOutputSchema>;

export async function moderateIntelligence(input: ModerateIntelligenceInput): Promise<ModerateIntelligenceOutput> {
  return moderateIntelligenceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'moderateIntelPrompt',
  input: { schema: ModerateIntelligenceInputSchema },
  output: { schema: ModerateIntelligenceOutputSchema },
  prompt: `You are a security moderator for Leopardfish Intel. Analyse the following user submission for professional educator intel.

Instructions:
1. **Check for Malice**: Identify any hate speech, malicious professional defamation, or nonsensical gibberish. Factual reports of poor school conditions are permitted, but baseless personal attacks are flagged.
2. **PII Detection**: Scan for real names of individuals, private phone numbers, or email addresses. 
3. **Redaction Protocol**: If minor PII is found, redact it using [REDACTED]. 
4. **Auto-Rejection**: If the report contains significant unredacted PII (like a clear phone number or email address), set status to 'auto_rejected' and flag as 'PII_VIOLATION'.
5. **Classification**: Assign a 'confidence_score' from 0-100 based on how detailed, evidence-led, and professional the report is.
6. **Final Verdict**: Set status to 'auto_rejected' if the content is pure gibberish, malicious hate speech, or contains dangerous PII violations. Otherwise, set to 'pending' for staging.

Submission Payload:
{{{content}}}`,
});

export const moderateIntelligenceFlow = ai.defineFlow(
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

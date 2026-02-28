
'use server';
/**
 * @fileOverview An AI flow to analyse and validate user-submitted field intelligence.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const AnalyseIntelInputSchema = z.object({
  category: z.string(),
  content: z.string(),
});

export async function analyseIntelStream(input: { category: string; content: string }) {
  const { stream, response } = ai.generateStream({
    system: `You are a high-level intelligence officer for Leopardfish Intel. 
    Your task is to provide real-time analysis of a field report submitted by an educator. 
    Evaluate the strategic importance, check for red flags, and provide a short tactical summary. 
    Maintain a professional, stealthy, and analytical tone.`,
    prompt: `Report Category: ${input.category}\nContent: ${input.content}`,
  });

  return { stream, response };
}

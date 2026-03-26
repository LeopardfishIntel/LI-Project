 'use server';

/**
 * @fileOverview An AI flow to analyse and validate user-submitted field intelligence.
 */

import { ai } from '@/ai/genkit'; // 🛰️ RE-ESTABLISHED: The Genkit Mission Control
import { db } from '@/firebase/server'; // 🛡️ SECURED: The Server-side Firestore singleton
import { z } from 'zod';

const AnalyseIntelInputSchema = z.object({
  category: z.string().min(1, "Category is required"),
  content: z.string().min(10, "Report content is too short for tactical analysis"),
});

export async function analyseIntelStream(rawInput: { category: string; content: string }) {
  // 🛡️ TACTICAL VALIDATION
  const validated = AnalyseIntelInputSchema.safeParse(rawInput);
  if (!validated.success) {
    throw new Error(`Validation Failed: ${validated.error.message}`);
  }

  const { category, content } = validated.data;

  // 🛰️ STREAMING GENERATION
  const { stream } = ai.generateStream({
    model: 'googleai/gemini-1.5-flash', 
    system: `You are a high-level intelligence officer for Leopardfish Intel. 
    Your task is to provide real-time analysis of a field report submitted by an educator. 
    Evaluate the strategic importance, check for red flags, and provide a short tactical summary. 
    Maintain a professional, stealthy, and analytical tone. 
    Use Markdown. Use font-black and tracking-tighter for all headers.`,
    prompt: `Report Category: ${category}\nContent: ${content}`,
  });

  return stream;
}
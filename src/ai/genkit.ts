import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [
    googleAI({ 
      // ✅ CORRECT: Pulling from environment (Preferred)
      // OR if you must hardcode for a quick test, use: 
      // apiKey: "AIzaSyBpbzldS7RugR-eh2CyBvgM72gYpoadBMU" 
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY 
    })
  ],
  model: 'googleai/gemini-1.5-flash',
});
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

// 🛡️ Safe: Pulls from .env.local only
const KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

export const ai = genkit({
  plugins: [
    googleAI({ 
      apiKey: KEY,
    })
  ],
  // 🚀 2026 Stable Standard
  model: 'googleai/gemini-2.5-flash',
});

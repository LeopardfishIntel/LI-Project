import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

// 🛡️ Safe: Pulls from .env.local only
// 🛡️ Safe: Checks multiple standard names to ensure live site compatibility
const KEY = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;

export const ai = genkit({
  plugins: [
    googleAI({ 
      apiKey: KEY,
    })
  ],
  // 🚀 2026 Stable Standard
  model: 'googleai/gemini-2.5-flash',
});

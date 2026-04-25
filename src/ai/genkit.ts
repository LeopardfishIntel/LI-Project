import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

/**
 * 🛰️ MISSION-CRITICAL: LIVE GETTER PATTERN
 * This function creates a fresh AI instance with the latest 
 * environment variables every time it is called.
 */
export function getAI() {
  const isServer = typeof window === 'undefined';
  const KEY = isServer 
    ? (process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY) 
    : 'CLIENT_SIDE_STUB';

  return genkit({
    plugins: [
      googleAI({ 
        apiKey: KEY,
      })
    ],
    // 🚀 2026 Stable Standard
    model: 'googleai/gemini-2.5-flash',
  });
}

// ⚠️ DEPRECATED: Use getAI() instead. 
// Keeping this for a few minutes while we migrate flows.
export const ai = getAI();

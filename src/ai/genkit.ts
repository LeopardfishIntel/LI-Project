import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

/**
 * 🛰️ MISSION-CRITICAL: DYNAMIC GOOGLE AI ENGINE
 * We are using the standard API Key method for everything.
 * Because this is a function, it waits until the exact moment of
 * execution to grab the key, bypassing the early-boot failures!
 */
export function getAI() {
  const isServer = typeof window === 'undefined';
  
  // 🛡️ SECURITY: Only attempt to pull keys on the server
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

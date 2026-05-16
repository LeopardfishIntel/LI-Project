import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

/**
 * 🛰️ MISSION-CRITICAL: DYNAMIC GOOGLE AI ENGINE
 * We are using the standard API Key method for everything.
 * Because this is a function, it waits until the exact moment of
 * execution to grab the key, bypassing the early-boot failures!
 */
let aiInstance: any = null;

export function getAI() {
  if (aiInstance) return aiInstance;

  const isServer = typeof window === 'undefined';
  
  // 🛡️ SECURITY: Only attempt to pull keys on the server
  const KEY = isServer 
    ? (process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY) 
    : 'CLIENT_SIDE_STUB';

  aiInstance = genkit({
    plugins: [
      googleAI({ 
        apiKey: KEY || 'MISSING_KEY_FALLBACK',
      })
    ],
    // 🚀 2026 Stable Standard
    model: 'googleai/gemini-1.5-flash',
  });

  return aiInstance;
}

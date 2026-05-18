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
  const isServer = typeof window === 'undefined';
  
  // 🛡️ SECURITY: Only attempt to pull keys on the server
  const KEY = isServer 
    ? (process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY) 
    : 'CLIENT_SIDE_STUB';

  const KEY_PREFIX = KEY ? KEY.substring(0, 10) : "NONE";

  // If we already initialized Genkit, and the cached instance has the SAME key prefix as the active one, let's reuse it!
  if (aiInstance && aiInstance.apiKeyPrefix === KEY_PREFIX) {
    console.log("🛸 [GENKIT] getAI cached instance accessed. Active KEY prefix:", aiInstance.apiKeyPrefix || "N/A");
    return aiInstance;
  }

  console.log("🛸 [GENKIT] getAI fresh init. isServer:", isServer, "Key Prefix:", KEY_PREFIX);

  aiInstance = genkit({
    plugins: [
      googleAI({ 
        apiKey: KEY || 'MISSING_KEY_FALLBACK',
      })
    ],
    // 🚀 2026 Stable Standard
    model: 'googleai/gemini-2.5-flash',
  });

  aiInstance.apiKeyPrefix = KEY_PREFIX;

  return aiInstance;
}

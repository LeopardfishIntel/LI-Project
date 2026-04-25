import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

/**
 * 🛰️ MISSION-CRITICAL: GHOST PROXY INITIALIZATION
 * This Proxy intercepts all calls to the 'ai' object and 
 * initializes Genkit ONLY when a method is actually called.
 * This guarantees that process.env is fully populated by the server.
 */
function createDynamicAI() {
  let cachedAI: any = null;

  const getAI = () => {
    if (cachedAI) return cachedAI;

    const isServer = typeof window === 'undefined';
    const KEY = isServer 
      ? (process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY) 
      : undefined;

    cachedAI = genkit({
      plugins: [
        googleAI({ 
          apiKey: KEY,
        })
      ],
      // 🚀 2026 Stable Standard
      model: 'googleai/gemini-2.5-flash',
    });

    return cachedAI;
  };

  return new Proxy({} as any, {
    get(_, prop) {
      const instance = getAI();
      const value = instance[prop];
      return typeof value === 'function' ? value.bind(instance) : value;
    }
  });
}

// 🛰️ THE GHOST INSTANCE
export const ai = createDynamicAI();

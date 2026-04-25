import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { vertexAI } from '@genkit-ai/vertexai';

/**
 * 🛰️ MISSION-CRITICAL: HYBRID AI ENGINE
 * Local Dev: Uses Google AI (API Key)
 * Live Site: Uses Vertex AI (Identity-based, no API key needed!)
 */
export function getAI() {
  const isServer = typeof window === 'undefined';
  const isProduction = process.env.NODE_ENV === 'production';
  
  const googleKey = isServer 
    ? (process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY) 
    : undefined;

  // 🛡️ Live Site: Use Vertex AI (Bulletproof)
  if (isProduction && isServer) {
    return genkit({
      plugins: [
        vertexAI({ 
          location: 'us-central1' 
        })
      ],
      model: 'vertexai/gemini-1.5-flash', 
    });
  }

  // 🛠️ Local Dev: Use Google AI (API Key)
  return genkit({
    plugins: [
      googleAI({ 
        apiKey: googleKey,
      })
    ],
    model: 'googleai/gemini-1.5-flash',
  });
}

// Export a proxy for backward compatibility
export const ai = new Proxy({} as any, {
  get(_, prop) {
    const instance = getAI();
    const value = instance[prop];
    return typeof value === 'function' ? value.bind(instance) : value;
  }
});

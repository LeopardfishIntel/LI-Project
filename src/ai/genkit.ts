import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

/**
 * 🛰️ MISSION-CRITICAL: ULTRA-LAZY INITIALIZATION
 * This Proxy ensures that the 'googleAI' plugin is NOT initialized
 * until the exact moment a flow or prompt is executed. 
 * This prevents 'FAILED_PRECONDITION' errors during boot-up.
 */
function createUltraLazyAI() {
  let cachedAI: any = null;

  const initAI = () => {
    if (cachedAI) return cachedAI;

    const isServer = typeof window === 'undefined';
    // 🛡️ SECURITY: Only attempt to pull keys on the server
    const KEY = isServer 
      ? (process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY) 
      : 'CLIENT_SIDE_STUB'; // Dummy string for client-side to prevent crash

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

  // The Proxy wraps all genkit methods (defineFlow, definePrompt, generate, etc.)
  return new Proxy({} as any, {
    get(_, prop) {
      // These methods are called at top-level in flow files
      const topLevelMethods = ['defineFlow', 'definePrompt', 'defineHelper'];
      
      if (topLevelMethods.includes(prop as string)) {
        return (...args: any[]) => {
          // Return a "Delayed Execution" function
          return async (...runArgs: any[]) => {
            const instance = initAI();
            const method = instance[prop];
            const flowOrPrompt = method.apply(instance, args);
            return typeof flowOrPrompt === 'function' 
              ? flowOrPrompt(...runArgs) 
              : flowOrPrompt;
          };
        };
      }

      // For all other runtime methods (generate, etc.)
      return (...args: any[]) => {
        const instance = initAI();
        const method = instance[prop];
        return method.apply(instance, args);
      };
    }
  });
}

// 🛰️ THE LAZY INSTANCE
export const ai = createUltraLazyAI();

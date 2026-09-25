import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { aiBudgetGuard } from './budgetGuard';

/**
 * 🛰️ MISSION-CRITICAL: DYNAMIC GOOGLE AI ENGINE
 * We are using the standard API Key method for everything.
 * Integrates Budget Guard with £2.00 GBP threshold and safety warnings.
 */
let aiInstance: any = null;

export function getAI() {
  const isServer = typeof window === 'undefined';
  
  // 🛡️ SECURITY & BUDGET: Check spending limit
  if (isServer && !aiBudgetGuard.canExecute()) {
    throw new Error(`[AI BUDGET GUARD] Execution blocked: Cumulative spending exceeded £${aiBudgetGuard.getBudgetLimit().toFixed(2)} GBP limit. Please top up or verify usage.`);
  }

  // 🛡️ SECURITY: Only attempt to pull keys on the server
  const KEY = isServer 
    ? (process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY) 
    : 'CLIENT_SIDE_STUB';

  const KEY_PREFIX = KEY ? KEY.substring(0, 10) : "NONE";

  // If we already initialized Genkit, and the cached instance has the SAME key prefix as the active one, let's reuse it!
  if (aiInstance && aiInstance.apiKeyPrefix === KEY_PREFIX) {
    aiBudgetGuard.recordUsage(1200, 300);
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
  aiBudgetGuard.recordUsage(1200, 300);

  return aiInstance;
}


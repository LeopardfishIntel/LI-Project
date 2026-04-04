import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

// 🛡️ TACTICAL BYPASS: Hardcoded valid key
const KEY = "AIzaSyDPvJMAUkAbwhbCtA-oHluqN5I7pkI7MBg"; 

export const ai = genkit({
  plugins: [
    googleAI({ apiKey: KEY })
  ],
  // 🚀 GLOBAL OVERRIDE: Force Genkit's internal systems to use 2.0-flash
  model: 'googleai/gemini-2.0-flash', 
});
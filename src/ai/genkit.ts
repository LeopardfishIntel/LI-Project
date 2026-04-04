import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

// 🛡️ TACTICAL BYPASS: Hardcoded valid key
const KEY = "AIzaSyDPvJMAUkAbwhbCtA-oHluqN5I7pkI7MBg"; 

export const ai = genkit({
  plugins: [
    googleAI({ 
      apiKey: KEY,
    })
  ],
  // 🚀 2026 STANDARD: Using Gemini 3.1 Flash-Lite
  model: 'googleai/gemini-3.1-flash-lite-preview', 
});
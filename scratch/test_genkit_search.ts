import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

if (process.env.GOOGLE_API_KEY) {
  process.env.GEMINI_API_KEY = process.env.GOOGLE_API_KEY;
}

import { getAI } from "../src/ai/genkit";

async function main() {
  const ai = getAI();
  console.log("Calling Genkit gemini-2.5-flash with googleSearch tool...");
  
  try {
    const response = await ai.generate({
      model: "googleai/gemini-2.5-flash",
      prompt: "Search the web to find the exact number of distinct, academic/teaching job vacancies advertised for Cheltenham Muscat over the last 12 months. Do not include support staff. Count distinct teaching/leadership roles only.",
      config: {
        // Enforce Google Search tool in Genkit
        tools: [{ googleSearch: {} } as any]
      }
    });
    
    console.log("-----------------------------------------");
    console.log("RESPONSE TEXT:");
    console.log("-----------------------------------------");
    console.log(response.text);
  } catch (err) {
    console.error("GENKIT ERROR:", err);
  }
}

main().catch(console.error);

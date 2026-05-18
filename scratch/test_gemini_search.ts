import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { GoogleGenerativeAI } from "@google/generative-ai";

async function main() {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.error("Missing GOOGLE_API_KEY");
    return;
  }
  
  const genAI = new GoogleGenerativeAI(apiKey);
  // Use gemini-2.5-flash
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
  });
  
  console.log("Calling Gemini with Google Search tool...");
  const response = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: "Find the exact number of distinct, publicly advertised job vacancies for Cheltenham Muscat over the last 12 months. Search across TES, Schrole, and the school's direct HR portal. Filter out support staff. Tell me how many distinct vacancies you found." }] }],
    tools: [{ googleSearch: {} } as any],
  });
  
  console.log("-----------------------------------------");
  console.log("RESPONSE TEXT:");
  console.log("-----------------------------------------");
  console.log(response.response.text());
  
  console.log("-----------------------------------------");
  console.log("GROUNDING METADATA:");
  console.log("-----------------------------------------");
  console.log(JSON.stringify(response.response.candidates?.[0]?.groundingMetadata, null, 2));
}

main().catch(console.error);

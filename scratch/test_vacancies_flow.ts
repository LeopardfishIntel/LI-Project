import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

if (process.env.GOOGLE_API_KEY) {
  process.env.GEMINI_API_KEY = process.env.GOOGLE_API_KEY;
}

import { searchVacancies } from "../src/ai/flows/search-vacancies-flow";

async function main() {
  console.log("Testing searchVacancies flow for Riverside Prague...");
  const res = await searchVacancies({
    schoolName: "Riverside Prague",
    city: "Prague",
    country: "Czech Republic"
  });
  
  console.log("-----------------------------------------");
  console.log("VACANCIES RESULT:");
  console.log("-----------------------------------------");
  console.log(JSON.stringify(res, null, 2));
}

main().catch(console.error);

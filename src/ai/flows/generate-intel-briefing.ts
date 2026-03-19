 // 🚀 STABILIZED VERTEX AI ENGINE
import { getVertexAI, getGenerativeModel } from "firebase/vertex-ai";
import { app } from "@/firebase/config";

/**
 * 🛰️ LEOPARDFISH INTEL GENERATOR
 * Generates a tactical fit analysis using the Gemini 1.5 Flash engine.
 */
export async function generateIntelBriefing(matchResults: any) {
  try {
    // 🛡️ Initialize the AI Engine on the stable path
    const vertexAI = getVertexAI(app);
    
    // 💎 Model: Gemini 1.5 Flash (Optimized for speed/accuracy)
    const model = getGenerativeModel(vertexAI, { 
      model: "gemini-1.5-flash",
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.7, // Balanced for professional/insightful tone
      }
    });

    const prompt = `
      You are the Leopardfish Intel Agent. 
      Analyze the following teacher-to-school match results and provide a high-level briefing:
      ${JSON.stringify(matchResults)}
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    return response.text();

  } catch (error) {
    console.error("🚨 INTEL_ENGINE_FAILURE:", error);
    return "Briefing unavailable. Tactical data stream interrupted.";
  }
}
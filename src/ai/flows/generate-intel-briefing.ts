 // @ts-ignore - Some TS versions struggle with the preview subpath
import { getVertexAI, getGenerativeModel } from "firebase/vertex-ai-preview";
import app from "@firebase/config";

export async function generateIntelBriefing(matchResults: any) {
  try {
    const vertexAI = getVertexAI(app);
    const model = getGenerativeModel(vertexAI, { model: "gemini-1.5-flash" });
    const result = await model.generateContent(`Analyze: ${JSON.stringify(matchResults)}`);
    return result.response.text();
  } catch (error) {
    return "Briefing unavailable.";
  }
}
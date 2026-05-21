import { getAI } from '@/ai/genkit';
import { z } from 'zod';
import { gemini15Pro } from '@genkit-ai/googleai';

export const generateCountryIndexesFlow = getAI().defineFlow({
  name: 'generateCountryIndexes',
  inputSchema: z.object({
    country: z.string().describe("The name of the country to analyze (e.g. 'Thailand', 'Poland')"),
  }),
  outputSchema: z.object({
    adventureScore: z.number().min(0).max(9.9).describe("Final Adventure Score (0.0 to 9.9)"),
    cultureScore: z.number().min(0).max(9.9).describe("Final Culture Score (0.0 to 9.9)"),
    careerScore: z.number().min(0).max(9.9).describe("Final Career Score (0.0 to 9.9)"),
    adventureStats: z.object({
      geography: z.number().min(0).max(10).describe("Diversity of terrain and UNESCO sites (0-10)"),
      travel: z.number().min(0).max(10).describe("Flight and rail connectivity, the 'Weekend Warrior' factor (0-10)"),
      vibe: z.number().min(0).max(10).describe("Hofstede difference from typical Western norm (0-10)"),
      safety: z.number().min(0).max(10).describe("Global Peace Index and stability (0-10)")
    }),
    cultureStats: z.object({
      immersion: z.number().min(0).max(10).describe("Old World heritage and festival density (0-10)"),
      integration: z.number().min(0).max(10).describe("English proficiency and expat friendliness (0-10)"),
      thirdSpace: z.number().min(0).max(10).describe("Cafe culture, parks, and pedestrian zones (0-10)"),
      exotic: z.number().min(0).max(10).describe("Hofstede Insights exotic factor (0-10)")
    }),
    careerStats: z.object({
      pedigree: z.number().min(0).max(10).describe("Density of top-tier accredited schools (0-10)"),
      leadership: z.number().min(0).max(10).describe("Internal leadership pathways and upward mobility (0-10)"),
      pd: z.number().min(0).max(10).describe("Professional development norms and funding (0-10)"),
      competition: z.number().min(0).max(10).describe("Competitiveness of the hiring market (0-10)")
    })
  }),
}, async (input: { country: string }) => {
  const { country } = input;

  const prompt = `
    You are Leopardfish Intel, a tactical intelligence analyst for international educators.
    Your objective is to calculate the 'Adventure Index' and 'Culture Index' for: ${country}.
    
    Use the following rigid, data-driven formulas to calculate the scores. Estimate the raw 0-10 values based on your training data (World Bank, UNESCO, Hofstede Insights, Global Peace Index, EF English Proficiency).

    THE ADVENTURE FORMULA (A):
    G (Geography): Diversity of terrain and proximity to UNESCO sites. (Weight: 0.4)
    T (Travel): Flight/Rail connectivity to other countries. (Weight: 0.3)
    V (Vibe): How different is the local language/food from typical Western norms? (Weight: 0.2)
    S (Safety): Global Peace Index and general stability. (Weight: 0.1)
    Calculation: A = (G * 0.4) + (T * 0.3) + (V * 0.2) + (S * 0.1)

    THE CULTURE FORMULA (C):
    I (Immersion): Density of heritage sites, theaters, local festivals. (Weight: 0.4)
    L (Integration): EF English proficiency and Expat Insider "Ease of Settling In". High English/ease = higher score. (Weight: 0.3)
    E (Third Space): Quality of cafe culture and public social spaces. (Weight: 0.2)
    X (Cultural Distance): Hofstede's Insights (Power Distance, Individualism) exotic factor. (Weight: 0.1)
    Calculation: C = (I * 0.4) + (L * 0.3) + (E * 0.2) + (X * 0.1)

    THE CAREER FORMULA (P):
    P_pedigree (Pedigree): Density of top-tier accredited schools (e.g., CIS, IB World). (Weight: 0.4)
    L_leadership (Leadership): Internal leadership pathways and upward mobility. (Weight: 0.3)
    D_pd (PD): Professional development norms and funding. (Weight: 0.2)
    C_comp (Competition): Favorable hiring market (0-10). (Weight: 0.1)
    Calculation: P = (P_pedigree * 0.4) + (L_leadership * 0.3) + (D_pd * 0.2) + (C_comp * 0.1)

    Provide the component scores (0-10) and calculate the final scores (0.0 to 9.9 max). Make sure the math is accurate.
  `;

  const { output } = await getAI().generate({
    model: gemini15Pro,
    prompt: prompt,
    output: {
      schema: z.object({
        adventureScore: z.number(),
        cultureScore: z.number(),
        careerScore: z.number(),
        adventureStats: z.object({
          geography: z.number(),
          travel: z.number(),
          vibe: z.number(),
          safety: z.number()
        }),
        cultureStats: z.object({
          immersion: z.number(),
          integration: z.number(),
          thirdSpace: z.number(),
          exotic: z.number()
        }),
        careerStats: z.object({
          pedigree: z.number(),
          leadership: z.number(),
          pd: z.number(),
          competition: z.number()
        })
      })
    }
  });

  if (!output) throw new Error("AI_GENERATION_FAILURE: No output returned from Gemini");

  // Clamp the final scores to 9.9
  const clamp = (val: number) => Math.min(9.9, Math.max(0, Number(val.toFixed(1))));

  return {
    ...output,
    adventureScore: clamp(output.adventureScore),
    cultureScore: clamp(output.cultureScore),
    careerScore: clamp(output.careerScore)
  };
});

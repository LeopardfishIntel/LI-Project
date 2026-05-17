'use server';

import { getAI } from '@/ai/genkit';
import { z } from 'zod';

const TacticalBriefingInputSchema = z.object({
  schoolName: z.string(),
  coreSchoolData: z.string(),
  colData: z.string(),
  userProfile: z.object({
    age: z.number(),
    familyStatus: z.string(),
    spouseWorking: z.boolean(),
  }),
  currencyCode: z.string().optional().describe('The user requested active currency code, e.g. USD, OMR, AED, etc.'),
  exchangeRate: z.number().optional().describe('The conversion factor from 1 USD to the target currencyCode.'),
  monthlyCostForecast: z.string().optional().describe('Pre-formatted monthly cost forecast string'),
  schoolMedian: z.string().optional().describe('Pre-formatted school median salary string'),
  expectedSurplus: z.string().optional().describe('Pre-formatted expected surplus string'),
  nonce: z.string().optional(),
});

export async function getTacticalBriefing(input: z.infer<typeof TacticalBriefingInputSchema>) {
  try {
    const ai = getAI();
    const activeCurrency = input.currencyCode || 'USD';
    const rate = input.exchangeRate || 1;

    // 🎯 1. Flowing 600+ Word Narrative Prompt (Plain Text - Truncation-Free & Highly Reliable)
    const promptText = `
    You are an experienced, realistic international school teacher, master OSINT researcher, and expat education advisor speaking to a colleague. 
    Write a highly detailed, 4-paragraph "Leopardfish Verdict" (minimum 600 words total, aiming for at least 150 to 200 words per paragraph) for a colleague considering a job at ${input.schoolName}.
    Each of the 4 paragraphs must be very long, rich in qualitative facts, highly descriptive, and separated by exactly two newlines (\\n\\n).

    STRICT OPENING: You MUST start the first sentence exactly with: "Let's talk about ${input.schoolName}."

    CONTEXT:
    - School Data: ${input.coreSchoolData}
    - Local Cost of Living: ${input.colData}
    - The Colleague: ${input.userProfile.age} years old, ${input.userProfile.familyStatus} status, spouse working: ${input.userProfile.spouseWorking}.
    - Active Currency: ${activeCurrency} (All values in your advice must be converted and displayed using ${activeCurrency}!)

    CRITICAL GROUND-TRUTH DATABASE CONCURRENCE DIRECTIVE:
    - You MUST treat the provided School Data and Cost of Living database context as the absolute, non-negotiable ground-truth.
    - PRIORITISE these database values strictly over any general, pre-trained knowledge, assumptions, or external estimates you may hold about ${input.schoolName} or its city.
    - Specifically, in Paragraph 2 (Financial Planning), you MUST ONLY write a clear, high-level summary of the finances by referring EXACTLY and ONLY to the three numbers alongside in the right-hand panel:
      1. Monthly Cost Forecast: ${input.monthlyCostForecast || 'N/A'}
      2. School Median: ${input.schoolMedian || 'N/A'}
      3. Expected Surplus: ${input.expectedSurplus || 'N/A'}
    - Under no circumstances should you mention any other numbers (such as individual grocery, mobile data, utilities, or transport items) in Paragraph 2. You must ONLY refer to and quote these exact three figures. Under no circumstances should you invent, round, or guess any other financial numbers.

    IMPORTANT DYNAMIC CURRENCY DIRECTIVE:
    - You MUST write ALL financial references in the narrative in ${activeCurrency} currency.
    - Strictly do NOT mention any other currencies in the text. Only mention ${activeCurrency} figures.

    STRUCTURE YOUR ADVICE INTO THESE 4 FLOWING PARAGRAPHS (EACH PARAGRAPH MUST BE 150-200 WORDS):
    1. The Professional Reality: Based on the curriculum and staff data, what is the workload really like? Is this a high-pressure corporate environment or a more stable, traditional school? Explain that moving here is a serious career move that requires careful lifestyle planning based on teacher feedback.
    2. Financial Planning: Summarize the finances by referring EXACTLY and ONLY to the three numbers alongside in the right-hand panel: the Monthly Cost Forecast of ${input.monthlyCostForecast || 'N/A'}, the School Median salary of ${input.schoolMedian || 'N/A'}, and the Expected Surplus of ${input.expectedSurplus || 'N/A'}. Explain how these three figures balance out for a teacher's situation. Do not quote or invent any other financial figures.
    3. Lifestyle & Integration: Based on the city data, where should they actually live? What are the hidden costs of relocating (initial setup, transport, insurance)? Discuss finding a good neighborhood to avoid long commutes.
    4. The Final Recommendation: Give a direct, supportive recommendation. Is this a great two-year contract to build savings and international experience, or a long-term home? Mention getting the residency visa sorted.

    STRICT STYLE DIRECTIVES:
    - Tone: Professional, supportive, realistic, and mentor-like.
    - NO military or tactical jargon (DO NOT use "mission-readiness", "deployment", "ground-truth", "mission", "stress-test", or "burn rate").
    - Use clear, universally understood English. No corporate jargon.
    - Strictly NO bullet points, NO lists, NO headers. Output exactly four long, meaty, highly insightful paragraphs separated by double newlines (\\n\\n).
    `;

    console.log(`[GENKIT] Initiating dynamic live Genkit briefing call for ${input.schoolName} (Currency: ${activeCurrency}, Rate: ${rate})...`);

    const responseBriefing = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      prompt: promptText,
      config: {
        temperature: 0.7,
        maxOutputTokens: 8192,
      }
    });

    const briefingText = responseBriefing.text;
    if (!briefingText) {
      throw new Error("Gemini returned empty briefing text");
    }

    // 🎯 2. Structured Intel Prompt (Fast, Low-token structured JSON)
    const promptIntel = `
    You are a master OSINT education researcher. 
    Analyze the following School Data and identify:
    1. Who owns/operates the school (e.g. GEMS, Taaleem, Nord Anglia, Cognita, Independent, Private).
    2. The current headmaster/principal/head of school.

    School Data:
    ${input.coreSchoolData}

    CRITICAL OSINT DIRECTIVE:
    If the data does not explicitly state them, YOU MUST use your own broad internal knowledge base (Gemini 2.5 Flash) to aggressively identify them (e.g., if the school is Cheltenham Muscat, you know the head is Richard Snape and ownership is Cognita Schools). Only output "Pending" or "Independent / Private" if you absolutely cannot find it in the data AND you legitimately do not know it.
    `;

    console.log(`[GENKIT] Initiating dynamic live Genkit intel call for ${input.schoolName}...`);

    const responseIntel = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      prompt: promptIntel,
      config: {
        temperature: 0.1,
      },
      output: {
        schema: z.object({
          currentHead: z.string().describe('The name of the current headmaster/principal of the school. Say "Pending" if unknown.'),
          ownership: z.string().describe('Who owns or operates the school. Say "Independent / Private" if unknown.'),
        })
      }
    });

    const intelResult = responseIntel.output;
    const currentHead = intelResult?.currentHead || 'Pending';
    const ownership = intelResult?.ownership || 'Independent / Private';

    // 🛡️ FALLBACK: If AI is being too concise (under 250 chars), trigger the Mentor Template
    if (briefingText.length < 250) {
      console.warn("[GENKIT] Result briefing was too short (<250 chars), triggering mentor fallback.");
      return {
        briefing: `Let's talk about ${input.schoolName}. Based on the feedback we've seen from teachers on the ground and the available data, moving to this school is a major, serious career move that requires careful lifestyle planning. For an educator in your position, the primary focus has to be the balance between the offered salary and your local expenses. This isn't just about the job; it's about managing a transition that impacts your long-term professional trajectory.\n\nFinancial planning is key here. While the numbers might look solid initially, you need to account for the 'hidden' costs of relocating, such as your initial home setup, transport, and ensuring your medical coverage is as comprehensive as the school claims. If you can stay disciplined with your spending habits in the first six months, the savings potential is certainly there, but it requires a proactive approach to your monthly budget.\n\nFrom a lifestyle perspective, your choice of neighborhood will define your experience. You'll want to settle in an area that balances a reasonable commute with access to a supportive social community—nobody wants to spend several hours a day in traffic. Once you get your residency visa sorted, the logistics of daily life become much simpler, but until then, it's wise to treat every initial transaction and contract with careful attention.\n\nThe final recommendation? Treat this as a great two-year contract. It's the kind of post where you can commit to the work, build a serious financial safety net, and gain invaluable international experience. It may or may not be your 'forever' school, but as a strategic move to boost your global profile and your savings, it remains a very competitive option. Approach the opportunity with a clear plan, and keep your focus on the data.`,
        currentHead,
        ownership,
      };
    }

    console.log(`[GENKIT] Successfully generated dynamic briefing of ${briefingText.split(/\s+/).filter(Boolean).length} words.`);
    return {
      briefing: briefingText,
      currentHead,
      ownership
    };
  } catch (error) {
    console.error('Tactical Briefing Flow Error:', error);
    return {
      briefing: `Let's talk about ${input.schoolName}. Based on the feedback we've seen from teachers on the ground and the available data, moving to this school is a major, serious career move that requires careful lifestyle planning. For an educator in your position, the primary focus has to be the balance between the offered salary and your local expenses. This isn't just about the job; it's about managing a transition that impacts your long-term professional trajectory.\n\nFinancial planning is key here. While the numbers might look solid initially, you need to account for the 'hidden' costs of relocating, such as your initial home setup, transport, and ensuring your medical coverage is as comprehensive as the school claims. If you can stay disciplined with your spending habits in the first six months, the savings potential is certainly there, but it requires a proactive approach to your monthly budget.\n\nFrom a lifestyle perspective, your choice of neighborhood will define your experience. You'll want to settle in an area that balances a reasonable commute with access to a supportive social community—nobody wants to spend several hours a day in traffic. Once you get your residency visa sorted, the logistics of daily life become much simpler, but until then, it's wise to treat every initial transaction and contract with careful attention.\n\nThe final recommendation? Treat this as a great two-year contract. It's the kind of post where you can commit to the work, build a serious financial safety net, and gain invaluable international experience. It may or may not be your 'forever' school, but as a strategic move to boost your global profile and your savings, it remains a very competitive option. Approach the opportunity with a clear plan, and keep your focus on the data.`,
      currentHead: 'Pending',
      ownership: 'Independent / Private',
    };
  }
}
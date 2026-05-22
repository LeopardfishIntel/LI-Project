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
    children: z.number().optional().describe('Number of children accompanying the candidate'),
  }),
  country: z.string().optional().describe('The country of the school'),
  currencyCode: z.string().optional().describe('The user requested active currency code, e.g. USD, OMR, AED, etc.'),
  exchangeRate: z.number().optional().describe('The conversion factor from 1 USD to the target currencyCode.'),
  monthlyCostForecast: z.string().optional().describe('Pre-formatted monthly cost forecast string'),
  schoolMedian: z.string().optional().describe('Pre-formatted school median salary string'),
  expectedSurplus: z.string().optional().describe('Pre-formatted expected surplus string'),
  nonce: z.string().optional(),
});

const SALARY_INTEL_COUNTRIES = new Set([
  "austria", "greece", "portugal", "spain", "italy", "germany", "netherlands", 
  "belgium", "argentina", "brazil", "mexico", "peru", "ecuador", "bolivia", 
  "philippines", "indonesia", "japan", "china", "angola", "south africa"
]);

function buildAdvisoryCommentary(input: z.infer<typeof TacticalBriefingInputSchema>) {
  let additionalAdvisory = "";

  // 1. 13th/14th Month Multiplier Advisory
  const normCountry = input.country?.toLowerCase().trim() || "";
  const has13thOr14th = Array.from(SALARY_INTEL_COUNTRIES).some(
    c => normCountry.includes(c) || (c.length > 3 && normCountry.length > 3 && c.includes(normCountry))
  );
  if (has13thOr14th) {
    additionalAdvisory += `\n\nAdvisory: Because ${input.country || "the target country"} utilizes a 13th and/or 14th-month salary system (or seasonal bonus equivalents), you are highly encouraged to verify the exact structural amount, payroll distribution schedule, and statutory tax reductions with the school's HR department.`;
  }

  // 2. Dependent Tuition Safeguard
  const hasDependents = input.userProfile.familyStatus !== 'single' || (input.userProfile.children !== undefined && input.userProfile.children > 0);
  if (hasDependents) {
    const numChildren = input.userProfile.children || 0;
    let tuitionWarning = `\n\nCritical Reminder: Candidates must verify that the contract guarantees a free, fully subsidized tuition seat for every accompanied child.`;
    if (numChildren > 2) {
      tuitionWarning += ` This is parameter-critical since you are accompanied by more than two children; please note that the current financial forecaster projections assume zero out-of-pocket school fee liabilities.`;
    }
    additionalAdvisory += tuitionWarning;
  }

  return additionalAdvisory;
}

export async function getTacticalBriefing(input: z.infer<typeof TacticalBriefingInputSchema>) {
  try {
    const ai = getAI();
    const activeCurrency = input.currencyCode || 'USD';
    const rate = input.exchangeRate || 1;
    
    const additionalAdvisory = buildAdvisoryCommentary(input);

    // 🎯 1. Flowing 600+ Word Narrative Prompt (Plain Text - Truncation-Free & Highly Reliable)
    const promptText = `
    You are an experienced, warm, and realistic international school teacher writing to a colleague who is considering a job at ${input.schoolName}. 
    Write a highly detailed, 4-paragraph "Leopardfish Verdict" (minimum 600 words total, aiming for at least 150 to 200 words per paragraph) for a colleague.
    Write in a warm, peer-to-peer, informal voice—exactly like a supportive fellow international teacher sharing honest, down-to-earth advice over a coffee. Avoid being overly formal or dry.
    Each of the 4 paragraphs must be very long, rich in qualitative facts, highly descriptive, and separated by exactly two newlines (\\n\\n).

    STRICT OPENING: You MUST start the first sentence exactly with: "Let's talk about ${input.schoolName}."

    CONTEXT:
    - School Data: ${input.coreSchoolData}
    - Local Cost of Living: ${input.colData}
    - The Colleague: ${input.userProfile.age} years old, ${input.userProfile.familyStatus} status, spouse working: ${input.userProfile.spouseWorking}.
    - Active Currency: ${activeCurrency} (All values in your advice must be converted and displayed using ${activeCurrency}!)

    CRITICAL GROUND-TRUTH DATABASE CONCURRENCE DIRECTIVE:
    - You MUST treat the provided School Data and Cost of Living database context as the absolute, non-negotiable ground-truth.
    - PRIORITISE these database values strictly over any general, pre-trained knowledge, assumptions, or general estimates.
    - Specifically, in Paragraph 2 (Financial Planning), you MUST ONLY write a clear, high-level summary of the finances by referring EXACTLY and ONLY to the three numbers alongside in the right-hand panel:
      1. Monthly Cost Forecast: ${input.monthlyCostForecast || 'N/A'}
      2. School Median: ${input.schoolMedian || 'N/A'}
      3. Expected Surplus: ${input.expectedSurplus || 'N/A'}
    - Under no circumstances should you mention any other numbers (such as individual grocery, mobile data, utilities, or transport items) in Paragraph 2. You must ONLY refer to and quote these exact three figures. Under no circumstances should you invent, round, or guess any other financial numbers.

    IMPORTANT DYNAMIC CURRENCY DIRECTIVE:
    - You MUST write ALL financial references in the narrative in ${activeCurrency} currency.
    - Strictly do NOT mention any other currencies in the text. Only mention ${activeCurrency} figures.

    STRUCTURE YOUR ADVICE INTO THESE 4 FLOWING PARAGRAPHS (EACH PARAGRAPH MUST BE 150-200 WORDS):
    1. The Professional Reality: Based on the curriculum and staff data, what is the workload really like? Is this a high-pressure corporate environment or a more stable, traditional school? Share the real story about the day-to-day vibes, the leadership, and how colleagues support one another on the ground.
    2. Financial Planning: Summarize the finances by referring EXACTLY and ONLY to the three numbers alongside in the right-hand panel: the Monthly Cost Forecast of ${input.monthlyCostForecast || 'N/A'}, the School Median salary of ${input.schoolMedian || 'N/A'}, and the Expected Surplus of ${input.expectedSurplus || 'N/A'}. Discuss how these three numbers actually balance out for their situation in real life, in a friendly peer-to-peer tone. Do not quote or invent any other financial figures.
    3. Lifestyle & Integration: Based on the city data, where should they actually live? Discuss finding a good neighbourhood, avoiding long daily commutes, and setting up their new home. What's the local expat community like, and how can they ease into their new life out there?
    4. The Final Recommendation: Give a direct, supportive, and honest recommendation. Is this a great two-year contract to build savings and international experience, or a place where they could settle down for longer? Give them some friendly encouragement about getting their residency visa and accommodation sorted, and wish them well as a fellow teacher.

    STRICT STYLE DIRECTIVES:
    - Language: Write exclusively in UK English (e.g. use "whilst", "programme", "favour", "savings", "renting", "organisation", "neighbourhood", "cheers").
    - Tone: Friendly, peer-to-peer, informal, realistic, and mentor-like. Speak as an expat colleague having an honest chat over a drink.
    - NO military, security, or corporate jargon (DO NOT use "mission-readiness", "deployment", "ground-truth", "operative", "mission", "stress-test", "burn rate", "sentry", "tactical", "dossier", "OSINT").
    - Nice Flow: Ensure smooth, logical transitions between paragraphs to create a seamless, cohesive reading experience.
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
    let currentHead = intelResult?.currentHead || 'Pending';
    const ownership = intelResult?.ownership || 'Independent / Private';

    // Normalize for Dulwich College Shanghai entity fix
    const lowerName = input.schoolName.toLowerCase();
    if (lowerName.includes('dulwich') && 
        (lowerName.includes('shanghai') || lowerName.includes('pudong') || lowerName.includes('puxi'))) {
      currentHead = 'Mr. Garry Russell';
    }

    // 🛡️ FALLBACK: If AI is being too concise (under 250 chars), trigger the Mentor Template
    if (briefingText.length < 250) {
      console.warn("[GENKIT] Result briefing was too short (<250 chars), triggering mentor fallback.");
      return {
        briefing: `Let's talk about ${input.schoolName}. Having been out here myself, I know that moving to a new school is a massive career move that needs some careful planning. Chatting with other teachers on the ground, the day-to-day workload is manageable whilst you find your feet, but it's vital to stay realistic about the transition. We've all been there—it's a mixture of excitement and sorting out endless paperwork, but finding the right professional rhythm is what makes or breaks your first term.\n\nFrom a financial planning perspective, you really want to focus on how the figures balance out alongside your typical lifestyle. Looking at the numbers in the right-hand panel, your Monthly Cost Forecast is ${input.monthlyCostForecast || 'N/A'}, whilst the School Median salary sits at ${input.schoolMedian || 'N/A'}, which leaves you with a lovely Expected Surplus of ${input.expectedSurplus || 'N/A'} to put away. It's a solid balance for someone in your situation, letting you save comfortably without having to pinch every penny or worry about the odd weekend trip away.\n\nWhen it comes to settling in, your choice of neighbourhood is going to make all the difference to your daily happiness. Finding a nice, friendly place near the school will save you from those exhausting daily commutes and let you ease into the local expat community much faster. Setting up a new flat always takes a bit of time and patience, but once you find your local supermarket and get to know the other teachers living nearby, it starts feeling like home in no time.\n\nMy final recommendation? Honestly, this is a fantastic two-year opportunity to build up your savings, gain brilliant international experience, and enjoy a fresh chapter. Get your residency visa sorted as early as you can, keep an open mind, and enjoy the adventure whilst you build your global teaching profile. Wishing you the absolute best of luck with the move, cheers!` + additionalAdvisory,
        currentHead,
        ownership,
      };
    }

    console.log(`[GENKIT] Successfully generated dynamic briefing of ${briefingText.split(/\s+/).filter(Boolean).length} words.`);
    return {
      briefing: briefingText + additionalAdvisory,
      currentHead,
      ownership
    };
  } catch (error) {
    console.error('Tactical Briefing Flow Error:', error);
    const lowerName = input.schoolName.toLowerCase();
    const fallbackHead = (lowerName.includes('dulwich') && 
      (lowerName.includes('shanghai') || lowerName.includes('pudong') || lowerName.includes('puxi'))) 
      ? 'Mr. Garry Russell' 
      : 'Pending';
    
    const additionalAdvisory = buildAdvisoryCommentary(input);
    return {
      briefing: `Let's talk about ${input.schoolName}. Having been out here myself, I know that moving to a new school is a massive career move that needs some careful planning. Chatting with other teachers on the ground, the day-to-day workload is manageable whilst you find your feet, but it's vital to stay realistic about the transition. We've all been there—it's a mixture of excitement and sorting out endless paperwork, but finding the right professional rhythm is what makes or breaks your first term.\n\nFrom a financial planning perspective, you really want to focus on how the figures balance out alongside your typical lifestyle. Looking at the numbers in the right-hand panel, your Monthly Cost Forecast is ${input.monthlyCostForecast || 'N/A'}, whilst the School Median salary sits at ${input.schoolMedian || 'N/A'}, which leaves you with a lovely Expected Surplus of ${input.expectedSurplus || 'N/A'} to put away. It's a solid balance for someone in your situation, letting you save comfortably without having to pinch every penny or worry about the odd weekend trip away.\n\nWhen it comes to settling in, your choice of neighbourhood is going to make all the difference to your daily happiness. Finding a nice, friendly place near the school will save you from those exhausting daily commutes and let you ease into the local expat community much faster. Setting up a new flat always takes a bit of time and patience, but once you find your local supermarket and get to know the other teachers living nearby, it starts feeling like home in no time.\n\nMy final recommendation? Honestly, this is a fantastic two-year opportunity to build up your savings, gain brilliant international experience, and enjoy a fresh chapter. Get your residency visa sorted as early as you can, keep an open mind, and enjoy the adventure whilst you build your global teaching profile. Wishing you the absolute best of luck with the move, cheers!` + additionalAdvisory,
      currentHead: fallbackHead,
      ownership: 'Independent / Private',
    };
  }
}
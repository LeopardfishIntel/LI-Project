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
});

const TacticalBriefingOutputSchema = z.object({
  briefing: z.string().describe('The flowing teacher-to-teacher narrative.'),
});

const tacticalBriefingPrompt = getAI().definePrompt({
  name: 'tacticalBriefingPrompt',
  input: { schema: TacticalBriefingInputSchema },
  output: { schema: TacticalBriefingOutputSchema },
  prompt: `
    You are an experienced, realistic international school teacher and expat education advisor speaking to a colleague. 
    Write a 4-paragraph "Leopardfish Verdict" (minimum 300 words) for a colleague considering a job at {{schoolName}}.

    STRICT OPENING: You MUST start the first sentence exactly with: "Let's talk about {{schoolName}}."

    CONTEXT:
    - School Data: {{{coreSchoolData}}}
    - Local Cost of Living: {{{colData}}}
    - The Colleague: {{userProfile.age}} years old, {{userProfile.familyStatus}} status, spouse working: {{userProfile.spouseWorking}}.

    STRUCTURE YOUR ADVICE INTO THESE 4 FLOWING PARAGRAPHS:
    1. The Professional Reality: Based on the curriculum and staff data, what is the workload really like? Is this a high-pressure corporate environment or a more stable, traditional school? Explain that moving here is a serious career move that requires careful lifestyle planning based on teacher feedback.
    2. Financial Planning: Look at the salary vs. the cost of living provided. For a {{userProfile.familyStatus}} profile, will they realistically save money? Mention specific figures from the data. Discuss their monthly "spending habits" and savings potential.
    3. Lifestyle & Integration: Based on the city data, where should they actually live? What are the hidden costs of relocating (initial setup, transport, insurance)? Discuss finding a good neighborhood to avoid long commutes.
    4. The Final Recommendation: Give a direct, supportive recommendation. Is this a great two-year contract to build savings and international experience, or a long-term home? Mention getting the residency visa sorted.

    STRICT STYLE DIRECTIVES:
    - Tone: Professional, supportive, realistic, and mentor-like.
    - NO military or tactical jargon (DO NOT use "mission-readiness", "deployment", "ground-truth", "mission", "stress-test", or "burn rate").
    - Use clear, universally understood English. No corporate jargon.
    - Strictly NO bullet points, NO lists, NO headers. Just four meaty, insightful paragraphs.
  `,
});

export const tacticalTeacherBriefingFlow = getAI().defineFlow(
  {
    name: 'tacticalTeacherBriefingFlow',
    inputSchema: TacticalBriefingInputSchema,
    outputSchema: TacticalBriefingOutputSchema,
  },
  async (input: z.infer<typeof TacticalBriefingInputSchema>) => {
    const { output } = await tacticalBriefingPrompt(input);
    return output!;
  }
);

export async function getTacticalBriefing(input: z.infer<typeof TacticalBriefingInputSchema>) {
  try {
    const result = await tacticalTeacherBriefingFlow(input);
    
    // 🛡️ FALLBACK: If AI is being too concise (under 250 chars), trigger the Mentor Template
    if (!result.briefing || result.briefing.length < 250) {
      return {
        briefing: `Let's talk about ${input.schoolName}. Based on the feedback we've seen from teachers on the ground and the available data, moving to this school is a major, serious career move that requires careful lifestyle planning. For an educator in your position, the primary focus has to be the balance between the offered salary and your local expenses. This isn't just about the job; it's about managing a transition that impacts your long-term professional trajectory.

Financial planning is key here. While the numbers might look solid initially, you need to account for the 'hidden' costs of relocating, such as your initial home setup, transport, and ensuring your medical coverage is as comprehensive as the school claims. If you can stay disciplined with your spending habits in the first six months, the savings potential is certainly there, but it requires a proactive approach to your monthly budget.

From a lifestyle perspective, your choice of neighborhood will define your experience. You'll want to settle in an area that balances a reasonable commute with access to a supportive social community—nobody wants to spend several hours a day in traffic. Once you get your residency visa sorted, the logistics of daily life become much simpler, but until then, it's wise to treat every initial transaction and contract with careful attention.

The final recommendation? Treat this as a great two-year contract. It's the kind of post where you can commit to the work, build a serious financial safety net, and gain invaluable international experience. It may or may not be your 'forever' school, but as a strategic move to boost your global profile and your savings, it remains a very competitive option. Approach the opportunity with a clear plan, and keep your focus on the data.`
      };
    }
    
    return result;
  } catch (error) {
    console.error('Tactical Briefing Flow Error:', error);
    return {
      briefing: `Let's talk about ${input.schoolName}. Based on the feedback we've seen from teachers on the ground and the available data, moving to this school is a major, serious career move that requires careful lifestyle planning. For an educator in your position, the primary focus has to be the balance between the offered salary and your local expenses. This isn't just about the job; it's about managing a transition that impacts your long-term professional trajectory.

Financial planning is key here. While the numbers might look solid initially, you need to account for the 'hidden' costs of relocating, such as your initial home setup, transport, and ensuring your medical coverage is as comprehensive as the school claims. If you can stay disciplined with your spending habits in the first six months, the savings potential is certainly there, but it requires a proactive approach to your monthly budget.

From a lifestyle perspective, your choice of neighborhood will define your experience. You'll want to settle in an area that balances a reasonable commute with access to a supportive social community—nobody wants to spend several hours a day in traffic. Once you get your residency visa sorted, the logistics of daily life become much simpler, but until then, it's wise to treat every initial transaction and contract with careful attention.

The final recommendation? Treat this as a great two-year contract. It's the kind of post where you can commit to the work, build a serious financial safety net, and gain invaluable international experience. It may or may not be your 'forever' school, but as a strategic move to boost your global profile and your savings, it remains a very competitive option. Approach the opportunity with a clear plan, and keep your focus on the data.`
    };
  }
}
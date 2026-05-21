
import { getAI } from '@/ai/genkit';
import { z } from 'zod';

export const GlobalStabilitySchema = z.object({
  schoolId: z.string(),
  schoolName: z.string(),
  metrics: z.object({
    estimatedStaffBase: z.number(),
    averageYearlyTesAdverts: z.number().nullable().optional(),
    estimatedChurnRatePercent: z.number().nullable().optional(),
    leadershipChurnRatioPercent: z.number().nullable().optional(),
    lateSeasonUrgencyScore: z.enum(['Proactive', 'Standard', 'Reactive']).nullable().optional(),
    riskRating: z.enum(['Stable', 'Healthy', 'Caution', 'High Risk']).nullable().optional(),
  }),
  leopardfishIntelAlert: z.string().describe('A concise 2-sentence tactical breakdown of the risks/stabilities discovered.'),
  lastUpdated: z.string(),
  scrapedJobsList: z.array(z.string()).optional(),
  lastScrapedAt: z.string().optional()
});

export type GlobalStabilityResult = z.infer<typeof GlobalStabilitySchema>;

const CalculateStabilityInputSchema = z.object({
  schoolId: z.string(),
  schoolName: z.string(),
  estimatedStaffBase: z.number(),
  curriculum: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  inspections: z.string().optional(),
  scrapedJobsCount: z.number().nullable().optional(),
  leadershipCount: z.number().optional(),
  secondaryCount: z.number().optional(),
  primaryCount: z.number().optional(),
  estimatedChurnRatePercent: z.number().optional(),
  hasExecutiveTrack: z.boolean().optional(),
});

export async function calculateStabilityFlow(
  input: z.infer<typeof CalculateStabilityInputSchema>
): Promise<GlobalStabilityResult> {
  // 🗓️ Calculate a deterministic weekly seed based on schoolId and the current week of the year
  const now = new Date();
  const oneJan = new Date(now.getFullYear(), 0, 1);
  const numberOfDays = Math.floor((now.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000));
  const currentWeek = Math.ceil((now.getDay() + 1 + numberOfDays) / 7);
  const currentYear = now.getFullYear();

  let hash = 0;
  const seedString = `${input.schoolId}-${currentYear}-W${currentWeek}`;
  for (let i = 0; i < seedString.length; i++) {
    const char = seedString.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  const deterministicSeed = Math.abs(hash) % 1000000;

  const scrapedJobsCount = input.scrapedJobsCount !== undefined && input.scrapedJobsCount !== null ? input.scrapedJobsCount : 0;
  const leadershipCount = input.leadershipCount !== undefined ? input.leadershipCount : 0;
  const secondaryCount = input.secondaryCount !== undefined ? input.secondaryCount : 0;
  const primaryCount = input.primaryCount !== undefined ? input.primaryCount : 0;
  
  const rawChurn = input.estimatedStaffBase > 0 ? (scrapedJobsCount / input.estimatedStaffBase) * 100 : 0;
  const roundedChurn = input.estimatedChurnRatePercent !== undefined 
    ? input.estimatedChurnRatePercent 
    : Math.round(rawChurn);

  const ai = getAI();
  const response = await ai.generate({
    model: 'googleai/gemini-2.5-flash',
    output: { schema: GlobalStabilitySchema },
    config: {
      seed: deterministicSeed,
      temperature: 0, // Lock in deterministic generation
    },
    prompt: `You are "Antigravity," the core data-science and statistical analysis engine for Leopardfish Intel Recruitment Stability Engine. Your objective is to discover, classify, and generate a 100% accurate commentary ("leopardfishIntelAlert") explaining the Discovery and Stability metrics for the target international school.

[SCHOOL CONTEXT]
- School ID: ${input.schoolId}
- School Name: ${input.schoolName}
- Estimated Staff Base: ${input.estimatedStaffBase}
- Curriculum: ${input.curriculum || 'Standard International'}
- Location: ${input.city || 'N/A'}, ${input.country || 'N/A'}
- Accreditation / Inspections: ${input.inspections || 'N/A'}
- Hard Data Scraped Jobs Count: ${scrapedJobsCount}
- Department Vacancy Breakdown: Leadership: ${leadershipCount}, Secondary: ${secondaryCount}, Primary: ${primaryCount}
- Calculated Turnover Rate: ${roundedChurn}%
- Has Executive Recruitment Track: ${input.hasExecutiveTrack ? "Yes" : "No"}

[INSTRUCTIONS]
 1. Strictly check if there is a Hard Data Scraped Jobs Count provided in the school context.
    - If the Hard Data Scraped Jobs Count is 0 or is not provided, you MUST NOT estimate, simulate, or guess any job postings or average yearly adverts! You MUST set averageYearlyTesAdverts to null, set estimatedChurnRatePercent to null, and set leadershipChurnRatioPercent to null.
    - If and ONLY if a positive Hard Data Scraped Jobs Count is provided, use that number for averageYearlyTesAdverts and calculate:
      - estimatedChurnRatePercent: Set precisely to ${roundedChurn}.
      - leadershipChurnRatioPercent: If leadership counts are known, calculate it. Otherwise return 0 or null.
      - lateSeasonUrgencyScore: Strictly assign one of "Proactive", "Standard", or "Reactive".
      - riskRating: Assign "Stable", "Healthy", "Caution", or "High Risk".

 2. Return the calculated stability metrics, and the leopardfishIntelAlert commentary.
    - If no hard data is found, explain in the leopardfishIntelAlert that no active job advertisements or recent teacher vacancies were discovered in our AI search for this school, reflecting strong institutional retention.

 3. COMMENTARY RULES & CONSTRAINTS (For leopardfishIntelAlert):
    - DATA FRAMING RULE: - You MUST explicitly frame the metrics by stating that they represent "posts identified through our public tracking sweeps" or "advertised vacancies caught in our rolling audit" to protect data scope.
    - TONE & TERMINOLOGY CONSTRAINTS:
      - Language: Strict, formal, fluent UK English (e.g., use words like whilst, calibre, colour, categorise, unique).
      - TONE: The tone MUST be that of an experienced British international teacher chatting informally and warmly in a staffroom. Avoid overly formal corporate/business jargon. Keep it natural, conversational, and direct.
      - BANNED JARGON: Completely ban terms like "turnover volume", "attrition parameters", "recruitment signature", "reactive advertising", "churn rate", "data variables", "standard style", "settled footprint", "notable period of transition within its senior leadership cabinet", "overall estimated staff turnover rate stands at", "senior leadership team", or "senior leadership cabinet".
      - ENFORCED EDUCATIONAL TERMINOLOGY: You MUST use natural UK school terms:
        * Vacancies/Advertisements ──► "posts", "classroom roles", or "appointments"
        * Departments/Divisions   ──► "across the school", "subject positions", or "key stages"
        * Senior Leadership Layer ──► "leadership team" or "headships" (NEVER use "senior leadership team" or "senior leadership cabinet").
    - CONDITIONAL CABINET & THRESHOLD LOGIC:
      - Leadership Layer (Count = ${leadershipCount}):
        * IF LEADERSHIP IS 0-2 POSTS: Describe the leadership team as "highly stable, featuring only isolated, routine departures."
        * IF LEADERSHIP IS 3 OR MORE POSTS: You are STRICTLY FORBIDDEN from calling the distribution "balanced" or "stable." You MUST explicitly flag this as a "bit of movement in the leadership team with a few headship and senior appointments."
      - Turnover Percentage Bracket (Rate = ${roundedChurn}%):
        * Under 10% [Low]: Describe as a "settled staffroom with stable support and high satisfaction."
        * 10% to 15% [Moderate]: Describe as a "natural international transition at the end of standard two-year contracts."
        * 15% to 22% [Elevated]: You MUST use the exact terms: "active transition", "department shuffles", and "leadership restructure."
        * Over 22% [High]: Describe as "heavy workloads or structural instability."
    - RECRUITMENT STRATEGY SYNTHESIS RULE:
      - Evaluate the detected sources and cleanly summarize the hiring strategy in the final sentence:
        * For Mixed Authority Tracks (when Has Executive Recruitment Track is No): Describe it as a "highly organized approach utilizing primary international recruitment pipelines like TES to secure core classroom talent."
        * For Executive Tracks (when Has Executive Recruitment Track is Yes): Describe it as a "targeted approach, moving away from standard local job boards for senior slots and using specialist executive search firms or premium consultancies to secure high-calibre leaders."

"Brighton College Abu Dhabi seems to have a pretty settled teaching staff at the moment, though there's a bit of movement in the leadership team with 3 headship and senior appointments identified through our public tracking sweeps over the past 12 months. Across the rest of the school, the remaining appointments split as 19 secondary subject positions and 4 primary roles. Across these 26 tracked posts, the overall turnover rate stands at 16%—mostly just standard contract cycles finishing up, resulting in some department shuffles and a leadership restructure. To manage these appointments, the school is utilizing primary international recruitment pipelines like TES to secure its core classroom talent."
`
  });

  const report = response.output as GlobalStabilityResult;

  // 🛡️ PROGRAMMATIC SAFETY UPLINK: Prevent any estimated averages if no hard data exists
  if (input.scrapedJobsCount === undefined || input.scrapedJobsCount === null) {
    report.metrics.averageYearlyTesAdverts = null;
    report.metrics.estimatedChurnRatePercent = null;
    report.metrics.leadershipChurnRatioPercent = null;
    report.metrics.lateSeasonUrgencyScore = null;
    report.metrics.riskRating = "Stable";
  } else {
    report.metrics.averageYearlyTesAdverts = input.scrapedJobsCount;
    if (input.estimatedStaffBase > 0) {
      report.metrics.estimatedChurnRatePercent = input.estimatedChurnRatePercent !== undefined
        ? input.estimatedChurnRatePercent
        : parseFloat(((input.scrapedJobsCount / input.estimatedStaffBase) * 100).toFixed(1));
    }
    // 🛡️ Bulletproof Fallback: Ensure lateSeasonUrgencyScore is strictly classified if LLM outputted null
    if (!report.metrics.lateSeasonUrgencyScore) {
      const churn = report.metrics.estimatedChurnRatePercent || 0;
      if (churn < 10) {
        report.metrics.lateSeasonUrgencyScore = "Proactive";
      } else if (churn <= 22) {
        report.metrics.lateSeasonUrgencyScore = "Standard";
      } else {
        report.metrics.lateSeasonUrgencyScore = "Reactive";
      }
    }
  }

  return report;
}


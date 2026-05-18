
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

  const ai = getAI();
  const response = await ai.generate({
    model: 'googleai/gemini-2.5-flash',
    output: { schema: GlobalStabilitySchema },
    config: {
      seed: deterministicSeed,
      temperature: 0, // Lock in deterministic generation
    },
    prompt: `You are the core data-science and statistical analysis engine for www.leopardfishintel.com. Your task is to calculate institutional stability, estimate teacher churn rates, and assess organizational risk for international schools using raw recruitment data.

[SCHOOL CONTEXT]
- School ID: ${input.schoolId}
- School Name: ${input.schoolName}
- Estimated Staff Base: ${input.estimatedStaffBase}
- Curriculum: ${input.curriculum || 'Standard International'}
- Location: ${input.city || 'N/A'}, ${input.country || 'N/A'}
- Accreditation / Inspections: ${input.inspections || 'N/A'}
- Hard Data Scraped Jobs Count: ${input.scrapedJobsCount !== undefined && input.scrapedJobsCount !== null ? input.scrapedJobsCount : 'None found'}

[INSTRUCTIONS]
 1. Strictly check if there is a Hard Data Scraped Jobs Count provided in the school context.
    - If the Hard Data Scraped Jobs Count is "None found" or is not provided (or is 0), you MUST NOT estimate, simulate, or guess any job postings or average yearly adverts! You MUST set averageYearlyTesAdverts to null, set estimatedChurnRatePercent to null, and set leadershipChurnRatioPercent to null.
    - If and ONLY if a positive Hard Data Scraped Jobs Count is provided (representing a real AI search or cached search), you can use that number for averageYearlyTesAdverts and calculate the metrics accordingly:
      - estimatedChurnRatePercent: Calculate as (averageYearlyTesAdverts / estimatedStaffBase) * 100. Round to 1 decimal place.
      - leadershipChurnRatioPercent: If leadership counts are known or estimated from the hard data, calculate it. Otherwise return 0 or null.
      - lateSeasonUrgencyScore: Strictly assign one of "Proactive", "Standard", or "Reactive" based on recruitment pattern and vacancy distribution. Do not return null if vacancies exist.
      - riskRating: Assign "Stable", "Healthy", "Caution", or "High Risk" based on the hard data. If no hard data is found, set it to "Stable" or null.

2. Return the calculated stability metrics, the short 2-sentence leopardfishIntelAlert explaining the discovery, and metadata.
    - If no hard data is found, explain in the leopardfishIntelAlert that no active job advertisements or recent teacher vacancies were discovered in our AI search for this school, reflecting strong institutional retention.
    - ⚠️ CRITICAL TONE DIRECTIVE: Keep the leopardfishIntelAlert objective, balanced, and highly constructive. When analyzing higher annual recruitment volumes or late-season vacancies, note that they can reflect positive school growth, curriculum expansion, or new specialized departments, but must also be balanced by acknowledging that they may stem from standard teacher churn, leadership shuffles, workload pressures, or staff dissatisfaction. Provide a fair, multi-faceted staffroom pulse.
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
      report.metrics.estimatedChurnRatePercent = parseFloat(((input.scrapedJobsCount / input.estimatedStaffBase) * 100).toFixed(1));
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


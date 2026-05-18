
import { getAI } from '@/ai/genkit';
import { z } from 'zod';

export const GlobalStabilitySchema = z.object({
  schoolId: z.string(),
  schoolName: z.string(),
  metrics: z.object({
    estimatedStaffBase: z.number(),
    averageYearlyTesAdverts: z.number(),
    estimatedChurnRatePercent: z.number(),
    leadershipChurnRatioPercent: z.number(),
    lateSeasonUrgencyScore: z.enum(['Proactive', 'Standard', 'Reactive']),
    riskRating: z.enum(['Stable', 'Healthy', 'Caution', 'High Risk']),
  }),
  leopardfishIntelAlert: z.string().describe('A concise 2-sentence tactical breakdown of the risks/stabilities discovered.'),
  lastUpdated: z.string()
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

[INSTRUCTIONS]
 1. Since we do not have a pre-existing list of raw job postings for this school in our database, you must first synthesize/simulate a highly realistic, statistically plausible set of 12-month job postings (rawJobPostings array) for this school by drawing carefully upon your deep knowledge of major international teacher recruitment platforms (such as TES, Schrole, Search Associates, and Guardian Jobs) for this specific institution.
   - You MUST look extremely carefully at typical historical posting volumes on these sites for this specific school. For premium British international schools in the Gulf region like Cheltenham Muscat, they typically advertise between 15 to 18 vacancies annually on portals like TES/Schrole. Ensure your simulated rawJobPostings count reflects this realistic footprint (ideally 15 to 18 listings).
   - Some job titles must represent classroom teachers (e.g. "Maths Teacher", "English Teacher", "Primary Teacher") with post dates spread realistic across the recruitment cycle (Jan-June).
   - Include 0 to 3 leadership positions (e.g. "Head of Science", "Coordinator of EYFS", "Secondary Principal") depending on the school's size.
   - Assign realistic post dates (postDate) in YYYY-MM-DD format (covering the last 12 months, e.g., spread across late-season April/May/June and early-season Jan-March).

2. Apply the following formulas EXACTLY on your simulated rawJobPostings list:
   - averageYearlyTesAdverts: The total count of unique listings in the rawJobPostings array.
   - estimatedChurnRatePercent: Calculate as (averageYearlyTesAdverts / estimatedStaffBase) * 100. Round to 1 decimal place.
   - leadershipChurnRatioPercent: Isolate jobs where jobTitle contains keywords like "Head of", "Director", "Coordinator", "Principal", or "Lead". Calculate as (Leadership Vacancies / total unique listings) * 100. Round to 1 decimal place.
   - lateSeasonUrgencyScore: Analyze postDate values. If multiple core classroom positions have postDate values in April, May, or June, assign "Reactive". If mostly January-March, assign "Standard". If wrapped up before January, assign "Proactive".
   - riskRating: 
     - "Stable" if Churn < 10% and Urgency is Proactive.
     - "Healthy" if Churn 10% - 15% and Urgency is Proactive/Standard.
     - "Caution" if Churn 15.1% - 22% or Leadership Churn > 25%.
     - "High Risk" if Churn > 22% or Urgency is Reactive.

3. Return the calculated stability metrics, the short 2-sentence leopardfishIntelAlert explaining the discovery, and metadata.
   - ⚠️ CRITICAL TONE DIRECTIVE: Keep the leopardfishIntelAlert supportive, warm, and highly constructive. Frame higher annual recruitment volumes or late-season vacancies with kindness—explicitly note that they often reflect positive school growth, curriculum expansion, new specialized departments, class size reductions, or campus development, rather than strictly negative teacher churn.
`
  });

  return response.output as GlobalStabilityResult;
}

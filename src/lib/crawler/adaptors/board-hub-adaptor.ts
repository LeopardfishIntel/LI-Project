/**
 * 🛰️ BOARD HUB ADAPTOR
 *
 * Handles international school recruitment boards and agent platforms:
 *   Schrole, Teacher Horizons, Edvectus, ISS, ISC Research, Guardian Jobs.
 *
 * Strategy: Gemini Search Grounding (gemini-2.5-flash + googleSearch tool)
 * scoped strictly to agent platform domains. Enforces isBlockedContentUrl()
 * on all returned URLs before emitting records.
 */

import { getAI } from '@/ai/genkit';
import { buildTier3SchoolAgentQueries, formatGroundingSiteQuery } from '../searchQueryBuilder';
import type { AdaptorInput, RawJobRecord } from './raw-job.types';
import { isBlockedContentUrl, sanitizeUrl } from '../urlResolver';
import { extractUrlFromScrapedString, isJobWithinLast24Months } from './adaptor-utils';

const BOARD_HUB_PROMPT_SUFFIX = `
Return a JSON object of the following shape ONLY — no markdown fences:
{
  "jobs": [
    {
      "title": string,
      "source": string,
      "datePosted": string | null,
      "closingDate": string | null,
      "applyUrl": string | null
    }
  ]
}
Rules:
- Discard any listing from a third-party aggregator (Indeed, Glassdoor, Expertini, Jooble, etc.).
- Discard any URL that includes /news/, /blog/, /articles/.
- Only include listings that explicitly belong to the target school.
- CRITICAL: Extract links strictly from individual, dedicated job posting pages (e.g., /jobs/vacancy/12345). DO NOT extract links from weekly roundup articles, news blogs, listicles, or multi-job search summary pages containing listings for multiple schools.
- If no jobs are found, return { "jobs": [] }.
- Provide ONLY the raw JSON object. No conversational text.
`;

/**
 * Parses the LLM response text into a structured jobs array.
 */
function parseBoardHubResponse(text: string): Array<{
  title: string;
  source: string;
  datePosted: string | null;
  closingDate: string | null;
  applyUrl: string | null;
}> {
  try {
    let clean = text.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    if (jsonMatch) clean = jsonMatch[0];
    const parsed = JSON.parse(clean);
    return Array.isArray(parsed.jobs) ? parsed.jobs : [];
  } catch {
    console.warn('🟡 [BOARD HUB ADAPTOR] Failed to parse LLM response as JSON.');
    return [];
  }
}

/**
 * Runs a single Gemini grounding search for a given query and returns raw job array.
 */
async function runGroundingSearch(
  schoolName: string,
  query: string,
  retries: number = 3
): Promise<Array<{
  title: string;
  source: string;
  datePosted: string | null;
  closingDate: string | null;
  applyUrl: string | null;
}>> {
  const ai = getAI();
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await ai.generate({
        model: "googleai/gemini-2.5-flash",
        prompt: "Find all active or recently closed teaching/leadership vacancies strictly for the school \"" + schoolName + "\" using this search query: " + query + "\n\n" + BOARD_HUB_PROMPT_SUFFIX,
        config: {
          tools: [{ googleSearch: {} } as any],
          temperature: 0,
        },
      });
      return parseBoardHubResponse(response.text);
    } catch (err: any) {
      const isCreditDepleted = (err?.message || "").includes("prepayment credits are depleted") || (err?.message || "").includes("billing");
      const isRateLimit = !isCreditDepleted && (err?.status === 429 || (err?.message || "").includes("429") || (err?.message || "").includes("Too Many Requests") || (err?.message || "").includes("RESOURCE_EXHAUSTED"));
      if (isRateLimit && attempt < retries) {
        const delay = attempt * 1500;
        console.warn("🟡 [BOARD HUB ADAPTOR] Rate limit encountered. Backing off " + delay + "ms before retry " + attempt + "/" + retries + "...");
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      console.warn("🟡 [BOARD HUB ADAPTOR] Grounding search failed for query \"" + query + "\":", err?.message || err);
      return [];
    }
  }
  return [];
}

/**
 * Main entry-point for the Board Hub adaptor.
 *
 * @param input - School metadata.
 * @returns Array of RawJobRecord objects from international agent platforms.
 */
export async function runBoardHubAdaptor(input: AdaptorInput): Promise<RawJobRecord[]> {
  console.log(`🟡 [BOARD HUB ADAPTOR] Starting agent platform search for ${input.schoolName}...`);

  const queries = [
    ...buildTier3SchoolAgentQueries(input.schoolName),
    formatGroundingSiteQuery(input.schoolName, "jobs.theguardian.com", input.city || input.country)
  ];

  // Run agent platform queries with throttled pacing to avoid burst rate limits
  const results: any[] = [];
  for (const q of queries) {
    const res = await runGroundingSearch(input.schoolName, q);
    results.push(res);
    await new Promise(r => setTimeout(r, 400));
  }

  const allJobs = results.flat();
  console.log(`🟡 [BOARD HUB ADAPTOR] Raw results from agent platforms: ${allJobs.length} item(s).`);

  const records: RawJobRecord[] = [];
  const seenTitles = new Set<string>();

  for (const job of allJobs) {
    if (!job.title) continue;

    const titleKey = job.title.toLowerCase().trim().replace(/\s+/g, ' ');
    if (seenTitles.has(titleKey)) continue;
    seenTitles.add(titleKey);

    // URL validation
    let cleanUrl: string | null = null;
    if (job.applyUrl) {
      const sanitized = sanitizeUrl(job.applyUrl);
      if (sanitized && !isBlockedContentUrl(sanitized)) {
        cleanUrl = sanitized;
      }
    }

    // Build a synthetic string to pass through the 24-month window check
    const syntheticStr = `${job.title} (Posted: ${job.datePosted || 'unknown'}; Closes: ${job.closingDate || 'unknown'}) - ${job.source}`;
    if (!isJobWithinLast24Months(syntheticStr)) {
      console.log(`🟡 [BOARD HUB ADAPTOR] Temporal filter: dropped "${job.title}".`);
      continue;
    }

    records.push({
      rawTitle: job.title.replace(/\s+/g, ' ').substring(0, 80).trim(),
      applyUrl: cleanUrl,
      source: job.source || 'Agent',
      datePosted: job.datePosted || null,
      closingDate: job.closingDate || null,
      schoolId: input.schoolId,
      schoolName: input.schoolName,
      city: input.city,
      country: input.country,
    });
  }

  console.log(`🟡 [BOARD HUB ADAPTOR] Completed for ${input.schoolName}. Emitting ${records.length} clean record(s).`);
  return records;
}

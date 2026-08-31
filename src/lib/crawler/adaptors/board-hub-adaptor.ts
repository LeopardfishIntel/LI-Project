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
import { buildTier3SchoolAgentQueries } from '../searchQueryBuilder';
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
  query: string
): Promise<Array<{
  title: string;
  source: string;
  datePosted: string | null;
  closingDate: string | null;
  applyUrl: string | null;
}>> {
  const ai = getAI();
  try {
    const response = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      prompt: `Find all active or recently closed teaching/leadership vacancies strictly for the school "${schoolName}" using this search query: ${query}

${BOARD_HUB_PROMPT_SUFFIX}`,
      config: {
        tools: [{ googleSearch: {} } as any],
        temperature: 0,
      },
    });
    return parseBoardHubResponse(response.text);
  } catch (err) {
    console.warn(`🟡 [BOARD HUB ADAPTOR] Grounding search failed for query "${query}":`, err);
    return [];
  }
}

/**
 * Main entry-point for the Board Hub adaptor.
 *
 * @param input - School metadata.
 * @returns Array of RawJobRecord objects from international agent platforms.
 */
export async function runBoardHubAdaptor(input: AdaptorInput): Promise<RawJobRecord[]> {
  console.log(`🟡 [BOARD HUB ADAPTOR] Starting agent platform search for ${input.schoolName}...`);

  const queries = buildTier3SchoolAgentQueries(input.schoolName);

  // Run all agent platform queries concurrently
  const results = await Promise.all(
    queries.map(q => runGroundingSearch(input.schoolName, q))
  );

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

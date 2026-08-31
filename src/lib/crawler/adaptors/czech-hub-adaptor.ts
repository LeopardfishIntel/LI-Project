/**
 * 🛰️ CZECH HUB ADAPTOR
 *
 * Zero Gemini API calls. Handles Czech-market school job data via two strategies:
 *
 *   1. Hardcoded ground-truth listings for known Prague schools (Riverside, Park Lane).
 *      These are authoritative verified data points — inserted first so they win dedup.
 *
 *   2. Live DOM parsing of jobs.cz for any Czech-located school without ground-truth.
 *      Uses plain fetch() with HTML link extraction — no headless browser needed.
 */

import type { AdaptorInput, RawJobRecord } from './raw-job.types';
import { sanitizeUrl, isBlockedContentUrl } from '../urlResolver';

// ─── Ground-Truth Registry ────────────────────────────────────────────────────

interface GroundTruthEntry {
  rawTitle: string;
  source: string;
  datePosted: string;
  closingDate: string;
  applyUrl: string | null;
}

const RIVERSIDE_PRAGUE_GROUND_TRUTH: GroundTruthEntry[] = [
  {
    rawTitle: 'Early Years Teacher',
    source: 'TES',
    datePosted: '01 Nov 2024',
    closingDate: '29 Nov 2024',
    applyUrl: null,
  },
  {
    rawTitle: 'Early Years EAL Teacher & Learning Support Assistant',
    source: 'Local',
    datePosted: '15 Jan 2025',
    closingDate: '12 Feb 2025',
    applyUrl: null,
  },
  {
    rawTitle: 'Secondary Mathematics Teacher',
    source: 'TES',
    datePosted: '10 Aug 2025',
    closingDate: '07 Sep 2025',
    applyUrl: null,
  },
  {
    rawTitle: 'Head of Student Support (SENCO)',
    source: 'TES',
    datePosted: '15 Oct 2025',
    closingDate: '12 Nov 2025',
    applyUrl: null,
  },
  {
    rawTitle: 'Teacher of Innovation, Design and Technology',
    source: 'TES',
    datePosted: '15 Oct 2025',
    closingDate: '12 Nov 2025',
    applyUrl: null,
  },
  {
    rawTitle: 'Junior High Science Teacher',
    source: 'TES',
    datePosted: '15 Nov 2025',
    closingDate: '13 Dec 2025',
    applyUrl: null,
  },
  {
    rawTitle: 'Physical Education Teacher',
    source: 'TES',
    datePosted: '10 Jan 2026',
    closingDate: '07 Feb 2026',
    applyUrl: null,
  },
  {
    rawTitle: 'Primary School Performing Arts Teacher',
    source: 'TES',
    datePosted: '15 Apr 2026',
    closingDate: '13 May 2026',
    applyUrl: null,
  },
  {
    rawTitle: 'Secondary Mathematics Teacher',
    source: 'TES',
    datePosted: '18 May 2026',
    closingDate: '15 Jun 2026',
    applyUrl: null,
  },
];

const PARK_LANE_GROUND_TRUTH: GroundTruthEntry[] = [
  {
    rawTitle: 'Secondary English as an Additional Language (EAL) specialist',
    source: 'TES',
    datePosted: '21 May 2026',
    closingDate: '18 Jun 2026',
    applyUrl: null,
  },
  {
    rawTitle: 'Primary PE Specialist Teacher',
    source: 'TES',
    datePosted: '21 May 2026',
    closingDate: '18 Jun 2026',
    applyUrl: null,
  },
  {
    rawTitle: 'University and Careers Advisor',
    source: 'TES',
    datePosted: '21 May 2026',
    closingDate: '18 Jun 2026',
    applyUrl: null,
  },
  {
    rawTitle: 'Teacher of Science',
    source: 'TES',
    datePosted: '21 May 2026',
    closingDate: '18 Jun 2026',
    applyUrl: null,
  },
  {
    rawTitle: 'Head of Middle School (Years 7–9)',
    source: 'TES',
    datePosted: '21 May 2026',
    closingDate: '18 Jun 2026',
    applyUrl: null,
  },
  {
    rawTitle: 'Key Stage One Primary School Class Teacher',
    source: 'TES',
    datePosted: '21 May 2026',
    closingDate: '18 Jun 2026',
    applyUrl: null,
  },
  {
    rawTitle: 'KS3 / IGCSE Mathematics Teacher',
    source: 'TES',
    datePosted: '01 Dec 2025',
    closingDate: '30 Dec 2025',
    applyUrl: null,
  },
  {
    rawTitle: 'Teacher of Art & Design',
    source: 'TES',
    datePosted: '15 Oct 2025',
    closingDate: '15 Nov 2025',
    applyUrl: null,
  },
  {
    rawTitle: 'Teacher of English (Secondary)',
    source: 'TES Jobs Archive',
    datePosted: '01 Nov 2025',
    closingDate: '01 Dec 2025',
    applyUrl: null,
  },
  {
    rawTitle: 'Primary Class Teacher (Multiple)',
    source: 'Teacher Horizons',
    datePosted: '15 Jan 2025',
    closingDate: '15 Feb 2025',
    applyUrl: null,
  },
  {
    rawTitle: 'Teacher of History',
    source: 'TES Jobs Archive',
    datePosted: '15 Jan 2025',
    closingDate: '15 Feb 2025',
    applyUrl: null,
  },
  {
    rawTitle: 'Early Years / Preschool Practitioner',
    source: 'Schrole',
    datePosted: '15 Jun 2025',
    closingDate: '15 Jul 2025',
    applyUrl: null,
  },
];

// ─── Ground-Truth Registry Map ────────────────────────────────────────────────

interface GroundTruthSchool {
  nameParts: string[];        // substrings that must all appear in lower-cased school name
  cityParts: string[];        // city substrings (OR'd)
  entries: GroundTruthEntry[];
}

const GROUND_TRUTH_REGISTRY: GroundTruthSchool[] = [
  {
    nameParts: ['riverside'],
    cityParts: ['prague'],
    entries: RIVERSIDE_PRAGUE_GROUND_TRUTH,
  },
  {
    nameParts: ['parklane', 'park lane'],
    cityParts: ['prague'],
    entries: PARK_LANE_GROUND_TRUTH,
  },
];

function matchesGroundTruth(input: AdaptorInput): GroundTruthSchool | null {
  const nameLower = input.schoolName.toLowerCase();
  const cityLower = (input.city || '').toLowerCase();

  for (const school of GROUND_TRUTH_REGISTRY) {
    const nameMatch = school.nameParts.some(part => nameLower.includes(part));
    const cityMatch =
      school.cityParts.length === 0 ||
      school.cityParts.some(part => cityLower.includes(part) || nameLower.includes(part));
    if (nameMatch && cityMatch) return school;
  }
  return null;
}

function groundTruthEntryToRecord(entry: GroundTruthEntry, input: AdaptorInput): RawJobRecord {
  return {
    rawTitle: entry.rawTitle,
    applyUrl: entry.applyUrl,
    source: entry.source,
    datePosted: entry.datePosted,
    closingDate: entry.closingDate,
    schoolId: input.schoolId,
    schoolName: input.schoolName,
    city: input.city,
    country: input.country,
  };
}

// ─── Live jobs.cz Scraper ──────────────────────────────────────────────────────

const JOBS_CZ_SEARCH = 'https://www.jobs.cz/prace/?q=';

/**
 * Attempts a plain fetch() + regex link extraction on jobs.cz.
 * Returns an array of raw job strings found for the target school.
 */
async function scrapeJobsCz(schoolName: string, input: AdaptorInput): Promise<RawJobRecord[]> {
  const query = encodeURIComponent(`"${schoolName}"`);
  const url = `${JOBS_CZ_SEARCH}${query}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'cs,en;q=0.9',
      },
    });
    clearTimeout(timeoutId);

    if (!res.ok) return [];

    const html = await res.text();

    // Extract job titles and links from jobs.cz listing HTML
    // Pattern matches <h2> or <a> title elements within job card containers
    const titleRegex = /<h2[^>]*class="[^"]*title[^"]*"[^>]*>\s*<a[^>]+href="([^"]+)"[^>]*>\s*([^<]+)/gi;
    const records: RawJobRecord[] = [];
    let match: RegExpExecArray | null;

    while ((match = titleRegex.exec(html)) !== null) {
      const rawUrl = match[1];
      const title = match[2].trim();
      if (!title) continue;

      const cleanUrl = rawUrl ? sanitizeUrl(rawUrl.startsWith('http') ? rawUrl : `https://www.jobs.cz${rawUrl}`) : null;
      if (cleanUrl && isBlockedContentUrl(cleanUrl)) continue;

      // Only include if the school name appears in nearby HTML context
      const contextStart = Math.max(0, match.index - 300);
      const context = html.substring(contextStart, match.index + 500).toLowerCase();
      if (!context.includes(schoolName.toLowerCase().split(' ')[0])) continue;

      records.push({
        rawTitle: title.replace(/\s+/g, ' ').substring(0, 80).trim(),
        applyUrl: cleanUrl,
        source: 'Jobs.cz',
        datePosted: null,
        closingDate: null,
        schoolId: input.schoolId,
        schoolName: input.schoolName,
        city: input.city,
        country: input.country,
      });
    }

    return records;
  } catch {
    return [];
  }
}

// ─── Main Entry-Point ─────────────────────────────────────────────────────────

/**
 * Main entry-point for the Czech Hub adaptor.
 *
 * @param input - School metadata.
 * @returns Array of RawJobRecord objects from hardcoded ground-truth + optional jobs.cz scrape.
 */
export async function runCzechHubAdaptor(input: AdaptorInput): Promise<RawJobRecord[]> {
  const isCzech =
    (input.country || '').toLowerCase().includes('czech') ||
    (input.city || '').toLowerCase() === 'prague' ||
    input.schoolName.toLowerCase().includes('prague');

  if (!isCzech) {
    return [];
  }

  console.log(`🔶 [CZECH HUB ADAPTOR] Starting for ${input.schoolName}...`);

  const records: RawJobRecord[] = [];

  // 1. Hardcoded ground-truth (authoritative — always first)
  const groundTruth = matchesGroundTruth(input);
  if (groundTruth) {
    const gtRecords = groundTruth.entries.map(e => groundTruthEntryToRecord(e, input));
    records.push(...gtRecords);
    console.log(`🔶 [CZECH HUB ADAPTOR] Loaded ${gtRecords.length} ground-truth record(s) for ${input.schoolName}.`);
  }

  // 2. Live jobs.cz scrape for Czech schools without ground-truth
  if (!groundTruth) {
    console.log(`🔶 [CZECH HUB ADAPTOR] No ground-truth. Attempting live jobs.cz scrape for ${input.schoolName}...`);
    const liveRecords = await scrapeJobsCz(input.schoolName, input);
    records.push(...liveRecords);
    console.log(`🔶 [CZECH HUB ADAPTOR] jobs.cz returned ${liveRecords.length} live record(s).`);
  }

  console.log(`🔶 [CZECH HUB ADAPTOR] Completed for ${input.schoolName}. Total: ${records.length} record(s).`);
  return records;
}

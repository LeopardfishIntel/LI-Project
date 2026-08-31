/**
 * 🛰️ DIRECT SCHOOL WEBSITE ADAPTOR (STRICT DOM LOCK & CRAWLER)
 *
 * Renders official school careers landing pages using Playwright DOM tracing.
 * Enforces Strict DOM Lock: Inspects the locked target URL payload and follows child vacancy links.
 * Returns exact extracted records without un-grounded site-wide fallbacks when a target URL is provided.
 */

import type { AdaptorInput, RawJobRecord } from "./raw-job.types";
import { crawlCareersLandingPage } from "../landingPageCrawler";
import { extractUrlFromScrapedString, sanitizeUrl, isBlockedContentUrl } from "../urlResolver";
import { getCoreTitleAndSource } from "./adaptor-utils";
import { validatePhaseMatching } from "../entityMatcher";

function parsedStringToRecord(rawJob: string, input: AdaptorInput): RawJobRecord | null {
  if (!rawJob) return null;

  const extractedUrl = extractUrlFromScrapedString(rawJob);
  const { core: rawTitle, source } = getCoreTitleAndSource(rawJob);

  if (!rawTitle) return null;

  const cleanSource = source.replace(/^ - /, '').trim() || 'School Web';

  let cleanUrl: string | null = null;
  if (extractedUrl && !isBlockedContentUrl(extractedUrl)) {
    cleanUrl = sanitizeUrl(extractedUrl);
  }

  let datePosted: string | null = null;
  let closingDate: string | null = null;
  const parenMatch = rawJob.match(/\(([^)]+)\)/);
  if (parenMatch) {
    for (const part of parenMatch[1].split(';').map(s => s.trim())) {
      if (part.toLowerCase().startsWith('posted:')) {
        datePosted = part.substring(7).trim();
      } else if (part.toLowerCase().startsWith('closes:')) {
        closingDate = part.substring(7).trim();
      }
    }
  }

  return {
    rawTitle: rawTitle.replace(/\s+/g, ' ').substring(0, 80).trim(),
    applyUrl: cleanUrl,
    source: cleanSource,
    datePosted,
    closingDate,
    schoolId: input.schoolId,
    schoolName: input.schoolName,
    city: input.city,
    country: input.country,
  };
}

export async function runSchoolWebsiteAdaptor(
  input: AdaptorInput,
  hasPrimary: boolean = true,
  hasSecondary: boolean = true
): Promise<RawJobRecord[]> {
  console.log(`🟢 [SCHOOL WEB ADAPTOR] Starting for ${input.schoolName}...`);

  const records: RawJobRecord[] = [];
  const seenUrls = new Set<string>();

  // ── STEP 1 & STEP 2: Strict DOM Lock & Landing Page Tracing ─────────────────
  if (input.careersPageUrl) {
    try {
      console.log(`🟢 [SCHOOL WEB ADAPTOR] Tracing locked target landing page: ${input.careersPageUrl}`);
      const landingRecords = await crawlCareersLandingPage(input.careersPageUrl, input);
      
      for (const rec of landingRecords) {
        const phaseCheck = validatePhaseMatching(
          { isSecondaryOnly: hasSecondary && !hasPrimary, isPrimaryOnly: hasPrimary && !hasSecondary },
          rec.rawTitle
        );
        if (!phaseCheck.isPhaseValid) continue;

        const key = rec.applyUrl || rec.rawTitle.toLowerCase();
        if (seenUrls.has(key)) continue;
        seenUrls.add(key);
        records.push(rec);
      }

      console.log(`🟢 [SCHOOL WEB ADAPTOR] Strict DOM Lock completed for ${input.careersPageUrl}. Emitting ${records.length} clean record(s).`);
      return records;
    } catch (err) {
      console.warn(`🟢 [SCHOOL WEB ADAPTOR] Target landing page crawler failed:`, err);
      return [];
    }
  }

  return records;
}

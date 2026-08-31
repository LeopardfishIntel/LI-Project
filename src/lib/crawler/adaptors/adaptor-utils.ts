/**
 * 🛰️ ADAPTOR UTILITIES
 *
 * Pure helper functions extracted from the search-vacancies-flow monolith.
 * Used by all adaptors and the orchestrator for string parsing, normalization,
 * deduplication, and temporal validation.
 */

import type { RawJobRecord } from './raw-job.types';
import { sanitizeUrl, isBlockedContentUrl } from '../urlResolver';

// ─── String Parsing ───────────────────────────────────────────────────────────

/**
 * Sanitizes and standardizes a raw scraped vacancy string into a canonical format:
 * "Title (Cycle; Posted: DD MMM YYYY; Closes: DD MMM YYYY) - Source"
 */
export const sanitizeVacancyString = (raw: string, currentDateStr: string = "21 May 2026"): string => {
  if (!raw) return raw;
  const lastDashIdx = raw.lastIndexOf(' - ');
  let main = raw;
  let source = 'Web';
  if (lastDashIdx !== -1) {
    main = raw.substring(0, lastDashIdx).trim();
    source = raw.substring(lastDashIdx + 3).trim();
  }

  const parenIdx = main.lastIndexOf('(');
  let rawTitle = parenIdx !== -1 ? main.substring(0, parenIdx).trim() : main.trim();

  // Flatten newlines and multiple spaces; cap at 80 chars
  rawTitle = rawTitle.replace(/\s+/g, ' ').substring(0, 80).trim();

  let parenthetical = '';
  if (parenIdx !== -1) {
    const closedParenIdx = main.lastIndexOf(')');
    if (closedParenIdx !== -1 && closedParenIdx > parenIdx) {
      parenthetical = main.substring(parenIdx + 1, closedParenIdx).trim();
    }
  }

  const partsOfParenthetical = parenthetical ? parenthetical.split(';').map(s => s.trim()) : [];
  let cycle = partsOfParenthetical[0] || 'Aug 2026';

  if (cycle.toLowerCase().includes('posted:')) {
    cycle = 'Aug 2026';
  }

  let postedDate = '';
  let closesDate = '';

  for (const part of partsOfParenthetical) {
    if (part.toLowerCase().startsWith('posted:')) {
      postedDate = part.substring(7).trim();
    } else if (part.toLowerCase().startsWith('closes:')) {
      closesDate = part.substring(7).trim();
    }
  }

  if (!postedDate) {
    postedDate = currentDateStr;
  }
  if (!closesDate) {
    const posted = new Date(postedDate);
    if (!isNaN(posted.getTime())) {
      const closes = new Date(posted.getTime() + 28 * 24 * 60 * 60 * 1000);
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      closesDate = `${String(closes.getDate()).padStart(2, '0')} ${months[closes.getMonth()]} ${closes.getFullYear()}`;
    } else {
      closesDate = "18 Jun 2026";
    }
  }

  const newParenthetical = `${cycle}; Posted: ${postedDate}; Closes: ${closesDate}`;
  return `${rawTitle} (${newParenthetical}) - ${source}`;
};

/**
 * Splits a raw vacancy string at the last " - " separator, returning { core, source }.
 * Also strips the "|| URL" pipe suffix from the source before returning.
 */
export const getCoreTitleAndSource = (raw: string): { core: string; source: string } => {
  // Strip URL pipe suffix first
  const pipeIdx = raw.lastIndexOf(' || ');
  const cleanRaw = pipeIdx !== -1 ? raw.substring(0, pipeIdx).trim() : raw;

  const parts = cleanRaw.split(' - ');
  const source = parts[1] ? ` - ${parts[1]}` : '';
  const core = parts[0] || cleanRaw;
  return { core, source };
};

/**
 * Normalizes a job title for fuzzy comparison, stripping parentheticals, school
 * name words, city/country, and common abbreviations.
 */
export const getNormalizedComparisonKey = (
  title: string,
  schoolName?: string,
  city?: string,
  country?: string
): string => {
  let key = title.replace(/\s*\([^)]*\)/g, '').trim().toLowerCase();

  if (schoolName) {
    const words = schoolName.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    for (const word of words) {
      key = key.split(word).join('');
    }
  }
  if (city) key = key.split(city.toLowerCase()).join('');
  if (country) key = key.split(country.toLowerCase()).join('');

  key = key
    .replace(/august/g, 'aug')
    .replace(/january/g, 'jan')
    .replace(/december/g, 'dec')
    .replace(/october/g, 'oct')
    .replace(/march/g, 'mar')
    .replace(/learning\s+support\s+assistant/g, 'lsa')
    .replace(/special\s+educational\s+needs\s+coordinator/g, 'senco')
    .replace(/special\s+educational\s+needs/g, 'sen')
    .replace(/head\s+of\s+student\s+support/g, 'senco')
    .replace(/english\s+as\s+an\s+additional\s+language/g, 'eal')
    .replace(/mathematics/g, 'maths')
    .replace(/physical\s+education/g, 'pe')
    .replace(/design\s+and\s+technology/g, 'dt');

  return key.replace(/[^a-z0-9]/g, '').trim();
};

/**
 * Extracts the recruitment year from a vacancy string's parenthetical block.
 */
export const getParentheticalYear = (raw: string): string => {
  const parentheticalMatches = [...raw.matchAll(/\(([^)]+)\)/g)];
  if (parentheticalMatches.length === 0) return '2026';

  for (const m of parentheticalMatches) {
    const content = m[1].toLowerCase();
    const yearMatch = content.match(/202[4-7]/);
    if (yearMatch) return yearMatch[0];

    if (content.includes('2025/26') || content.includes('25/26')) return '2025';
    if (content.includes('2026/27') || content.includes('26/27')) return '2026';
    if (content.includes('2024/25') || content.includes('24/25')) return '2024';
  }

  return '2026';
};

/**
 * Returns false if the vacancy string's dates clearly fall outside the 24-month window.
 */
export const isJobWithinLast24Months = (rawJobStr: string): boolean => {
  const dateMatch = rawJobStr.match(/\(([^)]+)\)/);
  if (!dateMatch) return true;
  const content = dateMatch[1];
  const parts = content.split(';').map(s => s.trim());
  let posted: Date | undefined;
  let closes: Date | undefined;
  for (const part of parts) {
    if (part.toLowerCase().startsWith('posted:')) {
      const d = new Date(part.substring(7).trim());
      if (!isNaN(d.getTime())) posted = d;
    } else if (part.toLowerCase().startsWith('closes:')) {
      const d = new Date(part.substring(7).trim());
      if (!isNaN(d.getTime())) closes = d;
    }
  }
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 2);

  if (closes && closes < cutoff) return false;
  if (posted && posted < cutoff) return false;
  return true;
};

// ─── URL Extraction ────────────────────────────────────────────────────────────

/**
 * Extracts the URL appended with ' || ' pipe separator from a scraped job string.
 * Returns { cleanJobString, extractedUrl }.
 */
export const extractUrlFromScrapedString = (
  rawJobString: string
): { cleanJobString: string; extractedUrl: string | null } => {
  if (!rawJobString) return { cleanJobString: '', extractedUrl: null };
  const pipeIdx = rawJobString.lastIndexOf(' || ');
  if (pipeIdx !== -1) {
    const cleanJobString = rawJobString.substring(0, pipeIdx).trim();
    const rawUrl = rawJobString.substring(pipeIdx + 4).trim();
    return { cleanJobString, extractedUrl: sanitizeUrl(rawUrl) };
  }
  return { cleanJobString: rawJobString.trim(), extractedUrl: null };
};

// ─── Deduplication ────────────────────────────────────────────────────────────

/**
 * Deduplicates a flat array of raw vacancy strings using normalised title + year comparison.
 * Ground-truth entries (prepended) are prioritised. [UNVERIFIED] entries are
 * dropped if they have no corroborating verified entry.
 */
export function deduplicateRawJobs(
  allRawJobs: string[],
  schoolName?: string,
  city?: string,
  country?: string
): string[] {
  // Sort: UNVERIFIED entries last so verified entries win deduplication
  const sorted = [...allRawJobs].sort((a, b) => {
    const aU = a.includes('[UNVERIFIED]');
    const bU = b.includes('[UNVERIFIED]');
    if (aU && !bU) return 1;
    if (!aU && bU) return -1;
    return 0;
  });

  const finalList: string[] = [];
  let droppedUnverified = 0;

  for (const rawJob of sorted) {
    if (!rawJob) continue;
    if (
      rawJob.toLowerCase().includes("intelligence report") ||
      rawJob.toLowerCase().includes("unable to retrieve")
    ) continue;

    const { core } = getCoreTitleAndSource(rawJob);
    const normKey = getNormalizedComparisonKey(core, schoolName, city, country);
    if (!normKey) continue;

    const year = getParentheticalYear(rawJob);

    let isDuplicate = false;
    let duplicateIdx = -1;

    for (let i = 0; i < finalList.length; i++) {
      const existingCore = getCoreTitleAndSource(finalList[i]).core;
      const existingNorm = getNormalizedComparisonKey(existingCore, schoolName, city, country);
      const existingYear = getParentheticalYear(finalList[i]);

      if (
        year === existingYear &&
        (normKey === existingNorm ||
          normKey.includes(existingNorm) ||
          existingNorm.includes(normKey))
      ) {
        isDuplicate = true;
        // Keep the longer (more descriptive) entry unless new one is [UNVERIFIED]
        if (core.length > existingCore.length && !rawJob.includes('[UNVERIFIED]')) {
          duplicateIdx = i;
        }
        break;
      }
    }

    if (!isDuplicate) {
      if (rawJob.includes('[UNVERIFIED]')) {
        droppedUnverified++;
        continue;
      }
      finalList.push(rawJob);
    } else if (duplicateIdx !== -1) {
      finalList[duplicateIdx] = rawJob;
    }
  }

  console.log(
    `🛸 [DEDUP] Kept ${finalList.length} distinct entries. Dropped ${droppedUnverified} uncorroborated [UNVERIFIED] ghost listings.`
  );
  return finalList;
}

// ─── RawJobRecord Conversion ──────────────────────────────────────────────────

/**
 * Converts a typed RawJobRecord to the legacy pipe-separated string format used
 * by the orchestrator's output schema.
 * Format: "Title (Cycle; Posted: DD MMM YYYY; Closes: DD MMM YYYY) - Source || URL"
 */
export function rawJobRecordToString(record: RawJobRecord, currentDateStr: string = "28 Aug 2026"): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  let postedStr = currentDateStr;
  if (record.datePosted) {
    const d = new Date(record.datePosted);
    if (!isNaN(d.getTime())) {
      postedStr = `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
    }
  }

  let closesStr = '';
  if (record.closingDate) {
    const d = new Date(record.closingDate);
    if (!isNaN(d.getTime())) {
      closesStr = `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
    }
  }
  if (!closesStr) {
    // Default to 28 days after posted
    const posted = new Date(postedStr);
    if (!isNaN(posted.getTime())) {
      const closes = new Date(posted.getTime() + 28 * 24 * 60 * 60 * 1000);
      closesStr = `${String(closes.getDate()).padStart(2, '0')} ${months[closes.getMonth()]} ${closes.getFullYear()}`;
    } else {
      closesStr = 'Rolling basis';
    }
  }

  const title = record.rawTitle.replace(/\s+/g, ' ').substring(0, 80).trim();
  const parenthetical = `Aug 2026; Posted: ${postedStr}; Closes: ${closesStr}`;
  const urlSuffix = record.applyUrl && !isBlockedContentUrl(record.applyUrl)
    ? ` || ${record.applyUrl}`
    : '';

  return `${title} (${parenthetical}) - ${record.source}${urlSuffix}`;
}

// ─── Entity & URL Host / Title Validation ──────────────────────────────────────

export interface EntityProfileForUrlValidation {
  tesEmployerSlug?: string;
  tesOrganizationId?: string;
  city?: string;
  country?: string;
  officialDomain?: string;
  schoolWebsite?: string;
}

/**
 * Patch 1: Enforce Entity-URL Host Validation
 * Verifies that the applyUrl host matches the target school's known location, slug, or domain.
 */
export function assertUrlMatchesEntity(
  applyUrl: string | null | undefined,
  source: string,
  school: EntityProfileForUrlValidation
): boolean {
  if (!applyUrl) return true;
  const url = applyUrl.toLowerCase();

  // 1. If it's a TES link, check if it matches known location or employer ID/slug
  if (url.includes('tes.com/jobs/vacancy/')) {
    const slugMatch = school.tesEmployerSlug && url.includes(school.tesEmployerSlug.toLowerCase());
    const orgIdMatch = school.tesOrganizationId && url.includes(school.tesOrganizationId);
    const cityMatch = school.city && school.city.length > 2 && url.includes(school.city.toLowerCase());
    const countryMatch = school.country && school.country.length > 2 && url.includes(school.country.toLowerCase());

    if (school.tesEmployerSlug || school.tesOrganizationId || school.city || school.country) {
      if (!slugMatch && !orgIdMatch && !cityMatch && !countryMatch) {
        console.warn(`[URL ENTITY MISMATCH] TES link "${applyUrl}" rejected: does not match slug, org ID, or city/country for target entity.`);
        return false;
      }
    }
  }

  // 2. If it's a direct school website job, it MUST contain the school's official domain
  const targetDomain = school.officialDomain || school.schoolWebsite;
  if (source === 'School Web' && targetDomain) {
    const cleanDomain = targetDomain.replace(/^https?:\/\/(www\.)?/, '').split('/')[0].toLowerCase();
    if (cleanDomain && !url.includes(cleanDomain)) {
      console.warn(`[DOMAIN MISMATCH] School Web link "${applyUrl}" rejected: does not contain official domain "${cleanDomain}".`);
      return false;
    }
  }

  return true;
}

/**
 * Patch 3: Strict Title Keyword Matching
 * Compares scraped jobTitle with subject keywords in the resolved applyUrl slug.
 */
export function assertTitleMatchesUrlSlug(title: string, applyUrl: string | null | undefined): boolean {
  if (!applyUrl) return true;
  const urlParts = applyUrl.split('/');
  const urlSlug = (urlParts.pop() || urlParts.pop() || '').toLowerCase();
  if (!urlSlug || urlSlug.length < 3) return true;

  const titleLower = title.toLowerCase();

  // If job title is "English" but URL slug contains "science" or "physics", drop it
  if (titleLower.includes('english') && (urlSlug.includes('science') || urlSlug.includes('physics') || urlSlug.includes('maths') || urlSlug.includes('mathematics'))) {
    console.error(`[MISMATCH BLOCKED] Title: "${title}" mismatched with URL slug: ${applyUrl}`);
    return false;
  }
  if (titleLower.includes('science') && (urlSlug.includes('english') || urlSlug.includes('history') || urlSlug.includes('geography') || urlSlug.includes('art'))) {
    console.error(`[MISMATCH BLOCKED] Title: "${title}" mismatched with URL slug: ${applyUrl}`);
    return false;
  }
  if ((titleLower.includes('maths') || titleLower.includes('mathematics')) && (urlSlug.includes('english') || urlSlug.includes('history') || urlSlug.includes('geography') || urlSlug.includes('art'))) {
    console.error(`[MISMATCH BLOCKED] Title: "${title}" mismatched with URL slug: ${applyUrl}`);
    return false;
  }

  return true;
}

/**
 * 🔒 STEP 4: ACTIVE LISTING SIGNAL CHECK
 * Detects explicit closed position banners ("position is no longer accepting applications",
 * "vacancy is closed", "applications have closed") to discard delisted payloads.
 */
export function hasClosedPositionNegativeBanner(html: string | null | undefined): boolean {
  if (!html) return false;
  const lower = html.toLowerCase();
  return (
    lower.includes('position is no longer accepting applications') ||
    lower.includes('this vacancy is closed') ||
    lower.includes('this job is no longer available') ||
    lower.includes('applications for this post have closed') ||
    lower.includes('this posting has expired') ||
    lower.includes('vacancy has expired')
  );
}

/**
 * 🔒 MANDATORY JOB ADVERT SIGNAL CHECK
 * Verifies that a web page HTML/text contains explicit recruitment & vacancy signals:
 * - Application signals: "apply", "submit application", "how to apply", "application form"
 * - Temporal & Structural signals: "closing date", "deadline", "start date", "commencing", "job description", "responsibilities"
 */
export function hasJobAdvertSignals(htmlOrText: string | null | undefined): boolean {
  if (!htmlOrText) return false;
  const lower = htmlOrText.toLowerCase();

  const requiredSignalPatterns = [
    /\b(closing\s+date|deadline|closes|valid\s+through)\b/i,
    /\b(start\s+date|commencing|contract\s+type|full\s*time|part\s*time)\b/i,
    /\b(apply|apply\s+now|how\s+to\s+apply|application\s+form|submit\s+application|job\s+description|key\s+responsibilities|person\s+specification|reporting\s+to)\b/i,
  ];

  let signalMatches = 0;
  for (const pattern of requiredSignalPatterns) {
    if (pattern.test(lower)) {
      signalMatches++;
    }
  }

  return signalMatches >= 1;
}

/**
 * Pure helper for resolving and deduplicating source pills on job cards.
 */

export interface JobPill {
  key: string;
  label: string;
  url: string;
}

export function normalizePillUrl(urlStr: string): string {
  if (!urlStr || urlStr === "#") return "";
  return urlStr.toLowerCase().replace(/\/+$/, "").trim();
}

/**
 * Resolves job card pills:
 * - If a DIRECT pill shares its URL with any group/operator pill on the same card (e.g. ISP, Cognita, Inspired, etc.),
 *   the DIRECT pill is dropped and the group pill is kept.
 * - If the DIRECT pill has a distinct URL, both pills are kept.
 * - If only DIRECT is present, it is kept.
 * - Preserves the sort order of the resulting pills.
 */
export function resolvePillDeduplication(pills: JobPill[]): JobPill[] {
  const validPills = pills.filter(p => p.url && p.url !== "#");

  // Collect URLs from non-DIRECT pills
  const otherPillUrls = new Set<string>();
  for (const pill of validPills) {
    if (pill.key !== "DIRECT") {
      const norm = normalizePillUrl(pill.url);
      if (norm) otherPillUrls.add(norm);
    }
  }

  // Drop DIRECT if its URL is identical to any group/other pill
  const filtered = validPills.filter(pill => {
    if (pill.key === "DIRECT") {
      const norm = normalizePillUrl(pill.url);
      if (otherPillUrls.has(norm)) {
        return false;
      }
    }
    return true;
  });

  // Deduplicate any remaining duplicate URLs across non-direct pills while preserving sort order
  const seenUrls = new Set<string>();
  const result: JobPill[] = [];
  for (const pill of filtered) {
    const norm = normalizePillUrl(pill.url);
    if (!seenUrls.has(norm)) {
      seenUrls.add(norm);
      result.push(pill);
    }
  }

  return result;
}

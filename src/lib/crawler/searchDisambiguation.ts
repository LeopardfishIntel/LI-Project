/**
 * 🛸 SEARCH RESULT DISAMBIGUATION GATE
 *
 * Pre-ingestion validation gate. Inspects candidate page HTML, title, or H1 header
 * to ensure that the page content explicitly belongs to the target school.
 * Immediately drops off-target URLs before parsing job details.
 */

import { extractCanonicalDomain } from "./schoolGrounding";

export interface DisambiguationTargetSchool {
  schoolName: string;
  officialDomain?: string;
  aliases?: string[];
}

export function extractPageTitleAndH1(htmlOrTitle: string): { title: string; h1: string } {
  if (!htmlOrTitle) return { title: "", h1: "" };

  let title = "";
  let h1 = "";

  const titleMatch = htmlOrTitle.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch) {
    title = titleMatch[1].replace(/<[^>]+>/g, "").trim();
  } else if (!htmlOrTitle.includes("<") && htmlOrTitle.length < 200) {
    title = htmlOrTitle.trim();
  }

  const h1Match = htmlOrTitle.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1Match) {
    h1 = h1Match[1].replace(/<[^>]+>/g, "").trim();
  }

  return { title, h1 };
}

export function assertPageDisambiguation(
  htmlOrTitle: string,
  urlStr: string,
  targetSchool: DisambiguationTargetSchool
): boolean {
  if (!targetSchool || !targetSchool.schoolName) return true;

  const { title, h1 } = extractPageTitleAndH1(htmlOrTitle);
  const combinedHeader = `${title} ${h1}`.toLowerCase();
  const lowerSchoolName = targetSchool.schoolName.toLowerCase().trim();

  if (combinedHeader.includes(lowerSchoolName)) return true;

  if (targetSchool.aliases && targetSchool.aliases.length > 0) {
    for (const alias of targetSchool.aliases) {
      if (alias && combinedHeader.includes(alias.toLowerCase().trim())) {
        return true;
      }
    }
  }

  if (targetSchool.officialDomain) {
    const canonical = extractCanonicalDomain(targetSchool.officialDomain);
    if (canonical && (combinedHeader.includes(canonical) || urlStr.toLowerCase().includes(canonical))) {
      return true;
    }
  }

  const isAggregator = urlStr.toLowerCase().includes("tes.com") || urlStr.toLowerCase().includes("schrole.com");
  if (isAggregator) return true;

  console.log(
    `[SEARCH_DISAMBIGUATION_REJECTED] Dropped URL "${urlStr}" because page title/H1 ("${title || h1}") does not contain "${targetSchool.schoolName}"`
  );
  return false;
}

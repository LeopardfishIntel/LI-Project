/**
 * Shared whole-word school matching utilities for stream route and crawler engines.
 */

/**
 * Builds a regex pattern matching school names as whole words across text, URLs, and slugs.
 * Ensures whitespace, hyphens, and underscores match flexibly.
 */
export function buildSchoolRegex(schoolName: string | undefined | null): RegExp | null {
  const cleanSchool = (schoolName || '').trim();
  if (cleanSchool.length < 4) return null;
  const pattern = cleanSchool
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/[\s_-]+/g, '[-_\\s]+');
  return new RegExp(`(^|[^a-zA-Z0-9])${pattern}([^a-zA-Z0-9]|$)`, 'i');
}

/**
 * Verifies if a given text or URL contains a whole-word match for the target school.
 */
export function isSchoolMatch(schoolName: string | undefined | null, textOrUrl: string | undefined | null): boolean {
  if (!schoolName || !textOrUrl) return false;
  const regex = buildSchoolRegex(schoolName);
  return regex ? regex.test(textOrUrl) : false;
}

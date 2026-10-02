/**
 * RETIRED SCHOOL IDS
 *
 * A retired FLIS ID belonged to a duplicate school record that was merged into another record.
 * A retired ID must NEVER be used again: no crawling, no job matching, no jobs saved under it,
 * nothing shown on the board or in the school lists.
 *
 * This list lives in code on purpose: a bad data write or script cannot switch it off,
 * and every addition goes through the normal review and push.
 *
 * To retire a school: add one entry here (id + the ID it was merged into + date + note).
 * Never remove an entry.
 */
export interface RetiredSchool {
  mergedInto: string;
  retiredOn: string; // YYYY-MM-DD
  note?: string;
}

export const RETIRED_SCHOOLS: Readonly<Record<string, RetiredSchool>> = Object.freeze({
  FLIS0425: { mergedInto: "FLIS0038", retiredOn: "2026-10-02", note: "St. Catherine's British School, Athens — duplicate of FLIS0038 (same school, same TES ID 1065747)" },
});

/** True when the ID (any case, any surrounding spaces) is a retired school ID. */
export function isRetiredSchool(id: unknown): boolean {
  if (typeof id !== "string") return false;
  return Object.prototype.hasOwnProperty.call(RETIRED_SCHOOLS, id.trim().toUpperCase());
}

/** The surviving school ID for a retired ID, or null. Informational only: nothing redirects automatically. */
export function mergedIntoSchool(id: unknown): string | null {
  if (!isRetiredSchool(id)) return null;
  return RETIRED_SCHOOLS[(id as string).trim().toUpperCase()].mergedInto;
}

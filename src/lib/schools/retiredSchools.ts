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
  FLIS0439: { mergedInto: "FLIS0046", retiredOn: "2026-10-02", note: "Dulwich College Suzhou - duplicate of FLIS0046" },
  FLIS0406: { mergedInto: "FLIS0052", retiredOn: "2026-10-02", note: "St George's British International School Rome - duplicate of FLIS0052" },
  FLIS0387: { mergedInto: "FLIS0060", retiredOn: "2026-10-02", note: "Zurich International School - duplicate of FLIS0060" },
  FLIS0412: { mergedInto: "FLIS0086", retiredOn: "2026-10-02", note: "TASIS The American School in Switzerland - duplicate of FLIS0086" },
  FLIS0431: { mergedInto: "FLIS0118", retiredOn: "2026-10-02", note: "The British International School Cairo - duplicate of FLIS0118" },
  FLIS0378: { mergedInto: "FLIS0135", retiredOn: "2026-10-02", note: "Shrewsbury International School Bangkok Riverside - duplicate of FLIS0135" },
  FLIS0390: { mergedInto: "FLIS0050", retiredOn: "2026-10-02", note: "Frankfurt International School - duplicate of FLIS0050" },
  FLIS0426: { mergedInto: "FLIS0058", retiredOn: "2026-10-02", note: "St. George's International School Switzerland - duplicate of FLIS0058 (same TES ID 1057262)" },
  FLIS0427: { mergedInto: "FLIS0261", retiredOn: "2026-10-02", note: "The British International School Bratislava - duplicate of FLIS0261" },
  FLIS0422: { mergedInto: "FLIS0209", retiredOn: "2026-10-02", note: "St. Christopher's School (Senior) - same school as FLIS0209 (St Christopher's, Isa Town)" },
  FLIS0385: { mergedInto: "FLIS0068", retiredOn: "2026-10-04", note: "International School of Amsterdam - duplicate of FLIS0068 (IS Amsterdam, same school, same website isa.nl)" },
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

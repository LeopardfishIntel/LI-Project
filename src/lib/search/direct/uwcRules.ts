/**
 * UWC schools are read by the Direct engine (each school's own careers page),
 * because UWC International does not list school jobs (uwc.org/careers/vacancies
 * says to contact each school directly). The jobs keep their own "UWC" pill so the
 * school group stays easy to find. UWC is a group label on top of Direct, not a separate engine.
 */
export const UWC_SOURCE = "UWC";

/** UWC schools that are in our registry (FLIS codes). Other UWC schools can be added here once they are in the registry. */
export const UWC_SCHOOL_IDS: readonly string[] = [
  "FLIS0005",
  "FLIS0143",
  "FLIS0202",
  "FLIS0232",
];

export function isUwcSchool(schoolId: string): boolean {
  return UWC_SCHOOL_IDS.includes(schoolId);
}

/** Adds the UWC label to a Direct record's source list and link list. Other schools are returned unchanged. */
export function withUwcLabel<T extends { schoolId?: string; sources?: string[]; sourceUrls?: Record<string, string> }>(
  rec: T,
  jobUrl: string,
): T {
  if (!rec.schoolId || !isUwcSchool(rec.schoolId)) return rec;
  const sources = Array.from(new Set([...(rec.sources || []), UWC_SOURCE]));
  return { ...rec, sources, sourceUrls: { ...(rec.sourceUrls || {}), [UWC_SOURCE]: jobUrl } };
}

/**
 * Shared step for running a search engine: turns an engine's matches into the records Pipeline 1 expects, grouped by school.
 * Used by the nightly orchestrator and by the trial/manual scripts, so both always behave the same.
 */
export function groupMatchesBySchool(matches: any[], engineKey: string): Map<string, any[]> {
  const schoolGroups = new Map<string, any[]>();
  for (const m of matches) {
    if (!m.schoolId) continue;
    const sId = String(m.schoolId).toUpperCase().trim();
    if (!schoolGroups.has(sId)) schoolGroups.set(sId, []);
    schoolGroups.get(sId)!.push({
      rawTitle: m.title,
      source: m.source || engineKey,
      sources: (m as any).sources || undefined,
      sourceUrls: (m as any).sourceUrls || undefined,
      directUrl: (m as any).directUrl || undefined,
      group: (m as any).group || undefined,
      applyUrl: m.applyUrl,
      schoolId: m.schoolId,
      schoolName: m.schoolName,
      city: m.city,
      country: m.country,
      datePosted: m.datePosted || null,
      closingDate: m.closingDate || null,
      matchConfidence: (m as any).matchConfidence || undefined,
      verificationReasons: (m as any).reasons || (m as any).verificationReasons || undefined,
    });
  }
  return schoolGroups;
}

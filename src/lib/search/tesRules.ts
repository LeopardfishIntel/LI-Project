/**
 * TES rules that do not need the network or the database (Roger, 2026-10-06).
 *
 * 1. Shared TES pages. Many schools point at one TES employer page that belongs to a whole group
 *    (taaleem-1058642, kings-education-1058490, gems-education-1057361, innoventures-education-1066416, aldar-education-1220983 ...)
 *    or at another school's page (Regent International -> Sunmarke). Reading such a page for each school shows every school the whole
 *    group's jobs, and that is where wrong-school jobs came from. `tesSchoolsToSkip` says which schools must NOT be read from their saved page.
 * 2. Clean-up safety. `purgeLooksSafe` stops a half-loaded TES page from wiping a school's live TES jobs.
 */

export interface TesCandidate { schoolId: string; name: string; slug?: string; org?: string }

const STOP = new Set(["the", "of", "in", "at", "and", "for", "school", "schools"]);

function plain(s: string): string {
  return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/['’`]/g, "");
}
/** The number at the end of a TES employer slug is the TES organisation id (e.g. ...-1057613). */
export function pageIdOf(c: TesCandidate): string {
  const m = String(c.slug || "").match(/-(\d{5,9})$/);
  return m ? m[1] : String(c.org || "").trim();
}
/** Share of the school's name words (3+ letters) that appear in its TES slug. 1 = the slug is clearly this school. */
export function nameFitsSlug(name: string, slug: string): number {
  const slugFlat = plain(slug).replace(/[^a-z0-9]+/g, "");
  const words = plain(name).split(/[^a-z0-9]+/).filter((w) => w.length >= 3 && !STOP.has(w));
  if (!words.length || !slugFlat) return 1;
  return words.filter((w) => slugFlat.includes(w)).length / words.length;
}

/**
 * Schools whose saved TES page cannot safely be read for them.
 *  - a group / other-school page: the school's name does not fit the page's slug (fit under 0.5), or
 *  - a page that several schools share: only the one school that clearly fits (over 0.5, and best) is kept, the rest are skipped.
 */
export function tesSchoolsToSkip(all: TesCandidate[]): { schoolId: string; reason: string }[] {
  const out: { schoolId: string; reason: string }[] = [];
  const groups = new Map<string, TesCandidate[]>();
  for (const c of all) {
    const id = pageIdOf(c);
    if (!id) continue;
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id)!.push(c);
  }
  for (const [id, members] of groups) {
    const slugOf = (c: TesCandidate) => String(c.slug || members.find((m) => m.slug)?.slug || "");
    const fits = members.map((c) => ({ c, fit: nameFitsSlug(c.name, slugOf(c)) }));
    if (members.length === 1) {
      const f = fits[0];
      if (f.fit < 0.5) out.push({ schoolId: f.c.schoolId, reason: `TES page ${slugOf(f.c) || id} does not look like this school's own page (name fit ${f.fit.toFixed(2)})` });
      continue;
    }
    const best = Math.max(...fits.map((f) => f.fit));
    const winners = fits.filter((f) => f.fit > 0.5 && f.fit === best);
    for (const f of fits) {
      const keep = winners.length === 1 && winners[0].c.schoolId === f.c.schoolId;
      if (!keep) out.push({ schoolId: f.c.schoolId, reason: `TES page ${id} is shared by ${members.length} schools (${members.map((m) => m.schoolId).join(", ")}); this school is not the clear owner (name fit ${f.fit.toFixed(2)})` });
    }
  }
  return out;
}

/**
 * Is it safe to delete the TES jobs that are missing from this read?
 * A read that found far fewer jobs than the school already has is more likely a half-loaded page than a real clear-out.
 * Jobs past their closing date are always safe to delete (the caller handles those separately).
 */
export function purgeLooksSafe(existingTesJobs: number, missingFromRead: number): boolean {
  if (missingFromRead <= 0) return true;
  if (existingTesJobs < 4) return true;
  return missingFromRead / existingTesJobs <= 0.6;
}

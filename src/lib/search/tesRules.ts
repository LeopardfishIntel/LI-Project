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
  const everyWord = plain(name).split(/[^a-z0-9]+/).filter(Boolean);
  const words = everyWord.filter((w) => w.length >= 3 && !STOP.has(w));
  if (!words.length || !slugFlat) return 1;
  // A slug that starts with the school's initials ("sji-international-school" for "St. Joseph's Institution International") counts those name words as matched.
  const first = plain(slug).split("-")[0].replace(/[^a-z]/g, "");
  const initials = everyWord.map((w) => w[0]).join("");
  const initialsWords = first.length >= 3 && initials.startsWith(first) ? new Set(everyWord.slice(0, first.length)) : new Set<string>();
  return words.filter((w) => slugFlat.includes(w) || initialsWords.has(w)).length / words.length;
}

/**
 * Does the employer named on a vacancy page match the school's own TES employer page?  e.g. "Jumeirah English Speaking School" on
 * jumeirah-english-speaking-school-jess-1055094. The strict name matcher said no to many real employers (found in the 2026-10-06 wide trial:
 * "Epsom College Malaysia" vs "Epsom College in Malaysia", "The English School" vs "The English School Nicosia" ...).
 * Only used for a school's own page - shared / group pages are skipped before this is ever reached.
 */
export function hiringOrgFitsPage(hiringOrg: string, slug?: string): boolean {
  if (!hiringOrg || !slug) return false;
  if (nameFitsSlug(hiringOrg, slug) >= 0.8) return true;
  // The employer may add a campus on the end ("Repton School, Abu Dhabi - Fry Campus" on repton-school-abu-dhabi-1065997):
  // fine when every word of the page's own name (two or more) is in the employer name.
  const pageWords = plain(slug).replace(/-\d{5,9}$/, "").split(/[^a-z0-9]+/).filter((w) => w.length >= 3 && !STOP.has(w));
  const orgFlat = plain(hiringOrg).replace(/[^a-z0-9]+/g, "");
  return pageWords.length >= 2 && pageWords.every((w) => orgFlat.includes(w));
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
 * Does a TES vacancy link name a country the school is NOT in?  e.g. "...-singapore-2348923" under a school in Thailand.
 * Cities and country names that mean the same place are treated as home: for a school in the United Arab Emirates, "-dubai-", "-uae-" and
 * "-united-arab-emirates-" are all home (the first version of this rule rejected "-dubai-" for a UAE school - found in the 2026-10-06 trial).
 * Returns the foreign word it found, or null.
 */
const PLACES: { token: string; home: string[] }[] = [
  { token: "thailand", home: ["thailand"] }, { token: "china", home: ["china"] }, { token: "singapore", home: ["singapore"] },
  { token: "japan", home: ["japan"] }, { token: "spain", home: ["spain"] }, { token: "italy", home: ["italy"] },
  { token: "france", home: ["france"] }, { token: "germany", home: ["germany"] }, { token: "greece", home: ["greece"] },
  { token: "switzerland", home: ["switzerland"] }, { token: "brazil", home: ["brazil"] }, { token: "argentina", home: ["argentina"] },
  { token: "uae", home: ["united arab emirates", "uae", "emirates"] }, { token: "dubai", home: ["united arab emirates", "uae", "emirates"] },
  { token: "united-arab-emirates", home: ["united arab emirates", "uae", "emirates"] },
  { token: "qatar", home: ["qatar"] }, { token: "oman", home: ["oman"] }, { token: "kuwait", home: ["kuwait"] }, { token: "bahrain", home: ["bahrain"] },
  { token: "egypt", home: ["egypt"] }, { token: "kenya", home: ["kenya"] }, { token: "vietnam", home: ["vietnam", "viet nam"] },
  { token: "malaysia", home: ["malaysia"] }, { token: "indonesia", home: ["indonesia"] }, { token: "india", home: ["india"] },
  { token: "saudi-arabia", home: ["saudi arabia", "saudi"] }, { token: "korea", home: ["korea"] }, { token: "hong-kong", home: ["hong kong"] },
  { token: "cyprus", home: ["cyprus"] }, { token: "azerbaijan", home: ["azerbaijan"] }, { token: "philippines", home: ["philippines"] },
];
export function slugForeignCountry(url: string, schoolCountry?: string): string | null {
  const home = String(schoolCountry || "").toLowerCase().trim();
  if (!home) return null;
  const u = String(url || "").toLowerCase();
  for (const p of PLACES) {
    if (!u.includes(`-${p.token}-`)) continue;
    if (p.home.some((n) => home.includes(n) || n.includes(home))) continue;
    return p.token;
  }
  return null;
}

/**
 * What does a TES vacancy page say about the job? Used before removing a job TES no longer lists.
 *  "gone"    - the page is not found (404/410), or it is a live page whose own closing date has passed.
 *  "live"    - the page loads and carries a JobPosting that has not closed: the job is still there (the list read just missed it).
 *  "unknown" - anything else (network trouble, blocked, a page with no job data). Unknown is NEVER removed.
 */
export function classifyVacancyPage(i: { status: number; hasJobPosting: boolean; validThroughMs?: number | null }, now: number = Date.now()): "gone" | "live" | "unknown" {
  if (i.status === 404 || i.status === 410) return "gone";
  if (i.status >= 200 && i.status < 300 && i.hasJobPosting) {
    if (i.validThroughMs && i.validThroughMs < now) return "gone";
    return "live";
  }
  return "unknown";
}

/**
 * Tidy the end of a job title after the school name has been taken out of it and it has been cut to length.
 * Found in the 2026-10-06 trial: "EYFS/KS1 Arabic Teacher at", "Assistant Headteacher Secondary at", and a cut such as
 * "GERMAN & FRENCH TEACHER (SECONDARY SCHOOL - GERMAN INTERNATI". Removes a dangling "at / for / with / in / of / -",
 * a half word left by the length cut, and an unclosed bracket and what follows it.
 */
export function tidyTitleEnd(title: string, cutMidWord = false): string {
  let t = String(title || "").replace(/\s+/g, " ").trim();
  if (cutMidWord) t = t.replace(/\s+\S*$/, "").trim();
  if ((t.match(/\(/g) || []).length > (t.match(/\)/g) || []).length) t = t.replace(/\s*\([^)]*$/, "").trim();
  for (let i = 0; i < 4; i++) t = t.replace(/(?:\s+(?:at|for|with|in|of|to|and|&|the|-|–|—))+$/i, "").replace(/[-_\s/,:–—]+$/, "").trim();
  return t;
}


/**
 * Which school of a GROUP's TES page does one vacancy belong to?  (Roger, 2026-10-06)
 * On a group page the employer is the group ("Aldar Education", "Taaleem") on every job, so the employer name cannot tell the campus.
 * The campus can only come from the job's own words (title, then description). A campus counts only by words that belong to that one school's name:
 * words shared by several members, generic school words, and the group's own name are ignored.
 * Exactly one school named -> that school. None or more than one -> null (the job is left out and counted; never guessed).
 */
const GENERIC = new Set(["the", "of", "in", "at", "and", "for", "school", "schools", "international", "academy", "academies", "college", "british", "american", "english", "primary", "secondary", "senior", "junior", "community", "private", "education", "campus", "dubai", "abu", "dhabi", "sharjah", "uae", "emirates", "al"]);
function wordsOf(s: string): string[] { return plain(s).split(/[^a-z0-9]+/).filter(Boolean); }

export function campusWords(memberName: string, otherNames: string[], employer: string): string[] {
  const mine = wordsOf(memberName).filter((w) => w.length >= 3 && !GENERIC.has(w));
  const theirs = new Set(otherNames.flatMap(wordsOf));
  const group = new Set(wordsOf(employer));
  return mine.filter((w) => !theirs.has(w) && !group.has(w));
}

export function attributeGroupJob(
  job: { title: string; description?: string | null; employer?: string | null },
  members: { schoolId: string; name: string }[]
): { schoolId: string | null; by: "title" | "description" | "none" | "several"; reason: string } {
  const employer = job.employer || "";
  const words = members.map((m) => ({ m, w: campusWords(m.name, members.filter((x) => x.schoolId !== m.schoolId).map((x) => x.name), employer) }));
  const hit = (text: string) => {
    const flat = " " + wordsOf(text).join(" ") + " ";
    return words.filter((x) => x.w.some((w) => flat.includes(" " + w + " "))).map((x) => x.m);
  };
  const inTitle = hit(job.title || "");
  if (inTitle.length === 1) return { schoolId: inTitle[0].schoolId, by: "title", reason: `title names ${inTitle[0].name}` };
  if (inTitle.length > 1) return { schoolId: null, by: "several", reason: `title names several: ${inTitle.map((x) => x.schoolId).join(",")}` };
  const inDesc = hit(job.description || "");
  if (inDesc.length === 1) return { schoolId: inDesc[0].schoolId, by: "description", reason: `description names ${inDesc[0].name}` };
  if (inDesc.length > 1) return { schoolId: null, by: "several", reason: `description names several: ${inDesc.map((x) => x.schoolId).join(",")}` };
  return { schoolId: null, by: "none", reason: "no campus named" };
}


/**
 * TES pages shared by several schools where NO school is the clear owner (a real group page: Aldar, Taaleem, Kings, ...).
 * These are read once, and each job is placed on a campus by attributeGroupJob. A shared page that has a clear owner (e.g. Sunmarke's page
 * borrowed by Regent International) is NOT a group page: the owner is read normally and the other school is skipped.
 */
export function findGroupPages<T extends TesCandidate>(all: T[], skippedIds: Set<string>): { pageId: string; slug: string; members: T[] }[] {
  const groups = new Map<string, T[]>();
  for (const c of all) {
    const id = pageIdOf(c);
    if (!id) continue;
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id)!.push(c);
  }
  const out: { pageId: string; slug: string; members: T[] }[] = [];
  for (const [pageId, members] of groups) {
    if (members.length < 2 || !members.every((m) => skippedIds.has(m.schoolId))) continue;
    const slug = String(members.find((m) => m.slug)?.slug || "");
    if (!slug) continue;
    out.push({ pageId, slug, members });
  }
  return out;
}

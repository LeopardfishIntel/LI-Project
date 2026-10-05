/**
 * Which existing board job (featured_jobs_cache) is the SAME job as one that is just arriving?
 * If there is one, the new source is added to it as another pill instead of creating a second card.
 *
 * Rules (kept careful on purpose):
 *  - Same school only (the caller passes that school's rows).
 *  - Exactly the same title (letters and numbers only) always counts - this is the long-standing rule.
 *  - Different wording counts ONLY when one side is a Direct-type source (the school's own page), because school
 *    pages word titles differently from job boards ("Teacher of Biology & ESS" vs "Teacher of Biology & ESS (ESS)").
 *    It uses sameTitle(): numbers must match and most words must overlap.
 *  - A row whose status is "merged" is never matched loosely.
 */
import { sameTitle } from "../search/direct/directRules";

const DIRECT_RX = /DIRECT|OFFICIAL|WEBSITE|SCHOOL WEB|SCHOOL ATS/;
export function isDirectSourceName(n: unknown): boolean { return DIRECT_RX.test(String(n || "").toUpperCase()); }

export interface BoardRow { id: string; title: string; status?: string | null; source?: string | null; sources?: string[] | null }
export interface Incoming { title: string; source?: string | null; sources?: string[] | null }

const flat = (t: string) => String(t || "").toLowerCase().replace(/[^a-z0-9]/g, "").trim();
const namesOf = (x: { source?: string | null; sources?: string[] | null }) => [x.source, ...(Array.isArray(x.sources) ? x.sources : [])].filter(Boolean);

export function findBoardMatch<T extends BoardRow>(rows: T[], incoming: Incoming): T | undefined {
  const key = flat(incoming.title);
  if (!key) return undefined;
  const exact = rows.find((r) => flat(r.title) === key);
  if (exact) return exact;
  const incomingDirect = namesOf(incoming).some(isDirectSourceName);
  return rows.find((r) => {
    if (String(r.status || "").toLowerCase() === "merged") return false;
    if (!incomingDirect && !namesOf(r).some(isDirectSourceName)) return false;
    return sameTitle(r.title, incoming.title);
  });
}

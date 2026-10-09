/**
 * Which jobs the PUBLIC board shows (Roger, 2026-10-09).
 * Only jobs from engines that have been reviewed and fixed are shown to visitors. Jobs from the other engines stay in the database
 * and in the admin view; add an engine to this list when its turn has been done.
 * Reviewed so far: TES, GRC, UWC, ISP, GEMS, Taaleem, Guardian, Search Associates, Direct (school careers pages).
 * A job is shown when ANY of its sources (main source, sources list) or its apply link belongs to a reviewed engine.
 * One place only: the board and the home-page vacancy counter both use it.
 */

const TES_WORD = /(^|[^A-Z])TES([^A-Z]|$)/;

/** True when this one source name / apply link belongs to a reviewed engine. */
export function isReviewedSourceName(nameUpper: string, urlLower: string = ""): boolean {
  const s = String(nameUpper || "").toUpperCase();
  const u = String(urlLower || "").toLowerCase();
  if (TES_WORD.test(s) || /(^|[/.])tes\.com\//.test(u)) return true;                                   // TES
  if (s.includes("GRC") || u.includes("grcfair.org")) return true;                                      // GRC
  if (s.includes("UWC") || s.includes("UNITED WORLD COLLEGE") || u.includes("uwc.org")) return true;    // UWC
  if (s.includes("ISP") || s.includes("INTERNATIONAL SCHOOLS PARTNERSHIP") || u.includes("internationalschools.wd3.myworkdayjobs.com")) return true; // ISP
  if (s.includes("GEMS") || u.includes("gemseducation") || u.includes("gems.ae")) return true;          // GEMS
  if (s.includes("TAALEEM") || u.includes("taaleem.ae")) return true;                                   // Taaleem
  if (s.includes("GUARDIAN") || u.includes("theguardian.com") || u.includes("guardianjobs")) return true; // Guardian
  if (s.includes("SEARCH ASSOCIATES") || u.includes("searchassociates")) return true;                   // Search Associates
  if (s.includes("OFFICIAL") || s.includes("WEBSITE") || s.includes("DIRECT") || s.includes("SCHOOL WEB")) return true; // Direct (school careers pages)
  return false;
}

/**
 * True when a board job (featured_jobs_cache document) may be shown to visitors.
 * `schoolIsTaaleem` is the board's own "this school belongs to the Taaleem group" check.
 */
export function isReviewedPublicJob(
  job: { source?: any; sources?: any; applyUrl?: any } | null | undefined,
  schoolIsTaaleem: boolean = false
): boolean {
  if (!job) return false;
  if (schoolIsTaaleem) return true;
  const url = String(job.applyUrl || "").toLowerCase();
  const names: string[] = [job.source, ...(Array.isArray(job.sources) ? job.sources : [])].filter(Boolean).map((x: any) => String(x).toUpperCase());
  if (names.some((n) => isReviewedSourceName(n))) return true;
  return isReviewedSourceName("", url);
}

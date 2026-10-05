/** Pure rules for the retire-vanished step (no database, so tests can lock them). */
const norm = (u: any) => String(u || "").trim().toLowerCase().replace(/\/+$/, "");
export const normUrl = norm;
const has = (arr: any, label: string) => Array.isArray(arr) && arr.some((s: any) => String(s).toUpperCase() === label.toUpperCase());

/**
 * Pure decision for ONE approved board job (no database). Locked by tests (retireVanished.test.ts).
 *   claims: the job lists this engine as a source;  retire: the engine no longer supplies it;
 *   action "strip" = another source can carry the card (only the pill goes), "delete" = nothing else supports it.
 */
export function decideRetire(x: any, label: string, urlHint: string, live: Set<string>):
  { claims: false } | { claims: true; retire: false } | { claims: true; retire: true; action: "delete" | "strip"; why: string; boardAfter?: any } {
  const claims = String(x.source || "").toUpperCase() === label.toUpperCase() || has(x.sources, label);
  if (!claims) return { claims: false };
  const engineUrl = (x.sourceUrls && x.sourceUrls[label]) || (String(x.applyUrl || "").includes(urlHint) ? x.applyUrl : "");
  if (engineUrl && live.has(norm(engineUrl))) return { claims: true, retire: false };
  const why = engineUrl ? "no longer in the source's list" : `claims ${label} but has no ${label} link`;
  const remaining = Array.from(new Set([x.source, ...(Array.isArray(x.sources) ? x.sources : [])].filter((s: any) => s && String(s).toUpperCase() !== label.toUpperCase()).map(String)));
  if (remaining.length > 0) {
    const urls: Record<string, string> = { ...(x.sourceUrls || {}) };
    delete urls[label];
    const newApply = urls[remaining[0]] || (!String(x.applyUrl || "").includes(urlHint) ? x.applyUrl : "");
    if (newApply) return { claims: true, retire: true, action: "strip", why, boardAfter: { source: remaining[0], sources: remaining, sourceUrls: urls, applyUrl: newApply } };
  }
  return { claims: true, retire: true, action: "delete", why };
}


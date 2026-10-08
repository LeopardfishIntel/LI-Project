/**
 * Engine health (Roger, 2026-10-07) - ADMIN VIEW ONLY. Turns the engine run records (crawllogs) into warnings:
 *   RED    - the engine did not run when it was due, or its latest day found nothing although earlier days found jobs. Something broke: look today.
 *   AMBER  - it found nothing on every recorded day (it never found a job in the records). Probably broken or the site changed.
 *   YELLOW - it runs and finds jobs, but added no NEW job for 14 days. Could just be a quiet spell.
 * Records are added up per day (UTC), so an engine that runs in several chunks a night (TES) is judged on its whole night.
 */
export interface HealthLog { engine: string; totalFound: number; addedCount: number; createdAtMillis: number }
export type HealthLevel = "ok" | "yellow" | "amber" | "red";
export interface EngineHealth { engine: string; level: HealthLevel; reason: string; lastGoodDay: string | null }

/** Engines that are signed off and run every night (add an engine here when it is signed off). */
export const WATCHED_ENGINES = ["GEMS", "GRC", "SEARCH_ASSOCIATES", "TES"] as const;

/**
 * Engines Roger has approved after a rebuild (Roger, 2026-10-07: the green "healthy" line must not show for an engine that is not approved yet).
 * Add an engine here ONLY when Roger says so. GEMS and TES were rebuilt on 2026-10-07 and approved by Roger on 2026-10-08.
 */
export const APPROVED_ENGINES: readonly string[] = ["GRC", "SEARCH_ASSOCIATES", "GEMS", "TES"];

/** The line shown when no engine has a warning. Green only when every watched engine is approved; otherwise says which are waiting. */
export function healthyLine(): { green: boolean; text: string } {
  const waiting = WATCHED_ENGINES.filter((e) => !APPROVED_ENGINES.includes(e));
  if (!waiting.length) return { green: true, text: "All watched engines healthy and approved" };
  return { green: false, text: `No warnings. Waiting for your approval: ${waiting.map((e) => e.replace(/_/g, " ")).join(", ")}` };
}

const DAY = 86400000;
const dayKey = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/**
 * Engines that were rebuilt: only the run records from this day on are judged (older records come from the old, broken engine).
 * Add an engine here when it is rebuilt. Format: "YYYY-MM-DD" (UTC).
 */
export const REBUILT_ON: Record<string, string> = { GEMS: "2026-10-07", TES: "2026-10-07" };

export function assessEngineHealth(
  engine: string,
  logs: HealthLog[],
  nowMs: number,
  isDueOn: (date: Date) => boolean,
  rebuiltOn?: string,
): EngineHealth {
  const sinceMs = rebuiltOn ? Date.parse(rebuiltOn + "T00:00:00Z") : 0;
  const mine = logs.filter((l) => String(l.engine).toUpperCase() === engine.toUpperCase() && l.createdAtMillis >= sinceMs);
  const days = new Map<string, { found: number; added: number }>();
  for (const l of mine) {
    const k = dayKey(l.createdAtMillis);
    const d = days.get(k) || { found: 0, added: 0 };
    d.found += Number(l.totalFound) || 0;
    d.added += Number(l.addedCount) || 0;
    days.set(k, d);
  }
  const keys = Array.from(days.keys()).sort(); // oldest -> newest
  const lastGoodDay = [...keys].reverse().find((k) => (days.get(k)!.found > 0)) || null;
  if (!keys.length) return { engine, level: "red", reason: "No run records at all.", lastGoodDay: null };

  // Did it run on the most recent day it was due? (a due day counts once it is 6 hours old, so the nightly run had time to finish)
  for (let back = 0; back <= 8; back++) {
    const dayStart = Math.floor((nowMs - back * DAY) / DAY) * DAY;
    if (nowMs - dayStart < 6 * 3600000 + 0) { if (back === 0) continue; }
    if (!isDueOn(new Date(dayStart + 12 * 3600000))) continue;
    if (nowMs - (dayStart + 6 * 3600000) < 0) continue;
    const ranOnOrAfter = keys.some((k) => k >= dayKey(dayStart));
    if (!ranOnOrAfter) return { engine, level: "red", reason: `Did not run on ${dayKey(dayStart)} although it was due.`, lastGoodDay };
    break;
  }

  const latest = keys[keys.length - 1];
  const latestFound = days.get(latest)!.found;
  const earlierPositive = keys.slice(0, -1).some((k) => days.get(k)!.found > 0);
  if (latestFound === 0 && earlierPositive) return { engine, level: "red", reason: `Latest run (${latest}) found 0 jobs, but earlier runs found jobs (last good day ${lastGoodDay}).`, lastGoodDay };
  if (latestFound === 0 && !earlierPositive) {
    return { engine, level: "amber", reason: `Found 0 jobs on every recorded day (${keys.length} day${keys.length === 1 ? "" : "s"}).`, lastGoodDay };
  }
  const recent = keys.filter((k) => k >= dayKey(nowMs - 14 * DAY));
  const addedRecent = recent.reduce((n, k) => n + days.get(k)!.added, 0);
  const spanDays = (nowMs - Date.parse(keys[0] + "T00:00:00Z")) / DAY;
  if (spanDays >= 14 && addedRecent === 0) return { engine, level: "yellow", reason: "No new job added for 14 days.", lastGoodDay };
  return { engine, level: "ok", reason: "Running normally.", lastGoodDay };
}

/**
 * Colour for an engine's pill on the jobs page (ADMIN VIEW ONLY).
 *   red (flashing) / amber / yellow = the warnings above.
 *   green   = running normally AND approved by Roger.
 *   waiting = running normally but not approved yet (shown plain, no green).
 *   none    = engine is not watched (no colour change).
 */
export type PillTone = "red" | "amber" | "yellow" | "green" | "waiting" | "none";
export function pillTone(engineKey: string, health: EngineHealth[] | null | undefined): PillTone {
  const h = (health || []).find((x) => x.engine.toUpperCase() === engineKey.replace(/ /g, "_").toUpperCase());
  if (!h) return "none";
  if (h.level !== "ok") return h.level;
  return APPROVED_ENGINES.includes(h.engine) ? "green" : "waiting";
}

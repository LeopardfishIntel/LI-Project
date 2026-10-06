/**
 * JOB GATE - the single place that decides whether a new job goes live ("approved") or waits ("pending_review").
 * Written 2026-10-05 (Roger). Every search engine's jobs pass through Pipeline 1, which calls this once per job.
 *
 * A job is approved only when ALL of these hold; otherwise it is pending_review, with the reasons written on it:
 *   1. The engine has been checked and signed off (AUTO_APPROVE_SOURCES). Engines not yet signed off always send jobs to pending.
 *   2. The school match is certain (matchConfidence = "high").
 *   3. The job has a direct link to apply.
 *   4. The closing date is not more than MAX_FUTURE_CLOSING_DAYS away (a far-off date is usually a placeholder).
 *   5. The engine has not been paused by the drift check (engineDrift.ts).
 *   6. The title is clearly a teaching or leadership role (an unclear title is kept, but sent to pending).
 * Role, expired date and duplicates are rejected earlier in Pipeline 1 and never reach this gate.
 * An imposed closing date (posted date + 42 days) is allowed; the job is then marked isRollingDeadline = true so it is clear the date is imposed.
 */

/**
 * Engines checked one by one and signed off for automatic approval. Add an engine here only after its trial run looks right.
 * "SCHOOL WEB" is the Direct engine (a school's own careers page). Roger signed it off 2026-10-05 for HIGH-confidence jobs only:
 * the gate below still needs matchConfidence "high" (the job has its own link), a sane date and a clear teaching title; anything else stays pending.
 * "TES" signed off by Roger 2026-10-06 after the trial runs on 163 schools: only schools with their OWN TES employer page are read (group / shared pages are skipped),
 * each vacancy page must name the school as employer, the link must be a TES vacancy page, and clean-up only removes a job after checking its own page.
 * "SEARCH ASSOCIATES" signed off by Roger 2026-10-06 after the trial (9 open jobs, every school matched by whole-word name + country, real deadlines, past or "no longer accepting" jobs dropped, business roles left out).
 */
export const AUTO_APPROVE_SOURCES = new Set<string>(["GRC", "SCHOOL WEB", "TES", "SEARCH ASSOCIATES"]);

/** For signed-off engines, a title that is not clearly teaching or leadership (e.g. "HS Chemistry") is kept but sent to pending, not thrown away. */
export function acceptsUnsureRoles(source: string): boolean {
  return AUTO_APPROVE_SOURCES.has(String(source || "").toUpperCase().trim());
}

/** True when the engine KEY (e.g. "SEARCH_ASSOCIATES") is signed off. Keys use underscores, the source names the gate sees use spaces. */
export function isSignedOffEngine(engineKey: string): boolean {
  return AUTO_APPROVE_SOURCES.has(String(engineKey || "").toUpperCase().trim().replace(/_/g, " "));
}

export const MAX_FUTURE_CLOSING_DAYS = 365;

/**
 * A stated closing date more than this many days away is treated as a placeholder ("fishing" post, Roger 2026-10-05):
 * it is ignored and the 42-day rule applies instead (posted date + 42 days).
 */
export const MAX_STATED_CLOSING_DAYS = 180;
export function isPlaceholderClosingDate(closingMillis: number | null | undefined, now: number = Date.now()): boolean {
  return Boolean(closingMillis) && (closingMillis as number) - now > MAX_STATED_CLOSING_DAYS * 24 * 60 * 60 * 1000;
}
const DAY_MS = 24 * 60 * 60 * 1000;

export interface GateInput {
  source: string;
  matchConfidence?: string | null;
  applyUrl?: string | null;
  closingDateMillis: number | null;
  /** True when the title is not clearly a teaching or leadership role (but is not support staff either). */
  roleUnsure?: boolean;
  /** True when the drift check has paused this engine (see engineDrift.ts). */
  engineQuarantined?: boolean;
  now?: number;
}

export interface GateDecision {
  status: "approved" | "pending_review";
  reasons: string[];
}

export function decideReviewStatus(i: GateInput): GateDecision {
  const now = i.now ?? Date.now();
  const reasons: string[] = [];
  if (!AUTO_APPROVE_SOURCES.has(String(i.source || "").toUpperCase().trim())) {
    reasons.push(`Source "${i.source}" is not yet signed off for automatic approval`);
  }
  if (i.engineQuarantined) {
    reasons.push("Engine paused by the drift check (its results changed sharply); needs a re-check");
  }
  if (i.matchConfidence !== "high") {
    reasons.push(`School match not certain (${i.matchConfidence || "not checked"})`);
  }
  if (i.roleUnsure) {
    reasons.push("Job title is not clearly a teaching or leadership role");
  }
  if (!i.applyUrl || !String(i.applyUrl).trim()) {
    reasons.push("No direct apply link");
  }
  if (i.closingDateMillis && i.closingDateMillis - now > MAX_FUTURE_CLOSING_DAYS * DAY_MS) {
    reasons.push(`Closing date is more than ${MAX_FUTURE_CLOSING_DAYS} days away`);
  }
  return { status: reasons.length === 0 ? "approved" : "pending_review", reasons };
}

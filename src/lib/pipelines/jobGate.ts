/**
 * JOB GATE - the single place that decides whether a new job goes live ("approved") or waits ("pending_review").
 * Written 2026-10-05 (Roger). Every search engine's jobs pass through Pipeline 1, which calls this once per job.
 *
 * A job is approved only when ALL of these hold; otherwise it is pending_review, with the reasons written on it:
 *   1. The engine has been checked and signed off (AUTO_APPROVE_SOURCES). Engines not yet signed off always send jobs to pending.
 *   2. The school match is certain (matchConfidence = "high").
 *   3. The job has a direct link to apply.
 *   4. The closing date is not more than MAX_FUTURE_CLOSING_DAYS away (a far-off date is usually a placeholder).
 *   5. The title is clearly a teaching or leadership role (an unclear title is kept, but sent to pending).
 * Role, expired date and duplicates are rejected earlier in Pipeline 1 and never reach this gate.
 * An imposed closing date (posted date + 42 days) is allowed; the job is then marked isRollingDeadline = true so it is clear the date is imposed.
 */

/** Engines checked one by one and signed off for automatic approval. Add an engine here only after its trial run looks right. */
export const AUTO_APPROVE_SOURCES = new Set<string>(["GRC"]);

/** For signed-off engines, a title that is not clearly teaching or leadership (e.g. "HS Chemistry") is kept but sent to pending, not thrown away. */
export function acceptsUnsureRoles(source: string): boolean {
  return AUTO_APPROVE_SOURCES.has(String(source || "").toUpperCase().trim());
}

export const MAX_FUTURE_CLOSING_DAYS = 365;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface GateInput {
  source: string;
  matchConfidence?: string | null;
  applyUrl?: string | null;
  closingDateMillis: number | null;
  /** True when the title is not clearly a teaching or leadership role (but is not support staff either). */
  roleUnsure?: boolean;
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

/**
 * Tidy-up rules for old "rejected" and "merged" board records (Roger, 2026-10-06).
 *
 * Nothing in the engines writes these records. They come from three places only:
 *   - the Remove button on the board (marks the job "rejected" and keeps it),
 *   - the duplicate-merge script (marks the lesser copy "merged"),
 *   - one-off clean-up scripts.
 * They pile up (715 TES ones alone by 2026-10-06). The daily janitor now deletes them once they are old enough.
 *
 * A "rejected" record also works as a memory: while it exists, the same job coming back from an engine is folded into it
 * and stays rejected. So rejected records are kept for REJECTED_KEEP_DAYS before they go, and merged ones (only a leftover
 * duplicate) for MERGED_KEEP_DAYS.
 */
export const REJECTED_KEEP_DAYS = 30;
export const MERGED_KEEP_DAYS = 7;
export const TIDY_MAX_PER_RUN = 200;

const DAY_MS = 86_400_000;

function toMillis(v: any): number {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  if (typeof v.toMillis === "function") { try { return v.toMillis(); } catch { return 0; } }
  if (typeof v.seconds === "number") return v.seconds * 1000;
  if (v instanceof Date) return v.getTime();
  const t = Date.parse(String(v));
  return Number.isFinite(t) ? t : 0;
}

/**
 * When did this record become rejected / merged (as near as we can tell)? 0 = unknown.
 * Rejected: when it was reviewed (Remove button) else when it was first added.
 * Merged: when it was first added. (updatedAtMillis is NOT used: every time an engine sees the job again it is refreshed,
 * which would stop the record ever getting old.)
 */
export function tidyReferenceMillis(j: any): number {
  const st = String(j?.status || "").toLowerCase();
  const added = toMillis(j?.ingestedAtMillis) || toMillis(j?.createdAtMillis) || toMillis(j?.createdAt);
  if (st === "rejected") return toMillis(j?.reviewedAt) || added;
  return added;
}

/** Should the janitor delete this board record now? Records with no usable date are treated as old. */
export function isTidyable(j: any, now: number): boolean {
  const st = String(j?.status || "").toLowerCase();
  if (st !== "rejected" && st !== "merged") return false;
  const ref = tidyReferenceMillis(j);
  const keepDays = st === "rejected" ? REJECTED_KEEP_DAYS : MERGED_KEEP_DAYS;
  if (!ref) return true;
  return now - ref >= keepDays * DAY_MS;
}

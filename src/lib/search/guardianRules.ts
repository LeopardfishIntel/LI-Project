/** Pure Guardian rules (no database, no network) so tests can lock them. */
/**
 * What one Guardian job page says. Guardian shows "This job has expired" at the top of a closed job, and a missing page (404/410) is gone too.
 * Anything else that loads normally is live. A page we cannot read is "unknown" (never treated as expired).
 */
export function guardianPageState(status: number, bodyText: string): "expired" | "live" | "unknown" {
  if (status === 404 || status === 410) return "expired";
  if (status !== 200) return "unknown";
  const top = String(bodyText || "").replace(/\s+/g, " ").slice(0, 1500);
  return /\bthis job has expired\b/i.test(top) ? "expired" : "live";
}

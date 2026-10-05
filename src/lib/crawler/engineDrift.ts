/**
 * ENGINE DRIFT PROTECTION (Roger, 2026-10-05)
 * Once a search engine has been fixed and signed off (jobGate AUTO_APPROVE_SOURCES), this watches it after every run.
 * If its results change sharply (the source changed its website or data, or our matching broke) the engine is paused:
 * its jobs go to pending instead of live until Roger re-checks it. A paused engine is shown in crawler_engine_status/<engine>.
 *
 * Drift means, compared with the last normal run: the engine found nothing, or found / kept less than 40% of the usual number.
 * Only engines that usually keep 5 or more jobs are checked (a small engine's counts are too noisy).
 */
import { getAdminDb } from "@/firebase/admin";

export interface EngineRunStats { found: number; kept: number }
export interface DriftResult { drifted: boolean; reason?: string }

export const DRIFT_MIN_USUAL_KEPT = 5;
export const DRIFT_RATIO = 0.4;

export function detectDrift(usual: EngineRunStats | null | undefined, now: EngineRunStats): DriftResult {
  if (!usual || usual.kept < DRIFT_MIN_USUAL_KEPT) return { drifted: false };
  if (now.found === 0) return { drifted: true, reason: `Found nothing; the usual is ${usual.found}` };
  if (now.found < usual.found * DRIFT_RATIO) return { drifted: true, reason: `Found ${now.found}; the usual is ${usual.found}` };
  if (now.kept < usual.kept * DRIFT_RATIO) return { drifted: true, reason: `Kept ${now.kept}; the usual is ${usual.kept}` };
  return { drifted: false };
}

const docIdFor = (engineKey: string) => String(engineKey || "").toLowerCase().trim();
const quarantineCache = new Map<string, { value: boolean; at: number }>();

/** True when the drift check has paused this engine. Cached for 5 minutes. A database error means "not paused" (the gate's other rules still apply). */
export async function isEngineQuarantined(engineKey: string): Promise<boolean> {
  const id = docIdFor(engineKey);
  if (!id) return false;
  const hit = quarantineCache.get(id);
  if (hit && Date.now() - hit.at < 5 * 60 * 1000) return hit.value;
  let value = false;
  try {
    const db: any = getAdminDb();
    if (db && typeof db.collection === "function") {
      const snap = await db.collection("crawler_engine_status").doc(id).get();
      value = Boolean(snap.exists && snap.data()?.driftQuarantined === true);
    }
  } catch (_) { /* keep false */ }
  quarantineCache.set(id, { value, at: Date.now() });
  return value;
}

/** Call after an engine's run. Updates the usual numbers, or pauses the engine when it has drifted. */
export async function recordRunAndCheckDrift(engineKey: string, now: EngineRunStats): Promise<DriftResult> {
  const id = docIdFor(engineKey);
  try {
    const db: any = getAdminDb();
    if (!db || typeof db.collection !== "function") return { drifted: false };
    const baseRef = db.collection("crawler_engine_status").doc(`${id}_baseline`);
    const base = await baseRef.get();
    const usual = base.exists ? (base.data() as EngineRunStats) : null;
    const result = detectDrift(usual, now);
    if (result.drifted) {
      await db.collection("crawler_engine_status").doc(id).set(
        { driftQuarantined: true, driftReason: result.reason, driftAt: new Date().toISOString(), engineKey: id },
        { merge: true }
      );
      quarantineCache.set(id, { value: true, at: Date.now() });
    } else {
      await baseRef.set({ found: now.found, kept: now.kept, updatedAt: new Date().toISOString() });
    }
    return result;
  } catch (_) {
    return { drifted: false };
  }
}

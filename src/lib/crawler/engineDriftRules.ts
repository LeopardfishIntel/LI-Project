// Pure drift rules (no imports so they can be tested anywhere). See engineDrift.ts for how they are used.
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

/** A queue engine (TES) call that read no schools at all (everything was already checked within the pass window) has nothing to judge: 0 found means "no work", not "the source is empty". */
export function queueCallHadNoWork(schoolsRead: number, foundThisCall: number): boolean {
  return schoolsRead === 0 && foundThisCall === 0;
}

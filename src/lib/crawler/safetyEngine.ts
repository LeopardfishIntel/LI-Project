import { getAdminDb } from "@/firebase/admin";

export interface EngineCoolingStatus {
  engineKey: string;
  isCooling: boolean;
  coolingUntilMillis: number;
  reason?: string;
  statusCode?: number;
  lastTripAt?: string;
}

/**
 * 1. Inject Randomized Request Jitter between crawler page requests
 */
export async function injectRequestJitter(minMs: number = 1500, maxMs: number = 4500): Promise<void> {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  await new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * 2. Check if an Engine is currently in a 48-Hour Cooling Period
 */
export async function isEngineCoolingDown(engineKey: string): Promise<boolean> {
  try {
    const db = getAdminDb();
    if (!db || typeof db.collection !== "function") return false;

    const docRef = db.collection("crawler_engine_status").doc(engineKey.toLowerCase());
    const docSnap = await docRef.get();

    if (!docSnap.exists) return false;
    const data = docSnap.data();

    if (data?.coolingUntilMillis && data.coolingUntilMillis > Date.now()) {
      console.warn(`🧊 [SAFETY ENGINE] Engine "${engineKey}" is COOLING_DOWN until ${new Date(data.coolingUntilMillis).toISOString()} (${data.reason || "Rate limited"})`);
      return true;
    }

    return false;
  } catch (err) {
    console.warn(`⚠️ Error checking cooling status for ${engineKey}:`, err);
    return false;
  }
}

/**
 * 3. Trip 48-Hour Circuit Breaker on 429 Too Many Requests or 403 Forbidden
 */
export async function tripEngineCoolingDown(
  engineKey: string,
  reason: string,
  statusCode: number = 429
): Promise<EngineCoolingStatus> {
  const coolingDurationMs = 48 * 60 * 60 * 1000; // 48 Hours
  const coolingUntilMillis = Date.now() + coolingDurationMs;
  const keyLower = engineKey.toLowerCase();

  const status: EngineCoolingStatus = {
    engineKey: keyLower,
    isCooling: true,
    coolingUntilMillis,
    reason,
    statusCode,
    lastTripAt: new Date().toISOString()
  };

  try {
    const db = getAdminDb();
    if (db && typeof db.collection === "function") {
      await db.collection("crawler_engine_status").doc(keyLower).set(status, { merge: true });
    }
  } catch (err) {
    console.error(`❌ Failed to record circuit breaker status for ${engineKey}:`, err);
  }

  console.error(`🚨 [CIRCUIT BREAKER TRIPPED] Engine "${engineKey}" tripped 48h cooling period (HTTP ${statusCode}: ${reason}). Cooling until ${new Date(coolingUntilMillis).toISOString()}`);
  return status;
}

/**
 * 4. Two-Pass Differential Filter
 * Pass 1 strictly gathers candidate IDs / applyUrls.
 * Compares against database cache and returns ONLY new or updated job items for Pass 2.
 */
export async function twoPassDifferentialFilter<T extends { jobId?: string; applyUrl?: string; schoolId?: string }>(
  engineKey: string,
  candidateItems: T[]
): Promise<{ newItems: T[]; skippedCount: number }> {
  try {
    const db = getAdminDb();
    if (!db || typeof db.collection !== "function") {
      return { newItems: candidateItems, skippedCount: 0 };
    }

    const snap = await db.collection("featured_jobs_cache").get();
    const existingJobIds = new Set<string>();
    const existingApplyUrls = new Set<string>();

    snap.docs.forEach((d: any) => {
      const data = d.data();
      if (d.id) existingJobIds.add(String(d.id).toLowerCase());
      if (data.jobId) existingJobIds.add(String(data.jobId).toLowerCase());
      if (data.applyUrl) existingApplyUrls.add(String(data.applyUrl).toLowerCase().trim());
    });

    const newItems: T[] = [];
    let skippedCount = 0;

    for (const item of candidateItems) {
      const idStr = String(item.jobId || "").toLowerCase();
      const urlStr = String(item.applyUrl || "").toLowerCase().trim();

      const existsById = idStr && existingJobIds.has(idStr);
      const existsByUrl = urlStr && existingApplyUrls.has(urlStr);

      if (existsById || existsByUrl) {
        skippedCount++;
      } else {
        newItems.push(item);
      }
    }

    console.log(`🛸 [TWO-PASS DIFFERENTIAL] "${engineKey}": ${newItems.length} new items qualified for Pass 2 processing (${skippedCount} unchanged items skipped).`);
    return { newItems, skippedCount };
  } catch (err) {
    console.warn(`⚠️ Error in twoPassDifferentialFilter for ${engineKey}:`, err);
    return { newItems: candidateItems, skippedCount: 0 };
  }
}

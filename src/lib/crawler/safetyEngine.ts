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


/**
 * 5. Webhook Telemetry Dispatcher (Discord, Slack, Sentry, Generic HTTP)
 */
export interface TelemetryPayload {
  title: string;
  message: string;
  severity: "info" | "warning" | "alert" | "error";
  engine?: string;
  metadata?: Record<string, any>;
  timestamp?: string;
}

const SEVERITY_COLORS: Record<string, number> = {
  info: 0x38bdf8,
  warning: 0xfbbf24,
  alert: 0xf97316,
  error: 0xef4444,
};

const SEVERITY_EMOJIS: Record<string, string> = {
  info: "ℹ️",
  warning: "⚠️",
  alert: "🚨",
  error: "❌",
};

export async function sendTelemetryWebhook(payload: TelemetryPayload): Promise<boolean> {
  const timestamp = payload.timestamp || new Date().toISOString();
  const emoji = SEVERITY_EMOJIS[payload.severity] || "ℹ️";
  const titleWithEmoji = `${emoji} [${payload.severity.toUpperCase()}] ${payload.title}`;

  console.log(`📡 [TELEMETRY] ${titleWithEmoji}: ${payload.message}`, payload.metadata ? JSON.stringify(payload.metadata) : "");

  const discordUrl = process.env.DISCORD_WEBHOOK_URL;
  const slackUrl = process.env.SLACK_WEBHOOK_URL;
  const alertUrl = process.env.ALERT_WEBHOOK_URL || process.env.GENERIC_WEBHOOK_URL;

  let dispatched = false;

  // Discord
  if (discordUrl) {
    try {
      const fields = payload.metadata
        ? Object.entries(payload.metadata).map(([name, value]) => ({
            name,
            value: typeof value === "object" ? JSON.stringify(value) : String(value),
            inline: true,
          }))
        : [];

      await fetch(discordUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          embeds: [
            {
              title: titleWithEmoji,
              description: payload.message,
              color: SEVERITY_COLORS[payload.severity] || 0x38bdf8,
              fields,
              footer: { text: `Engine: ${payload.engine || "System"} • FLIS Platform` },
              timestamp,
            },
          ],
        }),
      });
      dispatched = true;
    } catch (err: any) {
      console.warn("⚠️ [TELEMETRY] Discord dispatch failed:", err?.message || err);
    }
  }

  // Slack
  if (slackUrl) {
    try {
      await fetch(slackUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `*${titleWithEmoji}*\n${payload.message}`,
          attachments: payload.metadata
            ? [
                {
                  color: `#${(SEVERITY_COLORS[payload.severity] || 0x38bdf8).toString(16)}`,
                  fields: Object.entries(payload.metadata).map(([title, value]) => ({
                    title,
                    value: typeof value === "object" ? JSON.stringify(value) : String(value),
                    short: true,
                  })),
                  footer: `Engine: ${payload.engine || "System"} • ${timestamp}`,
                },
              ]
            : undefined,
        }),
      });
      dispatched = true;
    } catch (err: any) {
      console.warn("⚠️ [TELEMETRY] Slack dispatch failed:", err?.message || err);
    }
  }

  // Generic JSON Alert Webhook
  if (alertUrl) {
    try {
      await fetch(alertUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          timestamp,
        }),
      });
      dispatched = true;
    } catch (err: any) {
      console.warn("⚠️ [TELEMETRY] Generic alert dispatch failed:", err?.message || err);
    }
  }

  return dispatched;
}

/**
 * 6. Track 0-Job Anomalies across sweeps (alerts when mapped school has 0 jobs for 3 consecutive sweeps)
 */
export async function recordSchoolSweepAnomaly(
  engineKey: string,
  schoolId: string,
  companyName: string,
  activeJobsCount: number
): Promise<number> {
  try {
    const db = getAdminDb();
    if (!db || typeof db.collection !== "function") return 0;

    const docRef = db.collection("crawler_engine_status").doc(`${engineKey.toLowerCase()}_drift_telemetry`);
    const snap = await docRef.get();
    const data = snap.data() || {};
    const zeroCounts: Record<string, number> = data.zeroCounts || {};

    let currentZeroCount = zeroCounts[schoolId] || 0;

    if (activeJobsCount === 0) {
      currentZeroCount += 1;
      zeroCounts[schoolId] = currentZeroCount;

      if (currentZeroCount >= 3) {
        await sendTelemetryWebhook({
          title: "Consecutive Zero-Job Anomaly Detected",
          message: `Mapped school ${schoolId} ("${companyName}") returned 0 active vacancies for ${currentZeroCount} consecutive sweeps. Possible ATS entity name drift or portal restructure.`,
          severity: "alert",
          engine: engineKey,
          metadata: {
            schoolId,
            companyName,
            consecutiveZeroSweeps: currentZeroCount,
            lastChecked: new Date().toISOString(),
          },
        });
      }
    } else {
      // Reset counter if jobs were found
      zeroCounts[schoolId] = 0;
    }

    await docRef.set({ zeroCounts, lastSweepAt: new Date().toISOString() }, { merge: true });
    return zeroCounts[schoolId] || 0;
  } catch (err: any) {
    console.warn(`⚠️ Error recording sweep anomaly for ${schoolId}:`, err?.message || err);
    return 0;
  }
}

/**
 * 7. Playwright WAF Fallback Switch
 * Automatically routes requests to headless Playwright stealth browser when WAF challenges are detected.
 */
export async function setEngineWafFallback(engineKey: string, enabled: boolean, reason?: string): Promise<void> {
  try {
    const db = getAdminDb();
    if (!db || typeof db.collection !== "function") return;

    const docRef = db.collection("crawler_engine_status").doc(`${engineKey.toLowerCase()}_waf_fallback`);
    await docRef.set({
      engineKey: engineKey.toLowerCase(),
      usePlaywrightFallback: enabled,
      reason: reason || (enabled ? "WAF challenge / 403 Forbidden detected" : "Normal AJAX operating"),
      updatedAt: new Date().toISOString(),
      expiresAtMillis: enabled ? Date.now() + 24 * 60 * 60 * 1000 : 0, // Fallback active for 24h
    }, { merge: true });

    console.log(`🛡️ [WAF FALLBACK SWITCH] Engine "${engineKey}" Playwright fallback set to: ${enabled} (${reason || ""})`);
  } catch (err) {
    console.warn(`⚠️ Error setting WAF fallback for ${engineKey}:`, err);
  }
}

export async function isEngineWafFallbackActive(engineKey: string): Promise<boolean> {
  try {
    const db = getAdminDb();
    if (!db || typeof db.collection !== "function") return false;

    const docRef = db.collection("crawler_engine_status").doc(`${engineKey.toLowerCase()}_waf_fallback`);
    const snap = await docRef.get();
    if (!snap.exists) return false;

    const data = snap.data();
    if (data?.usePlaywrightFallback === true) {
      if (data.expiresAtMillis && data.expiresAtMillis < Date.now()) {
        // Expired, reset to false
        await docRef.set({ usePlaywrightFallback: false }, { merge: true });
        return false;
      }
      return true;
    }
    return false;
  } catch (err) {
    return false;
  }
}

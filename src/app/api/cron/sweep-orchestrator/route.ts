import { getAdminDb } from "@/firebase/admin";
import { NextResponse } from "next/server";
import { rejectUnlessCron } from "@/lib/cronAuth";
import { getCurrentSeason, shouldEngineRunToday, CRAWLER_TIMETABLE } from "@/lib/crawler/timetableScheduler";
import { isEngineCoolingDown } from "@/lib/crawler/safetyEngine";
import { searchIspDbSchools } from "@/lib/search/isp";
import { searchGlobeducateDbSchools } from "@/lib/search/globeducate";
import { searchCognitaDbSchools } from "@/lib/search/cognita";
import { searchInspiredDbSchools } from "@/lib/search/inspired";
import { searchTeachAwayDbSchools } from "@/lib/search/teachaway";
import { searchGemsDbSchools } from "@/lib/search/gems";
import { searchTaylorsDbSchools } from "@/lib/search/taylors";
import { searchGrcDbSchools } from "@/lib/search/grc";
import { searchGuardianDbSchools } from "@/lib/search/guardian";
import { searchNordAngliaDbSchools } from "@/lib/search/nordanglia";
import { searchTesDbSchools, getTesRunInfo, markTesChecked } from "@/lib/search/tes";
import { searchSearchAssociatesDbSchools } from "@/lib/search/searchassociates";
import { searchTaaleemDbSchools } from "@/lib/search/taaleem-server";
import { runIngestionPipeline } from "@/lib/pipelines/pipeline1-ingestion";
import { isSignedOffEngine } from "@/lib/pipelines/jobGate";
import { getGemsLastNote } from "@/lib/crawler/adaptors/gems-adaptor";
import { getSaLastNote } from "@/lib/search/searchassociates";
import { getTaaleemLastNote } from "@/lib/crawler/adaptors/taaleem-adaptor";
import { groupMatchesBySchool } from "@/lib/pipelines/engineRunner";
import { recordRunAndCheckDrift } from "@/lib/crawler/engineDrift";
import { planRetireVanished, applyRetirePlan } from "@/lib/pipelines/retireVanished";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = await rejectUnlessCron(request);
  if (denied) return denied;
  try {
    const { searchParams } = new URL(request.url);
    const forcedEngine = searchParams.get("forceEngine");
    // ?only=KEY runs just that one engine (still only when due and signed off). The nightly workflow calls each engine in its own request,
    // because one request is cut off by the website host after about 5 minutes.
    const onlyEngine = (searchParams.get("only") || "").toUpperCase();

    const now = new Date();
    const season = getCurrentSeason(now);
    const dayOfWeek = now.toLocaleString("en-US", { weekday: "long", timeZone: "UTC" });
    const utcTime = now.toISOString();

    const telemetry: Record<string, any> = {
      timestamp: utcTime,
      season,
      dayOfWeek,
      executedEngines: [],
      skippedEngines: []
    };

    const engineRunners: Record<string, () => Promise<any[]>> = {
      GUARDIAN: searchGuardianDbSchools,
      NORD_ANGLIA: searchNordAngliaDbSchools,
      ISP: searchIspDbSchools,
      GLOBEDUCATE: searchGlobeducateDbSchools,
      COGNITA: searchCognitaDbSchools,
      INSPIRED: searchInspiredDbSchools,
      TEACH_AWAY: searchTeachAwayDbSchools,
      GEMS: searchGemsDbSchools,
      TAYLORS: searchTaylorsDbSchools,
      GRC: searchGrcDbSchools,
      TES: searchTesDbSchools,
      TAALEEM: searchTaaleemDbSchools,
      SEARCH_ASSOCIATES: searchSearchAssociatesDbSchools,
    };

    // Engines whose vanished jobs are retired after a healthy run: the pill / source name and a word that is in their links.
    const RETIRE_RULES: Record<string, { label: string; urlHint: string }> = {
      GRC: { label: "GRC", urlHint: "grcfair.org" },
      SEARCH_ASSOCIATES: { label: "SEARCH ASSOCIATES", urlHint: "searchassociates.com" },
      GEMS: { label: "GEMS", urlHint: "careers.gemseducation.com" },
      TAALEEM: { label: "Taaleem", urlHint: "careers.taaleem.ae" },
    };

    for (const [key, runner] of Object.entries(engineRunners)) {
      if (onlyEngine && onlyEngine !== key) continue;
      const isForced = forcedEngine && forcedEngine.toUpperCase() === key;
      const isDue = shouldEngineRunToday(key, now);

      if (!isDue && !isForced) {
        telemetry.skippedEngines.push({
          engineKey: key,
          reason: "Not scheduled for execution today (Seasonality / Timetable Rule)"
        });
        continue;
      }

      // Roger (2026-10-05): the nightly sweep runs only engines that have been reviewed, fixed and signed off in jobGate.ts.
      // An engine can still be run on purpose with ?forceEngine=KEY.
      if (!isForced && !isSignedOffEngine(key)) {
        telemetry.skippedEngines.push({
          engineKey: key,
          reason: "Not yet reviewed and signed off in jobGate.ts (nightly sweep runs signed-off engines only)"
        });
        continue;
      }

      if (await isEngineCoolingDown(key)) {
        telemetry.skippedEngines.push({
          engineKey: key,
          reason: "COOLING_DOWN (48-Hour Circuit Breaker Active)"
        });
        continue;
      }

      console.log(`🛸 [SWEEP ORCHESTRATOR] Running crawler engine "${key}"...`);
      const startMs = Date.now();
      const matches = await runner();

      let ingestedCount = 0;
      let addedCount = 0;
      let removedCount = 0;

      // Group matches by schoolId so records are ingested in full school batches
      const schoolGroups = groupMatchesBySchool(matches, key);

      for (const [sId, records] of schoolGroups.entries()) {
        const res = await runIngestionPipeline(sId, records, {
          purgeTesVacancies: key === "TES"
        });

        if (res?.accepted > 0) ingestedCount += res.accepted;
        if (res?.addedCount) addedCount += res.addedCount;
        if (res?.removedCount) removedCount += res.removedCount;
      }

      // TES is a work queue: mark the schools this call read as checked (only now that their jobs are in), and note how many are left.
      let remaining: number | undefined;
      if (key === "TES") {
        const info = getTesRunInfo();
        try { await markTesChecked(info.checked); } catch (e: any) { console.warn("⚠️ Could not mark TES schools as checked:", e?.message || e); }
        remaining = info.remaining;
      }

      const durationMs = Date.now() - startMs;
      const totalFound = matches.length;
      const dbMatched = matches.filter(m => !!m.schoolId).length;

      // 🛰️ Persist CrawlLog in Firestore crawllogs collection
      try {
        const db = getAdminDb();
        if (db) {
          await db.collection("crawllogs").add({
            engine: key,
            addedCount,
            removedCount,
            totalFound,
            dbMatched,
            durationMs,
            ...(remaining !== undefined ? { remaining } : {}),
            createdAt: new Date().toISOString(),
            createdAtMillis: Date.now()
          });
          console.log(`🛰️ [CRAWL LOG PERSISTED] Engine=${key} | +${addedCount} | -${removedCount} | Total=${totalFound} | Matched=${dbMatched} | Time=${durationMs}ms`);
        }
      } catch (logErr: any) {
        console.warn(`⚠️ Failed to persist CrawlLog for ${key}:`, logErr?.message || logErr);
      }

      // Drift protection: a signed-off engine whose results change sharply is paused (its jobs then go to pending).
      let drift: { drifted: boolean; reason?: string } = { drifted: false };
      if (isSignedOffEngine(key)) {
        // The drift record is kept under the source name the gate sees (spaces, not underscores).
        if (remaining === undefined) {
          drift = await recordRunAndCheckDrift(key.replace(/_/g, " "), { found: totalFound, kept: ingestedCount });
        } else {
          // A queue engine reads in chunks. One chunk is not comparable with the last chunk, so the totals of a whole pass are compared instead.
          const db: any = getAdminDb();
          const ref = db.collection("engine_cycle").doc(key);
          const snap = await ref.get();
          const prev: any = snap.exists ? snap.data() : {};
          const cyc = { found: (prev.found || 0) + totalFound, kept: (prev.kept || 0) + ingestedCount };
          if (remaining === 0) {
            drift = await recordRunAndCheckDrift(key.replace(/_/g, " "), cyc);
            await ref.set({ found: 0, kept: 0, updatedAtMillis: Date.now() });
          } else {
            await ref.set({ ...cyc, updatedAtMillis: Date.now() });
          }
        }
        if (drift.drifted) console.warn(`🚨 [DRIFT] Engine ${key} paused: ${drift.reason}`);
      }

      // Jobs the engine no longer supplies are retired (only after a healthy run of a signed-off engine; see retireVanished.ts).
      let retire: any = null;
      if (isSignedOffEngine(key) && !drift.drifted && RETIRE_RULES[key]) {
        try {
          const plan = await planRetireVanished({ engineLabel: RETIRE_RULES[key].label, urlHint: RETIRE_RULES[key].urlHint, liveUrls: matches.map((m: any) => m.applyUrl).filter(Boolean) });
          const done = await applyRetirePlan(plan);
          retire = { claims: plan.claims, wouldRetire: plan.items.length, ...done, skipped: plan.skipped };
          if (plan.items.length) console.log(`🧹 [RETIRE] ${key}: ${plan.items.length} stale job(s):`, plan.items.map((i) => `${i.action} ${i.title} (${i.schoolId})`));
          if (plan.skipped) console.warn(`🧹 [RETIRE] ${key}: ${plan.skipped}`);
        } catch (e: any) {
          retire = { error: String(e?.message || e) };
        }
      }

      telemetry.executedEngines.push({
        retire,
        driftPaused: drift.drifted,
        driftReason: drift.reason,
        engineKey: key,
        matchesFound: totalFound,
        dbMatched,
        addedCount,
        removedCount,
        durationMs,
        ingestedCount,
        remaining,
        tesSlowest: key === "TES" ? getTesRunInfo().slowest : undefined,
        note: key === "GEMS" ? (getGemsLastNote() || undefined) : key === "SEARCH_ASSOCIATES" ? (getSaLastNote() || undefined) : key === "TAALEEM" ? (getTaaleemLastNote() || undefined) : undefined
      });
    }

    return NextResponse.json({
      status: "success",
      message: "Staggered Crawling Sweep Orchestrator Completed Successfully.",
      telemetry
    });
  } catch (err: any) {
    console.error("❌ Error in sweep-orchestrator cron route:", err);
    return NextResponse.json({ status: "error", error: err?.message || String(err) }, { status: 500 });
  }
}

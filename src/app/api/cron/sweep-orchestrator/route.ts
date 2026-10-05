import { getAdminDb } from "@/firebase/admin";
import { NextResponse } from "next/server";
import { getCurrentSeason, shouldEngineRunToday, CRAWLER_TIMETABLE } from "@/lib/crawler/timetableScheduler";
import { isEngineCoolingDown } from "@/lib/crawler/safetyEngine";
import { searchIspDbSchools } from "@/lib/search/isp";
import { searchGlobeducateDbSchools } from "@/lib/search/globeducate";
import { searchUwcDbSchools } from "@/lib/search/uwc";
import { searchCognitaDbSchools } from "@/lib/search/cognita";
import { searchInspiredDbSchools } from "@/lib/search/inspired";
import { searchTeachAwayDbSchools } from "@/lib/search/teachaway";
import { searchGemsDbSchools } from "@/lib/search/gems";
import { searchTaylorsDbSchools } from "@/lib/search/taylors";
import { searchTeacherHorizonsDbSchools } from "@/lib/search/teacherhorizons";
import { searchGrcDbSchools } from "@/lib/search/grc";
import { searchGuardianDbSchools } from "@/lib/search/guardian";
import { searchNordAngliaDbSchools } from "@/lib/search/nordanglia";
import { searchTesDbSchools } from "@/lib/search/tes";
import { searchTaaleemDbSchools } from "@/lib/search/taaleem-server";
import { runIngestionPipeline } from "@/lib/pipelines/pipeline1-ingestion";
import { AUTO_APPROVE_SOURCES } from "@/lib/pipelines/jobGate";
import { recordRunAndCheckDrift } from "@/lib/crawler/engineDrift";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const forcedEngine = searchParams.get("forceEngine");

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
      UWC: searchUwcDbSchools,
      COGNITA: searchCognitaDbSchools,
      INSPIRED: searchInspiredDbSchools,
      TEACH_AWAY: searchTeachAwayDbSchools,
      GEMS: searchGemsDbSchools,
      TAYLORS: searchTaylorsDbSchools,
      TEACHER_HORIZONS: searchTeacherHorizonsDbSchools,
      GRC: searchGrcDbSchools,
      TES: searchTesDbSchools,
      TAALEEM: searchTaaleemDbSchools,
    };

    for (const [key, runner] of Object.entries(engineRunners)) {
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
      if (!isForced && !AUTO_APPROVE_SOURCES.has(key)) {
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
      const schoolGroups = new Map<string, any[]>();
      for (const m of matches) {
        if (!m.schoolId) continue;
        const sId = m.schoolId.toUpperCase().trim();
        if (!schoolGroups.has(sId)) {
          schoolGroups.set(sId, []);
        }
        schoolGroups.get(sId)!.push({
          rawTitle: m.title,
          source: m.source || key,
          sources: (m as any).sources || undefined,
          sourceUrls: (m as any).sourceUrls || undefined,
          directUrl: (m as any).directUrl || undefined,
          group: (m as any).group || undefined,
          applyUrl: m.applyUrl,
          schoolId: m.schoolId,
          schoolName: m.schoolName,
          city: m.city,
          country: m.country,
          datePosted: m.datePosted || null,
          closingDate: m.closingDate || null,
          matchConfidence: (m as any).matchConfidence || undefined,
          verificationReasons: (m as any).reasons || (m as any).verificationReasons || undefined
        });
      }

      for (const [sId, records] of schoolGroups.entries()) {
        const res = await runIngestionPipeline(sId, records, {
          purgeTesVacancies: key === "TES"
        });

        if (res?.accepted > 0) ingestedCount += res.accepted;
        if (res?.addedCount) addedCount += res.addedCount;
        if (res?.removedCount) removedCount += res.removedCount;
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
      if (AUTO_APPROVE_SOURCES.has(key)) {
        drift = await recordRunAndCheckDrift(key, { found: totalFound, kept: ingestedCount });
        if (drift.drifted) console.warn(`🚨 [DRIFT] Engine ${key} paused: ${drift.reason}`);
      }

      telemetry.executedEngines.push({
        driftPaused: drift.drifted,
        driftReason: drift.reason,
        engineKey: key,
        matchesFound: totalFound,
        dbMatched,
        addedCount,
        removedCount,
        durationMs,
        ingestedCount
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

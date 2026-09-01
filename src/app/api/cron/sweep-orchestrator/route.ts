import { getAdminDb } from "@/firebase/admin";
import { NextResponse } from "next/server";
import { getCurrentSeason, shouldEngineRunToday, CRAWLER_TIMETABLE } from "@/lib/crawler/timetableScheduler";
import { isEngineCoolingDown } from "@/lib/crawler/safetyEngine";
import { searchIspDbSchools } from "@/lib/search/isp";
import { searchGlobeducateDbSchools } from "@/lib/search/globeducate";
import { searchUwcDbSchools } from "@/lib/search/uwc";
import { searchMalvernDbSchools } from "@/lib/search/malvern";
import { searchCognitaDbSchools } from "@/lib/search/cognita";
import { searchInspiredDbSchools } from "@/lib/search/inspired";
import { searchTeachAwayDbSchools } from "@/lib/search/teachaway";
import { searchGemsDbSchools } from "@/lib/search/gems";
import { searchEsfDbSchools } from "@/lib/search/esf";
import { searchTaylorsDbSchools } from "@/lib/search/taylors";
import { searchTeacherHorizonsDbSchools } from "@/lib/search/teacherhorizons";
import { runIngestionPipeline } from "@/lib/pipelines/pipeline1-ingestion";

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
      ISP: searchIspDbSchools,
      GLOBEDUCATE: searchGlobeducateDbSchools,
      UWC: searchUwcDbSchools,
      MALVERN: searchMalvernDbSchools,
      COGNITA: searchCognitaDbSchools,
      INSPIRED: searchInspiredDbSchools,
      TEACH_AWAY: searchTeachAwayDbSchools,
      GEMS: searchGemsDbSchools,
      ESF: searchEsfDbSchools,
      TAYLORS: searchTaylorsDbSchools,
      TEACHER_HORIZONS: searchTeacherHorizonsDbSchools
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

      for (const m of matches) {
        if (!m.schoolId) continue;
        const res = await runIngestionPipeline(m.schoolId, [{
          rawTitle: m.title,
          source: m.source || key,
          applyUrl: m.applyUrl,
          schoolId: m.schoolId,
          schoolName: m.schoolName,
          city: m.city,
          country: m.country,
          datePosted: m.datePosted || null,
          closingDate: m.closingDate || null
        }]);

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

      telemetry.executedEngines.push({
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

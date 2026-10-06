import { searchGuardianDbSchools } from "../lib/search/guardian";
import { searchNordAngliaDbSchools } from "../lib/search/nordanglia";
import { searchGrcDbSchools } from "../lib/search/grc";
import { searchCognitaDbSchools } from "../lib/search/cognita";
import { searchGemsDbSchools } from "../lib/search/gems";
import { searchIspDbSchools } from "../lib/search/isp";
import { searchGlobeducateDbSchools } from "../lib/search/globeducate";
import { searchInspiredDbSchools } from "../lib/search/inspired";
import { searchTeachAwayDbSchools } from "../lib/search/teachaway";
import { searchTaylorsDbSchools } from "../lib/search/taylors";
import { searchUwcDbSchools } from "../lib/search/uwc";
import { runIngestionPipeline } from "../lib/pipelines/pipeline1-ingestion";
import { getAdminDb } from "../firebase/admin";

interface EngineDef {
  key: string;
  name: string;
  runner: () => Promise<any[]>;
}

const ENGINES: EngineDef[] = [
  { key: "NORD_ANGLIA", name: "Nord Anglia Education", runner: searchNordAngliaDbSchools },
  { key: "GUARDIAN", name: "The Guardian Jobs", runner: searchGuardianDbSchools },
  { key: "GRC", name: "GRC Fair", runner: searchGrcDbSchools },
  { key: "COGNITA", name: "Cognita Schools", runner: searchCognitaDbSchools },
  { key: "GEMS", name: "GEMS Education", runner: searchGemsDbSchools },
  { key: "ISP", name: "International Schools Partnership (ISP)", runner: searchIspDbSchools },
  { key: "GLOBEDUCATE", name: "Globeducate", runner: searchGlobeducateDbSchools },
  { key: "INSPIRED", name: "Inspired Education", runner: searchInspiredDbSchools },
  { key: "TEACH_AWAY", name: "Teach Away", runner: searchTeachAwayDbSchools },
  { key: "TAYLORS", name: "Taylors Education", runner: searchTaylorsDbSchools },
  { key: "UWC", name: "United World Colleges (UWC)", runner: searchUwcDbSchools },
];

async function main() {
  console.log("=================================================");
  console.log("🚀 STARTING GLOBAL SWEEP ACROSS ALL CRAWLER ENGINES");
  console.log("=================================================\n");

  const summary: Record<string, { totalFound: number; matched: number; accepted: number; rejected: number; durationMs: number }> = {};
  let totalAcceptedAllEngines = 0;

  for (const eng of ENGINES) {
    console.log(`\n-------------------------------------------------`);
    console.log(`📡 [ENGINE: ${eng.name} (${eng.key})]`);
    console.log(`-------------------------------------------------`);
    const startMs = Date.now();

    try {
      const matches = await eng.runner();
      const totalFound = matches.length;
      let matched = 0;
      let accepted = 0;
      let rejected = 0;

      // Group matches by schoolId so records are ingested in full school batches
      const schoolGroups = new Map<string, any[]>();
      for (const m of matches) {
        if (!m.schoolId) continue;
        matched++;
        const sId = m.schoolId.toUpperCase().trim();
        if (!schoolGroups.has(sId)) {
          schoolGroups.set(sId, []);
        }
        schoolGroups.get(sId)!.push({
          rawTitle: m.title,
          source: m.source || eng.name,
          sources: m.sources || [m.source || eng.name],
          sourceUrls: m.sourceUrls || (m.applyUrl ? { [m.source || eng.name]: m.applyUrl } : undefined),
          directUrl: m.directUrl || m.applyUrl,
          group: m.group,
          applyUrl: m.applyUrl,
          schoolId: m.schoolId,
          schoolName: m.schoolName,
          city: m.city,
          country: m.country,
          datePosted: m.datePosted || null,
          closingDate: m.closingDate || null,
          matchConfidence: m.matchConfidence || undefined,
          verificationReasons: m.reasons || undefined
        });
      }

      for (const [sId, records] of schoolGroups.entries()) {
        const res = await runIngestionPipeline(sId, records, {
          purgeTesVacancies: eng.key === "TES"
        });

        if (res?.accepted > 0) accepted += res.accepted;
        if (res?.rejected > 0) rejected += res.rejected;
      }

      const durationMs = Date.now() - startMs;
      totalAcceptedAllEngines += accepted;

      summary[eng.key] = { totalFound, matched, accepted, rejected, durationMs };

      // Persist CrawlLog in Firestore
      try {
        const db = getAdminDb();
        if (db) {
          await db.collection("crawllogs").add({
            engine: eng.key,
            engineName: eng.name,
            totalFound,
            dbMatched: matched,
            accepted,
            rejected,
            durationMs,
            createdAt: new Date().toISOString(),
            createdAtMillis: Date.now()
          });
        }
      } catch (logErr) {
        console.warn(`Could not persist log for ${eng.key}:`, logErr);
      }

      console.log(`✅ [${eng.key}] Done in ${durationMs}ms | Found: ${totalFound} | Matched: ${matched} | Ingested: ${accepted} | Filtered/Rejected: ${rejected}`);
    } catch (err: any) {
      console.error(`❌ [${eng.key}] Error during sweep:`, err?.message || err);
      summary[eng.key] = { totalFound: 0, matched: 0, accepted: 0, rejected: 0, durationMs: Date.now() - startMs };
    }
  }

  console.log("\n=================================================");
  console.log("🏁 GLOBAL SWEEP COMPLETE SUMMARY");
  console.log("=================================================");
  console.table(summary);
  console.log(`\n🎉 Total newly ingested/verified vacancies across all engines: ${totalAcceptedAllEngines}`);

  // Query final total in cache
  try {
    const db = getAdminDb();
    if (db) {
      const snap = await db.collection("featured_jobs_cache").get();
      console.log(`📊 Total Active Vacancies in featured_jobs_cache: ${snap.size}`);
    }
  } catch (err) {
    console.warn("Could not query cache total:", err);
  }
}

main().then(() => process.exit(0)).catch(e => { console.error("Global sweep fatal error:", e); process.exit(1); });

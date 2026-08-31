import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { runGrcAdaptor } from "../src/lib/crawler/adaptors/grc-adaptor";
import { runIngestionPipeline } from "../src/lib/pipelines/pipeline1-ingestion";

async function sweepGrcSearch() {
  console.log("================================================================");
  console.log("🌐 [GRC SEARCH ENGINE] Sweeping All Grounded GRC Vacancies");
  console.log("================================================================\n");

  try {
    const records = await runGrcAdaptor();
    console.log("📌 Found " + records.length + " active grounded GRC vacancy record(s).\n");

    if (records.length === 0) {
      console.log("✓ 0 active GRC vacancies currently available to ingest.");
      return;
    }

    // Group raw records by schoolId for clean pipeline processing
    const schoolGroups = new Map<string, typeof records>();
    records.forEach(rec => {
      const list = schoolGroups.get(rec.schoolId) || [];
      list.push(rec);
      schoolGroups.set(rec.schoolId, list);
    });

    let totalAccepted = 0;
    let totalRejected = 0;

    for (const [schoolId, groupRecords] of schoolGroups.entries()) {
      console.log("Ingesting " + groupRecords.length + " GRC record(s) for schoolId " + schoolId + "...");
      const res = await runIngestionPipeline(schoolId, groupRecords);
      totalAccepted += res.accepted;
      totalRejected += res.rejected;
      console.log("  ✅ Accepted: " + res.accepted + " | Rejected: " + res.rejected);
    }

    console.log("\n================================================================");
    console.log("🎉 GRC SEARCH ENGINE SWEEP COMPLETE");
    console.log("================================================================");
    console.log("  • Total Schools Ingested: " + schoolGroups.size);
    console.log("  • Total Active Vacancies Ingested: " + totalAccepted);
    console.log("  • Total Rejected Vacancies: " + totalRejected);
    console.log("================================================ civilization\n");
  } catch (err: any) {
    console.error("⚠️ GRC Search Sweep failed:", err.message || err);
  }
}

sweepGrcSearch().catch(console.error);

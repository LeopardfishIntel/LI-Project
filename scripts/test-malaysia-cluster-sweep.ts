import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { getAdminDb } from "../src/firebase/admin";
import { runTesAdaptor } from "../src/lib/crawler/adaptors/tes-adaptor";
import { runSchoolWebsiteAdaptor } from "../src/lib/crawler/adaptors/school-website-adaptor";
import { runBoardHubAdaptor } from "../src/lib/crawler/adaptors/board-hub-adaptor";
import { runIngestionPipeline } from "../src/lib/pipelines/pipeline1-ingestion";

const MALAYSIA_CLUSTER_IDS = [
  "FLIS0142", // The Alice Smith School (KLASS)
  "FLIS0143", // Marlborough College Malaysia (MCM)
  "FLIS0144", // British International School of Kuala Lumpur (BSKL)
  "FLIS0145", // Garden International School (GIS)
  "FLIS0146", // Epsom College in Malaysia
  "FLIS0147", // Mont Kiara International School (MKIS)
  "FLIS0219", // Tenby International School Setia Eco Park
  "FLIS0287", // International School of Kuala Lumpur (ISKL)
  "FLIS0288", // Uplands International School Penang
  "FLIS0289", // Stonyhurst International School Penang
  "FLIS0290", // Nexus International School Malaysia (Putrajaya)
];

async function runMalaysiaBatchSweep() {
  const db = getAdminDb();
  console.log("==================================================================");
  console.log("MALAYSIA CLUSTER TEST INGESTION BATCH (FLIS0142 - FLIS0290)");
  console.log("==================================================================\n");

  const startTime = Date.now();
  let totalRawDiscovered = 0;
  let totalAccepted = 0;
  let totalRejected = 0;
  let totalNewCached = 0;
  let totalMergedMultiSource = 0;

  const clusterStats: Array<{
    id: string;
    name: string;
    rawCount: number;
    accepted: number;
    sources: string[];
    durationMs: number;
  }> = [];

  for (const schoolId of MALAYSIA_CLUSTER_IDS) {
    const schoolStart = Date.now();
    const docRef = db.collection("schools").doc(schoolId);
    const snap = await docRef.get();
    
    if (!snap.exists) {
      console.warn("School document not found in Firestore:", schoolId);
      continue;
    }

    const s = snap.data();
    const schoolName = s.schoolname || s.name || schoolId;
    const city = s.city || "";
    const country = s.country || "Malaysia";
    const tesSlug = s.tesEmployerSlug || null;
    const tesOrgId = s.tesOrganizationId || null;
    const careersPageUrl = s.careersPageUrl || s.website || null;

    console.log("[SWEEP] " + schoolId + " — " + schoolName + " (" + city + ", " + country + ")");

    const rawRecords: any[] = [];
    const detectedSources = new Set<string>();

    // 1. Direct Careers Web Adaptor
    if (careersPageUrl && !careersPageUrl.includes("tes.com")) {
      try {
        console.log("   ↳ Probing Direct Web / ATS endpoint: " + careersPageUrl);
        const webRecords = await runSchoolWebsiteAdaptor({
          schoolId,
          schoolName,
          city,
          country,
          careersPageUrl,
        });
        webRecords.forEach(r => { rawRecords.push(r); detectedSources.add(r.source || "Direct"); });
        console.log("     [Direct Web] Yielded " + webRecords.length + " raw record(s).");
      } catch (err: any) {
        console.warn("     Web Adaptor error for " + schoolId + ":", err.message || err);
      }
    }

    // 2. TES Adaptor
    if (tesSlug || tesOrgId) {
      try {
        console.log("   ↳ Probing TES endpoint (slug: " + (tesSlug || "N/A") + ", orgId: " + (tesOrgId || "N/A") + ")");
        const tesRecords = await runTesAdaptor({
          schoolId,
          schoolName,
          city,
          country,
          tesEmployerSlug: tesSlug || undefined,
          tesOrganizationId: tesOrgId || undefined,
        });
        tesRecords.forEach(r => { rawRecords.push(r); detectedSources.add("TES"); });
        console.log("     [TES] Yielded " + tesRecords.length + " raw record(s).");
      } catch (err: any) {
        console.warn("     TES Adaptor error for " + schoolId + ":", err.message || err);
      }
    }

    // 3. Board Hub Adaptor (Guardian Jobs + Grounded Agent Platforms)
    try {
      console.log("   ↳ Probing Board Hub (Guardian Jobs + Agent Grounding)");
      const boardRecords = await runBoardHubAdaptor({
        schoolId,
        schoolName,
        city,
        country,
      });
      boardRecords.forEach(r => { rawRecords.push(r); detectedSources.add(r.source || "Board/Agent"); });
      console.log("     [Board Hub] Yielded " + boardRecords.length + " raw record(s).");
    } catch (err: any) {
      console.warn("     Board Hub Adaptor error for " + schoolId + ":", err.message || err);
    }

    totalRawDiscovered += rawRecords.length;

    // 4. Run through Pipeline 1 (Temporal Gate + Deduplication + Precedence Engine)
    let accepted = 0;
    if (rawRecords.length > 0) {
      const res = await runIngestionPipeline(schoolId, rawRecords);
      accepted = res.accepted;
      totalAccepted += res.accepted;
      totalRejected += res.rejected;
      totalNewCached += (res.addedCount || 0);
      if (res.accepted > (res.addedCount || 0)) {
        totalMergedMultiSource += (res.accepted - (res.addedCount || 0));
      }
      console.log("   Pipeline 1 Result: " + res.accepted + " accepted, " + res.rejected + " rejected (" + (res.addedCount || 0) + " new, " + (res.accepted - (res.addedCount || 0)) + " merged dual-listings).");
    } else {
      console.log("   0 active openings detected.");
    }

    const duration = Date.now() - schoolStart;
    clusterStats.push({
      id: schoolId,
      name: schoolName,
      rawCount: rawRecords.length,
      accepted,
      sources: Array.from(detectedSources),
      durationMs: duration,
    });
    console.log("");
  }

  const totalDurationSeconds = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log("==================================================================");
  console.log("MALAYSIA TEST INGESTION BATCH SUMMARY");
  console.log("==================================================================");
  console.log("Total Batch Duration: " + totalDurationSeconds + "s (Avg " + (Number(totalDurationSeconds)/MALAYSIA_CLUSTER_IDS.length).toFixed(1) + "s / school)");
  console.log("Schools Evaluated: " + clusterStats.length);
  console.log("Raw Requisitions Discovered: " + totalRawDiscovered);
  console.log("Valid Postings Ingested / Kept: " + totalAccepted);
  console.log("Expired / Duplicate / Non-Pedagogical Dropped: " + totalRejected);
  console.log("New Cache Entries Created: " + totalNewCached);
  console.log("Merged Multi-Source Postings: " + totalMergedMultiSource);
  console.log("------------------------------------------------------------------");
  console.log("School Breakdown:");
  clusterStats.forEach(s => {
    console.log(" • " + s.id.padEnd(9) + " " + s.name.padEnd(42) + " | " + s.accepted + " live (" + s.rawCount + " raw) | " + (s.sources.join(", ") || "None") + " | " + (s.durationMs/1000).toFixed(1) + "s");
  });
  console.log("==================================================================\n");
}

runMalaysiaBatchSweep().catch(console.error);

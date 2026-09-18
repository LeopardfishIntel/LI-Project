/**
 * 💎 FLIS0027 MIGRATION: Purge stale data & re-ingest from GEMS Career Engine
 *
 * This script:
 *   1. Purges ALL existing featured_jobs_cache entries for FLIS0027
 *   2. Purges ALL subcollection jobs under schools/FLIS0027/jobs
 *   3. Queries the GEMS Career Engine for "GEMS WORLD ACADEMY - DUBAI"
 *   4. Ingests only verified, active jobs through pipeline1
 *   5. Updates the school document with the correct careersPageUrl
 */

import { getAdminDb, generateJobFingerprint, setDocument } from "../../src/firebase/admin";
import { runGemsAdaptor } from "../../src/lib/crawler/adaptors/gems-adaptor";
import { runIngestionPipeline } from "../../src/lib/pipelines/pipeline1-ingestion";

const SCHOOL_ID = "FLIS0027";
const GEMS_COMPANY_NAME = "GEMS WORLD ACADEMY - DUBAI";
const GEMS_CAREERS_URL =
  "https://careers.gemseducation.com/en/job-search-results/?keyword=&job_city=&trigger=company_name&company_name=GEMS+WORLD+ACADEMY+-+DUBAI";

async function main() {
  const db = getAdminDb();
  if (!db) {
    console.error("❌ No Firestore DB connection.");
    process.exit(1);
  }

  console.log("═══════════════════════════════════════════════════════════");
  console.log("💎 FLIS0027 GEMS ENGINE MIGRATION");
  console.log("═══════════════════════════════════════════════════════════\n");

  // ── STEP 1: Purge featured_jobs_cache for FLIS0027 ─────────────────────
  console.log("🗑️  STEP 1: Purging featured_jobs_cache for FLIS0027...");
  const cacheSnap = await db.collection("featured_jobs_cache").where("schoolId", "==", SCHOOL_ID).get();
  let cacheDeleted = 0;
  for (const doc of cacheSnap.docs) {
    await doc.ref.delete();
    cacheDeleted++;
  }
  console.log(`   ✅ Deleted ${cacheDeleted} cache documents.\n`);

  // ── STEP 2: Purge subcollection jobs ───────────────────────────────────
  console.log("🗑️  STEP 2: Purging schools/FLIS0027/jobs subcollection...");
  const jobsSnap = await db.collection("schools").doc(SCHOOL_ID).collection("jobs").get();
  let jobsDeleted = 0;
  for (const doc of jobsSnap.docs) {
    await doc.ref.delete();
    jobsDeleted++;
  }
  console.log(`   ✅ Deleted ${jobsDeleted} subcollection job documents.\n`);

  // ── STEP 3: Query GEMS Career Engine ───────────────────────────────────
  console.log("💎 STEP 3: Querying GEMS Career Engine for GEMS WORLD ACADEMY - DUBAI...");
  const records = await runGemsAdaptor(
    {
      schoolId: SCHOOL_ID,
      schoolName: "GEMS World Dubai",
      city: "Dubai",
      country: "United Arab Emirates",
    },
    GEMS_COMPANY_NAME
  );
  console.log(`   💎 Adaptor returned ${records.length} clean teaching records.\n`);

  // ── STEP 4: Verify apply URLs ──────────────────────────────────────────
  console.log("🔍 STEP 4: Verifying all apply URLs return HTTP 200...");
  let verifiedCount = 0;
  let failedUrls: string[] = [];
  for (const rec of records) {
    if (!rec.applyUrl) continue;
    try {
      const res = await fetch(rec.applyUrl, { method: "HEAD", redirect: "follow" });
      if (res.status === 200) {
        verifiedCount++;
      } else {
        failedUrls.push(`${rec.applyUrl} → HTTP ${res.status}`);
        console.warn(`   ⚠️ ${rec.rawTitle}: ${rec.applyUrl} → HTTP ${res.status}`);
      }
    } catch (err: any) {
      failedUrls.push(`${rec.applyUrl} → ERROR: ${err?.message}`);
      console.warn(`   ⚠️ ${rec.rawTitle}: ${rec.applyUrl} → ERROR`);
    }
  }
  console.log(`   ✅ Verified ${verifiedCount}/${records.length} URLs. Failed: ${failedUrls.length}\n`);

  // ── STEP 5: Ingest through pipeline1 ───────────────────────────────────
  console.log("🛸 STEP 5: Ingesting verified jobs through pipeline1...");
  const result = await runIngestionPipeline(SCHOOL_ID, records);
  console.log(`   ✅ Pipeline result: accepted=${result.accepted}, rejected=${result.rejected}`);
  if (result.reasons.length > 0) {
    console.log("   Rejection reasons:");
    result.reasons.forEach(r => console.log(`     - ${r}`));
  }
  console.log();

  // ── STEP 6: Update school document ─────────────────────────────────────
  console.log("📝 STEP 6: Updating schools/FLIS0027 document...");
  await db.collection("schools").doc(SCHOOL_ID).update({
    careersPageUrl: GEMS_CAREERS_URL,
    website: GEMS_CAREERS_URL,
    agency: "GEMS Education Careers Portal",
    openJobsCount: result.accepted,
    scrapedJobsList: result.acceptedFingerprints || [],
    lastSweepAt: new Date().toISOString(),
    lastSweepSource: "GEMS Career Engine (careers.gemseducation.com)",
  });
  console.log(`   ✅ School document updated.\n`);

  // ── SUMMARY ────────────────────────────────────────────────────────────
  console.log("═══════════════════════════════════════════════════════════");
  console.log("💎 MIGRATION COMPLETE");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`   Cache purged: ${cacheDeleted}`);
  console.log(`   Subcollection purged: ${jobsDeleted}`);
  console.log(`   GEMS API records: ${records.length}`);
  console.log(`   URLs verified: ${verifiedCount}/${records.length}`);
  console.log(`   Ingested (accepted): ${result.accepted}`);
  console.log(`   Ingested (rejected): ${result.rejected}`);
  console.log(`   New careersPageUrl: ${GEMS_CAREERS_URL}`);
  if (failedUrls.length > 0) {
    console.log("\n   ⚠️ Failed URLs:");
    failedUrls.forEach(u => console.log(`     - ${u}`));
  }
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  });

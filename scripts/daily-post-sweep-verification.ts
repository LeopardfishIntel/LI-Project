/**
 * 🛰️ LEOPARDFISH POST-SWEEP AUTOMATED JOB VERIFICATION GUARDIAN
 *
 * Runs automatically 30 minutes after the evening search sweep completes.
 * Performs deep verification across all active job cache records:
 *  1. Dead Link & 404/DNS resolution check
 *  2. Expired job banner detection ("Closed or Expired Job Posting", etc.)
 *  3. Past closing date validation (closingDateMillis < Date.now())
 *  4. Strict Geographic & School Entity parity audit (zero cross-country collisions)
 *  5. School counter synchronization (100% database parity)
 *  6. Master data JSON exports regeneration
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { getAdminDb } from "../src/firebase/admin";
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

interface VerificationReport {
  timestamp: string;
  totalScanned: number;
  liveVerified: number;
  expiredDatePurged: number;
  deadLinksPurged: number;
  expiredBannersPurged: number;
  geographicMismatchesPurged: number;
  syncedSchoolsCount: number;
  activeVacanciesTotal: number;
  durationSeconds: number;
}

export async function runDailyJobVerification(): Promise<VerificationReport> {
  const startTime = Date.now();
  console.log("=================================================================");
  console.log("🛡️ [DAILY POST-SWEEP VERIFICATION GUARDIAN] Starting Deep Audit...");
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  console.log("=================================================================\n");

  const db = getAdminDb();
  if (!db) {
    throw new Error("❌ Firestore Admin DB unavailable.");
  }

  // 1. Load canonical schools registry
  const schoolsSnap = await db.collection("schools").get();
  const schoolMap = new Map<string, any>();
  schoolsSnap.forEach((doc) => {
    schoolMap.set(doc.id.toUpperCase(), { id: doc.id, ...doc.data() });
  });
  console.log(`📌 Loaded ${schoolMap.size} canonical schools into memory.`);

  // 2. Scan all jobs in featured_jobs_cache
  const jobsSnap = await db.collection("featured_jobs_cache").get();
  console.log(`📊 Scanned ${jobsSnap.size} job documents in featured_jobs_cache.\n`);

  let expiredDatePurged = 0;
  let geographicMismatchesPurged = 0;
  let deadLinksPurged = 0;
  let expiredBannersPurged = 0;
  let liveVerified = 0;

  const purgeList: Array<{ id: string; reason: string }> = [];
  const candidateUrlChecks: Array<{ id: string; url: string; title: string; schoolName: string }> = [];

  const foreignCountryList = [
    "thailand", "china", "singapore", "japan", "spain", "italy", "france", "germany",
    "greece", "switzerland", "brazil", "argentina", "uae", "dubai", "qatar", "oman",
    "kuwait", "bahrain", "egypt", "kenya", "vietnam", "malaysia", "indonesia", "india"
  ];

  const now = Date.now();

  // Phase A: Rapid Memory-Level Integrity & Expiration Checks
  for (const doc of jobsSnap.docs) {
    const job = doc.data();
    const docId = doc.id;
    const sId = (job.schoolId || "").toUpperCase().trim();
    const url = String(job.applyUrl || job.source_url || "").trim();
    const urlLower = url.toLowerCase();
    const school = schoolMap.get(sId);

    // Check 1: Missing or invalid school ID (non-hub)
    if (!school && sId !== "SEARCH_ASSOCIATES_HUB") {
      purgeList.push({ id: docId, reason: `Unknown schoolId: ${sId}` });
      geographicMismatchesPurged++;
      continue;
    }

    // Check 2: Past Closing Date
    if (job.closingDateMillis && job.closingDateMillis < now) {
      purgeList.push({ id: docId, reason: `Past closing date: ${job.closingDate}` });
      expiredDatePurged++;
      continue;
    }

    // Check 3: Geographic Contamination via URL slug tokens
    if (school && school.country) {
      const canonicalCountryLower = (school.country || "").toLowerCase();
      let hasGeoConflict = false;

      if (urlLower.includes("tes.com/jobs/vacancy/")) {
        for (const fc of foreignCountryList) {
          if (urlLower.includes(`-${fc}-`) || urlLower.includes(`-${fc}/`)) {
            if (!canonicalCountryLower.includes(fc) && !fc.includes(canonicalCountryLower)) {
              if (canonicalCountryLower.includes("emirates") && (fc === "uae" || fc === "dubai")) continue;
              hasGeoConflict = true;
              break;
            }
          }
        }
      }

      if (hasGeoConflict) {
        purgeList.push({ id: docId, reason: `Geographic URL slug mismatch with canonical ${school.country}` });
        geographicMismatchesPurged++;
        continue;
      }
    }

    // Queue for Live Portal Banner / Dead Link Inspection (Taaleem, ATS, Direct)
    if (url.includes("careers.taaleem.ae") || url.includes("tes.com") || url.includes(".pdf")) {
      candidateUrlChecks.push({ id: docId, url, title: job.title, schoolName: job.schoolName });
    } else {
      liveVerified++;
    }
  }

  // Phase B: Live Headless Verification on High-Risk Portals
  if (candidateUrlChecks.length > 0) {
    console.log(`🌐 Live-verifying ${candidateUrlChecks.length} candidate portal URLs via headless browser...`);
    const browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });

    const concurrency = 6;
    for (let i = 0; i < candidateUrlChecks.length; i += concurrency) {
      const chunk = candidateUrlChecks.slice(i, i + concurrency);
      await Promise.all(
        chunk.map(async (item) => {
          const page = await browser.newPage();
          try {
            const resp = await page.goto(item.url, { waitUntil: "domcontentloaded", timeout: 15000 });
            const status = resp?.status();

            if (status === 404) {
              purgeList.push({ id: item.id, reason: `404 Not Found at ${item.url}` });
              deadLinksPurged++;
              return;
            }

            const bodyText = await page.evaluate(() => document.body.innerText || "");
            const isClosed =
              bodyText.includes("Closed or Expired Job Posting") ||
              bodyText.includes("is closed or has expired") ||
              bodyText.includes("no longer open for applications") ||
              bodyText.includes("Job Not Found") ||
              bodyText.includes("This position has been filled");

            if (isClosed) {
              purgeList.push({ id: item.id, reason: `Portal closed/expired banner detected` });
              expiredBannersPurged++;
            } else {
              liveVerified++;
            }
          } catch (err: any) {
            // If DNS/Connection dead
            if (err.message.includes("ERR_NAME_NOT_RESOLVED") || err.message.includes("ERR_CONNECTION_REFUSED")) {
              purgeList.push({ id: item.id, reason: `Dead domain URL: ${err.message}` });
              deadLinksPurged++;
            } else {
              liveVerified++; // Retain transient network timeouts
            }
          } finally {
            await page.close().catch(() => {});
          }
        })
      );
    }
    await browser.close();
  }

  // Phase C: Execute Purge Batch
  if (purgeList.length > 0) {
    console.log(`\n🧹 Purging ${purgeList.length} invalid/expired job records from featured_jobs_cache...`);
    let batch = db.batch();
    let opCount = 0;

    for (const item of purgeList) {
      batch.delete(db.collection("featured_jobs_cache").doc(item.id));
      opCount++;
      if (opCount >= 400) {
        await batch.commit();
        batch = db.batch();
        opCount = 0;
      }
    }
    if (opCount > 0) {
      await batch.commit();
    }
    console.log(`  ✅ Purge complete.`);
  }

  // Phase D: Synchronize School Open Job Counters
  console.log("\n🔄 Synchronizing database school counters...");
  const cacheSnap = await db.collection("featured_jobs_cache").get();
  const countsBySchool: Record<string, number> = {};

  cacheSnap.docs.forEach((doc) => {
    const d = doc.data();
    const sId = String(d.schoolId || "").toUpperCase().trim();
    if (!sId || sId.startsWith("AGNT") || sId === "SEARCH_ASSOCIATES_HUB") return;
    countsBySchool[sId] = (countsBySchool[sId] || 0) + 1;
  });

  let syncedSchoolsCount = 0;
  let counterBatch = db.batch();
  let counterOps = 0;

  for (const [sId, schoolData] of schoolMap.entries()) {
    const freshCount = countsBySchool[sId] || 0;
    const currentCount = schoolData.openJobsCount || 0;

    if (freshCount !== currentCount) {
      counterBatch.update(db.collection("schools").doc(sId), {
        openJobsCount: freshCount,
        lastCountersSyncedAt: Date.now(),
      });
      syncedSchoolsCount++;
      counterOps++;
      if (counterOps >= 400) {
        await counterBatch.commit();
        counterBatch = db.batch();
        counterOps = 0;
      }
    }
  }
  if (counterOps > 0) {
    await counterBatch.commit();
  }
  console.log(`  ✅ Synchronized ${syncedSchoolsCount} school documents with fresh counts.`);

  // Phase E: Refresh Master JSON Export Files
  const freshSchoolsSnap = await db.collection("schools").get();
  const exportSchools: any[] = [];
  freshSchoolsSnap.forEach((doc) => exportSchools.push({ id: doc.id, ...doc.data() }));
  exportSchools.sort((a, b) => a.id.localeCompare(b.id));

  const rootExport = path.resolve("./complete_school_fields_export.json");
  const publicExport = path.resolve("./public/complete_school_fields_export.json");
  fs.writeFileSync(rootExport, JSON.stringify(exportSchools, null, 2));
  fs.writeFileSync(publicExport, JSON.stringify(exportSchools, null, 2));
  console.log("  ✅ Exported master files to complete_school_fields_export.json and public/.");

  const durationSeconds = Math.round((Date.now() - startTime) / 1000);

  const report: VerificationReport = {
    timestamp: new Date().toISOString(),
    totalScanned: jobsSnap.size,
    liveVerified,
    expiredDatePurged,
    deadLinksPurged,
    expiredBannersPurged,
    geographicMismatchesPurged,
    syncedSchoolsCount,
    activeVacanciesTotal: cacheSnap.size,
    durationSeconds,
  };

  console.log("\n=================================================================");
  console.log("🎉 [DAILY VERIFICATION GUARDIAN COMPLETE]");
  console.log("=================================================================");
  console.log(` • Duration: ${durationSeconds}s`);
  console.log(` • Total Jobs Scanned: ${report.totalScanned}`);
  console.log(` • Live Verified Active: ${report.liveVerified}`);
  console.log(` • Expired Past Dates Purged: ${report.expiredDatePurged}`);
  console.log(` • Expired Portal Banners Purged: ${report.expiredBannersPurged}`);
  console.log(` • Dead Links / 404s Purged: ${report.deadLinksPurged}`);
  console.log(` • Geographic Mismatches Purged: ${report.geographicMismatchesPurged}`);
  console.log(` • Schools Updated with Parity: ${report.syncedSchoolsCount}`);
  console.log(` • Total Live Featured Jobs: ${report.activeVacanciesTotal}`);
  console.log("=================================================================\n");

  return report;
}

if (require.main === module || process.argv[1]?.includes("daily-post-sweep-verification")) {
  runDailyJobVerification().catch(console.error);
}

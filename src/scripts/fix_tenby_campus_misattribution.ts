/**
 * 🇲🇾 FIX TENBY CAMPUS MISATTRIBUTION SCRIPT
 *
 * Scans the 18 Tenby jobs identified in the Workday diagnostic report
 * that were mapped to FLIS0204 ("Tenby International School Setia Eco Park").
 *
 * Actions:
 * - CONFIRM (9 jobs): "Tenby World Sdn Bhd" -> Genuine Setia Eco Park campus
 * - REJECT (9 jobs): Other Tenby campuses not in the canonical database:
 *     * Tenby Ecohill Sdn Bhd (2 jobs - Semenyih)
 *     * Tenby Southern Sdn Bhd (2 jobs - Setia Eco Gardens, Pekan Nanas)
 *     * Tenby Education Sdn Bhd (2 jobs - Penang / National)
 *     * Fondcare Sdn Bhd (1 job - Penang International)
 *     * Tenby Aman Sdn Bhd (1 job - Tropicana Aman)
 *     * Ipoh International School Sdn Bhd (1 job - Ipoh)
 *
 * SAFETY: Dry run by default. Zero writes without `--commit`.
 *
 * Usage:
 *   npx tsx src/scripts/fix_tenby_campus_misattribution.ts          (dry run)
 *   npx tsx src/scripts/fix_tenby_campus_misattribution.ts --commit (apply writes)
 */

import * as fs from "fs";
import * as path from "path";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const saPath = path.resolve(process.cwd(), "service-account.json");
if (fs.existsSync(saPath)) {
  const serviceAccount = require(saPath);
  if (!getApps().length) {
    initializeApp({ credential: cert(serviceAccount) });
  }
}
const db = getFirestore();

const COMMIT = process.argv.includes("--commit");

const OTHER_TENBY_ENTITIES: Record<string, string> = {
  "Tenby Ecohill Sdn Bhd": "Tenby Setia EcoHill (Semenyih)",
  "Tenby Southern Sdn Bhd": "Tenby Setia Eco Gardens (Pekan Nanas)",
  "Tenby Education Sdn Bhd": "Tenby Penang / National",
  "Fondcare Sdn Bhd": "Tenby Penang International",
  "Tenby Aman Sdn Bhd": "Tenby Tropicana Aman (Telok Panglima Garang)",
  "Ipoh International School Sdn Bhd": "Tenby Ipoh",
};

function findLatestDiagnosticReport(): string {
  const outputDir = path.resolve(process.cwd(), "src/scripts/output");
  const files = fs
    .readdirSync(outputDir)
    .filter((f) => f.startsWith("isp_school_and_dates_diagnostic_") && f.endsWith(".json"))
    .sort()
    .reverse();

  if (files.length === 0) {
    throw new Error("No isp_school_and_dates_diagnostic_*.json report found in src/scripts/output");
  }

  return path.join(outputDir, files[0]);
}

async function main() {
  console.log("🏫 [TENBY CAMPUS RECONCILIATION] Evaluating Tenby jobs for FLIS0204...");
  console.log(`Mode: ${COMMIT ? "🔴 COMMIT (LIVE WRITES)" : "🟢 DRY RUN (READ ONLY)"}\n`);

  const reportPath = findLatestDiagnosticReport();
  const rawReport = JSON.parse(fs.readFileSync(reportPath, "utf-8"));
  const reportResults: any[] = rawReport.results || [];

  const tenbyWorkdayJobs = reportResults.filter((r) => {
    const org = (r.hiringOrgName || "").toLowerCase();
    return org.includes("tenby") || org.includes("ipoh") || org.includes("fondcare");
  });

  const toConfirm: any[] = [];
  const toReject: any[] = [];

  for (const job of tenbyWorkdayJobs) {
    const org = job.hiringOrgName || "";
    if (org === "Tenby World Sdn Bhd") {
      toConfirm.push({
        docId: job.docId,
        title: job.title,
        hiringOrg: org,
        campus: "Tenby Setia Eco Park (Canonical FLIS0204)",
        applyUrl: job.applyUrl,
      });
    } else if (OTHER_TENBY_ENTITIES[org]) {
      const campus = OTHER_TENBY_ENTITIES[org];
      toReject.push({
        docId: job.docId,
        title: job.title,
        hiringOrg: org,
        campus,
        applyUrl: job.applyUrl,
        reason: `Misattributed Tenby campus: belongs to ${campus} (legal entity: "${org}"), not canonical FLIS0204 (Tenby Setia Eco Park). Campus not in canonical database.`
      });
    }
  }

  console.log(`================ PLAN SUMMARY ================`);
  console.log(`✅ To KEEP / CONFIRM for FLIS0204: ${toConfirm.length} job(s) (Setia Eco Park)`);
  console.log(`🚫 To REJECT (Other Tenby Campuses): ${toReject.length} job(s)`);
  console.log(`==============================================\n`);

  console.log(`✅ CONFIRM CANDIDATES (${toConfirm.length} jobs — Tenby Setia Eco Park):`);
  for (const c of toConfirm) {
    console.log(`  - [KEEP] ${c.docId}: "${c.title}"`);
    console.log(`    Org:    ${c.hiringOrg}`);
    console.log(`    Campus: ${c.campus}\n`);
  }

  console.log(`🚫 REJECT CANDIDATES (${toReject.length} jobs — Other Campuses):`);
  for (const r of toReject) {
    console.log(`  - [REJECT] ${r.docId}: "${r.title}"`);
    console.log(`    Org:    ${r.hiringOrg}`);
    console.log(`    Campus: ${r.campus}`);
    console.log(`    Reason: ${r.reason}\n`);
  }

  if (!COMMIT) {
    console.log("--------------------------------------------------------");
    console.log("ℹ️  Dry run complete. Zero Firestore writes were made.");
    console.log("👉 Confirm the 9 reject candidates above. Run with --commit to apply.");
    console.log("--------------------------------------------------------");
    return;
  }

  console.log("📡 Committing updates to Firestore...");
  let count = 0;
  for (const r of toReject) {
    await db.collection("featured_jobs_cache").doc(r.docId).update({
      status: "rejected",
      unverifiableAttribution: true,
      rejectionReason: r.reason,
      rejectedAt: new Date().toISOString()
    });
    count++;
  }

  console.log(`🎉 Successfully updated ${count} jobs to status: "rejected".`);
}

main().catch((err) => {
  console.error("❌ Error running fix_tenby_campus_misattribution:", err);
  process.exit(1);
});

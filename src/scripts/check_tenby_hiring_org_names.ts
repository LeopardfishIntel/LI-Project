/**
 * 🇲🇾 TENBY HIRING ORGANIZATION AUDIT SCRIPT
 *
 * Scans the latest ISP Workday diagnostic report for all jobs whose
 * `hiringOrgName` mentions "tenby", "ipoh", or "fondcare".
 * Groups results by exact legal-entity name so they can be reviewed
 * against FLIS0204 ("Tenby International School Setia Eco Park").
 *
 * READ-ONLY: Performs zero writes.
 *
 * Usage:
 *   npx tsx src/scripts/check_tenby_hiring_org_names.ts
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

interface DiagnosticResult {
  docId: string;
  title: string;
  storedSchoolId: string;
  storedSchoolName: string;
  applyUrl: string;
  hiringOrgName?: string | null;
  jsonLdDatePosted?: string | null;
  jsonLdValidThrough?: string | null;
  flags?: string[];
}

async function main() {
  const reportPath = findLatestDiagnosticReport();
  console.log(`📄 Using diagnostic report: ${reportPath}\n`);

  const raw = fs.readFileSync(reportPath, "utf-8");
  const data = JSON.parse(raw);
  const results: DiagnosticResult[] = data.results || [];

  // Filter jobs matching tenby, ipoh, or fondcare
  const tenbyJobs = results.filter((r) => {
    const org = (r.hiringOrgName || "").toLowerCase();
    return org.includes("tenby") || org.includes("ipoh") || org.includes("fondcare");
  });

  console.log(`🔍 Found ${tenbyJobs.length} total jobs matching Tenby / Ipoh / Fondcare entities.`);

  // Group by exact hiringOrgName
  const grouped = new Map<string, DiagnosticResult[]>();
  for (const job of tenbyJobs) {
    const org = job.hiringOrgName || "(Unknown Org)";
    if (!grouped.has(org)) {
      grouped.set(org, []);
    }
    grouped.get(org)!.push(job);
  }

  console.log(`🏢 Unique Legal Entity Names Found: ${grouped.size}\n`);

  let entityIndex = 1;
  for (const [orgName, jobs] of grouped.entries()) {
    console.log(`================================================================================`);
    console.log(`[Entity #${entityIndex}] "${orgName}" — ${jobs.length} job(s)`);
    console.log(`================================================================================`);
    for (const j of jobs) {
      console.log(`  - Doc ID:      ${j.docId}`);
      console.log(`    Title:       ${j.title}`);
      console.log(`    Stored As:   ${j.storedSchoolName} (${j.storedSchoolId})`);
      console.log(`    Apply URL:   ${j.applyUrl}`);
      console.log(`    Date Posted: ${j.jsonLdDatePosted || "null"}`);
      console.log(`    Closing:     ${j.jsonLdValidThrough || "null"}`);
      console.log(``);
    }
    entityIndex++;
  }

  // Cross-reference with FLIS0204 in database if Firestore is available
  try {
    const db = getFirestore();
    const docSnap = await db.collection("schools").doc("FLIS0204").get();
    if (docSnap.exists) {
      const d = docSnap.data() || {};
      console.log(`================================================================================`);
      console.log(`🏫 CANONICAL DATABASE SCHOOL FLIS0204:`);
      console.log(`================================================================================`);
      console.log(`  Name:        ${d.name || d.schoolname}`);
      console.log(`  City:        ${d.city}`);
      console.log(`  Country:     ${d.country}`);
      console.log(`  Group:       ${d.group || d.schoolGroup || d.ownership}`);
      console.log(`  Aliases:     ${JSON.stringify(d.aliases || [])}`);
      console.log(`  Legal Names: ${JSON.stringify(d.legalNames || d.legal_names || [])}`);
      console.log(`================================================================================\n`);
    }
  } catch (err: any) {
    console.log(`ℹ️ Could not query Firestore for FLIS0204: ${err.message}`);
  }
}

main().catch((err) => {
  console.error("❌ Error running check_tenby_hiring_org_names:", err);
  process.exit(1);
});

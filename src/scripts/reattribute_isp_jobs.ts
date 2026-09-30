/**
 * 🔄 RE-ATTRIBUTION & REJECTION SCRIPT — ISP Workday School Matching
 *
 * Re-evaluates currently stored ISP jobs using the hiringOrganization values
 * captured in the diagnostic report against EVERY school in Firestore using
 * matchSchoolEntity() (including legalNames).
 *
 * Actions:
 * - REATTRIBUTE: If a school matches with score >= 0.85, update schoolId,
 *   schoolName, city, country, datePosted, and closingDate.
 *   CRITICAL: Never sets status to "approved".
 * - REJECT: If no school matches, mark status: "rejected", unverifiableAttribution: true,
 *   and record rejectionReason.
 *
 * SAFETY: Dry run by default. Zero writes without `--commit`.
 * Reads local diagnostic JSON on disk — no live HTTP fetches.
 *
 * Usage:
 *   npx tsx src/scripts/reattribute_isp_jobs.ts           (dry run)
 *   npx tsx src/scripts/reattribute_isp_jobs.ts --commit  (commit changes)
 */

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as fs from "fs";
import * as path from "path";
import { createRequire } from "module";
import { matchSchoolEntity, SchoolEntity } from "../lib/crawler/entityMatcher";

const require = createRequire(import.meta.url);
const serviceAccount = require("../../service-account.json");
if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

const COMMIT = process.argv.includes("--commit");

interface ReattributePlanItem {
  docId: string;
  title: string;
  currentSchoolId: string;
  currentSchoolName: string;
  hiringOrgName: string | null;
  action: "REATTRIBUTE" | "REJECT";
  targetSchoolId?: string;
  targetSchoolName?: string;
  targetCity?: string;
  targetCountry?: string;
  matchScore?: number;
  matchType?: string;
  datePosted?: string | null;
  closingDate?: string | null;
  reason: string;
}

function findLatestDiagnosticReport(): string {
  const outputDir = path.resolve(process.cwd(), "src/scripts/output");
  const files = fs
    .readdirSync(outputDir)
    .filter((f) => f.startsWith("isp_school_and_dates_diagnostic_") && f.endsWith(".json"))
    .sort();
  if (files.length === 0) {
    throw new Error("No isp_school_and_dates_diagnostic_*.json report found in src/scripts/output/.");
  }
  return path.join(outputDir, files[files.length - 1]);
}

async function main() {
  console.log("🔍 [ISP REATTRIBUTION] Initializing ISP Re-attribution Plan...\n");

  const reportPath = findLatestDiagnosticReport();
  console.log(`📄 Using diagnostic report: ${reportPath}`);
  const report = JSON.parse(fs.readFileSync(reportPath, "utf-8"));
  const results: any[] = report.results || [];

  // 1. Fetch schools from Firestore
  console.log("📡 Fetching canonical schools from Firestore...");
  const schoolsSnap = await db.collection("schools").get();
  const schoolEntities: SchoolEntity[] = schoolsSnap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name || data.schoolname || "",
      schoolname: data.schoolname || data.name || "",
      city: data.city || "",
      country: data.country || "",
      aliases: Array.isArray(data.aliases) ? data.aliases : [],
      legalNames: Array.isArray(data.legalNames)
        ? data.legalNames
        : Array.isArray(data.legal_names)
        ? data.legal_names
        : [],
      group: data.group || data.schoolGroup || data.ownership || "",
    } as any;
  });
  console.log(`✅ Loaded ${schoolEntities.length} canonical schools.\n`);

  // 2. Build plan
  const plan: ReattributePlanItem[] = [];

  for (const row of results) {
    const docId = row.docId;
    const title = row.title || "";
    const currentSchoolId = row.storedSchoolId || "";
    const currentSchoolName = row.storedSchoolName || "";
    const hiringOrgName = row.hiringOrgName || null;
    const jsonLdDatePosted = row.jsonLdDatePosted || null;
    const jsonLdValidThrough = row.jsonLdValidThrough || null;

    if (!hiringOrgName || !hiringOrgName.trim()) {
      plan.push({
        docId,
        title,
        currentSchoolId,
        currentSchoolName,
        hiringOrgName: null,
        action: "REJECT",
        reason: "Missing hiringOrganization in JobPosting JSON-LD. Unverifiable school attribution.",
      });
      continue;
    }

    // Match hiringOrganization against all schools
    let bestSchool: SchoolEntity | null = null;
    let bestScore = 0;
    let bestMatchType = "none";
    let bestReason = "";

    for (const school of schoolEntities) {
      const matchRes = matchSchoolEntity(school, { candidateText: hiringOrgName }, 0.85);
      if (matchRes.isMatch && matchRes.score > bestScore) {
        bestScore = matchRes.score;
        bestSchool = school;
        bestMatchType = matchRes.matchType;
        bestReason = matchRes.reason || "";
      }
    }

    if (bestSchool && bestScore >= 0.85) {
      plan.push({
        docId,
        title,
        currentSchoolId,
        currentSchoolName,
        hiringOrgName,
        action: "REATTRIBUTE",
        targetSchoolId: bestSchool.id,
        targetSchoolName: bestSchool.name || bestSchool.schoolname,
        targetCity: bestSchool.city,
        targetCountry: bestSchool.country,
        matchScore: bestScore,
        matchType: bestMatchType,
        datePosted: jsonLdDatePosted,
        closingDate: jsonLdValidThrough,
        reason: `Matched "${hiringOrgName}" with score ${bestScore.toFixed(2)} (${bestMatchType}): ${bestReason}`,
      });
    } else {
      plan.push({
        docId,
        title,
        currentSchoolId,
        currentSchoolName,
        hiringOrgName,
        action: "REJECT",
        reason: `Unverifiable school attribution: hiringOrganization "${hiringOrgName}" did not match any school in database.`,
      });
    }
  }

  // 3. Summarize plan
  const reattributeItems = plan.filter((p) => p.action === "REATTRIBUTE");
  const rejectItems = plan.filter((p) => p.action === "REJECT");

  console.log("================ ISP REATTRIBUTION PLAN ================");
  console.log(`📊 Total Jobs Evaluated:  ${plan.length}`);
  console.log(`🔄 To REATTRIBUTE:         ${reattributeItems.length}`);
  console.log(`🚫 To REJECT:              ${rejectItems.length}`);
  console.log(`⚙️  Mode:                   ${COMMIT ? "🔴 COMMIT (WRITING TO FIRESTORE)" : "🟢 DRY RUN (READ ONLY)"}`);
  console.log("========================================================\n");

  if (reattributeItems.length > 0) {
    console.log(`🔄 REATTRIBUTE CANDIDATES (${reattributeItems.length} jobs):\n`);
    for (const item of reattributeItems) {
      const isMoved = item.currentSchoolId !== item.targetSchoolId;
      console.log(`- [${isMoved ? "MOVE" : "CONFIRM"}] ${item.docId}: "${item.title}"`);
      console.log(`   From:        ${item.currentSchoolName} (${item.currentSchoolId})`);
      console.log(`   To:          ${item.targetSchoolName} (${item.targetSchoolId})`);
      console.log(`   Hiring Org:  ${item.hiringOrgName}`);
      console.log(`   Match:       score=${item.matchScore?.toFixed(2)} (${item.matchType})`);
      console.log(`   datePosted:  ${item.datePosted || "(unchanged)"}`);
      console.log(`   closingDate: ${item.closingDate || "null"}\n`);
    }
  }

  if (rejectItems.length > 0) {
    console.log(`🚫 REJECT CANDIDATES (${rejectItems.length} jobs):\n`);
    for (const item of rejectItems) {
      console.log(`- [REJECT] ${item.docId}: "${item.title}"`);
      console.log(`   Stored School: ${item.currentSchoolName} (${item.currentSchoolId})`);
      console.log(`   Hiring Org:    ${item.hiringOrgName || "(none)"}`);
      console.log(`   Reason:        ${item.reason}\n`);
    }
  }

  // 4. Execution if --commit
  if (!COMMIT) {
    console.log("--------------------------------------------------------");
    console.log("ℹ️  Dry run complete. Zero Firestore writes were made.");
    console.log("👉 Review the plan above. Run with --commit to apply.");
    console.log("--------------------------------------------------------");
    return;
  }

  console.log("🚀 Executing Firestore updates...");
  let reattributedCount = 0;
  let rejectedCount = 0;

  for (const item of plan) {
    const docRef = db.collection("featured_jobs_cache").doc(item.docId);

    if (item.action === "REATTRIBUTE") {
      const updateData: Record<string, any> = {
        schoolId: item.targetSchoolId,
        schoolName: item.targetSchoolName,
        city: item.targetCity || "",
        country: item.targetCountry || "",
        reattributedAt: new Date().toISOString(),
        reattributionReason: item.reason,
      };
      if (item.datePosted) {
        updateData.datePosted = item.datePosted;
      }
      if (item.closingDate !== undefined) {
        updateData.closingDate = item.closingDate;
      }
      await docRef.update(updateData);
      reattributedCount++;
    } else {
      await docRef.update({
        status: "rejected",
        unverifiableAttribution: true,
        rejectionReason: item.reason,
        rejectedAt: new Date().toISOString(),
      });
      rejectedCount++;
    }
  }

  console.log(`\n✅ Successfully committed ${reattributedCount} re-attributions and ${rejectedCount} rejections.`);
}

main().catch((err) => {
  console.error("❌ Re-attribution failed:", err);
  process.exit(1);
});

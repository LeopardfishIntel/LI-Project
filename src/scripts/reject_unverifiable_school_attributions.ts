/**
 * 🗑️ REJECTION SCRIPT — Unverifiable School Attributions
 *
 * Enforces policy: only show jobs whose school attribution is 100% verifiable.
 * Anything ambiguous gets excluded/rejected, not flagged for review.
 *
 * 1. Reads the latest diagnostic report (src/scripts/output/tes_employer_mismatch_diagnostic_*.json),
 *    takes every MISMATCH and NO_HIRING_ORG_DATA row, and sets that featured_jobs_cache doc's
 *    status to "rejected" with a rejectionReason field explaining why.
 *
 * 2. Reads the most recent taaleem_school_audit_*.json, finds every row flagged FALLBACK_SCHOOL
 *    (the 18 rows sitting on the legacy FLIS0104 fallback), and sets status to "rejected" with
 *    rejectionReason — since none of them cleared a confident re-match, they do not meet the
 *    100% verifiable bar.
 *
 * SAFETY: dry-run by default. Prints full plan first (docId, current school, reason, engine).
 * Zero writes without --commit.
 *
 * Usage:
 *   npx tsx src/scripts/reject_unverifiable_school_attributions.ts            (dry run)
 *   npx tsx src/scripts/reject_unverifiable_school_attributions.ts --commit   (writes)
 */

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as fs from "fs";
import * as path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const serviceAccount = require("../../service-account.json");
if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

const COMMIT = process.argv.includes("--commit");

interface RejectionPlanItem {
  docId: string;
  engine: "TES" | "Taaleem";
  title?: string;
  currentSchoolId?: string;
  currentSchoolName?: string;
  rejectionReason: string;
}

function findLatestFile(pattern: string): string {
  const outputDir = path.resolve(process.cwd(), "src/scripts/output");
  const files = fs
    .readdirSync(outputDir)
    .filter((f) => f.startsWith(pattern) && f.endsWith(".json"))
    .sort();
  if (files.length === 0) {
    throw new Error(`No ${pattern}*.json report found in src/scripts/output/.`);
  }
  return path.join(outputDir, files[files.length - 1]);
}

async function main() {
  console.log("🔍 [UNVERIFIABLE REJECTION] Preparing plan for unverifiable school attributions...\n");

  const tesDiagnosticPath = findLatestFile("tes_employer_mismatch_diagnostic_");
  console.log(`📄 Using TES diagnostic report: ${tesDiagnosticPath}`);
  const tesReport = JSON.parse(fs.readFileSync(tesDiagnosticPath, "utf-8"));
  const tesResults: any[] = tesReport.results || [];

  const taaleemAuditPath = findLatestFile("taaleem_school_audit_");
  console.log(`📄 Using Taaleem audit report:    ${taaleemAuditPath}\n`);
  const taaleemReport = JSON.parse(fs.readFileSync(taaleemAuditPath, "utf-8"));
  const taaleemResults: any[] = taaleemReport.results || [];

  const plan: RejectionPlanItem[] = [];
  const seenDocIds = new Set<string>();

  // 1. Process TES MISMATCH and NO_HIRING_ORG_DATA rows
  const tesProblemRows = tesResults.filter(
    (r) => r.verdict === "MISMATCH" || r.verdict === "NO_HIRING_ORG_DATA"
  );

  for (const row of tesProblemRows) {
    if (seenDocIds.has(row.docId)) continue;
    seenDocIds.add(row.docId);

    const reason =
      row.verdict === "MISMATCH"
        ? `TES Employer Mismatch: JSON-LD hiringOrganization "${row.hiringOrgName || "unknown"}" does not confidently match stored school "${row.storedSchoolName}" (${row.storedSchoolId}). Unverifiable school attribution.`
        : `TES Missing Data: JSON-LD hiringOrganization is missing or empty. Unverifiable school attribution.`;

    plan.push({
      docId: row.docId,
      engine: "TES",
      title: row.title,
      currentSchoolId: row.storedSchoolId,
      currentSchoolName: row.storedSchoolName,
      rejectionReason: reason,
    });
  }

  // 2. Process Taaleem FALLBACK_SCHOOL rows
  const taaleemFallbackRows = taaleemResults.filter(
    (r) => Array.isArray(r.flags) && r.flags.includes("FALLBACK_SCHOOL")
  );

  for (const row of taaleemFallbackRows) {
    if (seenDocIds.has(row.docId)) continue;
    seenDocIds.add(row.docId);

    plan.push({
      docId: row.docId,
      engine: "Taaleem",
      title: row.title,
      currentSchoolId: row.storedSchoolId,
      currentSchoolName: row.storedSchoolName,
      rejectionReason: `Legacy Fallback Attribution: Record was placed on default FLIS0104 fallback without a confident campus match. Unverifiable school attribution.`,
    });
  }

  // 3. Print plan
  console.log("==================== REJECTION PLAN ====================");
  console.log(`Total records planned for rejection: ${plan.length} (${tesProblemRows.length} TES, ${taaleemFallbackRows.length} Taaleem)\n`);

  for (const p of plan) {
    console.log(
      `🗑️  [${p.engine}] ${p.docId} — "${p.title}"\n   Current School: ${p.currentSchoolName} (${p.currentSchoolId})\n   Reason:         ${p.rejectionReason}\n   Action:         status -> "rejected"\n`
    );
  }
  console.log("========================================================\n");

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputDir = path.resolve(process.cwd(), "src/scripts/output");
  const planPath = path.join(outputDir, `unverifiable_rejection_plan_${timestamp}.json`);
  fs.writeFileSync(planPath, JSON.stringify(plan, null, 2), "utf-8");
  console.log(`📁 Plan written to: ${planPath}`);

  if (!COMMIT) {
    console.log("\n🛑 Dry run only — ZERO writes made to Firestore. Review the plan above and re-run with --commit to apply.");
    return;
  }

  console.log("\n✍️  --commit passed — rejecting records in featured_jobs_cache...");
  let applied = 0;
  let errors = 0;

  for (const p of plan) {
    try {
      const ref = db.collection("featured_jobs_cache").doc(p.docId);
      const snap = await ref.get();
      if (!snap.exists) {
        console.warn(`   ⚠️  Skipping ${p.docId} — doc no longer exists in featured_jobs_cache.`);
        continue;
      }

      await ref.set(
        {
          status: "rejected",
          rejectionReason: p.rejectionReason,
          rejectedAt: Date.now(),
          unverifiableAttribution: true,
        },
        { merge: true }
      );
      applied++;
    } catch (err: any) {
      errors++;
      console.error(`   ❌ Failed to reject ${p.docId}:`, err?.message || err);
    }
  }

  console.log(`\n✅ Applied ${applied}/${plan.length} rejections. ${errors} errors.`);
}

main().catch((err) => {
  console.error("❌ Rejection script failed:", err);
  process.exit(1);
});

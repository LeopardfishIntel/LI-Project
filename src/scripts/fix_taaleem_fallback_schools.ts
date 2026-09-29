/**
 * 🛠️ CORRECTION — Legacy Taaleem Fallback Jobs
 *
 * Fixes the 18 (as of the last audit run) featured_jobs_cache records that
 * are still sitting on the old hardcoded FLIS0104 fallback from the
 * pre-rebuild sync-taaleem.ts. Reads the most recent
 * taaleem_school_audit_*.json report and, for each FALLBACK_SCHOOL row:
 *
 *   - If today's entityMatcher found a high-confidence real match:
 *       re-attributes schoolId/schoolName/city/country to that school,
 *       records matchConfidence + a correction note, and sets status to
 *       "pending_review" — NEVER auto-approved. A human still has to hit
 *       Approve in the admin panel.
 *   - If no confident match exists even today (central office roles,
 *     unmapped community schools):
 *       leaves the school attribution alone (we have nothing better to
 *       assign it to) but forces status to "pending_review" and adds a
 *       flag/reason so it surfaces for a human to manually reassign or
 *       remove, instead of silently staying "approved" under the wrong
 *       school.
 *
 * SAFETY: dry-run by default. Prints every planned change and writes a
 * plan JSON to src/scripts/output/. Pass --commit to actually write to
 * Firestore. Nothing here sets status to "approved" — every touched
 * record goes back into the review queue.
 *
 * Usage:
 *   npx tsx src/scripts/fix_taaleem_fallback_schools.ts            (dry run)
 *   npx tsx src/scripts/fix_taaleem_fallback_schools.ts --commit   (writes)
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

interface TaaleemAuditRow {
  docId: string;
  jobId?: string;
  title?: string;
  storedSchoolId?: string;
  storedSchoolName?: string;
  storedCity?: string;
  storedCountry?: string;
  applyUrl?: string;
  bestMatch: {
    schoolId?: string;
    schoolName?: string;
    city?: string;
    country?: string;
    score: number;
    matchType: string;
    confidence: string;
    reason?: string;
  } | null;
  flags: string[];
}

interface PlannedAction {
  docId: string;
  action: "REATTRIBUTE_AND_REVIEW" | "FLAG_FOR_MANUAL_REVIEW";
  title?: string;
  from: { schoolId?: string; schoolName?: string };
  to?: { schoolId?: string; schoolName?: string; city?: string; country?: string };
  reason: string;
}

function findLatestAuditReport(): string {
  const outputDir = path.resolve(process.cwd(), "src/scripts/output");
  const files = fs
    .readdirSync(outputDir)
    .filter((f) => f.startsWith("taaleem_school_audit_") && f.endsWith(".json"))
    .sort(); // ISO-ish timestamps in filenames sort chronologically
  if (files.length === 0) {
    throw new Error(
      "No taaleem_school_audit_*.json report found in src/scripts/output/. Run audit_taaleem_school_matches.ts first."
    );
  }
  return path.join(outputDir, files[files.length - 1]);
}

async function main() {
  const reportPath = findLatestAuditReport();
  console.log(`📄 Using audit report: ${reportPath}`);
  const report = JSON.parse(fs.readFileSync(reportPath, "utf-8"));
  const rows: TaaleemAuditRow[] = report.results || [];

  const fallbackRows = rows.filter((r) => r.flags.includes("FALLBACK_SCHOOL"));
  console.log(`🎯 Found ${fallbackRows.length} FALLBACK_SCHOOL rows to correct.\n`);

  const plan: PlannedAction[] = [];

  for (const row of fallbackRows) {
    const hasConfidentMatch =
      row.bestMatch &&
      row.bestMatch.confidence === "high" &&
      row.bestMatch.score >= 0.85 &&
      row.bestMatch.schoolId &&
      row.bestMatch.schoolId !== row.storedSchoolId;

    if (hasConfidentMatch && row.bestMatch) {
      plan.push({
        docId: row.docId,
        action: "REATTRIBUTE_AND_REVIEW",
        title: row.title,
        from: { schoolId: row.storedSchoolId, schoolName: row.storedSchoolName },
        to: {
          schoolId: row.bestMatch.schoolId,
          schoolName: row.bestMatch.schoolName,
          city: row.bestMatch.city,
          country: row.bestMatch.country,
        },
        reason: `Re-matched with high confidence (score=${row.bestMatch.score.toFixed(2)}) against today's entityMatcher. Was on legacy FLIS0104 fallback.`,
      });
    } else {
      plan.push({
        docId: row.docId,
        action: "FLAG_FOR_MANUAL_REVIEW",
        title: row.title,
        from: { schoolId: row.storedSchoolId, schoolName: row.storedSchoolName },
        reason: row.bestMatch
          ? `Best re-match confidence is only "${row.bestMatch.confidence}" (score=${row.bestMatch.score.toFixed(2)}) — not confident enough to auto-correct. Was on legacy FLIS0104 fallback.`
          : `No school match found at all, even with today's matcher. Was on legacy FLIS0104 fallback. Likely a central-office role or unmapped community school — needs manual assignment or removal.`,
      });
    }
  }

  console.log("================ PLANNED ACTIONS ================");
  for (const p of plan) {
    if (p.action === "REATTRIBUTE_AND_REVIEW") {
      console.log(
        `✏️  ${p.docId} — "${p.title}"\n   ${p.from.schoolName} (${p.from.schoolId}) -> ${p.to?.schoolName} (${p.to?.schoolId})\n   status -> pending_review | ${p.reason}\n`
      );
    } else {
      console.log(
        `🚩 ${p.docId} — "${p.title}"\n   staying on ${p.from.schoolName} (${p.from.schoolId}), flagged for manual review\n   status -> pending_review | ${p.reason}\n`
      );
    }
  }
  console.log("===================================================\n");

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputDir = path.resolve(process.cwd(), "src/scripts/output");
  const planPath = path.join(outputDir, `taaleem_fallback_fix_plan_${timestamp}.json`);
  fs.writeFileSync(planPath, JSON.stringify(plan, null, 2), "utf-8");
  console.log(`📁 Plan written to: ${planPath}`);

  if (!COMMIT) {
    console.log("\n🛑 Dry run only — no Firestore writes made. Re-run with --commit to apply.");
    return;
  }

  console.log("\n✍️  --commit passed — applying changes to featured_jobs_cache...");
  let applied = 0;
  let errors = 0;

  for (const p of plan) {
    try {
      const ref = db.collection("featured_jobs_cache").doc(p.docId);
      const snap = await ref.get();
      if (!snap.exists) {
        console.warn(`   ⚠️  Skipping ${p.docId} — doc no longer exists.`);
        continue;
      }

      if (p.action === "REATTRIBUTE_AND_REVIEW" && p.to) {
        await ref.set(
          {
            schoolId: p.to.schoolId,
            schoolName: p.to.schoolName,
            city: p.to.city || snap.data()?.city,
            country: p.to.country || snap.data()?.country,
            matchConfidence: "high",
            status: "pending_review",
            correctionNote: p.reason,
            correctedFromFallbackAt: Date.now(),
          },
          { merge: true }
        );
      } else {
        await ref.set(
          {
            status: "pending_review",
            flaggedForManualSchoolReview: true,
            flagReason: p.reason,
            flaggedAt: Date.now(),
          },
          { merge: true }
        );
      }
      applied++;
    } catch (err: any) {
      errors++;
      console.error(`   ❌ Failed to update ${p.docId}:`, err?.message || err);
    }
  }

  console.log(`\n✅ Applied ${applied}/${plan.length} corrections. ${errors} errors.`);
  console.log("Every touched record was set to status=pending_review — none were auto-approved.");
}

main().catch((err) => {
  console.error("❌ Fix script failed:", err);
  process.exit(1);
});

/**
 * 🔀 FIX: SCHOOL_MISMATCH reattribution (verified 2026-09-30)
 *
 * verify_mismatch_ground_truth.ts confirmed all 38 SCHOOL_MISMATCH groups
 * are genuine active misattribution — the job's schoolId foreign key points
 * to a different real school than its own cached title/schoolName/city/
 * country describe. This reattributes each job to the verified correct
 * schoolId, and refreshes the denormalized schoolName/city/country fields
 * to match that school's real live record (same pattern as
 * fix_dubai_school_misattribution.ts and fix_tenby_campus_misattribution.ts
 * earlier this project).
 *
 * SAFETY / SCOPE: reads src/scripts/output/mismatch_and_stale_report.json
 * (produced by report_mismatch_and_stale.ts) rather than hardcoding docIds,
 * so it always reflects the latest run. Any "from" schoolId that the report
 * maps to MORE THAN ONE distinct target school is EXCLUDED from the write
 * plan entirely and printed separately for manual review — per AGENTS.md's
 * multi-campus-operator warning (Aldar, GEMS, Taaleem, Bloom), a single
 * shared ID being claimed by two different real schools' worth of job text
 * is exactly the kind of thing that needs a human, not an automatic guess.
 * As of the 2026-09-30 report this excludes:
 *   - FLIS0028 (splits to both FLIS0027 Aldar Academies and FLIS0366 Yasmina
 *     British Academy — one duplicate TES posting even matched both ways
 *     across two doc IDs)
 *   - FLIS0113 (splits to both FLIS0350 Regent International School and
 *     FLIS0102 Raha International School)
 *
 * Dry run by default. Zero writes without --commit.
 *
 * Usage:
 *   npx tsx src/scripts/fix_school_mismatch_reattribution.ts          (dry run)
 *   npx tsx src/scripts/fix_school_mismatch_reattribution.ts --commit (apply)
 */

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as fs from "fs";
import * as path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const saPath = path.resolve(process.cwd(), "service-account.json");
if (fs.existsSync(saPath)) {
  const serviceAccount = require(saPath);
  if (!getApps().length) {
    initializeApp({ credential: cert(serviceAccount) });
  }
} else {
  const serviceAccount = require("../../service-account.json");
  if (!getApps().length) {
    initializeApp({ credential: cert(serviceAccount) });
  }
}
const db = getFirestore();

const COMMIT = process.argv.includes("--commit");

async function main() {
  console.log("🔀 [FIX SCHOOL_MISMATCH] Reattributing verified-wrong schoolIds");
  console.log(COMMIT ? "🔴 LIVE MODE — writes will be committed.\n" : "🟡 DRY RUN — no writes will be made.\n");

  const reportPath = path.resolve(process.cwd(), "src/scripts/output/mismatch_and_stale_report.json");
  if (!fs.existsSync(reportPath)) {
    console.error(`❌ ${reportPath} not found — run report_mismatch_and_stale.ts first.`);
    process.exit(1);
  }
  const report = JSON.parse(fs.readFileSync(reportPath, "utf-8"));

  const schoolsSnap = await db.collection("schools").get();
  const schoolsById = new Map(
    schoolsSnap.docs.map((d) => [String(d.id).toUpperCase(), { id: d.id, ...d.data() } as any])
  );

  // Find any fromId that maps to more than one distinct toId -> exclude entirely.
  const targetsByFrom = new Map<string, Set<string>>();
  for (const g of report.mismatchGroups) {
    const key = String(g.fromId).toUpperCase();
    if (!targetsByFrom.has(key)) targetsByFrom.set(key, new Set());
    targetsByFrom.get(key)!.add(String(g.toId).toUpperCase());
  }
  const ambiguousFromIds = new Set(
    Array.from(targetsByFrom.entries()).filter(([, targets]) => targets.size > 1).map(([id]) => id)
  );

  interface PlannedUpdate {
    docId: string;
    title: string;
    fromId: string;
    toId: string;
    toName: string;
    toCity: string;
    toCountry: string;
  }
  const planned: PlannedUpdate[] = [];
  const excluded: { fromId: string; targets: string[]; jobCount: number }[] = [];

  for (const g of report.mismatchGroups) {
    const fromKey = String(g.fromId).toUpperCase();
    const toKey = String(g.toId).toUpperCase();
    if (ambiguousFromIds.has(fromKey)) continue;

    const toSchool = schoolsById.get(toKey);
    if (!toSchool) continue; // shouldn't happen, verify script already confirmed these exist

    for (const job of g.jobs) {
      planned.push({
        docId: job.docId,
        title: job.title,
        fromId: g.fromId,
        toId: g.toId,
        toName: toSchool.name || toSchool.schoolname || "",
        toCity: toSchool.city || "",
        toCountry: toSchool.country || "",
      });
    }
  }

  for (const fromId of ambiguousFromIds) {
    const targets = Array.from(targetsByFrom.get(fromId) || []);
    const jobCount = report.mismatchGroups
      .filter((g: any) => String(g.fromId).toUpperCase() === fromId)
      .reduce((n: number, g: any) => n + g.jobs.length, 0);
    excluded.push({ fromId, targets, jobCount });
  }

  console.log(`✅ Plan: ${planned.length} job(s) will be reattributed.\n`);
  for (const p of planned) {
    console.log(`  ${p.docId} | "${p.title}"`);
    console.log(`    ${p.fromId} -> ${p.toId} (${p.toName}, ${p.toCity}, ${p.toCountry})`);
  }

  console.log(`\n⚠️  EXCLUDED (needs manual review — ambiguous, multiple real targets):`);
  for (const e of excluded) {
    console.log(`  ${e.fromId} -> ${e.targets.join(" AND ")} (${e.jobCount} job(s) — not touched by this script)`);
  }
  console.log("");

  if (!COMMIT) {
    console.log(`Dry run complete. ${planned.length} job(s) would be updated. Zero Firestore writes were made.`);
    console.log("Re-run with --commit to apply.");
    return;
  }

  const batch = db.batch();
  for (const p of planned) {
    const ref = db.collection("featured_jobs_cache").doc(p.docId);
    batch.update(ref, {
      schoolId: p.toId,
      schoolName: p.toName,
      city: p.toCity,
      country: p.toCountry,
      updatedAt: new Date().toISOString(),
    });
  }
  await batch.commit();
  console.log(`✅ ${planned.length} job(s) reattributed to their verified correct school.`);
  console.log(`ℹ️  ${excluded.reduce((n, e) => n + e.jobCount, 0)} job(s) left untouched pending manual review (see EXCLUDED list above).`);
}

main().catch((err) => {
  console.error("❌ Error:", err?.message || err);
  process.exit(1);
});

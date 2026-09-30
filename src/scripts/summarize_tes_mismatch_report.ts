/**
 * 📋 SUMMARIZE: the latest TES employer-mismatch diagnostic report
 *
 * diagnose_tes_employer_mismatch.ts (read-only, frozen-module-safe — it
 * only imports tes-adaptor.ts's exported extractJobPostingsFromHtml, never
 * modifies it) already ran and found, out of 904 audited: 133 MATCH,
 * 346 MISMATCH, 425 FETCH_FAILED. That's too much to review job-by-job.
 *
 * This groups the raw saved report (no new live fetches — reads the JSON
 * already on disk) so real patterns are visible:
 *   - MISMATCH grouped by (stored schoolName -> hiringOrganization name)
 *     pair, so a systemic pattern (e.g. one group-aggregator's postings
 *     all naming the parent operator instead of the specific campus) shows
 *     as one group instead of 346 unrelated lines — exactly like the
 *     SCHOOL_MISMATCH work done earlier today.
 *   - FETCH_FAILED grouped by failure reason/detail, so "non-TES URL
 *     tagged as TES" is distinguishable from "genuinely 404/expired".
 *
 * READ-ONLY. Reads the already-saved report file, makes zero network
 * calls and zero Firestore writes.
 *
 * Usage: npx tsx src/scripts/summarize_tes_mismatch_report.ts [path-to-report.json]
 *   (defaults to the newest tes_employer_mismatch_diagnostic_*.json in
 *   src/scripts/output/)
 */

import * as fs from "fs";
import * as path from "path";

function main() {
  const outDir = path.resolve(process.cwd(), "src/scripts/output");
  let reportPath = process.argv[2];
  if (!reportPath) {
    const files = fs.readdirSync(outDir).filter((f) => f.startsWith("tes_employer_mismatch_diagnostic_")).sort();
    if (files.length === 0) {
      console.error("❌ No tes_employer_mismatch_diagnostic_*.json found in src/scripts/output/. Run diagnose_tes_employer_mismatch.ts first.");
      process.exit(1);
    }
    reportPath = path.join(outDir, files[files.length - 1]);
  }
  console.log(`📋 Summarizing: ${reportPath}\n`);

  const raw = JSON.parse(fs.readFileSync(reportPath, "utf-8"));
  const results: any[] = Array.isArray(raw) ? raw : raw.results || [];

  // ---------------- MISMATCH grouping ----------------
  const mismatches = results.filter((r) => r.verdict === "MISMATCH");
  const mismatchGroups = new Map<string, { storedSchool: string; hiringOrg: string; items: any[] }>();
  for (const m of mismatches) {
    const storedSchool = m.storedSchoolName || "(unknown)";
    const hiringOrg = m.hiringOrgName || "(none extracted)";
    const key = `${storedSchool}=>${hiringOrg}`;
    if (!mismatchGroups.has(key)) mismatchGroups.set(key, { storedSchool, hiringOrg, items: [] });
    mismatchGroups.get(key)!.items.push(m);
  }
  const sortedMismatchGroups = Array.from(mismatchGroups.values()).sort((a, b) => b.items.length - a.items.length);

  console.log(`🔀 MISMATCH — ${mismatches.length} jobs across ${sortedMismatchGroups.length} distinct (stored -> hiringOrg) patterns:\n`);
  for (const g of sortedMismatchGroups.slice(0, 40)) {
    console.log(`  [${g.items.length}x] stored: "${g.storedSchool}"  ->  hiringOrganization: "${g.hiringOrg}"`);
    for (const item of g.items.slice(0, 2)) {
      console.log(`      e.g. ${item.docId}: "${item.title}" | ${item.applyUrl}`);
    }
  }
  if (sortedMismatchGroups.length > 40) console.log(`  ... and ${sortedMismatchGroups.length - 40} more groups (see full JSON)`);
  console.log("");

  // ---------------- FETCH_FAILED grouping ----------------
  const failed = results.filter((r) => r.verdict === "FETCH_FAILED");
  const failReasons = new Map<string, number>();
  for (const f of failed) {
    const isNonTes = !String(f.applyUrl || "").includes("tes.com/jobs/vacancy");
    const reasonKey = isNonTes ? "non-TES URL (school homepage / other domain, not a tes.com vacancy page)" : (f.detail || "unknown fetch error");
    failReasons.set(reasonKey, (failReasons.get(reasonKey) || 0) + 1);
  }
  console.log(`⚠️  FETCH_FAILED — ${failed.length} jobs, by reason:\n`);
  for (const [reason, count] of Array.from(failReasons.entries()).sort((a, b) => b[1] - a[1])) {
    console.log(`  [${count}x] ${reason}`);
  }
  console.log("");

  console.log("This script made ZERO network calls and ZERO Firestore writes. It only reads the saved report.");
}

main();

/**
 * SANDBOX VERIFICATION RUN (Phase 3)
 *
 * Targets ONE hub, writes NOTHING to Firestore (dryRun: true), and dumps both the
 * TeachAwayRunReport and the full job list to disk so you can inspect them before
 * turning this loose on the full regional sweep.
 *
 * This is the moment to confirm every "CONFIRM-IN-DEVTOOLS" assumption in teachaway.ts:
 *   - CARD_MARKER really matches real hub card text ("View Details" / "Quick Apply")
 *   - pagination advances (report.hubs[0].pages > 1 for a hub with more than one page)
 *   - report.hubs[0].statedTotal vs collected line up (no "count_mismatch")
 *   - at least one verified/needs_review job has a non-null closesAt, proving the
 *     JobPosting JSON-LD (or fallback text match) on the detail page actually parsed
 *
 * Usage:
 *   npx tsx src/scripts/sandbox_teachaway.ts
 *   npx tsx src/scripts/sandbox_teachaway.ts "https://www.teachaway.com/teaching-jobs-abroad/taaleem"
 *
 * Requires SCRAPER_CONTACT to be set (see .env.local) - a warning is logged if it isn't,
 * but the run still proceeds since this is a sandbox, not the production cron path.
 */
import { searchTeachAwayDbSchools, type TeachAwayRunReport } from "@/lib/search/teachaway";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const DEFAULT_HUB = "https://www.teachaway.com/teaching-jobs-abroad/taaleem";

async function main() {
  const hubUrl = process.argv[2] || DEFAULT_HUB;
  const outDir = join(process.cwd(), ".sandbox-output");
  mkdirSync(outDir, { recursive: true });

  console.log(`\n=== SANDBOX: Teach Away single-hub verification run ===`);
  console.log(`Hub: ${hubUrl}`);
  console.log(`Mode: dryRun=true (no Firestore writes), includeNeedsReview=true (see everything)\n`);

  let report: TeachAwayRunReport | null = null;

  const jobs = await searchTeachAwayDbSchools({
    onlyHubUrls: [hubUrl],
    dryRun: true,
    includeNeedsReview: true,
    maxPagesPerHub: 15, // safety ceiling for the sandbox, not the "real" cap
    maxDetailLookups: 40,
    deadlineMs: Date.now() + 5 * 60 * 1000, // 5 min is plenty for one hub
    onReport: (r) => {
      report = r;
    },
  });

  if (!report) {
    console.error("❌ No report was produced. searchTeachAwayDbSchools likely returned before the pipeline ran ");
    console.error("   (e.g. 0 FLIS schools matched the hub's implied country - check your `schools` collection).");
    process.exitCode = 1;
    return;
  }

  const finalReport = report as TeachAwayRunReport;

  writeFileSync(join(outDir, "report.json"), JSON.stringify(report, null, 2));
  writeFileSync(join(outDir, "jobs.json"), JSON.stringify(jobs, null, 2));

  console.log("--- Hub reports ---");
  for (const h of finalReport.hubs) {
    console.log(
      `  [${h.status}] ${h.url}\n    pages=${h.pages} collected=${h.collected} statedTotal=${h.statedTotal ?? "n/a"} complete=${h.complete}${h.note ? ` note="${h.note}"` : ""}`
    );
  }

  console.log("\n--- Totals ---");
  console.log(finalReport.totals);

  console.log("\n--- Rejection reasons (sample titles) ---");
  for (const [reason, count] of Object.entries(finalReport.rejectionsByReason)) {
    console.log(`  ${reason}: ${count}  e.g. ${JSON.stringify(finalReport.rejectionSamples[reason] || [])}`);
  }

  const withClosesAt = jobs.filter((j) => j.closesAt);
  const withRawOnly = jobs.filter((j) => !j.closesAt && j.closesAtRaw);
  console.log(
    `\n--- Closing dates --- \n  parsed: ${withClosesAt.length}/${jobs.length}  raw-but-unparsed: ${withRawOnly.length}  rolling/none: ${jobs.length - withClosesAt.length - withRawOnly.length}`
  );
  if (withRawOnly.length) {
    console.log("  Unparsed examples (fix parseAbsoluteDate for these formats):");
    withRawOnly.slice(0, 5).forEach((j) => console.log(`    "${j.closesAtRaw}" — ${j.title}`));
  }

  console.log(`\nFull dumps written to:\n  ${join(outDir, "report.json")}\n  ${join(outDir, "jobs.json")}`);

  if (finalReport.blocked) {
    console.warn("\n⚠️  Run stopped early: a bot challenge (Cloudflare or similar) was hit. See CARD_MARKER/BOT_UA notes.");
  }
  const badHubs = finalReport.hubs.filter((h) => h.status === "card_parse_failed" || h.status === "count_mismatch");
  if (badHubs.length) {
    console.warn(
      `\n⚠️  ${badHubs.length} hub(s) need attention before trusting this pipeline - see CARD_MARKER / PAGINATION / JOB_COUNTER_SELECTOR in teachaway.ts.`
    );
  }
}

main().catch((err) => {
  console.error("❌ Sandbox run failed:", err);
  process.exitCode = 1;
});

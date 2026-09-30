/**
 * 🔍 VERIFY: what is the "from" schoolId in a SCHOOL_MISMATCH really, today?
 *
 * report_mismatch_and_stale.ts groups mismatches by (current schoolId ->
 * suggested schoolId), but its "fromName" comes from the JOB's own cached
 * schoolName field — which can be stale from whenever the job was scraped,
 * not what that schoolId actually resolves to in the schools collection
 * right now. Before writing any reattribution script for the 85 flagged
 * jobs, we need to know: does the "from" ID currently belong to a genuinely
 * different real school (active misattribution, safe + correct to fix) or
 * does it just look that way because of a stale cached name (cosmetic)?
 *
 * READ-ONLY. Makes zero writes. For every SCHOOL_MISMATCH group, prints:
 *   - the "from" schoolId's ACTUAL current live school record (name/city/country)
 *   - the "to" (suggested) schoolId's live record
 *   - whether they're the same real school or two different real schools
 *
 * Usage:
 *   npx tsx src/scripts/verify_mismatch_ground_truth.ts
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

async function main() {
  console.log("🔍 GROUND-TRUTH VERIFICATION: SCHOOL_MISMATCH 'from' IDs");
  console.log("===========================================================\n");

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

  let sameRealSchool = 0;
  let differentRealSchool = 0;
  let fromMissing = 0;

  console.log(`${report.mismatchGroups.length} groups to check:\n`);

  for (const g of report.mismatchGroups) {
    const fromLive = schoolsById.get(String(g.fromId).toUpperCase());
    const toLive = schoolsById.get(String(g.toId).toUpperCase());

    const fromLiveName = fromLive ? (fromLive.name || fromLive.schoolname || "") : null;
    const toLiveName = toLive ? (toLive.name || toLive.schoolname || "") : null;

    let verdict: string;
    if (!fromLive) {
      verdict = "⚠️  FROM ID DOES NOT EXIST IN SCHOOLS COLLECTION";
      fromMissing++;
    } else {
      const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
      const same = normalize(fromLiveName || "") === normalize(toLiveName || "") && normalize(fromLiveName || "") !== "";
      if (same) {
        verdict = "= SAME real school (cosmetic — safe to reattribute)";
        sameRealSchool++;
      } else {
        verdict = "✗ DIFFERENT real school (active misattribution)";
        differentRealSchool++;
      }
    }

    console.log(`[${g.jobs.length}x] ${g.fromId} -> ${g.toId}`);
    console.log(`  cached job.schoolName said:  "${g.fromName}"`);
    console.log(`  ${g.fromId} LIVE record is:    ${fromLive ? `"${fromLiveName}" (${fromLive.city || "?"}, ${fromLive.country || "?"})` : "(no school doc at this ID)"}`);
    console.log(`  ${g.toId} LIVE record is:    "${toLiveName}" (${toLive?.city || "?"}, ${toLive?.country || "?"})`);
    console.log(`  Verdict: ${verdict}\n`);
  }

  console.log("================ SUMMARY ================");
  console.log(`Same real school (cosmetic, safe to bulk-fix):     ${sameRealSchool}`);
  console.log(`DIFFERENT real school (needs individual care):     ${differentRealSchool}`);
  console.log(`"from" ID has no school doc at all:                ${fromMissing}`);
  console.log("===========================================\n");
  console.log("This script made ZERO writes to Firestore. It only reads.");
}

main().catch((err) => {
  console.error("❌ Error:", err?.message || err);
  process.exit(1);
});

/**
 * 🔎 INVESTIGATE: 3 pending_review jobs Roger manually flagged (2026-09-30)
 *
 * Roger moved these 3 back to pending review from the admin staging queue
 * and needs to know why:
 *   1. "Head of Secondary" @ FLIS0106 (Nord Anglia Int'l School Dubai) —
 *      the apply link goes to a page saying "Sorry, this position has
 *      been filled."
 *   2. "Teacher of BTEC Business" @ FLIS0044 (shows as "Calcutta Int'l") —
 *      Roger says this is actually a Cheltenham Muscat job.
 *   3. "Teacher of Maths" @ FLIS0044 (same) — same issue.
 *
 * READ-ONLY. Pulls the full raw doc for each so we can see source, apply
 * URL, closingDateMillis, scrapedAt, and any employer/hiringOrganization-
 * like field actually captured, before proposing a fix. Note: FLIS0044 was
 * ALSO one of the 38 SCHOOL_MISMATCH groups fixed for LIVE jobs earlier
 * today (FLIS0044 Calcutta Int'l -> FLIS0042 Cheltenham Muscat) — the audit
 * and reattribution scripts only ever look at LIVE jobs, so anything sitting
 * in pending_review was never touched. This checks whether that's the same
 * root-cause bug recurring in freshly-scraped jobs, not just historical.
 *
 * Usage: npx tsx src/scripts/investigate_pending_review_flagged.ts
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
  console.log("🔎 Investigating 3 flagged pending_review jobs (read-only)\n");

  const snap = await db.collection("featured_jobs_cache")
    .where("schoolId", "in", ["FLIS0106", "FLIS0044"])
    .get();

  const titlesOfInterest = ["head of secondary", "teacher of btec business", "teacher of maths"];

  const matches = snap.docs.filter((d) => {
    const t = String(d.data().title || "").toLowerCase();
    return titlesOfInterest.some((needle) => t.includes(needle));
  });

  console.log(`Found ${matches.length} matching doc(s):\n`);
  for (const d of matches) {
    console.log(`docId: ${d.id}`);
    console.log(JSON.stringify(d.data(), null, 2));
    console.log("\n---\n");
  }

  if (matches.length === 0) {
    console.log("No matches found by schoolId+title. Dumping ALL FLIS0044/FLIS0106 pending docs instead:\n");
    snap.docs.forEach((d) => {
      console.log(`docId: ${d.id} | title: "${d.data().title}" | status: ${d.data().status}`);
    });
  }
}

main().catch((err) => {
  console.error("❌ Error:", err?.message || err);
  process.exit(1);
});

/**
 * 🔎 SANITY CHECK: before backfilling schoolName on 1,685 "approved" jobs,
 * check whether that number is inflated by (a) duplicate postings under
 * different docIds, or (b) jobs already past their closing date that
 * should really be EXPIRED, not counted as live inventory.
 *
 * READ-ONLY. Zero writes.
 *
 * Usage: npx tsx src/scripts/sanity_check_blank_schoolname.ts
 */

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const serviceAccount = require("../../service-account.json");
if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

async function main() {
  console.log("🔎 Sanity-checking the 1,715 blank-schoolName 'approved' jobs (read-only)\n");

  const snap = await db.collection("featured_jobs_cache").get();
  const nowMs = Date.now();

  const blankApproved: { id: string; applyUrl: string; schoolId: string; title: string; closingDateMillis: number | null; ingestedAtMillis: number | null; isRollingDeadline: boolean }[] = [];
  const namedApproved: { id: string; applyUrl: string; schoolId: string; title: string }[] = [];

  snap.docs.forEach((d) => {
    const j = d.data();
    if (String(j.status || "").toUpperCase() !== "APPROVED") return;
    const hasName = j.schoolName && String(j.schoolName).trim().length > 0;
    const applyUrl = String(j.applyUrl || j.source_url || "").toLowerCase().replace(/\/+$/, "").trim();
    if (hasName) {
      namedApproved.push({ id: d.id, applyUrl, schoolId: j.schoolId, title: j.title });
    } else {
      blankApproved.push({
        id: d.id,
        applyUrl,
        schoolId: j.schoolId,
        title: j.title,
        closingDateMillis: j.closingDateMillis ?? null,
        ingestedAtMillis: j.ingestedAtMillis ?? null,
        isRollingDeadline: Boolean(j.isRollingDeadline),
      });
    }
  });

  console.log(`Blank-schoolName approved docs: ${blankApproved.length}`);
  console.log(`Named-schoolName approved docs: ${namedApproved.length}\n`);

  // --- 1. Duplicate check: does this applyUrl already exist as a NAMED approved doc? ---
  const namedUrlSet = new Set(namedApproved.map((j) => j.applyUrl).filter(Boolean));
  const dupOfNamed = blankApproved.filter((j) => j.applyUrl && namedUrlSet.has(j.applyUrl));
  console.log(`🔁 Blank docs whose applyUrl ALREADY exists on a named/visible approved doc (likely duplicate): ${dupOfNamed.length}`);

  // --- 2. Duplicate check WITHIN the blank set itself (same applyUrl, multiple blank docs) ---
  const urlCounts = new Map<string, string[]>();
  for (const j of blankApproved) {
    if (!j.applyUrl) continue;
    if (!urlCounts.has(j.applyUrl)) urlCounts.set(j.applyUrl, []);
    urlCounts.get(j.applyUrl)!.push(j.id);
  }
  const internalDupGroups = Array.from(urlCounts.entries()).filter(([, ids]) => ids.length > 1);
  const internalDupDocCount = internalDupGroups.reduce((sum, [, ids]) => sum + ids.length, 0);
  console.log(`🔁 Blank docs that share an applyUrl with ANOTHER blank doc (internal duplicates): ${internalDupDocCount} docs across ${internalDupGroups.length} groups`);
  for (const [url, ids] of internalDupGroups.slice(0, 10)) {
    console.log(`   [${ids.length}x] ${url}`);
  }
  if (internalDupGroups.length > 10) console.log(`   ... and ${internalDupGroups.length - 10} more groups`);

  // --- 3. Empty/missing applyUrl entirely (can't even check duplication) ---
  const noUrl = blankApproved.filter((j) => !j.applyUrl);
  console.log(`\n⚠️ Blank docs with NO applyUrl at all: ${noUrl.length}`);

  // --- 4. Already past closing date (should arguably be EXPIRED, not live inventory) ---
  const pastClosing = blankApproved.filter((j) => j.closingDateMillis && j.closingDateMillis < nowMs);
  console.log(`\n📅 Blank docs with a closingDateMillis already in the PAST: ${pastClosing.length}`);

  // --- 5. Rolling deadline (no explicit date at all) ---
  const rolling = blankApproved.filter((j) => j.isRollingDeadline || !j.closingDateMillis);
  console.log(`📅 Blank docs with NO closing date / rolling: ${rolling.length}`);

  // --- 6. Genuinely new/unique/still-open candidates after excluding the above ---
  const dupIds = new Set([...dupOfNamed.map((j) => j.id)]);
  // For internal dup groups, only count the FIRST doc in each group as "unique", rest as duplicate
  for (const [, ids] of internalDupGroups) {
    for (const id of ids.slice(1)) dupIds.add(id);
  }
  const genuinelyNewAndOpen = blankApproved.filter((j) => {
    if (dupIds.has(j.id)) return false;
    if (j.closingDateMillis && j.closingDateMillis < nowMs) return false;
    return true;
  });
  console.log(`\n✅ After removing duplicates-of-visible, internal duplicates, and past-deadline: ${genuinelyNewAndOpen.length} docs remain as genuinely new, still-open, currently-invisible jobs.`);

  console.log("\n📌 Sample of 10 'genuinely new and open' docs for manual eyeballing:");
  for (const j of genuinelyNewAndOpen.slice(0, 10)) {
    console.log(`  ${j.id} | schoolId: ${j.schoolId} | title: "${j.title}" | applyUrl: ${j.applyUrl || "(none)"}`);
  }

  console.log("\nThis script made ZERO writes to Firestore. It only reads.");
}

main().catch((err) => {
  console.error("❌ Error:", err?.message || err);
  process.exit(1);
});

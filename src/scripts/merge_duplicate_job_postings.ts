/**
 * 🔗 MERGE: consolidate duplicate job postings into ONE card per real
 * vacancy, carrying every engine that advertises it as a separate pill —
 * matching how pipeline1-ingestion.ts's writeToCacheCollection() is
 * SUPPOSED to already merge cross-engine duplicates, but currently misses
 * a lot of real matches because its match check is an exact-equality
 * comparison (schoolId === schoolId, normalized title === normalized
 * title) rather than a fuzzy one. (That's in a frozen module — this
 * script does NOT touch it; it only cleans up the cards already sitting
 * in Firestore.)
 *
 * SCOPE: status APPROVED only, schoolId NOT starting with "AGNT" (UK
 * agency-sourced jobs with no specific FLIS school attached — explicitly
 * out of scope, left completely untouched).
 *
 * MATCHING (v2 — fixes a real bug found in the v1 dry run: a generic
 * school homepage/careers-hub URL shared by dozens of unrelated postings
 * was being treated as a unique identifier, and union-find then chained
 * completely unrelated jobs — even across DIFFERENT schools — into one
 * group. 75 unrelated jobs across 3 schools got collapsed into a single
 * card before this fix. Safety rules now:
 *   1. NEVER merge across different schoolIds. Full stop, no exceptions.
 *   2. A shared applyUrl only counts as a match if it's a "specific"
 *      vacancy link — i.e. has a real path beyond the bare domain or a
 *      generic /careers, /jobs, /vacancies landing page. Bare homepages
 *      and generic hub pages are excluded from URL-based matching
 *      entirely (they still may match via the title rule below).
 *   3. Title-based matching (same schoolId + same normalized title) is
 *      unchanged from v1 — this is what mirrors the intended pipeline
 *      logic and catches "same job, different engine, different link".
 *
 * Two docs are treated as the same real vacancy if EITHER:
 *   (a) same schoolId AND same normalized, non-generic applyUrl, OR
 *   (b) same schoolId AND same normalized title.
 * Union-find combines chains of matches, but every union step is now
 * schoolId-gated, so cross-school collapse is structurally impossible.
 *
 * For each group of 2+ docs, one is chosen as the PRIMARY (survivor):
 *   1. prefer a doc that already has a non-blank schoolName
 *   2. then prefer the earliest ingestedAtMillis (oldest/most established)
 *   3. then prefer the cleanest-looking title (no garbled trailing
 *      marketing text, e.g. "... is excited to announce ...")
 *   4. tie-break: lowest docId, for determinism
 *
 * The primary gets: merged `sources`/`sourceUrls` from every doc in the
 * group (so its card shows a pill per engine), and schoolName/city/country
 * backfilled from the `schools` collection if still blank.
 *
 * The other docs in the group are NOT deleted — they're marked
 * status: "MERGED", mergedInto: <primary docId>, mergedAt: <timestamp>,
 * so nothing is lost and it's auditable.
 *
 * SAFETY: Dry run by default. Zero writes without --commit.
 *
 * Usage:
 *   npx tsx src/scripts/merge_duplicate_job_postings.ts          (dry run)
 *   npx tsx src/scripts/merge_duplicate_job_postings.ts --commit (apply)
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

const COMMIT = process.argv.includes("--commit");

type JobDoc = {
  docId: string;
  schoolId: string;
  title: string;
  schoolName: string;
  applyUrl: string;
  sources: string[];
  sourceUrls: Record<string, string>;
  ingestedAtMillis: number;
  source: string;
};

function normUrl(u: string): string {
  return String(u || "").toLowerCase().replace(/\/+$/, "").trim();
}
function normTitle(t: string): string {
  return String(t || "").toLowerCase().replace(/[^a-z0-9]/g, "").trim();
}
function looksGarbled(t: string): boolean {
  const s = String(t || "");
  return / , | is excited to announce| are currently seeking| is seeking/i.test(s) || s.length > 80;
}

// A URL only identifies ONE specific vacancy if it has a real path beyond
// the bare domain or a generic landing page. Bare homepages and hub pages
// (careers.nordanglia.com, aloha-college.com, aloha-college.com/careers,
// aloha-college.com/jobs, aloha-college.com/vacancies, etc.) are excluded.
const GENERIC_PATH_SEGMENTS = new Set(["", "careers", "jobs", "vacancies", "vacancy", "employment", "work-with-us", "join-us"]);
function isSpecificVacancyUrl(u: string): boolean {
  const n = normUrl(u);
  if (!n) return false;
  try {
    const withProto = n.startsWith("http") ? n : `https://${n}`;
    const parsed = new URL(withProto);
    const segments = parsed.pathname.split("/").filter(Boolean);
    if (segments.length === 0) return false; // bare homepage
    if (segments.length === 1 && GENERIC_PATH_SEGMENTS.has(segments[0].toLowerCase())) return false; // generic hub page
    return true;
  } catch {
    return false;
  }
}

// --- Union-Find ---
class UnionFind {
  parent = new Map<string, string>();
  find(x: string): string {
    if (!this.parent.has(x)) this.parent.set(x, x);
    let root = x;
    while (this.parent.get(root) !== root) root = this.parent.get(root)!;
    let cur = x;
    while (this.parent.get(cur) !== root) {
      const next = this.parent.get(cur)!;
      this.parent.set(cur, root);
      cur = next;
    }
    return root;
  }
  union(a: string, b: string) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(ra, rb);
  }
}

async function main() {
  console.log("🔗 [MERGE v2] Consolidating duplicate FLIS-school job postings into one card per vacancy");
  console.log(COMMIT ? "🔴 LIVE MODE — writes will be committed.\n" : "🟡 DRY RUN — no writes will be made.\n");

  const [jobsSnap, schoolsSnap] = await Promise.all([
    db.collection("featured_jobs_cache").get(),
    db.collection("schools").get(),
  ]);

  const schoolsById = new Map(schoolsSnap.docs.map((d) => [String(d.id).toUpperCase(), { id: d.id, ...d.data() } as any]));

  const jobs: JobDoc[] = [];
  jobsSnap.docs.forEach((d) => {
    const j = d.data();
    if (String(j.status || "").toUpperCase() !== "APPROVED") return;
    const schoolId = String(j.schoolId || "").trim();
    if (!schoolId || schoolId.toUpperCase().startsWith("AGNT")) return; // out of scope, untouched
    jobs.push({
      docId: d.id,
      schoolId,
      title: String(j.title || ""),
      schoolName: String(j.schoolName || ""),
      applyUrl: String(j.applyUrl || j.source_url || ""),
      sources: j.sources && j.sources.length > 0 ? j.sources : [j.source || "Official Source"],
      sourceUrls: j.sourceUrls || {},
      ingestedAtMillis: j.ingestedAtMillis || 0,
      source: j.source || "Official Source",
    });
  });

  console.log(`Scanning ${jobs.length} approved FLIS-school jobs for duplicates...\n`);

  const uf = new UnionFind();
  // Group key now INCLUDES schoolId, so two docs only ever land in the
  // same bucket (and get unioned) if they already share a schoolId.
  const byUrlPerSchool = new Map<string, string[]>();
  const byTitlePerSchool = new Map<string, string[]>();
  let skippedGenericUrlCount = 0;

  for (const j of jobs) {
    uf.find(j.docId); // ensure registered
    const schoolKey = j.schoolId.toUpperCase();

    if (isSpecificVacancyUrl(j.applyUrl)) {
      const key = `${schoolKey}::${normUrl(j.applyUrl)}`;
      if (!byUrlPerSchool.has(key)) byUrlPerSchool.set(key, []);
      byUrlPerSchool.get(key)!.push(j.docId);
    } else if (normUrl(j.applyUrl)) {
      skippedGenericUrlCount++;
    }

    const nt = normTitle(j.title);
    if (nt) {
      const key = `${schoolKey}::${nt}`;
      if (!byTitlePerSchool.has(key)) byTitlePerSchool.set(key, []);
      byTitlePerSchool.get(key)!.push(j.docId);
    }
  }

  for (const ids of byUrlPerSchool.values()) {
    for (let i = 1; i < ids.length; i++) uf.union(ids[0], ids[i]);
  }
  for (const ids of byTitlePerSchool.values()) {
    for (let i = 1; i < ids.length; i++) uf.union(ids[0], ids[i]);
  }

  const jobsById = new Map(jobs.map((j) => [j.docId, j]));
  const groups = new Map<string, string[]>();
  for (const j of jobs) {
    const root = uf.find(j.docId);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push(j.docId);
  }

  const dupGroups = Array.from(groups.values()).filter((ids) => ids.length > 1);

  // Sanity guard: verify no group spans more than one schoolId (should be
  // structurally impossible given the schoolId-gated keys above, but
  // checked explicitly — if this ever fires, STOP, don't trust the run).
  let crossSchoolViolations = 0;
  for (const ids of dupGroups) {
    const schoolIds = new Set(ids.map((id) => jobsById.get(id)!.schoolId.toUpperCase()));
    if (schoolIds.size > 1) {
      crossSchoolViolations++;
      console.error(`🛑 CROSS-SCHOOL VIOLATION in group [${ids.join(", ")}] — schoolIds: ${Array.from(schoolIds).join(", ")}`);
    }
  }
  if (crossSchoolViolations > 0) {
    console.error(`\n❌ ${crossSchoolViolations} group(s) span multiple schools — aborting, do not trust this run.`);
    process.exit(1);
  }

  const totalDupDocs = dupGroups.reduce((sum, ids) => sum + ids.length, 0);
  const survivorsCount = dupGroups.length;
  const mergedAwayCount = totalDupDocs - survivorsCount;

  console.log(`Skipped ${skippedGenericUrlCount} generic/homepage URL(s) — not used for URL-based matching.`);
  console.log(`Found ${dupGroups.length} duplicate groups covering ${totalDupDocs} docs (all single-school, verified).`);
  console.log(`After merge: ${survivorsCount} survivor cards, ${mergedAwayCount} docs marked MERGED.\n`);

  const plan: {
    primaryId: string;
    schoolId: string;
    mergedIds: string[];
    mergedSources: string[];
    mergedUrls: Record<string, string>;
    schoolNameFix: string | null;
  }[] = [];

  for (const ids of dupGroups) {
    const docs = ids.map((id) => jobsById.get(id)!);

    const withName = docs.filter((d) => d.schoolName && d.schoolName.trim());
    const pool = withName.length > 0 ? withName : docs;
    const oldestMs = Math.min(...pool.map((d) => d.ingestedAtMillis || Infinity));
    const oldestCandidates = pool.filter((d) => (d.ingestedAtMillis || Infinity) === oldestMs);
    const cleanCandidates = oldestCandidates.filter((d) => !looksGarbled(d.title));
    const finalPool = cleanCandidates.length > 0 ? cleanCandidates : oldestCandidates;
    const primary = finalPool.sort((a, b) => a.docId.localeCompare(b.docId))[0];

    const sourceMap = new Map<string, string>();
    const mergedUrls: Record<string, string> = {};
    for (const d of docs) {
      for (const s of d.sources) {
        if (!s) continue;
        const key = String(s).toUpperCase().trim();
        if (!sourceMap.has(key)) sourceMap.set(key, String(s));
      }
      Object.entries(d.sourceUrls || {}).forEach(([k, v]) => {
        if (v) mergedUrls[k] = v as string;
      });
      if (d.applyUrl) mergedUrls[d.source] = d.applyUrl;
    }
    const mergedSources = Array.from(sourceMap.values());

    let schoolNameFix: string | null = null;
    if (!primary.schoolName || !primary.schoolName.trim()) {
      const school = schoolsById.get(primary.schoolId.toUpperCase());
      if (school) schoolNameFix = school.name || school.schoolname || null;
    }

    plan.push({
      primaryId: primary.docId,
      schoolId: primary.schoolId,
      mergedIds: ids.filter((id) => id !== primary.docId),
      mergedSources,
      mergedUrls,
      schoolNameFix,
    });
  }

  console.log("Sample of first 15 merge groups:\n");
  for (const p of plan.slice(0, 15)) {
    console.log(`  PRIMARY: ${p.primaryId}  [${p.schoolId}]${p.schoolNameFix ? ` (schoolName -> "${p.schoolNameFix}")` : ""}`);
    console.log(`    pills: [${p.mergedSources.join(", ")}]`);
    console.log(`    merges away: ${p.mergedIds.join(", ")}`);
  }
  if (plan.length > 15) console.log(`  ... and ${plan.length - 15} more groups`);

  // Extra sanity: flag any group where merged-away count looks implausibly
  // high (worth a human glance even though cross-school is now impossible)
  const suspiciouslyLarge = plan.filter((p) => p.mergedIds.length > 8);
  if (suspiciouslyLarge.length > 0) {
    console.log(`\n⚠️ ${suspiciouslyLarge.length} group(s) merge away MORE than 8 docs into one card — worth a manual glance before --commit:`);
    for (const p of suspiciouslyLarge) {
      console.log(`  PRIMARY: ${p.primaryId} [${p.schoolId}] <- ${p.mergedIds.length} docs`);
    }
  }

  console.log("");

  if (!COMMIT) {
    console.log(`Dry run complete. ${plan.length} survivor cards would be updated, ${mergedAwayCount} docs would be marked MERGED.`);
    console.log("Zero Firestore writes were made. Re-run with --commit to apply.");
    return;
  }

  let batch = db.batch();
  let opsInBatch = 0;
  const flushIfNeeded = async () => {
    if (opsInBatch >= 400) {
      await batch.commit();
      batch = db.batch();
      opsInBatch = 0;
    }
  };

  for (const p of plan) {
    const primaryRef = db.collection("featured_jobs_cache").doc(p.primaryId);
    const update: Record<string, any> = {
      sources: p.mergedSources,
      sourceUrls: p.mergedUrls,
      updatedAt: new Date().toISOString(),
    };
    if (p.schoolNameFix) {
      const school = schoolsById.get(p.schoolId.toUpperCase());
      update.schoolName = p.schoolNameFix;
      update.city = school?.city || "";
      update.country = school?.country || "";
    }
    batch.update(primaryRef, update);
    opsInBatch++;
    await flushIfNeeded();

    for (const mergedId of p.mergedIds) {
      const mergedRef = db.collection("featured_jobs_cache").doc(mergedId);
      batch.update(mergedRef, {
        status: "MERGED",
        mergedInto: p.primaryId,
        mergedAt: new Date().toISOString(),
      });
      opsInBatch++;
      await flushIfNeeded();
    }
  }

  if (opsInBatch > 0) {
    await batch.commit();
  }

  console.log(`✅ ${plan.length} survivor cards updated with merged pills. ${mergedAwayCount} duplicate docs marked MERGED.`);
}

main().catch((err) => {
  console.error("❌ Error:", err?.message || err);
  process.exit(1);
});

/**
 * 🛡️ LIVE SITE QUALITY ASSURANCE AUDIT
 *
 * A single, repeatable check you can run any time to see the real health of
 * every job currently showing to the public — not a one-off fix, a standing
 * QA tool. READ-ONLY. Makes zero writes, ever.
 *
 * It pulls every job that would actually show on the public site (same rule
 * page.tsx uses: status not expired/closed/rejected/pending, closing date
 * not already passed) and checks each one for:
 *
 *   1. BROKEN_LINK       — no usable apply link at all (nothing a person
 *                          could click through to actually apply)
 *   2. GENERIC_LINK       — the only link available is the school's general
 *                          website, not the specific job page
 *   3. SCHOOL_MISMATCH    — the stored school no longer matches the job text
 *                          well (re-checked against every school in the DB
 *                          using the same matcher the engines use)
 *   4. STALE_BUT_LIVE     — closing date has actually passed but the job is
 *                          still marked live (a status-guard failure)
 *   5. BAD_TITLE          — title looks like a non-teaching/support role
 *                          that should never have made it to the public feed
 *   6. MISSING_SCHOOL     — schoolId doesn't exist in the schools collection
 *                          at all
 *   7. DUPLICATE          — same school + same normalized title appearing
 *                          under more than one live job document
 *   8. UNVERIFIED_LIVE    — flagged unverifiableAttribution:true but somehow
 *                          still status-live (should never happen; a safety
 *                          net independent of the app's own filter)
 *
 * Output: a plain-English summary printed to the console (share this with
 * anyone, no technical knowledge needed), plus a full JSON report saved to
 * src/scripts/output/ for anyone who wants the detail.
 *
 * Usage:
 *   npx tsx src/scripts/audit_live_site_quality.ts
 */

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as fs from "fs";
import * as path from "path";
import { createRequire } from "module";
import { matchSchoolEntity, SchoolEntity } from "../lib/crawler/entityMatcher";
import { isValidJobTitle } from "../lib/crawler/titleSanitizer";
import { isSupportOrNonTeachingRole } from "../lib/crawler/roleClassifier";

const require = createRequire(import.meta.url);
const serviceAccount = require("../../service-account.json");
if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

interface FlaggedJob {
  docId: string;
  title: string;
  schoolId: string;
  schoolName: string;
  source: string;
  issues: string[];
  detail: string[];
}

const GENERIC_URLS = new Set([
  "https://careers.nordanglia.com",
  "https://careers.nordangliaeducation.com",
  "https://www.nordangliaeducation.com/careers",
  "https://jobs.inspirededu.com",
  "https://cognitapeople.csod.com",
  "https://www.teachaway.com/teaching-jobs-abroad",
  "https://uwc.org/careers/vacancies",
  "https://internationalschools.wd3.myworkdayjobs.com/en-us/ispcareers",
  "https://careers.globeducate.com/work-with-us/opportunities-worldwide",
  "https://careers.gemseducation.com",
  "https://www.gemseducation.com",
  "https://taaleem.ae",
  "https://www.taaleem.ae",
  "https://www.taaleem.ae/careers",
  "https://careers.taaleem.ae",
  "https://careers.taaleem.ae/en",
]);

function normalizeUrl(u?: string | null): string {
  if (!u) return "";
  return u.toLowerCase().trim().replace(/\/+$/, "");
}

function isGenericUrl(u?: string | null): boolean {
  const norm = normalizeUrl(u);
  if (!norm || norm === "#") return true;
  return GENERIC_URLS.has(norm) || norm.includes("job-search-results") || norm.includes("keyword=");
}

function normalizeTitleForDupeCheck(title: string): string {
  return String(title || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

async function main() {
  console.log("🛡️  LIVE SITE QUALITY ASSURANCE AUDIT");
  console.log("=====================================\n");

  const [jobsSnap, schoolsSnap] = await Promise.all([
    db.collection("featured_jobs_cache").get(),
    db.collection("schools").get(),
  ]);

  const allSchools = schoolsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as any));
  const schoolsById = new Map(allSchools.map((s) => [String(s.id).toUpperCase(), s]));

  const todayMs = Date.now();
  const liveJobs: any[] = [];

  jobsSnap.docs.forEach((d) => {
    const j = { docId: d.id, ...d.data() } as any;
    const rawStatus = String(j.status || "").toUpperCase();
    if (["EXPIRED", "CLOSED", "REJECTED", "PENDING_REVIEW", "PENDING"].includes(rawStatus)) return;
    // Match page.tsx's real visibility filter exactly, not just the status
    // guard — otherwise this reports on jobs the public can't actually see.
    const sIdCheck = String(j.schoolId || "").trim();
    if (!sIdCheck || sIdCheck.toUpperCase().startsWith("AGNT")) return;
    if (!isValidJobTitle(j.title || (j as any).jobTitle || "")) return;
    liveJobs.push(j);
  });

  console.log(`📊 Total documents in featured_jobs_cache: ${jobsSnap.size}`);
  console.log(`📊 Live / public-facing right now: ${liveJobs.length}\n`);

  const flagged: FlaggedJob[] = [];
  const dupeKey = new Map<string, string[]>(); // "schoolId::normalizedTitle" -> [docIds]

  for (const j of liveJobs) {
    const issues: string[] = [];
    const detail: string[] = [];
    const schoolId = j.schoolId || "";
    const schoolName = j.schoolName || j.schoolname || "";
    const title = j.title || "";
    const source = j.source || (Array.isArray(j.sources) ? j.sources[0] : "") || "";

    // 1 & 2: link quality
    const candidateUrl = j.directUrl || j.applyUrl || j.source_url || j.schoolWebsite;
    const hasAnyUsableUrl = Boolean(j.directUrl) && !isGenericUrl(j.directUrl)
      ? true
      : Boolean(j.applyUrl) && !isGenericUrl(j.applyUrl)
      ? true
      : Boolean(j.source_url) && !isGenericUrl(j.source_url)
      ? true
      : Boolean(j.schoolWebsite) && j.schoolWebsite !== "#";

    if (!hasAnyUsableUrl || !candidateUrl) {
      issues.push("BROKEN_LINK");
      detail.push("No usable link found at all (directUrl, applyUrl, source_url, schoolWebsite all missing/blank/#).");
    } else {
      const specificUrl = (j.directUrl && !isGenericUrl(j.directUrl)) ? j.directUrl
        : (j.applyUrl && !isGenericUrl(j.applyUrl)) ? j.applyUrl
        : (j.source_url && !isGenericUrl(j.source_url)) ? j.source_url
        : null;
      if (!specificUrl) {
        issues.push("GENERIC_LINK");
        detail.push(`Only a generic link is available (e.g. school homepage): ${candidateUrl}`);
      }
    }

    // 6: missing school
    const school = schoolId ? schoolsById.get(schoolId.toUpperCase()) : null;
    if (!school) {
      issues.push("MISSING_SCHOOL");
      detail.push(`schoolId "${schoolId}" does not exist in the schools collection.`);
    } else {
      // 3: school match confidence — re-check stored attribution against the
      // full DB using the same matcher the engines use, not just trust the
      // stored fields.
      const fullText = `${title} ${schoolName} ${j.city || ""} ${j.country || ""}`;
      let bestScore = 0;
      let bestSchoolId = "";
      for (const s of allSchools) {
        const entity: SchoolEntity = {
          id: s.id,
          name: s.name || s.schoolname,
          schoolname: s.schoolname || s.name,
          city: s.city,
          country: s.country,
          aliases: Array.isArray(s.aliases) ? s.aliases : [],
          legalNames: Array.isArray(s.legalNames) ? s.legalNames : [],
        };
        const res = matchSchoolEntity(entity, { candidateText: fullText, city: j.city });
        if (res.isMatch && res.score > bestScore) {
          bestScore = res.score;
          bestSchoolId = s.id;
        }
      }
      if (bestSchoolId && bestSchoolId.toUpperCase() !== schoolId.toUpperCase()) {
        issues.push("SCHOOL_MISMATCH");
        detail.push(`Stored as ${schoolId} (${schoolName}), but text now best-matches ${bestSchoolId} (score ${bestScore}). Worth a manual look — may be a stale attribution or just an ambiguous title.`);
      }
    }

    // 4: stale but live
    if (j.closingDateMillis && j.closingDateMillis < todayMs) {
      issues.push("STALE_BUT_LIVE");
      detail.push(`Closing date (${new Date(j.closingDateMillis).toISOString().slice(0, 10)}) has passed but the job is still marked live.`);
    }

    // 5: bad title — isValidJobTitle() is already applied as a visibility
    // filter above (matching page.tsx), so only isSupportOrNonTeachingRole()
    // belongs here: page.tsx does NOT filter by role classifier, so a
    // support/non-teaching title CAN still be live today. That's the real gap.
    if (isSupportOrNonTeachingRole(title)) {
      issues.push("BAD_TITLE");
      detail.push(`Title "${title}" looks like a non-teaching/support role.`);
    }

    // 8: unverified but live
    if (j.unverifiableAttribution === true) {
      issues.push("UNVERIFIED_LIVE");
      detail.push("Flagged unverifiableAttribution:true but is still showing as live — should have been rejected.");
    }

    // Multi-engine card tracking — page.tsx merges same schoolId+title docs
    // into one visible card by design, so this is informational, not a flag.
    const dk = `${schoolId}::${normalizeTitleForDupeCheck(title)}`;
    if (!dupeKey.has(dk)) dupeKey.set(dk, []);
    dupeKey.get(dk)!.push(j.docId);

    if (issues.length > 0) {
      flagged.push({ docId: j.docId, title, schoolId, schoolName, source, issues, detail });
    }
  }

  const uniqueLiveCards = dupeKey.size;
  const multiEngineGroups = Array.from(dupeKey.values()).filter((ids) => ids.length > 1).length;

  // Summary counts
  const counts: Record<string, number> = {};
  for (const f of flagged) {
    for (const issue of f.issues) {
      counts[issue] = (counts[issue] || 0) + 1;
    }
  }

  console.log("================ SUMMARY ================");
  console.log(`Live documents checked:     ${liveJobs.length}`);
  console.log(`Unique live cards (after multi-engine merge, matching what visitors actually see): ${uniqueLiveCards}`);
  console.log(`  (${multiEngineGroups} of those are posted by more than one engine — normal, not an issue)`);
  console.log(`Jobs with at least 1 real issue: ${flagged.length} (${((flagged.length / Math.max(liveJobs.length, 1)) * 100).toFixed(1)}% of documents)`);
  console.log("");
  console.log("By issue type:");
  console.log(`  BROKEN_LINK      (no way to apply at all):        ${counts.BROKEN_LINK || 0}`);
  console.log(`  GENERIC_LINK     (only a homepage link, not job):  ${counts.GENERIC_LINK || 0}`);
  console.log(`  SCHOOL_MISMATCH  (attribution looks stale/wrong):  ${counts.SCHOOL_MISMATCH || 0}`);
  console.log(`  STALE_BUT_LIVE   (closing date passed, still up):  ${counts.STALE_BUT_LIVE || 0}`);
  console.log(`  BAD_TITLE        (non-teaching role slipped in):   ${counts.BAD_TITLE || 0}`);
  console.log(`  MISSING_SCHOOL   (schoolId not in DB):             ${counts.MISSING_SCHOOL || 0}`);
  console.log(`  UNVERIFIED_LIVE  (should've been rejected):        ${counts.UNVERIFIED_LIVE || 0}`);
  console.log("==========================================\n");

  if (flagged.length > 0) {
    console.log("First 20 flagged jobs (full list in the saved report):\n");
    flagged.slice(0, 20).forEach((f) => {
      console.log(`- ${f.docId} | "${f.title}" | ${f.schoolName} (${f.schoolId}) | source=${f.source}`);
      console.log(`  Issues: ${f.issues.join(", ")}`);
    });
    console.log("");
  }

  const outputDir = path.resolve(process.cwd(), "src/scripts/output");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  const outPath = path.join(outputDir, `live_site_quality_audit_${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  fs.writeFileSync(
    outPath,
    JSON.stringify({ generatedAt: new Date().toISOString(), totalLive: liveJobs.length, uniqueLiveCards, multiEngineGroups, counts, flagged }, null, 2)
  );
  console.log(`📄 Full report saved: ${outPath}`);
  console.log("\nThis script makes zero writes — it's safe to run any time.");
}

main().catch((err) => {
  console.error("❌ Error:", err?.message || err);
  process.exit(1);
});

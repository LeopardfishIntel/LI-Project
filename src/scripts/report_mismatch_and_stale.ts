/**
 * 📋 REPORT: SCHOOL_MISMATCH + STALE_BUT_LIVE detail dump
 *
 * Job Audit (audit_live_site_quality.ts) currently flags 85 SCHOOL_MISMATCH
 * and 7 STALE_BUT_LIVE jobs but only prints one summary count for each — not
 * enough detail to act on. This is a companion, READ-ONLY report that dumps
 * every flagged job with enough context to spot patterns (e.g. "one engine
 * keeps mis-tagging one school" vs. 85 unrelated one-offs) before deciding
 * on any fix. Makes zero writes, ever — this is investigation only.
 *
 * For SCHOOL_MISMATCH, jobs are grouped by (current schoolId -> suggested
 * schoolId) pair, so a systemic pattern shows up as one group with many jobs
 * instead of 85 separate lines.
 *
 * For STALE_BUT_LIVE, jobs are listed individually (there are only 7) with
 * how many days past closing date each one is.
 *
 * Usage:
 *   npx tsx src/scripts/report_mismatch_and_stale.ts
 *
 * Output: printed to console AND saved as JSON to
 *   src/scripts/output/mismatch_and_stale_report.json
 */

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as fs from "fs";
import * as path from "path";
import { createRequire } from "module";
import { matchSchoolEntity, SchoolEntity } from "../lib/crawler/entityMatcher";
import { isValidJobTitle } from "../lib/crawler/titleSanitizer";

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
  console.log("📋 SCHOOL_MISMATCH + STALE_BUT_LIVE DETAIL REPORT (read-only)");
  console.log("================================================================\n");

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
    const sIdCheck = String(j.schoolId || "").trim();
    if (!sIdCheck || sIdCheck.toUpperCase().startsWith("AGNT")) return;
    if (!isValidJobTitle(j.title || (j as any).jobTitle || "")) return;
    liveJobs.push(j);
  });

  console.log(`Live / public-facing jobs checked: ${liveJobs.length}\n`);

  // ---------------- SCHOOL_MISMATCH ----------------
  interface MismatchJob {
    docId: string;
    title: string;
    source: string;
    city?: string;
    country?: string;
    applyUrl?: string;
    score: number;
  }
  const mismatchGroups = new Map<string, { fromId: string; fromName: string; toId: string; toName: string; jobs: MismatchJob[] }>();

  for (const j of liveJobs) {
    const schoolId = j.schoolId || "";
    const schoolName = j.schoolName || j.schoolname || "";
    const title = j.title || "";
    const school = schoolId ? schoolsById.get(schoolId.toUpperCase()) : null;
    if (!school) continue; // MISSING_SCHOOL handled by the main audit, not here

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
      const suggested = schoolsById.get(bestSchoolId.toUpperCase());
      const key = `${schoolId.toUpperCase()}=>${bestSchoolId.toUpperCase()}`;
      if (!mismatchGroups.has(key)) {
        mismatchGroups.set(key, {
          fromId: schoolId,
          fromName: schoolName,
          toId: bestSchoolId,
          toName: suggested?.name || suggested?.schoolname || "",
          jobs: [],
        });
      }
      mismatchGroups.get(key)!.jobs.push({
        docId: j.docId,
        title,
        source: j.source || (Array.isArray(j.sources) ? j.sources.join(",") : ""),
        city: j.city,
        country: j.country,
        applyUrl: j.directUrl || j.applyUrl || j.source_url,
        score: bestScore,
      });
    }
  }

  const sortedGroups = Array.from(mismatchGroups.values()).sort((a, b) => b.jobs.length - a.jobs.length);

  console.log(`🔀 SCHOOL_MISMATCH — ${sortedGroups.reduce((n, g) => n + g.jobs.length, 0)} jobs across ${sortedGroups.length} distinct (from -> to) patterns:\n`);
  for (const g of sortedGroups) {
    console.log(`  [${g.jobs.length}x] ${g.fromId} (${g.fromName || "?"}) -> suggested ${g.toId} (${g.toName || "?"})`);
    for (const job of g.jobs) {
      console.log(`      - ${job.docId} | "${job.title}" | source=${job.source} | score=${job.score} | ${job.city || "?"}, ${job.country || "?"}`);
      console.log(`        url: ${job.applyUrl || "(none)"}`);
    }
    console.log("");
  }

  // ---------------- STALE_BUT_LIVE ----------------
  interface StaleJob {
    docId: string;
    title: string;
    schoolId: string;
    schoolName: string;
    source: string;
    closingDate: string;
    daysPastClosing: number;
    status: string;
  }
  const staleJobs: StaleJob[] = [];
  for (const j of liveJobs) {
    if (j.closingDateMillis && j.closingDateMillis < todayMs) {
      staleJobs.push({
        docId: j.docId,
        title: j.title || "",
        schoolId: j.schoolId || "",
        schoolName: j.schoolName || j.schoolname || "",
        source: j.source || (Array.isArray(j.sources) ? j.sources.join(",") : ""),
        closingDate: new Date(j.closingDateMillis).toISOString().slice(0, 10),
        daysPastClosing: Math.floor((todayMs - j.closingDateMillis) / (1000 * 60 * 60 * 24)),
        status: j.status || "",
      });
    }
  }
  staleJobs.sort((a, b) => b.daysPastClosing - a.daysPastClosing);

  console.log(`⏰ STALE_BUT_LIVE — ${staleJobs.length} jobs (closing date passed, still showing live):\n`);
  for (const s of staleJobs) {
    console.log(`  - ${s.docId} | "${s.title}" | ${s.schoolId} (${s.schoolName || "?"}) | source=${s.source} | closed ${s.closingDate} (${s.daysPastClosing}d ago) | status=${s.status}`);
  }
  console.log("");

  // ---------------- Save JSON ----------------
  const outDir = path.resolve(process.cwd(), "src/scripts/output");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "mismatch_and_stale_report.json");
  fs.writeFileSync(
    outPath,
    JSON.stringify({ generatedAt: new Date().toISOString(), mismatchGroups: sortedGroups, staleJobs }, null, 2)
  );
  console.log(`💾 Full detail saved to ${outPath}`);
  console.log("\nThis script made ZERO writes to Firestore. It only reads.");
}

main().catch((err) => {
  console.error("❌ Error:", err?.message || err);
  process.exit(1);
});

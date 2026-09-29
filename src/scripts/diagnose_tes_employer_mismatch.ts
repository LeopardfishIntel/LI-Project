/**
 * 🔍 READ-ONLY DIAGNOSTIC — TES Employer/School Cross-Check
 *
 * Confirmed cases (Harrow International School Abu Dhabi showing generic
 * Taaleem ads; GEMS Founders School Al Barsha showing a GEMS World Academy
 * Dubai job) both trace to the same gap: tes-adaptor.ts's jobPostingToRecord
 * extracts JSON-LD JobPosting data (title, location, dates) but never reads
 * `hiringOrganization` — the field that actually names who's advertising the
 * job — so every posting swept from a school's configured TES employer page
 * gets stamped with that school's name/ID with zero validation that the
 * posting is actually theirs.
 *
 * This script does NOT modify tes-adaptor.ts (frozen per AGENTS.md). It only
 * imports its existing, exported extractJobPostingsFromHtml() to re-check
 * currently-stored TES jobs: for each one, it re-fetches the live vacancy
 * page, reads hiringOrganization.name from the JSON-LD, and compares it
 * against the school we currently have it attributed to — the same
 * matchSchoolEntity() every other engine already uses.
 *
 * Purpose: answer "how many of the 111 current TES jobs would actually fail
 * a hiringOrganization cross-check?" BEFORE deciding whether/how to add
 * that gate to the (frozen) adaptor.
 *
 * Usage:  npx tsx src/scripts/diagnose_tes_employer_mismatch.ts [--limit=50]
 * Writes: src/scripts/output/tes_employer_mismatch_diagnostic_<timestamp>.json
 *
 * Read-only. No Firestore writes. Makes live GET requests to tes.com vacancy
 * pages (the same pages already shown to users), throttled and batched.
 */

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as fs from "fs";
import * as path from "path";
import { createRequire } from "module";
import { matchSchoolEntity, SchoolEntity } from "../lib/crawler/entityMatcher";
import { extractJobPostingsFromHtml } from "../lib/crawler/adaptors/tes-adaptor";

const require = createRequire(import.meta.url);
const serviceAccount = require("../../service-account.json");
if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

const BATCH_SIZE = 4;
const BATCH_DELAY_MS = 1200;
const REQUEST_TIMEOUT_MS = 12000;

const STEALTH_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-cache",
};

interface DiagnosticRow {
  docId: string;
  title?: string;
  storedSchoolId: string;
  storedSchoolName: string;
  applyUrl: string;
  hiringOrgName?: string | null;
  verdict: "MATCH" | "MISMATCH" | "NO_HIRING_ORG_DATA" | "FETCH_FAILED";
  matchScore?: number;
  matchConfidence?: string;
  detail?: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchHiringOrgName(applyUrl: string): Promise<{ name: string | null; error?: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(applyUrl, { headers: STEALTH_HEADERS, signal: controller.signal });
    if (!res.ok) return { name: null, error: `HTTP ${res.status}` };
    const html = await res.text();
    const postings = extractJobPostingsFromHtml(html);
    if (postings.length === 0) return { name: null, error: "No JobPosting JSON-LD found" };
    const org = postings[0].hiringOrganization;
    const name = typeof org === "string" ? org : org?.name || null;
    return { name };
  } catch (err: any) {
    return { name: null, error: err?.name === "AbortError" ? "Timed out" : err?.message || String(err) };
  } finally {
    clearTimeout(timeout);
  }
}

async function runBatched<T, R>(items: T[], size: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    const chunk = items.slice(i, i + size);
    results.push(...(await Promise.all(chunk.map(worker))));
    process.stdout.write(`\r   Checked ${Math.min(i + size, items.length)}/${items.length} jobs...`);
    if (i + size < items.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }
  process.stdout.write("\n");
  return results;
}

async function main() {
  console.log("🔍 [TES DIAGNOSTIC] Starting TES Employer/School Cross-Check...");

  let limit: number | null = null;
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--limit=")) {
      const parsed = parseInt(arg.split("=")[1], 10);
      if (!isNaN(parsed) && parsed > 0) limit = parsed;
    }
  }

  // 1. Load canonical schools map
  console.log("📡 Fetching schools from Firestore...");
  const schoolsSnap = await db.collection("schools").get();
  const schoolMap = new Map<string, SchoolEntity>();
  schoolsSnap.docs.forEach((doc) => {
    const d = doc.data();
    schoolMap.set(doc.id, {
      id: doc.id,
      name: d.name || d.schoolname || "",
      schoolname: d.schoolname || d.name || "",
      city: d.city || "",
      country: d.country || "",
      aliases: Array.isArray(d.aliases) ? d.aliases : [],
      tesEmployerSlug: d.tesEmployerSlug || d.tes_slug || "",
      tesOrganizationId: d.tesOrganizationId || "",
    } as any);
  });
  console.log(`✅ Loaded ${schoolMap.size} schools.`);

  // 2. Query TES jobs in featured_jobs_cache
  console.log("📡 Fetching TES records from featured_jobs_cache...");
  const jobsSnap = await db.collection("featured_jobs_cache").get();
  const tesJobs: Array<{ docId: string; data: any }> = [];

  jobsSnap.docs.forEach((doc) => {
    const d = doc.data();
    const isTes =
      doc.id.startsWith("tes_") ||
      d.source === "TES" ||
      (Array.isArray(d.sources) && d.sources.includes("TES")) ||
      String(d.applyUrl || "").includes("tes.com/jobs/vacancy/");
    if (isTes && d.applyUrl) {
      tesJobs.push({ docId: doc.id, data: d });
    }
  });

  const targets = limit ? tesJobs.slice(0, limit) : tesJobs;
  console.log(`🎯 Found ${tesJobs.length} TES jobs. Auditing ${targets.length}...\n`);

  // 3. Run batched diagnostic
  const results = await runBatched(targets, BATCH_SIZE, async ({ docId, data }) => {
    const applyUrl = data.applyUrl;
    const storedSchoolId = data.schoolId || "";
    const storedSchoolName = data.schoolName || "";
    const title = data.title || data.rawTitle || "";

    const { name: hiringOrgName, error } = await fetchHiringOrgName(applyUrl);

    if (error) {
      return {
        docId,
        title,
        storedSchoolId,
        storedSchoolName,
        applyUrl,
        hiringOrgName: null,
        verdict: "FETCH_FAILED" as const,
        detail: error,
      };
    }

    if (!hiringOrgName || !hiringOrgName.trim()) {
      return {
        docId,
        title,
        storedSchoolId,
        storedSchoolName,
        applyUrl,
        hiringOrgName: null,
        verdict: "NO_HIRING_ORG_DATA" as const,
        detail: "JSON-LD hiringOrganization is missing or empty",
      };
    }

    const schoolEntity = schoolMap.get(storedSchoolId) || {
      id: storedSchoolId,
      name: storedSchoolName,
      schoolname: storedSchoolName,
      city: data.city || "",
      country: data.country || "",
    };

    const match = matchSchoolEntity(
      schoolEntity,
      {
        candidateText: hiringOrgName,
        city: data.city,
        country: data.country,
      },
      0.85
    );

    const isConfidentMatch = match.isMatch && match.score >= 0.85;

    return {
      docId,
      title,
      storedSchoolId,
      storedSchoolName,
      applyUrl,
      hiringOrgName,
      verdict: (isConfidentMatch ? "MATCH" : "MISMATCH") as "MATCH" | "MISMATCH",
      matchScore: match.score,
      matchConfidence: match.confidence,
      detail: isConfidentMatch
        ? `Matched "${hiringOrgName}" with score ${match.score.toFixed(2)} (${match.matchType})`
        : `Hiring organization "${hiringOrgName}" does not confidently match stored school "${storedSchoolName}" (score=${match.score.toFixed(2)}, reason=${match.reason || "low score"})`,
    };
  });

  // 4. Summarize
  const counts = {
    MATCH: 0,
    MISMATCH: 0,
    NO_HIRING_ORG_DATA: 0,
    FETCH_FAILED: 0,
  };

  for (const r of results) {
    counts[r.verdict]++;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputDir = path.resolve(process.cwd(), "src/scripts/output");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const outputPath = path.join(outputDir, `tes_employer_mismatch_diagnostic_${timestamp}.json`);

  const report = {
    timestamp: new Date().toISOString(),
    totalAudited: results.length,
    counts,
    results,
  };

  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), "utf-8");

  console.log("\n================ TES EMPLOYER DIAGNOSTIC SUMMARY ================");
  console.log(`📁 Report written to: ${outputPath}`);
  console.log(`📊 Total Audited: ${results.length}`);
  console.log(`✅ MATCH:              ${counts.MATCH}`);
  console.log(`❌ MISMATCH:           ${counts.MISMATCH}`);
  console.log(`❓ NO_HIRING_ORG_DATA: ${counts.NO_HIRING_ORG_DATA}`);
  console.log(`⚠️  FETCH_FAILED:       ${counts.FETCH_FAILED}`);
  console.log("=================================================================\n");

  const problemRows = results.filter((r) => r.verdict === "MISMATCH" || r.verdict === "NO_HIRING_ORG_DATA");
  if (problemRows.length > 0) {
    console.log(`🚨 Found ${problemRows.length} MISMATCH / NO_HIRING_ORG_DATA rows:\n`);
    for (const row of problemRows) {
      console.log(`- [${row.verdict}] ${row.docId}: "${row.title}"`);
      console.log(`   Stored School: ${row.storedSchoolName} (${row.storedSchoolId})`);
      console.log(`   Hiring Org:    ${row.hiringOrgName || "(none)"}`);
      console.log(`   Detail:        ${row.detail}`);
      console.log(`   URL:           ${row.applyUrl}\n`);
    }
  } else {
    console.log("🎉 Zero mismatches or missing hiringOrganization data found!");
  }
}

main().catch((err) => {
  console.error("❌ Diagnostic failed:", err);
  process.exit(1);
});

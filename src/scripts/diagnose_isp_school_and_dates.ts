/**
 * 🔍 READ-ONLY DIAGNOSTIC — ISP Workday School Matching and Closing Date Audit
 *
 * Checks two critical areas in the ISP ingestion pipeline:
 * 1. Closing date & posting date collection:
 *    Inspects whether live Workday vacancy pages provide schema.org JobPosting
 *    JSON-LD with `validThrough` (closing date) and real `datePosted`, or if
 *    closing dates are genuinely unavailable across Workday postings.
 * 2. School attribution integrity & ambiguity:
 *    Cross-checks the stored school attribution against the vacancy's JSON-LD
 *    `hiringOrganization` using matchSchoolEntity(). Separately tests whether
 *    the job's text/location matches more than one DB school via naive substring
 *    scan, surfacing AMBIGUOUS_MULTIPLE_MATCH risks.
 *
 * Read-only: Makes NO writes to Firestore.
 *
 * Usage: npx tsx src/scripts/diagnose_isp_school_and_dates.ts [--limit=50]
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
const BATCH_DELAY_MS = 1000;
const REQUEST_TIMEOUT_MS = 12000;

const STEALTH_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-cache",
};

interface DiagnosticResult {
  docId: string;
  title: string;
  storedSchoolId: string;
  storedSchoolName: string;
  storedDatePosted: string | null;
  storedClosingDate: string | null;
  applyUrl: string;
  structuredDataFound: boolean;
  hiringOrgName: string | null;
  jsonLdDatePosted: string | null;
  jsonLdValidThrough: string | null;
  schoolMatchVerdict: "MATCH" | "MISMATCH" | "NO_HIRING_ORG_DATA" | "FETCH_FAILED";
  schoolMatchScore?: number;
  schoolMatchDetail?: string;
  matchedSchoolsCount: number;
  matchedSchoolNames: string[];
  flags: string[];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchVacancyPageData(applyUrl: string): Promise<{
  structuredDataFound: boolean;
  hiringOrgName: string | null;
  datePosted: string | null;
  validThrough: string | null;
  pageText: string;
  error?: string;
}> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(applyUrl, { headers: STEALTH_HEADERS, signal: controller.signal });
    if (!res.ok) {
      return {
        structuredDataFound: false,
        hiringOrgName: null,
        datePosted: null,
        validThrough: null,
        pageText: "",
        error: `HTTP ${res.status}`,
      };
    }
    const html = await res.text();
    const postings = extractJobPostingsFromHtml(html);
    if (postings.length === 0) {
      return {
        structuredDataFound: false,
        hiringOrgName: null,
        datePosted: null,
        validThrough: null,
        pageText: html,
        error: "No JobPosting JSON-LD found",
      };
    }

    const posting = postings[0];
    const org = posting.hiringOrganization;
    const hiringOrgName = typeof org === "string" ? org : org?.name || null;
    const datePosted = posting.datePosted ? String(posting.datePosted) : null;
    const validThrough = posting.validThrough ? String(posting.validThrough) : null;

    return {
      structuredDataFound: true,
      hiringOrgName,
      datePosted,
      validThrough,
      pageText: html,
    };
  } catch (err: any) {
    return {
      structuredDataFound: false,
      hiringOrgName: null,
      datePosted: null,
      validThrough: null,
      pageText: "",
      error: err?.name === "AbortError" ? "Timed out" : err?.message || String(err),
    };
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
  console.log("🔍 [ISP DIAGNOSTIC] Starting ISP School and Dates Audit...");

  let limit: number | null = null;
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--limit=")) {
      const parsed = parseInt(arg.split("=")[1], 10);
      if (!isNaN(parsed) && parsed > 0) limit = parsed;
    }
  }

  // 1. Fetch schools from Firestore
  console.log("📡 Fetching canonical schools from Firestore...");
  const schoolsSnap = await db.collection("schools").get();
  const dbSchools: any[] = schoolsSnap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  const schoolMap = new Map<string, SchoolEntity>();
  for (const s of dbSchools) {
    schoolMap.set(s.id, {
      id: s.id,
      name: s.name || s.schoolname || "",
      schoolname: s.schoolname || s.name || "",
      city: s.city || "",
      country: s.country || "",
      aliases: Array.isArray(s.aliases) ? s.aliases : [],
      legalNames: Array.isArray(s.legalNames) ? s.legalNames : (Array.isArray(s.legal_names) ? s.legal_names : []),
      group: s.group || s.schoolGroup || s.ownership || "",
    } as any);
  }
  console.log(`✅ Loaded ${schoolMap.size} schools.`);

  // 2. Query ISP jobs in featured_jobs_cache
  console.log("📡 Fetching ISP records from featured_jobs_cache...");
  const jobsSnap = await db.collection("featured_jobs_cache").get();
  const ispJobs: Array<{ docId: string; data: any }> = [];

  for (const doc of jobsSnap.docs) {
    const d = doc.data();
    const isIsp =
      doc.id.startsWith("isp_") ||
      d.source === "ISP" ||
      (Array.isArray(d.sources) && d.sources.includes("ISP")) ||
      String(d.applyUrl || "").includes("internationalschools.wd3.myworkdayjobs.com");
    if (isIsp && d.applyUrl) {
      ispJobs.push({ docId: doc.id, data: d });
    }
  }

  const targets = limit ? ispJobs.slice(0, limit) : ispJobs;
  console.log(`🎯 Found ${ispJobs.length} ISP jobs. Auditing ${targets.length}...\n`);

  // 3. Run audit
  const results = await runBatched(targets, BATCH_SIZE, async ({ docId, data }) => {
    const applyUrl = data.applyUrl || "";
    const storedSchoolId = data.schoolId || "";
    const storedSchoolName = data.schoolName || "";
    const storedDatePosted = data.datePosted || null;
    const storedClosingDate = data.closingDate || null;
    const title = data.title || data.rawTitle || "";
    const flags: string[] = [];

    // Re-run naive substring matching against all DB schools to detect ambiguity
    const jobUrlLower = applyUrl.toLowerCase();
    const jobTitleLower = title.toLowerCase();
    const jobSearchText = `${jobTitleLower} ${jobUrlLower}`;

    const candidateMatches = dbSchools.filter((s: any) => {
      const sName = (s.name || s.schoolname || "").toLowerCase().trim();
      if (!sName || sName.length < 3) return false;
      if (jobSearchText.includes(sName)) return true;
      const aliases: string[] = Array.isArray(s.aliases) ? s.aliases : [];
      if (aliases.some((a) => a && String(a).trim().length >= 3 && jobSearchText.includes(String(a).toLowerCase().trim()))) {
        return true;
      }
      return false;
    });

    const matchedSchoolsCount = candidateMatches.length;
    const matchedSchoolNames = candidateMatches.map((s) => s.name || s.schoolname || s.id);

    if (matchedSchoolsCount > 1) {
      flags.push("AMBIGUOUS_MULTIPLE_MATCH");
    } else if (matchedSchoolsCount === 0) {
      flags.push("NO_SUBSTRING_SCHOOL_MATCH");
    }

    // Live vacancy page inspection
    const fetchRes = await fetchVacancyPageData(applyUrl);

    if (fetchRes.error && !fetchRes.structuredDataFound) {
      flags.push("FETCH_FAILED");
      return {
        docId,
        title,
        storedSchoolId,
        storedSchoolName,
        storedDatePosted,
        storedClosingDate,
        applyUrl,
        structuredDataFound: false,
        hiringOrgName: null,
        jsonLdDatePosted: null,
        jsonLdValidThrough: null,
        schoolMatchVerdict: "FETCH_FAILED" as const,
        schoolMatchDetail: fetchRes.error,
        matchedSchoolsCount,
        matchedSchoolNames,
        flags,
      };
    }

    if (!fetchRes.validThrough) {
      flags.push("NO_CLOSING_DATE_AVAILABLE");
    }

    if (!fetchRes.hiringOrgName) {
      flags.push("NO_HIRING_ORG_DATA");
      return {
        docId,
        title,
        storedSchoolId,
        storedSchoolName,
        storedDatePosted,
        storedClosingDate,
        applyUrl,
        structuredDataFound: fetchRes.structuredDataFound,
        hiringOrgName: null,
        jsonLdDatePosted: fetchRes.datePosted,
        jsonLdValidThrough: fetchRes.validThrough,
        schoolMatchVerdict: "NO_HIRING_ORG_DATA" as const,
        schoolMatchDetail: "JobPosting JSON-LD does not contain hiringOrganization",
        matchedSchoolsCount,
        matchedSchoolNames,
        flags,
      };
    }

    // Verify hiringOrganization against stored school
    const schoolEntity = schoolMap.get(storedSchoolId) || {
      id: storedSchoolId,
      name: storedSchoolName,
      schoolname: storedSchoolName,
      city: data.city || "",
      country: data.country || "",
    };

    const matchResult = matchSchoolEntity(
      schoolEntity,
      {
        candidateText: fetchRes.hiringOrgName,
        city: data.city,
        country: data.country,
      },
      0.85
    );

    const isMatch = matchResult.isMatch && matchResult.score >= 0.85;
    const verdict = isMatch ? ("MATCH" as const) : ("MISMATCH" as const);
    if (!isMatch) {
      flags.push("HIRING_ORG_MISMATCH");
    }

    return {
      docId,
      title,
      storedSchoolId,
      storedSchoolName,
      storedDatePosted,
      storedClosingDate,
      applyUrl,
      structuredDataFound: fetchRes.structuredDataFound,
      hiringOrgName: fetchRes.hiringOrgName,
      jsonLdDatePosted: fetchRes.datePosted,
      jsonLdValidThrough: fetchRes.validThrough,
      schoolMatchVerdict: verdict,
      schoolMatchScore: matchResult.score,
      schoolMatchDetail: isMatch
        ? `Matched "${fetchRes.hiringOrgName}" with score ${matchResult.score.toFixed(2)} (${matchResult.matchType})`
        : `Hiring organization "${fetchRes.hiringOrgName}" does not match stored school "${storedSchoolName}" (score=${matchResult.score.toFixed(2)})`,
      matchedSchoolsCount,
      matchedSchoolNames,
      flags,
    };
  });

  // 4. Summarize results
  const summary = {
    totalAudited: results.length,
    structuredDataFoundCount: results.filter((r) => r.structuredDataFound).length,
    noClosingDateCount: results.filter((r) => r.flags.includes("NO_CLOSING_DATE_AVAILABLE")).length,
    hasClosingDateCount: results.filter((r) => !!r.jsonLdValidThrough).length,
    hasDatePostedCount: results.filter((r) => !!r.jsonLdDatePosted).length,
    ambiguousMultipleMatchCount: results.filter((r) => r.flags.includes("AMBIGUOUS_MULTIPLE_MATCH")).length,
    hiringOrgMatchCount: results.filter((r) => r.schoolMatchVerdict === "MATCH").length,
    hiringOrgMismatchCount: results.filter((r) => r.schoolMatchVerdict === "MISMATCH").length,
    noHiringOrgDataCount: results.filter((r) => r.schoolMatchVerdict === "NO_HIRING_ORG_DATA").length,
    fetchFailedCount: results.filter((r) => r.schoolMatchVerdict === "FETCH_FAILED").length,
  };

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputDir = path.resolve(process.cwd(), "src/scripts/output");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const outputPath = path.join(outputDir, `isp_school_and_dates_diagnostic_${timestamp}.json`);

  fs.writeFileSync(outputPath, JSON.stringify({ timestamp: new Date().toISOString(), summary, results }, null, 2), "utf-8");

  console.log("\n================ ISP SCHOOL & DATES DIAGNOSTIC SUMMARY ================");
  console.log(`📁 Report written to:           ${outputPath}`);
  console.log(`📊 Total ISP Jobs Audited:       ${summary.totalAudited}`);
  console.log(`📑 Structured Data Found:       ${summary.structuredDataFoundCount}/${summary.totalAudited}`);
  console.log(`📅 Real datePosted in JSON-LD:  ${summary.hasDatePostedCount}/${summary.totalAudited}`);
  console.log(`⏰ Real validThrough (Deadline): ${summary.hasClosingDateCount}/${summary.totalAudited}`);
  console.log(`🚫 NO_CLOSING_DATE_AVAILABLE:   ${summary.noClosingDateCount}/${summary.totalAudited}`);
  console.log(`🔀 AMBIGUOUS_MULTIPLE_MATCH:     ${summary.ambiguousMultipleMatchCount}`);
  console.log(`✅ HIRING ORG MATCH:            ${summary.hiringOrgMatchCount}`);
  console.log(`❌ HIRING ORG MISMATCH:         ${summary.hiringOrgMismatchCount}`);
  console.log(`❓ NO_HIRING_ORG_DATA:          ${summary.noHiringOrgDataCount}`);
  console.log(`⚠️  FETCH_FAILED:                 ${summary.fetchFailedCount}`);
  console.log("=======================================================================\n");

  const ambiguous = results.filter((r) => r.flags.includes("AMBIGUOUS_MULTIPLE_MATCH"));
  if (ambiguous.length > 0) {
    console.log(`🚨 AMBIGUOUS MULTIPLE MATCHES (${ambiguous.length} jobs):`);
    for (const row of ambiguous.slice(0, 10)) {
      console.log(`- ${row.docId}: "${row.title}"`);
      console.log(`   Stored School: ${row.storedSchoolName} (${row.storedSchoolId})`);
      console.log(`   Matches (${row.matchedSchoolsCount}): ${row.matchedSchoolNames.join(", ")}`);
      console.log(`   URL: ${row.applyUrl}\n`);
    }
    if (ambiguous.length > 10) {
      console.log(`   ... and ${ambiguous.length - 10} more (see JSON report)\n`);
    }
  }

  const mismatches = results.filter((r) => r.schoolMatchVerdict === "MISMATCH");
  if (mismatches.length > 0) {
    console.log(`🚨 HIRING ORG MISMATCHES (${mismatches.length} jobs):`);
    for (const row of mismatches) {
      console.log(`- ${row.docId}: "${row.title}"`);
      console.log(`   Stored School: ${row.storedSchoolName}`);
      console.log(`   Hiring Org:    ${row.hiringOrgName}`);
      console.log(`   Detail:        ${row.schoolMatchDetail}`);
      console.log(`   URL:           ${row.applyUrl}\n`);
    }
  }
}

main().catch((err) => {
  console.error("❌ Diagnostic failed:", err);
  process.exit(1);
});

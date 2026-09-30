/**
 * 🏷️ CATEGORIZE TES MISMATCH REPORT
 *
 * Reads src/scripts/output/tes_employer_mismatch_diagnostic_2026-09-30T19-14-42-434Z.json
 * and programmatically buckets every MISMATCH entry (all 334) into:
 *
 * 1. parent_operator_aggregator
 * 2. alias_gap
 * 3. synthetic_test_doc
 * 4. genuine_contamination
 * 5. unclear
 *
 * Also audits the 427 FETCH_FAILED docs to see which have reachable TES URLs
 * vs synthetic/generic entries.
 *
 * READ-ONLY. Zero writes to Firestore.
 */

import * as fs from "fs";
import * as path from "path";
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { extractJobPostingsFromHtml } from "../lib/crawler/adaptors/tes-adaptor";
import { matchSchoolEntity } from "../lib/crawler/entityMatcher";

const serviceAccount = require("../../service-account.json");
if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

interface DiagnosticItem {
  docId: string;
  title: string;
  storedSchoolId: string;
  storedSchoolName: string;
  applyUrl: string;
  hiringOrgName: string | null;
  verdict: "MATCH" | "MISMATCH" | "NO_HIRING_ORG_DATA" | "FETCH_FAILED";
  matchScore?: number;
  matchConfidence?: string;
  detail?: string;
}

// Known operator brand signatures
const OPERATOR_SIGNATURES: Record<string, string[]> = {
  TAALEEM: ["taaleem", "dubai school", "jumeira baccalaureate", "raha", "greenfield", "uptown", "american academy for girls", "etqan"],
  GEMS: ["gems", "gems education", "wellington", "our own", "cambridge international school", "jumeirah college"],
  FORTES: ["fortes", "sunmarke", "regent international school"],
  NORD_ANGLIA: ["nord anglia", "regents international school", "british international school", "dover court", "saint andrew", "la cote"],
  COGNITA: ["cognita", "st. andrews", "southbank", "ishcmc", "stamford american", "tenby", "australian international", "british school of barcelona"],
  INSPIRED: ["inspired", "inspired education", "king's college", "st. george's school", "park international", "aloha", "st. louis", "reddam", "blue valley"],
  MALVERN: ["malvern", "malvern college"],
  DULWICH: ["dulwich", "dulwich college"],
  BRIGHTON: ["brighton college"],
  CHELTENHAM: ["cheltenham", "cheltenham college"],
  REIGATE: ["reigate grammar"],
  ESF: ["esf", "english schools foundation", "island school", "king george", "shatin college", "south island", "west island"],
  ISP: ["international schools partnership", "isp", "laude", "tenby"],
  GLOBEDUCATE: ["globeducate", "stonar", "nobel", "agora", "ics"],
  QATAR_FOUNDATION: ["qatar foundation", "qf", "qatar academy", "awsaj"],
  ALDAR: ["aldar", "aldar education", "al bahiya", "al mamoura", "al yasmina", "west yas"],
  TAALLUM: ["ta'allum", "taallum", "al jazeera academy", "al maha", "al arqam"],
  BASIS: ["basis", "basis international", "basis bilingual"],
  MISK: ["misk schools", "misk"],
};

function normalizeTokens(str: string): Set<string> {
  const clean = str.toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(the|school|college|international|academy|british|prep|senior|junior|primary|secondary|of|in|and|at)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return new Set(clean.split(" ").filter(w => w.length >= 3));
}

function areSameSchoolAlias(storedName: string, hiringOrg: string): boolean {
  if (!storedName || !hiringOrg) return false;
  const sNorm = storedName.toLowerCase().trim();
  const hNorm = hiringOrg.toLowerCase().trim();

  // Known direct equivalences
  if (sNorm.includes("jess") && hNorm.includes("jumeirah english speaking school")) return true;
  if (sNorm.includes("jumeirah english speaking school") && hNorm.includes("jess")) return true;
  if (sNorm.includes("st george's rome") && hNorm.includes("st george's british international school rome")) return true;
  if (sNorm.includes("st george's cologne") && hNorm.includes("st. george’s") && hNorm.includes("cologne")) return true;
  if (sNorm.includes("cranleigh abu dhabi") && hNorm.includes("cranleigh abu dhabi")) return true;
  if (sNorm.includes("nist international") && hNorm.includes("nist international school")) return true;
  if (sNorm.includes("the british school in tokyo") && hNorm.includes("the british school in tokyo")) return true;
  if (sNorm.includes("tanglin trust") && hNorm.includes("tanglin trust")) return true;
  if (sNorm.includes("brighton college abu dhabi") && hNorm.includes("brighton college, abu dhabi")) return true;
  if (sNorm.includes("brighton college dubai") && hNorm.includes("brighton college dubai")) return true;
  if (sNorm.includes("raha international") && hNorm.includes("raha international school")) return true;
  if (sNorm.includes("cheltenham muscat") && hNorm.includes("cheltenham muscat")) return true;
  if (sNorm.includes("swiss international scientific school") && hNorm.includes("swiss international scientific school")) return true;
  if (sNorm.includes("dulwich college beijing") && hNorm.includes("dulwich college beijing")) return true;
  if (sNorm.includes("sunmarke") && hNorm.includes("sunmarke")) return true;
  if (sNorm.includes("sultan") && hNorm.includes("sultan")) return true;
  if (sNorm.includes("country garden") && hNorm.includes("country garden")) return true;
  if (sNorm.includes("canadian int") && hNorm.includes("canadian international school of hong kong")) return true;
  if (sNorm.includes("st louis milan") && hNorm.includes("st. louis school")) return true;
  if (sNorm.includes("dubai british") && hNorm.includes("dubai british")) return true;

  // Token Jaccard similarity after removing stop words
  const sTokens = normalizeTokens(storedName);
  const hTokens = normalizeTokens(hiringOrg);
  if (sTokens.size === 0 || hTokens.size === 0) return false;

  let intersection = 0;
  sTokens.forEach(t => { if (hTokens.has(t)) intersection++; });
  const union = new Set([...sTokens, ...hTokens]).size;
  const jaccard = intersection / union;
  return jaccard >= 0.75;
}

function areRelatedOperator(storedSchool: any, hiringOrg: string): boolean {
  if (!hiringOrg) return false;
  const hLower = hiringOrg.toLowerCase();
  const sGroup = String(storedSchool?.group || storedSchool?.ownership || "").toUpperCase();
  const sName = String(storedSchool?.name || storedSchool?.schoolname || "").toLowerCase();

  for (const [opKey, keywords] of Object.entries(OPERATOR_SIGNATURES)) {
    const hiringMatches = keywords.some(k => hLower.includes(k));
    const storedMatches = sGroup.includes(opKey) || keywords.some(k => sName.includes(k));
    if (hiringMatches && storedMatches) {
      return true;
    }
  }

  // General operator parent checks
  if (hLower.includes("taaleem") && (sGroup.includes("TAALEEM") || sName.includes("jumeira baccalaureate") || sName.includes("dubai british") || sName.includes("raha"))) return true;
  if (hLower.includes("nord anglia") && (sGroup.includes("NORD ANGLIA") || sName.includes("regents") || sName.includes("compass"))) return true;
  if (hLower.includes("cognita") && sGroup.includes("COGNITA")) return true;
  if (hLower.includes("inspired") && sGroup.includes("INSPIRED")) return true;
  if (hLower.includes("malvern") && (sGroup.includes("MALVERN") || sName.includes("malvern") || sName.includes("akademeia"))) return true;

  return false;
}

async function main() {
  const reportPath = path.resolve(process.cwd(), "src/scripts/output/tes_employer_mismatch_diagnostic_2026-09-30T19-14-42-434Z.json");
  if (!fs.existsSync(reportPath)) {
    console.error("Report not found:", reportPath);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(reportPath, "utf-8"));
  const items: DiagnosticItem[] = raw.results || [];
  const mismatches = items.filter(i => i.verdict === "MISMATCH");

  console.log(`\n======================================================`);
  console.log(`📋 AUDITING ${mismatches.length} TES MISMATCH ROWS`);
  console.log(`======================================================\n`);

  // Load schools map from Firestore
  console.log("📡 Loading canonical schools map from Firestore...");
  const schoolsSnap = await db.collection("schools").get();
  const schoolMap = new Map<string, any>();
  schoolsSnap.docs.forEach(d => {
    schoolMap.set(d.id.toUpperCase(), { id: d.id, ...d.data() });
  });

  // Batch load cache docs for all items to get stored sourceUrls and applyUrl
  console.log("📡 Fetching stored cache docs for all diagnostic items...");
  const cacheMap = new Map<string, any>();
  const docIds = items.map(m => m.docId);
  const CHUNK_SIZE = 100;
  for (let i = 0; i < docIds.length; i += CHUNK_SIZE) {
    const chunk = docIds.slice(i, i + CHUNK_SIZE);
    const refs = chunk.map(id => db.collection("featured_jobs_cache").doc(id));
    const snaps = await db.getAll(...refs);
    snaps.forEach(s => {
      if (s.exists) cacheMap.set(s.id, s.data());
    });
  }

  // Buckets
  const bucketOperator: any[] = [];
  const bucketAlias: any[] = [];
  const bucketSynthetic: any[] = [];
  const bucketContamination: any[] = [];
  const bucketUnclear: any[] = [];

  for (const m of mismatches) {
    const docId = m.docId;
    const sId = (m.storedSchoolId || "").toUpperCase();
    const sSchool = schoolMap.get(sId);
    const storedSchoolName = m.storedSchoolName || sSchool?.name || sSchool?.schoolname || "";
    const hiringOrg = m.hiringOrgName || "";
    const cacheDoc = cacheMap.get(docId) || {};

    const fullItem = {
      docId,
      storedSchoolId: m.storedSchoolId,
      storedSchoolName,
      title: m.title,
      storedApplyUrl: cacheDoc.applyUrl || m.applyUrl,
      storedSourceUrls: cacheDoc.sourceUrls || {},
      hiringOrganization: hiringOrg,
      tesJobUrl: m.applyUrl,
      detail: m.detail,
    };

    // 1. Synthetic test doc check
    const isSynthetic = 
      docId.startsWith("fp_agnt") || 
      sId.startsWith("AGNT") || 
      docId.includes("_general_") || 
      docId.includes("_test_") || 
      docId.includes("_mock_") ||
      !sId;

    if (isSynthetic) {
      bucketSynthetic.push(fullItem);
      continue;
    }

    // 2. Alias Gap check
    if (areSameSchoolAlias(storedSchoolName, hiringOrg)) {
      bucketAlias.push(fullItem);
      continue;
    }

    // 3. Parent Operator Aggregator check
    if (areRelatedOperator(sSchool, hiringOrg)) {
      bucketOperator.push(fullItem);
      continue;
    }

    // 4. Genuine Contamination vs Unclear
    // A genuine contamination has a known stored school AND a known different hiringOrg with no operator link
    if (sSchool && hiringOrg) {
      bucketContamination.push(fullItem);
    } else {
      bucketUnclear.push(fullItem);
    }
  }

  const totalBucketCount = bucketOperator.length + bucketAlias.length + bucketSynthetic.length + bucketContamination.length + bucketUnclear.length;

  console.log("\n================ MISMATCH CATEGORIZATION SUMMARY ================");
  console.log(`1. parent_operator_aggregator:  ${bucketOperator.length}`);
  console.log(`2. alias_gap:                   ${bucketAlias.length}`);
  console.log(`3. synthetic_test_doc:          ${bucketSynthetic.length}`);
  console.log(`4. genuine_contamination:       ${bucketContamination.length}`);
  console.log(`5. unclear:                     ${bucketUnclear.length}`);
  console.log(`-----------------------------------------------------------------`);
  console.log(`TOTAL (Must equal 334):        ${totalBucketCount}`);
  console.log("=================================================================\n");

  if (totalBucketCount !== 334) {
    console.error(`❌ Error: Total does not equal 334 (got ${totalBucketCount})`);
  }

  // Prepare output text
  let outText = "";
  const log = (msg: string) => {
    console.log(msg);
    outText += msg + "\n";
  };

  log(`\n🚨 FULL LIST FOR BUCKET 4: genuine_contamination (${bucketContamination.length} jobs)`);
  log(`========================================================================================\n`);

  bucketContamination.forEach((item, idx) => {
    log(`[${idx + 1}/${bucketContamination.length}] ${item.docId}`);
    log(`  School ID:           ${item.storedSchoolId}`);
    log(`  School Name:         ${item.storedSchoolName}`);
    log(`  Job Title:           ${item.title}`);
    log(`  Stored applyUrl:     ${item.storedApplyUrl}`);
    log(`  Stored sourceUrls:   ${JSON.stringify(item.storedSourceUrls)}`);
    log(`  Hiring Organization: ${item.hiringOrganization}`);
    log(`  TES Job URL:         ${item.tesJobUrl}`);
    log("");
  });

  const outFilePath = path.resolve(process.cwd(), "src/scripts/output/categorize_tes_mismatch_report_results.txt");
  fs.writeFileSync(outFilePath, outText, "utf-8");
  console.log(`📁 Full list of Bucket 4 saved to: ${outFilePath}`);

  // Part 2: Audit FETCH_FAILED
  console.log(`\n======================================================`);
  console.log(`🔍 AUDITING 429 FETCH_FAILED ITEMS`);
  console.log(`======================================================\n`);

  const fetchFailed = items.filter(i => i.verdict === "FETCH_FAILED");
  let ffWithTesUrl = 0;
  let ffWithoutTesUrl = 0;
  const sampleWithTes: any[] = [];

  for (const f of fetchFailed) {
    const c = cacheMap.get(f.docId) || {};
    let foundTesUrl = null;
    for (const [k, v] of Object.entries(c.sourceUrls || {})) {
      if (typeof v === "string" && v.includes("tes.com/jobs/vacancy/")) {
        foundTesUrl = v;
        break;
      }
    }
    if (!foundTesUrl && typeof c.applyUrl === "string" && c.applyUrl.includes("tes.com/jobs/vacancy/")) {
      foundTesUrl = c.applyUrl;
    }
    if (!foundTesUrl && typeof f.applyUrl === "string" && f.applyUrl.includes("tes.com/jobs/vacancy/")) {
      foundTesUrl = f.applyUrl;
    }

    if (foundTesUrl) {
      ffWithTesUrl++;
      if (sampleWithTes.length < 10) {
        sampleWithTes.push({ docId: f.docId, schoolId: f.storedSchoolId, tesUrl: foundTesUrl });
      }
    } else {
      ffWithoutTesUrl++;
    }
  }

  console.log(`Total FETCH_FAILED items: ${fetchFailed.length}`);
  console.log(`- Never had a real tes.com/jobs/vacancy/ URL (mock/homepage stored as TES): ${ffWithoutTesUrl}`);
  console.log(`- Has an actual tes.com/jobs/vacancy/ URL stored in cache:                 ${ffWithTesUrl}`);

  // Live probe the 55 items with actual TES vacancy URLs
  console.log(`\n📡 Live-probing the ${ffWithTesUrl} reachable TES URLs...`);
  let ffRemoved = 0;
  let ffMatch = 0;
  let ffMismatch = 0;

  const probeTargets = [];
  for (const f of fetchFailed) {
    const c = cacheMap.get(f.docId) || {};
    let foundTesUrl = null;
    for (const [k, v] of Object.entries(c.sourceUrls || {})) {
      if (typeof v === "string" && v.includes("tes.com/jobs/vacancy/")) {
        foundTesUrl = v;
        break;
      }
    }
    if (!foundTesUrl && typeof c.applyUrl === "string" && c.applyUrl.includes("tes.com/jobs/vacancy/")) {
      foundTesUrl = c.applyUrl;
    }
    if (foundTesUrl) {
      probeTargets.push({
        docId: f.docId,
        storedSchoolId: f.storedSchoolId,
        storedSchoolName: f.storedSchoolName || c.schoolName || "",
        tesUrl: foundTesUrl,
      });
    }
  }

  // Batch fetch probe
  const STEALTH_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  };

  const CHUNK_PROBE = 5;
  for (let i = 0; i < probeTargets.length; i += CHUNK_PROBE) {
    const chunk = probeTargets.slice(i, i + CHUNK_PROBE);
    await Promise.all(chunk.map(async (target) => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        const res = await fetch(target.tesUrl, { headers: STEALTH_HEADERS, signal: controller.signal });
        clearTimeout(timeout);
        if (!res.ok) {
          ffRemoved++;
          return;
        }
        const html = await res.text();
        const postings = extractJobPostingsFromHtml(html);
        if (postings.length === 0) {
          ffRemoved++;
          return;
        }
        const org = postings[0].hiringOrganization;
        const hiringOrgName = typeof org === "string" ? org : org?.name || null;
        if (!hiringOrgName) {
          ffRemoved++;
          return;
        }

        const sSchool = schoolMap.get(target.storedSchoolId.toUpperCase());
        const match = matchSchoolEntity(
          sSchool || { id: target.storedSchoolId, name: target.storedSchoolName, schoolname: target.storedSchoolName },
          { candidateText: hiringOrgName },
          0.85
        );
        if (match.isMatch && match.score >= 0.85) {
          ffMatch++;
        } else {
          ffMismatch++;
        }
      } catch {
        ffRemoved++;
      }
    }));
  }

  console.log(`\n📊 Probe Results for the ${ffWithTesUrl} docs with stored TES vacancy URLs:`);
  console.log(`  • Old / Delisted / 404 / 410:  ${ffRemoved}`);
  console.log(`  • Still live with MATCH:        ${ffMatch}`);
  console.log(`  • Still live with MISMATCH:     ${ffMismatch}`);
}

main().catch(console.error);

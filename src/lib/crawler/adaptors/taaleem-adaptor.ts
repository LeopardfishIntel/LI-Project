/**
 * 🏫 TAALEEM CAREER ENGINE ADAPTOR (TOKENIZED BROWSER SESSION SWEEPER)
 *
 * Establishes an authenticated session with careers.taaleem.ae, extracts the
 * ephemeral Bayt dynamic security token, sweeps all active network pages, filters
 * non-teaching positions, and attaches deep curriculum, term, and role metadata with direct URLs.
 */

import { chromium } from "playwright";
import type { AdaptorInput, RawJobRecord } from "./raw-job.types";
import { isSupportOrNonTeachingRole } from "../roleClassifier";

/**
 * 🎯 Enforces clean job titles
 */
export function cleanTaaleemJobTitle(rawTitle: string): string {
  if (!rawTitle) return "";
  let clean = rawTitle.trim();

  clean = clean.replace(/([a-z])([A-Z])/g, "$1 $2");

  clean = clean
    .split(
      /-\s*(?:Immediate|October|August|Sept(?:ember)?|Jan(?:uary)?|April|May|June|July|November|December)\s*(?:start|\d{4})?/i
    )[0]
    .trim();

  clean = clean
    .replace(/[-,s]+$/, "")
    .replace(/\s+/g, " ")
    .trim();

  if (clean.length > 70) {
    clean = clean
      .substring(0, 70)
      .replace(/[-,s]+$/, "")
      .trim();
  }

  return clean || rawTitle.trim().substring(0, 70);
}

/**
 * 📚 Curriculum Track Tagging
 */
export function extractTaaleemCurriculumTrack(title: string, description?: string): string[] {
  const combined = `${title} ${description || ""}`.toLowerCase();
  const tracks: string[] = [];

  if (/\b(ib\s*dp|diploma\s*programme|ibdp)\b/i.test(combined)) tracks.push("IB DP");
  if (/\b(myp|middle\s*years\s*programme)\b/i.test(combined)) tracks.push("MYP");
  if (/\b(pyp|primary\s*years\s*programme)\b/i.test(combined)) tracks.push("PYP");
  if (/\b(igcse|gcse)\b/i.test(combined)) tracks.push("IGCSE");
  if (/\b(btec)\b/i.test(combined)) tracks.push("BTEC");
  if (/\b(ncfe|national\s*curriculum\s*for\s*england|british\s*curriculum|uk\s*curriculum)\b/i.test(combined)) {
    tracks.push("National Curriculum for England (NCfE)");
  }
  if (/\b(us\s*curriculum|american\s*curriculum|common\s*core|ap\b|advanced\s*placement)\b/i.test(combined)) {
    tracks.push("US Curriculum");
  }

  if (tracks.length === 0) {
    if (/\b(ib|international\s*baccalaureate)\b/i.test(combined)) tracks.push("IB");
  }

  return tracks.length > 0 ? tracks : ["International"];
}

/**
 * 🗓️ Start Term Tagging
 */
export function extractTaaleemStartTerm(title: string, description?: string): string {
  const combined = `${title} ${description || ""}`;

  if (/\bimmediate(?:ly)?\b/i.test(combined)) return "Immediate";
  if (/\baug(?:ust)?\s*(?:2026|2027)?\b/i.test(combined)) return "August 2026";
  if (/\bsep(?:t(?:ember)?)?\s*(?:2026|2027)?\b/i.test(combined)) return "September 2026";
  if (/\bjan(?:uary)?\s*(?:2026|2027)?\b/i.test(combined)) return "January 2027";
  if (/\bapr(?:il)?\s*(?:2026|2027)?\b/i.test(combined)) return "April 2026";

  return "August 2026";
}

/**
 * 👑 Role Tier Tagging
 */
export function extractTaaleemRoleTier(title: string, description?: string): "Classroom Teacher" | "Head of Department (HoD)" | "SLT / Coordinator" | "Counselor / Specialist" {
  const combined = `${title} ${description || ""}`.toLowerCase();

  if (/\b(principal|head of school|director|vice principal|deputy head|assistant head|slt|dean|head of primary|head of secondary|coordinator)\b/i.test(combined)) {
    return "SLT / Coordinator";
  }
  if (/\b(head of department|hod|lead teacher|head of faculty|curriculum leader|subject leader|head of pe|head of science|head of maths|head of english|head of arabic)\b/i.test(combined)) {
    return "Head of Department (HoD)";
  }
  if (/\b(counselor|counsellor|psychologist|sen\s*coordinator|senco|special\s*needs|librarian|speech|inclusion)\b/i.test(combined)) {
    return "Counselor / Specialist";
  }

  return "Classroom Teacher";
}

export interface RawTaaleemJob {
  id: string;
  title: string;
  url: string;
  applyUrl: string;
  companyName: string;
  description?: string;
  crtDate?: string;
  expDate?: string;
  loc?: string;
}

/**
 * 🌐 Sweeps all active pages of Taaleem Education network via authenticated token session
 */
export async function sweepAllTaaleemNetwork(): Promise<RawTaaleemJob[]> {
  console.log("🏫 [TAALEEM ENGINE] Launching authenticated tokenized session sweep...");
  let browser = null;

  try {
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });

    const page = await browser.newPage();
    let dynamicToken = "";

    page.on("request", (req) => {
      const u = req.url();
      if (u.includes("byt_job_search_manager") && u.includes("token=")) {
        const match = u.match(/token=([a-zA-Z0-9_-]+)/);
        if (match) dynamicToken = match[1];
      }
    });

    await page.goto("https://careers.taaleem.ae/en/job-search-results/", {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    console.log(`🏫 [TAALEEM ENGINE] Active Session Token Captured: "${dynamicToken || "default"}"`);

    const harvestedJobs: RawTaaleemJob[] = await page.evaluate(async (tok) => {
      const all: any[] = [];
      const tokenParam = tok ? `&token=${tok}` : "";

      const firstRes = await fetch(
        `/app/control/byt_job_search_manager?action=1${tokenParam}&query=page=1&body=job-search-results&lan=en`,
        { headers: { "X-Requested-With": "XMLHttpRequest" } }
      );
      const firstData = await firstRes.json();
      const totalJobs = firstData.totalJobs || 0;
      const totalPages = Math.ceil(totalJobs / 10);
      all.push(...(firstData.jobs || []));

      for (let p = 2; p <= totalPages; p++) {
        const res = await fetch(
          `/app/control/byt_job_search_manager?action=1${tokenParam}&query=page=${p}&body=job-search-results&lan=en`,
          { headers: { "X-Requested-With": "XMLHttpRequest" } }
        );
        const data = await res.json();
        if (data.jobs) all.push(...data.jobs);
      }

      return all.map((j: any) => ({
        id: String(j.id || ""),
        title: String(j.title || "").trim(),
        url: String(j.url || "").trim(),
        applyUrl: String(j.url || "").startsWith("http") ? String(j.url || "").trim() : `https://careers.taaleem.ae${String(j.url || "").trim()}`,
        companyName: String(j.companyName || j.company_name || "").trim(),
        description: String(j.desc || j.description || "").trim(),
        crtDate: j.crtDate ? String(j.crtDate) : undefined,
        expDate: j.expDate ? String(j.expDate) : undefined,
        loc: j.loc ? String(j.loc) : "UAE",
      }));
    }, dynamicToken);

    console.log(`🏫 [TAALEEM ENGINE] Harvested ${harvestedJobs.length} total direct Taaleem network records.`);
    return harvestedJobs;
  } catch (err: any) {
    console.error("❌ [TAALEEM ENGINE] Error during browser session sweep:", err?.message || err);
    return [];
  } finally {
    if (browser) await browser.close();
  }
}

/**
 * 🏫 Standard Adaptor entry point
 */
export async function runTaaleemAdaptor(
  input: AdaptorInput,
  taaleemCompanyName?: string
): Promise<RawJobRecord[]> {
  const targetCompany = (taaleemCompanyName || input.schoolName || "").trim().toLowerCase();
  const allNetworkJobs = await sweepAllTaaleemNetwork();

  const matchingJobs = allNetworkJobs.filter((j) => {
    const cName = String(j.companyName || "").trim().toLowerCase();
    return cName === targetCompany || cName.includes(targetCompany) || targetCompany.includes(cName);
  });

  const records: RawJobRecord[] = [];
  const seenUrls = new Set<string>();

  for (const job of matchingJobs) {
    const rawTitle = String(job.title || "").trim();
    if (!rawTitle || isSupportOrNonTeachingRole(rawTitle)) continue;

    const applyUrl = job.applyUrl;
    if (seenUrls.has(applyUrl.toLowerCase())) continue;
    seenUrls.add(applyUrl.toLowerCase());

    const datePosted = job.crtDate ? String(job.crtDate).split(" ")[0] : null;
    const closingDate = job.expDate ? String(job.expDate).split(" ")[0] : null;

    records.push({
      rawTitle: cleanTaaleemJobTitle(rawTitle) || rawTitle,
      applyUrl,
      source: "Taaleem",
      datePosted,
      closingDate,
      schoolId: input.schoolId,
      schoolName: input.schoolName,
      city: input.city || "Dubai",
      country: input.country || "United Arab Emirates",
      curriculum: extractTaaleemCurriculumTrack(rawTitle, job.description).join(", "),
      startTerm: extractTaaleemStartTerm(rawTitle, job.description),
      roleTier: extractTaaleemRoleTier(rawTitle, job.description),
    });
  }

  return records;
}
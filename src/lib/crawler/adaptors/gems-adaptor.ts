/**
 * 💎 GEMS EDUCATION CAREER ENGINE ADAPTOR (TOKENIZED BROWSER SESSION SWEEPER)
 *
 * Establishes an authenticated session with careers.gemseducation.com, extracts the
 * ephemeral Bayt dynamic security token, sweeps all active network pages, filters
 * non-teaching positions, and attaches deep curriculum, term, and role metadata.
 */

import { chromium } from "playwright";
import type { AdaptorInput, RawJobRecord } from "./raw-job.types";
import { isSupportOrNonTeachingRole } from "../roleClassifier";
import { isPastAcademicIntake } from "../dateParser";

/**
 * 🎯 ENFORCES SHORT JOB TITLE ONLY (Capped at 60 Characters Maximum)
 */
export function cleanGemsJobTitle(rawTitle: string): string {
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

  if (clean.length > 60) {
    clean = clean
      .substring(0, 60)
      .replace(/[-,s]+$/, "")
      .trim();
  }

  return clean || rawTitle.trim().substring(0, 60);
}

/**
 * 📚 METADATA EXTRACTION: Curriculum Track Tagging
 */
export function extractCurriculumTrack(title: string, description?: string): string[] {
  const combined = `${title} ${description || ""}`.toLowerCase();
  const tracks: string[] = [];

  if (/\b(ib\s*dp|diploma\s*programme|ibdp)\b/i.test(combined)) tracks.push("IB DP");
  if (/\b(myp|middle\s*years\s*programme)\b/i.test(combined)) tracks.push("MYP");
  if (/\b(pyp|primary\s*years\s*programme)\b/i.test(combined)) tracks.push("PYP");
  if (/\b(igcse|gcse)\b/i.test(combined)) tracks.push("IGCSE");
  if (/\b(ncfe|national\s*curriculum\s*for\s*england|british\s*curriculum|uk\s*curriculum)\b/i.test(combined)) {
    tracks.push("National Curriculum for England (NCfE)");
  }
  if (/\b(us\s*curriculum|american\s*curriculum|common\s*core|ap\b|advanced\s*placement)\b/i.test(combined)) {
    tracks.push("US Curriculum");
  }
  if (/\b(cbse|indian\s*curriculum)\b/i.test(combined)) tracks.push("CBSE");

  if (tracks.length === 0) {
    if (/\b(ib|international\s*baccalaureate)\b/i.test(combined)) tracks.push("IB");
  }

  return tracks.length > 0 ? tracks : ["International"];
}

/**
 * 🗓️ METADATA EXTRACTION: Start Term Tagging
 */
export function extractStartTerm(title: string, description?: string): string {
  const combined = `${title} ${description || ""}`;

  if (/\bimmediate(?:ly)?\b/i.test(combined)) return "Immediate";

  const match = combined.match(/\b(aug(?:ust)?|sep(?:t(?:ember)?)?|jan(?:uary)?|apr(?:il)?)\s*(20\d{2})?\b/i);
  if (match) {
    const rawMonth = match[1].toLowerCase();
    const explicitYear = match[2];
    let monthName = "August";
    if (rawMonth.startsWith("sep")) monthName = "September";
    else if (rawMonth.startsWith("jan")) monthName = "January";
    else if (rawMonth.startsWith("apr")) monthName = "April";

    if (explicitYear) {
      return `${monthName} ${explicitYear}`;
    }
    const currentYear = new Date().getFullYear();
    return `${monthName} ${currentYear}`;
  }

  return "August 2026";
}

/**
 * 👑 METADATA EXTRACTION: Role Tier Tagging
 */
export function extractRoleTier(title: string, description?: string): "Classroom Teacher" | "Head of Department (HoD)" | "SLT / Coordinator" | "Counselor / Specialist" {
  const combined = `${title} ${description || ""}`.toLowerCase();

  if (/\b(principal|head of school|director|vice principal|deputy head|assistant head|slt|dean|head of primary|head of secondary|coordinator)\b/i.test(combined)) {
    return "SLT / Coordinator";
  }
  if (/\b(head of department|hod|lead teacher|head of faculty|curriculum leader|subject leader)\b/i.test(combined)) {
    return "Head of Department (HoD)";
  }
  if (/\b(counselor|counsellor|psychologist|sen\s*coordinator|senco|special\s*needs|librarian|speech)\b/i.test(combined)) {
    return "Counselor / Specialist";
  }

  return "Classroom Teacher";
}

/**
 * 🌐 Sweeps all pages of GEMS Education network via authenticated token session
 */
export async function sweepAllGemsNetwork(): Promise<any[]> {
  console.log("💎 [GEMS ENGINE] Launching authenticated tokenized session sweep...");
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

    await page.goto("https://careers.gemseducation.com/en/job-search-results/", {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    console.log(`💎 [GEMS ENGINE] Active Session Token Captured: "${dynamicToken || "default"}"`);

    const harvestedJobs = await page.evaluate(async (tok) => {
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

      return all;
    }, dynamicToken);

    console.log(`💎 [GEMS ENGINE] Harvested ${harvestedJobs.length} total raw network records.`);
    return harvestedJobs;
  } catch (err: any) {
    console.error("❌ [GEMS ENGINE] Error during browser session sweep:", err?.message || err);
    return [];
  } finally {
    if (browser) await browser.close();
  }
}

/**
 * 💎 Standard Adaptor entry point
 */
export async function runGemsAdaptor(
  input: AdaptorInput,
  gemsCompanyName?: string
): Promise<RawJobRecord[]> {
  const targetCompany = (gemsCompanyName || input.schoolName || "").trim().toLowerCase();
  const allNetworkJobs = await sweepAllGemsNetwork();

  const matchingJobs = allNetworkJobs.filter((j) => {
    const cName = String(j.companyName || j.company_name || "").trim().toLowerCase();
    return cName === targetCompany || cName.includes(targetCompany) || targetCompany.includes(cName);
  });

  const records: RawJobRecord[] = [];
  const seenUrls = new Set<string>();

  for (const job of matchingJobs) {
    const rawTitle = String(job.title || "").trim();
    if (!rawTitle || isSupportOrNonTeachingRole(rawTitle)) continue;

    if (
      isPastAcademicIntake(rawTitle).isPast ||
      isPastAcademicIntake(job.description).isPast ||
      isPastAcademicIntake(job.crtDate).isPast
    ) {
      continue;
    }

    const relativeUrl = String(job.url || job.apply_url || job.applyUrl || "");
    const applyUrl = relativeUrl.startsWith("http") ? relativeUrl : `https://careers.gemseducation.com${relativeUrl}`;

    if (seenUrls.has(applyUrl.toLowerCase())) continue;
    seenUrls.add(applyUrl.toLowerCase());

    const datePosted = job.crtDate ? String(job.crtDate).split(" ")[0] : null;
    const closingDate = job.expDate ? String(job.expDate).split(" ")[0] : null;

    records.push({
      rawTitle: cleanGemsJobTitle(rawTitle) || rawTitle,
      applyUrl,
      source: "GEMS Education",
      datePosted,
      closingDate,
      schoolId: input.schoolId,
      schoolName: input.schoolName,
      city: input.city || "",
      country: input.country || "",
      curriculum: extractCurriculumTrack(rawTitle, job.description).join(", "),
      startTerm: extractStartTerm(rawTitle, job.description),
      roleTier: extractRoleTier(rawTitle, job.description),
    });
  }

  return records;
}

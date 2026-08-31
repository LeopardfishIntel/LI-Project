/**
 * 🌐 GRC FAIR SEARCH ENGINE ADAPTOR
 *
 * Sweeps GRC Fair's dynamic index (https://www.grcfair.org/Jobs) and individual
 * vacancy detail pages (https://www.grcfair.org/job-details/<id>).
 *
 * 4-Step Pipeline Execution:
 *   1. Index Extraction & DOM Lock
 *   2. Grounded Entity Disambiguation (Gate 0)
 *   3. Deep DOM Node Inspection
 *   4. Active Signal Check & Document Fingerprinting
 */

import type { AdaptorInput, RawJobRecord } from "./raw-job.types";
import { isSupportOrNonTeachingRole } from "../roleClassifier";
import { isWhitelistedSchool } from "../schoolWhitelist";
import { sanitizeUrl } from "../urlResolver";

const GRC_INDEX_URL = "https://www.grcfair.org/Jobs";
const GRC_API_ALL_JOBS = "https://backend.grcfair.org/s1/api/user/Alljoblisting?limit=1000&offset=0&type=user";
const GRC_DETAIL_BASE = "https://www.grcfair.org/job-details/";

/**
 * 🎯 ENFORCES SHORT JOB TITLE ONLY (Capped at 60 Characters Maximum)
 */
export function cleanGrcJobTitle(rawTitle: string): string {
  if (!rawTitle) return "";
  let clean = rawTitle.trim();

  // Strip generic / non-job text
  if (/^view\s+details/i.test(clean) || /^open\s+positions/i.test(clean)) {
    return "";
  }

  // Clean location concatenations or role prefixes
  clean = clean.replace(/([a-z])([A-Z])/g, "$1 $2");
  clean = clean.split(/-\s*(?:Immediate|October|August|Sept(?:ember)?|Jan(?:uary)?|April|May|June|July|November|December)\s*(?:start|\d{4})?/i)[0].trim();
  clean = clean.replace(/[-,\s]+$/, "").replace(/\s+/g, " ").trim();

  // STRICT 60-CHARACTER MAXIMUM LENGTH CAP
  if (clean.length > 60) {
    clean = clean.substring(0, 60).replace(/[-,\s]+$/, "").trim();
  }

  return clean || rawTitle.trim().substring(0, 60);
}

export async function runGrcAdaptor(input?: AdaptorInput): Promise<RawJobRecord[]> {
  console.log("🌐 [GRC SEARCH ENGINE] Initiating GRC Fair sweep...");

  const records: RawJobRecord[] = [];
  const seenJobUrls = new Set<string>();

  try {
    // Step 1: Index Extraction & DOM Lock
    const response = await fetch(GRC_API_ALL_JOBS, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      console.warn("🌐 [GRC SEARCH ENGINE] Failed to fetch GRC index API: HTTP " + response.status);
      return [];
    }

    const json = await response.json();
    const rawJobs = Array.isArray(json.data) ? json.data : [];
    console.log("🌐 [GRC SEARCH ENGINE] Found " + rawJobs.length + " total vacancy card(s) in GRC index.");

    for (const job of rawJobs) {
      const jobId = job.VacancyNo;
      if (!jobId) continue;

      const detailUrl = GRC_DETAIL_BASE + jobId;
      const cleanUrl = sanitizeUrl(detailUrl);
      if (!cleanUrl || seenJobUrls.has(cleanUrl)) continue;

      // Step 4: Active Signal Check (Must not be expired/inactive)
      if (job.Status !== undefined && job.Status !== 0) {
        continue;
      }

      const rawTitle = job.Title || "";
      const cleanTitle = cleanGrcJobTitle(rawTitle);

      // Step 3: Deep DOM Node Inspection - Gate 2 Academic Role Classifier
      if (!cleanTitle || isSupportOrNonTeachingRole(cleanTitle) || isSupportOrNonTeachingRole(rawTitle)) {
        continue; // Drop support staff, admin, IT, maintenance roles
      }

      // Step 2: Grounded Entity Disambiguation (Gate 0)
      const schoolDetails = job.School_details || {};
      const grcSchoolName = schoolDetails.Name || "";
      const grcWebsite = schoolDetails.Website || "";
      const grcCity = schoolDetails.City || "";
      const grcCountry = schoolDetails.Country || "";

      // Validate against grounded school database whitelist
      const whitelistedSchool = await isWhitelistedSchool(
        grcSchoolName,
        grcWebsite,
        input?.schoolId
      );

      if (!whitelistedSchool) {
        // Discard unverified or off-database schools / recruiters
        continue;
      }

      // If specific input.schoolId provided, ensure target school match
      if (input?.schoolId && whitelistedSchool.schoolId.toLowerCase() !== input.schoolId.toLowerCase()) {
        continue;
      }

      seenJobUrls.add(cleanUrl);

      // Step 3: Closing Date & Division Mapping
      const closingDateStr = job.ApplyByDate ? String(job.ApplyByDate) : null;
      const datePostedStr = job.PositionAdded || job.created_at ? String(job.PositionAdded || job.created_at) : null;

      records.push({
        rawTitle: cleanTitle,
        source: "GRC",
        applyUrl: cleanUrl,
        schoolId: whitelistedSchool.schoolId,
        schoolName: whitelistedSchool.schoolName,
        city: grcCity || input?.city || "",
        country: grcCountry || input?.country || "",
        datePosted: datePostedStr,
        closingDate: closingDateStr,
        status: "approved",
      });
    }

    console.log("🌐 [GRC SEARCH ENGINE] Extracted " + records.length + " clean, grounded GRC vacancy record(s).");
    return records;
  } catch (err: any) {
    console.warn("🌐 [GRC SEARCH ENGINE] Adaptor sweep failed:", err.message || err);
    return [];
  }
}

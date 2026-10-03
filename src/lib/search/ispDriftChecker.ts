import { SchoolEntity } from "../crawler/entityMatcher";
import { extractIspSchoolSlug, matchIspWorkdaySlug } from "./ispSlugMatcher";
import { GENERIC_GROUP_BRANDS, validateAndCleanAliases } from "../aliasRules";

export interface SchoolRecord extends SchoolEntity {
  id: string;
  name: string;
  group?: string;
  schoolGroup?: string;
  ownership?: string;
  aliases?: string[];
  [key: string]: any;
}

export interface CachedJobDoc {
  docId: string;
  schoolId: string;
  title: string;
  applyUrl?: string;
  externalPath?: string;
  status?: string;
  jobId?: string;
  [key: string]: any;
}

export interface LiveWorkdayJob {
  title: string;
  externalPath: string;
  bulletFields?: string[];
  locationsText?: string;
  [key: string]: any;
}

export interface SubcollectionJobDoc {
  schoolId: string;
  docId: string;
  title: string;
  applyUrl?: string;
  externalPath?: string;
  status?: string;
  [key: string]: any;
}

export interface MisattributedJob {
  docId: string;
  schoolId: string;
  title: string;
  slug: string;
  matchedSchoolId: string | null;
}

export interface StaleJob {
  docId: string;
  schoolId: string;
  title: string;
  jr: string;
}

export interface MissingJob {
  jr: string;
  title: string;
  slug: string;
  schoolId: string;
  schoolName: string;
}

export interface UnapprovedJob {
  jr: string;
  title: string;
  slug: string;
  schoolId: string;
  schoolName: string;
  existingStatuses: { docId: string; status: string }[];
}

export interface UnmatchedSlugGroup {
  slug: string;
  count: number;
  sampleTitles: string[];
}

export interface BadAlias {
  schoolId: string;
  alias: string;
  reason: string;
}

export interface SubcollectionMisattributedJob {
  schoolId: string;
  docId: string;
  title: string;
  slug: string;
  matchedSchoolId: string | null;
}

export interface IspDriftReportData {
  timestamp: string;
  counts: {
    misattributed: number;
    stale: number;
    missing: number;
    unapproved: number;
    unmatchedSchools: number;
    unmatchedTotalJobs: number;
    badAliases: number;
    subcollectionMisattributed: number;
  };
  misattributed: MisattributedJob[];
  stale: StaleJob[];
  missing: MissingJob[];
  unapproved: UnapprovedJob[];
  unmatchedSchoolGroups: UnmatchedSlugGroup[];
  badAliases: BadAlias[];
  subcollectionMisattributed: SubcollectionMisattributedJob[];
}

/**
 * Extracts a normalized JR number (e.g. JR214452 or JR211468-1) from a string or job object.
 */
export function extractWorkdayJobId(
  input: string | { bulletFields?: string[]; externalPath?: string; applyUrl?: string; jobId?: string } | undefined | null
): string {
  if (!input) return "";
  if (typeof input === "object") {
    if (input.jobId && /^JR\d+/i.test(input.jobId)) {
      return input.jobId.trim().toUpperCase();
    }
    if (Array.isArray(input.bulletFields)) {
      const bf = input.bulletFields.find((f) => typeof f === "string" && /^JR\d+/i.test(f));
      if (bf) return bf.trim().toUpperCase();
    }
    const pathOrUrl = input.externalPath || input.applyUrl || "";
    return extractWorkdayJobId(pathOrUrl);
  }

  const str = String(input);
  const match = str.match(/(JR\d+(?:-\d+)?)/i);
  return match ? match[1].toUpperCase() : "";
}

/**
 * Pure comparison logic for ISP drift detection.
 * Free of any I/O, network calls, or Firestore bindings for easy unit testing.
 */
export function analyzeIspDrift(params: {
  schools: SchoolRecord[];
  featuredJobs: CachedJobDoc[];
  liveWorkdayJobs: LiveWorkdayJob[];
  subcollectionJobs?: SubcollectionJobDoc[];
}): IspDriftReportData {
  const { schools, featuredJobs, liveWorkdayJobs, subcollectionJobs = [] } = params;

  // Build live JR set and lookup map
  const liveJrMap = new Map<string, LiveWorkdayJob>();
  for (const liveJob of liveWorkdayJobs) {
    const jr = extractWorkdayJobId(liveJob);
    if (jr) {
      liveJrMap.set(jr, liveJob);
    }
  }

  // Map cached featured jobs by JR and by status
  const cacheByJr = new Map<string, CachedJobDoc[]>();
  for (const doc of featuredJobs) {
    const jr = extractWorkdayJobId(doc.applyUrl || doc.externalPath || doc.jobId || "");
    if (jr) {
      const existing = cacheByJr.get(jr) || [];
      existing.push(doc);
      cacheByJr.set(jr, existing);
    }
  }

  // ==========================================
  // Check A: MISATTRIBUTED (featured_jobs_cache)
  // Approved docs with "myworkdayjobs.com" whose slug does NOT match the schoolId
  // ==========================================
  const misattributed: MisattributedJob[] = [];
  for (const doc of featuredJobs) {
    const status = (doc.status || "").toLowerCase();
    if (status !== "approved") continue;

    const url = doc.applyUrl || doc.externalPath || "";
    if (!url.toLowerCase().includes("myworkdayjobs.com")) continue;

    const slug = extractIspSchoolSlug(url);
    if (!slug) continue;

    const matched = matchIspWorkdaySlug(slug, schools);
    if (!matched || matched.id !== doc.schoolId) {
      misattributed.push({
        docId: doc.docId,
        schoolId: doc.schoolId,
        title: doc.title || "",
        slug,
        matchedSchoolId: matched?.id || null,
      });
    }
  }

  // ==========================================
  // Check B: STALE (featured_jobs_cache)
  // Approved Workday docs whose JR number is NOT in the live Workday list
  // ==========================================
  const stale: StaleJob[] = [];
  for (const doc of featuredJobs) {
    const status = (doc.status || "").toLowerCase();
    if (status !== "approved") continue;

    const url = doc.applyUrl || doc.externalPath || "";
    if (!url.toLowerCase().includes("myworkdayjobs.com")) continue;

    const jr = extractWorkdayJobId(url || doc.jobId || "");
    if (jr && !liveJrMap.has(jr)) {
      stale.push({
        docId: doc.docId,
        schoolId: doc.schoolId,
        title: doc.title || "",
        jr,
      });
    }
  }

  // ==========================================
  // Check C & D: MISSING, UNAPPROVED, UNMATCHED SCHOOLS
  // Iterate through live Workday jobs
  // ==========================================
  const missing: MissingJob[] = [];
  const unapproved: UnapprovedJob[] = [];
  const unmatchedSlugCountMap = new Map<string, { count: number; sampleTitles: string[] }>();

  for (const liveJob of liveWorkdayJobs) {
    const slug = extractIspSchoolSlug(liveJob.externalPath || "");
    const jr = extractWorkdayJobId(liveJob);
    const matched = matchIspWorkdaySlug(slug, schools);

    if (!matched) {
      // Check D: Unmatched school slug
      const current = unmatchedSlugCountMap.get(slug) || { count: 0, sampleTitles: [] };
      current.count += 1;
      if (current.sampleTitles.length < 3 && liveJob.title) {
        current.sampleTitles.push(liveJob.title);
      }
      unmatchedSlugCountMap.set(slug, current);
      continue;
    }

    // Check C: Matched a FLIS school -> check cache presence
    if (!jr) continue;
    const cachedDocs = cacheByJr.get(jr) || [];

    if (cachedDocs.length === 0) {
      missing.push({
        jr,
        title: liveJob.title || "",
        slug,
        schoolId: matched.id || "",
        schoolName: matched.name || matched.schoolname || "",
      });
    } else {
      const hasApproved = cachedDocs.some((d) => (d.status || "").toLowerCase() === "approved");
      if (!hasApproved) {
        unapproved.push({
          jr,
          title: liveJob.title || "",
          slug,
          schoolId: matched.id || "",
          schoolName: matched.name || matched.schoolname || "",
          existingStatuses: cachedDocs.map((d) => ({
            docId: d.docId,
            status: d.status || "unknown",
          })),
        });
      }
    }
  }

  const unmatchedSchoolGroups: UnmatchedSlugGroup[] = Array.from(unmatchedSlugCountMap.entries())
    .map(([slug, data]) => ({
      slug,
      count: data.count,
      sampleTitles: data.sampleTitles,
    }))
    .sort((a, b) => b.count - a.count);

  const unmatchedTotalJobs = unmatchedSchoolGroups.reduce((sum, g) => sum + g.count, 0);

  // ==========================================
  // Check E: ALIAS HYGIENE
  // Schools with aliases under 4 chars or in GENERIC_GROUP_BRANDS
  // ==========================================
  const badAliases: BadAlias[] = [];
  for (const school of schools) {
    const aliases = Array.isArray(school.aliases) ? school.aliases : [];
    for (const alias of aliases) {
      const trimmed = String(alias).trim().replace(/^["']|["']$/g, "");
      if (!trimmed) continue;
      const lower = trimmed.toLowerCase();
      if (trimmed.length < 4) {
        badAliases.push({
          schoolId: school.id,
          alias: trimmed,
          reason: `Under 4 characters (length: ${trimmed.length})`,
        });
      } else if (GENERIC_GROUP_BRANDS.has(lower)) {
        badAliases.push({
          schoolId: school.id,
          alias: trimmed,
          reason: `Generic group brand name`,
        });
      }
    }
  }

  // ==========================================
  // Check F: SUBCOLLECTION (schools/{id}/jobs)
  // Approved docs in ISP school subcollections whose slug does NOT match the school
  // ==========================================
  const subcollectionMisattributed: SubcollectionMisattributedJob[] = [];
  for (const doc of subcollectionJobs) {
    const status = (doc.status || "").toLowerCase();
    if (status !== "approved") continue;

    const url = doc.applyUrl || doc.externalPath || "";
    if (!url.toLowerCase().includes("myworkdayjobs.com")) continue;

    const slug = extractIspSchoolSlug(url);
    if (!slug) continue;

    const matched = matchIspWorkdaySlug(slug, schools);
    if (!matched || matched.id !== doc.schoolId) {
      subcollectionMisattributed.push({
        schoolId: doc.schoolId,
        docId: doc.docId,
        title: doc.title || "",
        slug,
        matchedSchoolId: matched?.id || null,
      });
    }
  }

  return {
    timestamp: new Date().toISOString(),
    counts: {
      misattributed: misattributed.length,
      stale: stale.length,
      missing: missing.length,
      unapproved: unapproved.length,
      unmatchedSchools: unmatchedSchoolGroups.length,
      unmatchedTotalJobs,
      badAliases: badAliases.length,
      subcollectionMisattributed: subcollectionMisattributed.length,
    },
    misattributed,
    stale,
    missing,
    unapproved,
    unmatchedSchoolGroups,
    badAliases,
    subcollectionMisattributed,
  };
}

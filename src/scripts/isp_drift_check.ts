import * as fs from "fs";
import * as path from "path";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import {
  analyzeIspDrift,
  SchoolRecord,
  CachedJobDoc,
  LiveWorkdayJob,
  SubcollectionJobDoc,
  IspDriftReportData,
} from "../lib/search/ispDriftChecker";

// Initialize Firebase Admin SDK (READ-ONLY)
function initFirestoreDb() {
  if (!getApps().length) {
    const serviceAccountPath = path.resolve("./service-account.json");
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
      initializeApp({ credential: cert(serviceAccount) });
    } else {
      initializeApp();
    }
  }
  return getFirestore();
}

/**
 * Fetches all live Workday jobs from the CXS API with paging.
 */
async function fetchAllLiveWorkdayJobs(): Promise<LiveWorkdayJob[]> {
  const url = "https://internationalschools.wd3.myworkdayjobs.com/wday/cxs/internationalschools/ISPCareers/jobs";
  const allPostings: LiveWorkdayJob[] = [];
  const seenPaths = new Set<string>();

  let offset = 0;
  let totalCount = 1000;

  while (offset < totalCount) {
    const payload = {
      limit: 20,
      offset: offset,
      searchText: "",
      appliedFacets: {},
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Workday CXS API returned HTTP status ${res.status} (${res.statusText}) at offset ${offset}`);
    }

    const data: any = await res.json();
    if (offset === 0 && typeof data.total === "number" && data.total > 0) {
      totalCount = data.total;
    }

    const list: any[] = data.jobPostings || [];
    if (list.length === 0) break;

    for (const item of list) {
      const p = item.externalPath || "";
      if (p && !seenPaths.has(p)) {
        seenPaths.add(p);
        allPostings.push(item);
      }
    }

    offset += 20;
  }

  return allPostings;
}

/**
 * Generates a clean, plain-English report from the analysis data.
 */
function formatPlainEnglishReport(data: IspDriftReportData): string {
  const { counts, timestamp } = data;

  let report = "";
  report += "=================================================================\n";
  report += "           ISP WORKDAY INTEGRATION & DRIFT AUDIT REPORT           \n";
  report += "=================================================================\n\n";

  report += `Execution Timestamp: ${timestamp}\n\n`;

  report += "-----------------------------------------------------------------\n";
  report += "G) EXECUTIVE SUMMARY COUNTS\n";
  report += "-----------------------------------------------------------------\n";
  report += `• A) Misattributed Featured Jobs:      ${counts.misattributed}\n`;
  report += `• B) Stale Featured Jobs (Expired):    ${counts.stale}\n`;
  report += `• C) Missing / Unapproved Live Jobs:   ${counts.missing} missing, ${counts.unapproved} unapproved\n`;
  report += `• D) Unmatched School Slugs (New):     ${counts.unmatchedSchools} schools (${counts.unmatchedTotalJobs} total live jobs)\n`;
  report += `• E) Bad Aliases (Hygiene Violations): ${counts.badAliases}\n`;
  report += `• F) Subcollection Misattributions:    ${counts.subcollectionMisattributed}\n\n`;

  report += "-----------------------------------------------------------------\n";
  report += `A) MISATTRIBUTED FEATURED JOBS (Count: ${data.misattributed.length})\n`;
  report += "Approved jobs in featured_jobs_cache whose Workday slug points to a different school.\n";
  report += "-----------------------------------------------------------------\n";
  if (data.misattributed.length === 0) {
    report += "None. All approved Workday featured jobs correctly match their assigned school.\n\n";
  } else {
    for (const item of data.misattributed) {
      report += `• docId: ${item.docId} | schoolId: ${item.schoolId} | title: "${item.title}" | slug: ${item.slug} (matches: ${item.matchedSchoolId || "NONE"})\n`;
    }
    report += "\n";
  }

  report += "-----------------------------------------------------------------\n";
  report += `B) STALE FEATURED JOBS (Count: ${data.stale.length})\n`;
  report += "Approved Workday jobs in featured_jobs_cache whose JR requisition is no longer live on Workday.\n";
  report += "-----------------------------------------------------------------\n";
  if (data.stale.length === 0) {
    report += "None. All approved Workday featured jobs are active on the live Workday portal.\n\n";
  } else {
    for (const item of data.stale) {
      report += `• docId: ${item.docId} | schoolId: ${item.schoolId} | title: "${item.title}" | JR: ${item.jr}\n`;
    }
    report += "\n";
  }

  report += "-----------------------------------------------------------------\n";
  report += `C) MISSING & UNAPPROVED LIVE JOBS (Missing: ${data.missing.length}, Unapproved: ${data.unapproved.length})\n`;
  report += "Live Workday jobs that match a FLIS school but are either absent from cache or not yet approved.\n";
  report += "-----------------------------------------------------------------\n";
  report += "1. MISSING FROM CACHE (Zero cache doc exists):\n";
  if (data.missing.length === 0) {
    report += "   None.\n";
  } else {
    for (const item of data.missing) {
      report += `   • JR: ${item.jr} | schoolId: ${item.schoolId} (${item.schoolName}) | title: "${item.title}" | slug: ${item.slug}\n`;
    }
  }
  report += "\n2. UNAPPROVED IN CACHE (Doc exists but status is pending, rejected, or expired):\n";
  if (data.unapproved.length === 0) {
    report += "   None.\n";
  } else {
    for (const item of data.unapproved) {
      const statuses = item.existingStatuses.map((s) => `${s.docId} (${s.status})`).join(", ");
      report += `   • JR: ${item.jr} | schoolId: ${item.schoolId} (${item.schoolName}) | title: "${item.title}" | existing: [${statuses}]\n`;
    }
  }
  report += "\n";

  report += "-----------------------------------------------------------------\n";
  report += `D) UNMATCHED SCHOOL SLUGS (Count: ${data.unmatchedSchoolGroups.length} schools, ${counts.unmatchedTotalJobs} jobs)\n`;
  report += "Live Workday jobs whose school slug does not match any current school in FLIS. Add these schools to expand coverage.\n";
  report += "-----------------------------------------------------------------\n";
  if (data.unmatchedSchoolGroups.length === 0) {
    report += "None. All live Workday jobs belong to recognized FLIS schools.\n\n";
  } else {
    for (const item of data.unmatchedSchoolGroups) {
      report += `• slug: ${item.slug} | live jobs: ${item.count} | sample titles: [${item.sampleTitles.join(", ")}]\n`;
    }
    report += "\n";
  }

  report += "-----------------------------------------------------------------\n";
  report += `E) ALIAS HYGIENE VIOLATIONS (Count: ${data.badAliases.length})\n`;
  report += "Schools configured with aliases that are under 4 characters or match generic group brands.\n";
  report += "-----------------------------------------------------------------\n";
  if (data.badAliases.length === 0) {
    report += "None. All school aliases meet length and uniqueness requirements.\n\n";
  } else {
    for (const item of data.badAliases) {
      report += `• schoolId: ${item.schoolId} | alias: "${item.alias}" | reason: ${item.reason}\n`;
    }
    report += "\n";
  }

  report += "-----------------------------------------------------------------\n";
  report += `F) ISP SUBCOLLECTION MISATTRIBUTIONS (Count: ${data.subcollectionMisattributed.length})\n`;
  report += "Approved job postings inside schools/{id}/jobs for ISP schools where the Workday slug does not match the schoolId.\n";
  report += "-----------------------------------------------------------------\n";
  if (data.subcollectionMisattributed.length === 0) {
    report += "None.\n\n";
  } else {
    for (const item of data.subcollectionMisattributed) {
      report += `• schoolId: ${item.schoolId} | docId: ${item.docId} | title: "${item.title}" | slug: ${item.slug} (matches: ${item.matchedSchoolId || "NONE"})\n`;
    }
    report += "\n";
  }

  return report;
}

async function run() {
  const isStrict = process.argv.includes("--strict");

  const db = initFirestoreDb();

  // 1. Fetch schools from Firestore
  const schoolsSnap = await db.collection("schools").get();
  const schools: SchoolRecord[] = schoolsSnap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      name: data.name || data.schoolname || "",
      schoolname: data.schoolname || data.name || "",
      city: data.city || "",
      country: data.country || "",
      aliases: Array.isArray(data.aliases) ? data.aliases : [],
      legalNames: Array.isArray(data.legalNames) ? data.legalNames : (Array.isArray(data.legal_names) ? data.legal_names : []),
      group: data.group || data.schoolGroup || data.ownership || "",
      schoolGroup: data.schoolGroup || data.group || "",
      ownership: data.ownership || data.group || "",
    };
  });

  // 2. Fetch featured_jobs_cache from Firestore
  const featuredSnap = await db.collection("featured_jobs_cache").get();
  const featuredJobs: CachedJobDoc[] = featuredSnap.docs.map((d) => {
    const data = d.data();
    return {
      docId: d.id,
      schoolId: data.schoolId || "",
      title: data.title || "",
      applyUrl: data.applyUrl || "",
      externalPath: data.externalPath || "",
      status: data.status || "",
      jobId: data.jobId || "",
    };
  });

  // 3. Fetch subcollections for ISP schools
  const ispSchools = schools.filter((s) => {
    const g = (s.group || s.schoolGroup || s.ownership || "").toUpperCase();
    return g.includes("ISP") || g.includes("INTERNATIONAL SCHOOLS PARTNERSHIP");
  });

  const subcollectionJobs: SubcollectionJobDoc[] = [];
  for (const school of ispSchools) {
    const subSnap = await db.collection("schools").doc(school.id).collection("jobs").get();
    for (const doc of subSnap.docs) {
      const data = doc.data();
      subcollectionJobs.push({
        schoolId: school.id,
        docId: doc.id,
        title: data.title || "",
        applyUrl: data.applyUrl || "",
        externalPath: data.externalPath || "",
        status: data.status || "",
      });
    }
  }

  // 4. Fetch live Workday jobs from API
  const liveWorkdayJobs = await fetchAllLiveWorkdayJobs();

  // 5. Run Pure Comparison Logic
  const reportData = analyzeIspDrift({
    schools,
    featuredJobs,
    liveWorkdayJobs,
    subcollectionJobs,
  });

  // 6. Write report to scratch/isp_drift_report.txt
  const reportText = formatPlainEnglishReport(reportData);
  const scratchDir = path.resolve("./scratch");
  if (!fs.existsSync(scratchDir)) {
    fs.mkdirSync(scratchDir, { recursive: true });
  }
  const reportPath = path.join(scratchDir, "isp_drift_report.txt");
  fs.writeFileSync(reportPath, reportText, "utf8");

  // 7. Print summary counts
  console.log("done");
  console.log(`Summary Counts:`);
  console.log(`- A) Misattributed:               ${reportData.counts.misattributed}`);
  console.log(`- B) Stale:                       ${reportData.counts.stale}`);
  console.log(`- C) Missing / Unapproved:        ${reportData.counts.missing} missing, ${reportData.counts.unapproved} unapproved`);
  console.log(`- D) Unmatched Schools:           ${reportData.counts.unmatchedSchools} schools (${reportData.counts.unmatchedTotalJobs} live jobs)`);
  console.log(`- E) Alias Hygiene Violations:    ${reportData.counts.badAliases}`);
  console.log(`- F) Subcollection Misattributed: ${reportData.counts.subcollectionMisattributed}`);

  if (isStrict) {
    const failureCount =
      reportData.counts.misattributed +
      reportData.counts.badAliases +
      reportData.counts.subcollectionMisattributed;
    if (failureCount > 0) {
      console.error(`❌ [STRICT MODE] Failed with ${failureCount} violation(s) across A, E, or F.`);
      process.exit(1);
    }
  }

  process.exit(0);
}

run().catch((err) => {
  console.error("FATAL ERROR in isp_drift_check:", err);
  process.exit(1);
});

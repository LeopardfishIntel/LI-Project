/**
 * 💎 AUTOMATED GEMS ATS ENTITY DISCOVERY UTILITY
 *
 * Sweeps the entire GEMS Education network via `careers.gemseducation.com` API,
 * discovers all active campus ATS company names, cross-references with the
 * Firestore `schools` database, and dispatches webhook telemetry alerts for
 * any unmapped active GEMS campuses.
 *
 * Usage:
 *   npx tsx scripts/discover-gems-entities.ts
 */

import { execSync } from "child_process";
import { getAdminDb } from "../../src/firebase/admin";
import { sendTelemetryWebhook } from "../../src/lib/crawler/safetyEngine";
import { GEMS_SCHOOL_COMPANY_MAP } from "../../src/lib/search/gems";

interface DiscoveredEntity {
  companyName: string;
  jobCount: number;
  sampleTitles: string[];
  matchedSchoolId?: string;
  matchedSchoolName?: string;
}

function fetchGemsPage(page: number) {
  const url = `https://careers.gemseducation.com/app/control/byt_job_search_manager?action=1&token=&query=page=${page}&body=job-search-results&lan=en`;
  const cmd = `curl -s "${url}" -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" -H "X-Requested-With: XMLHttpRequest" -H "Referer: https://careers.gemseducation.com/en/job-search-results/"`;
  const raw = execSync(cmd).toString();
  return JSON.parse(raw);
}

export async function discoverGemsEntities() {
  console.log("💎 [GEMS DISCOVERY] Initializing full-network ATS entity discovery sweep...");

  const firstPage = fetchGemsPage(1);
  const totalJobs = firstPage.totalJobs || 0;
  const totalPages = Math.ceil(totalJobs / 10);

  console.log(`💎 [GEMS DISCOVERY] Total network jobs: ${totalJobs} across ${totalPages} pages.`);

  const entityMap = new Map<string, { jobCount: number; sampleTitles: string[] }>();

  for (let p = 1; p <= totalPages; p++) {
    const data = p === 1 ? firstPage : fetchGemsPage(p);
    if (!data.jobs || data.jobs.length === 0) break;

    for (const job of data.jobs) {
      const company = String(job.companyName || job.company_name || "").trim();
      if (!company) continue;

      if (!entityMap.has(company)) {
        entityMap.set(company, { jobCount: 0, sampleTitles: [] });
      }

      const entity = entityMap.get(company)!;
      entity.jobCount++;
      if (entity.sampleTitles.length < 3 && job.title) {
        entity.sampleTitles.push(job.title);
      }
    }
  }

  console.log(`💎 [GEMS DISCOVERY] Discovered ${entityMap.size} unique active GEMS ATS campus entities.\n`);

  // Cross-reference with Firestore schools
  let dbSchools: any[] = [];
  try {
    const db = getAdminDb();
    if (db) {
      const snap = await db.collection("schools").get();
      dbSchools = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
    }
  } catch (err: any) {
    console.warn("⚠️ Could not load Firestore schools for auto-matching:", err?.message || err);
  }

  const mappedCompanyNames = new Set(Object.values(GEMS_SCHOOL_COMPANY_MAP).map(s => s.toLowerCase()));
  const unmappedEntities: DiscoveredEntity[] = [];
  const results: DiscoveredEntity[] = [];

  for (const [companyName, info] of entityMap.entries()) {
    const cleanCompany = companyName.toLowerCase().replace(/[^a-z0-9]/g, " ");
    
    let matchedId: string | undefined = undefined;
    let matchedName: string | undefined = undefined;

    // Check against GEMS_SCHOOL_COMPANY_MAP first
    for (const [sId, mappedName] of Object.entries(GEMS_SCHOOL_COMPANY_MAP)) {
      if (mappedName.toLowerCase() === companyName.toLowerCase()) {
        matchedId = sId;
        const sDoc = dbSchools.find(s => s.id === sId);
        matchedName = sDoc?.schoolname || sDoc?.name || mappedName;
        break;
      }
    }

    if (!matchedId) {
      for (const s of dbSchools) {
        const sName = String(s.schoolname || s.name || "").toLowerCase().replace(/[^a-z0-9]/g, " ");
        if (sName && (cleanCompany.includes(sName) || sName.includes(cleanCompany))) {
          matchedId = s.id;
          matchedName = s.schoolname || s.name;
          break;
        }
      }
    }

    const entityRecord: DiscoveredEntity = {
      companyName,
      jobCount: info.jobCount,
      sampleTitles: info.sampleTitles,
      matchedSchoolId: matchedId,
      matchedSchoolName: matchedName,
    };

    results.push(entityRecord);

    if (!mappedCompanyNames.has(companyName.toLowerCase()) && info.jobCount > 0) {
      unmappedEntities.push(entityRecord);
    }
  }

  // Sort by job count descending
  results.sort((a, b) => b.jobCount - a.jobCount);

  console.log("=== DISCOVERED GEMS ATS ENTITIES ===");
  results.forEach(r => {
    const matchStr = r.matchedSchoolId ? ` ➔ Matched DB School: [${r.matchedSchoolId}] ${r.matchedSchoolName}` : " ⚠️ UNMAPPED";
    console.log(`• "${r.companyName}" (${r.jobCount} jobs)${matchStr}`);
  });

  // 📡 Webhook Telemetry: Alert on unmapped entities with active vacancies
  if (unmappedEntities.length > 0) {
    console.log(`\n🚨 Found ${unmappedEntities.length} unmapped GEMS entities with active jobs. Dispatching webhook telemetry...`);
    for (const unmapped of unmappedEntities) {
      await sendTelemetryWebhook({
        title: "Unmapped GEMS ATS Entity Detected",
        message: `Discovered active GEMS ATS entity "${unmapped.companyName}" with ${unmapped.jobCount} live vacancies not yet registered in GEMS_SCHOOL_COMPANY_MAP.`,
        severity: "warning",
        engine: "GEMS",
        metadata: {
          companyName: unmapped.companyName,
          liveVacancies: unmapped.jobCount,
          sampleTitles: unmapped.sampleTitles,
        },
      });
    }
  }

  return results;
}

// Direct execution
if (process.argv[1]?.includes("discover-gems-entities")) {
  discoverGemsEntities()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Error in GEMS discovery:", err);
      process.exit(1);
    });
}

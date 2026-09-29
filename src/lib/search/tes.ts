import { getAdminDb } from "@/firebase/admin";
import { runTesAdaptor, purgeStaleTesVacancies } from "@/lib/crawler/adaptors/tes-adaptor";
import type { AdaptorInput, RawJobRecord } from "@/lib/crawler/adaptors/raw-job.types";

export interface TesJobMatch {
  jobId: string;
  title: string;
  applyUrl: string;
  schoolId: string;
  schoolName: string;
  city: string;
  country: string;
  source: string;
  sources?: string[];
  sourceUrls?: Record<string, string>;
  directUrl?: string | null;
  group?: string;
  datePosted?: string | null;
  closingDate?: string | null;
}

const BATCH_SIZE = 3;
const BATCH_DELAY_MS = 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Sweeps TES (Times Educational Supplement) for active teaching vacancies across
 * all database schools configured with a tesEmployerSlug or tesOrganizationId.
 *
 * For each school:
 * 1. Runs the scoped runTesAdaptor.
 * 2. Purges stale/expired TES records for that specific school.
 * 3. Returns aggregated matches shaped for sweep-orchestrator generic ingestion.
 */
export async function searchTesDbSchools(): Promise<TesJobMatch[]> {
  console.log("🛸 [TES CRAWLER] Starting automated sweep of TES employer hubs...");

  try {
    const db = getAdminDb();
    if (!db || typeof db.collection !== "function") {
      console.warn("⚠️ Admin SDK Firestore unavailable for TES search.");
      return [];
    }

    const snap = await db.collection("schools").get();
    const candidateSchools: AdaptorInput[] = [];

    snap.docs.forEach((doc: any) => {
      const data = doc.data();
      const tesEmployerSlug = data.tesEmployerSlug || data.tesSlug;
      const tesOrganizationId = data.tesOrganizationId || data.tesOrgId;

      if (tesEmployerSlug || tesOrganizationId) {
        candidateSchools.push({
          schoolId: doc.id,
          schoolName: data.schoolname || data.name || doc.id,
          city: data.city || "",
          country: data.country || "",
          tesEmployerSlug: tesEmployerSlug ? String(tesEmployerSlug).trim() : undefined,
          tesOrganizationId: tesOrganizationId ? String(tesOrganizationId).trim() : undefined,
          careersPageUrl: data.careersPageUrl,
          schoolWebsite: data.schoolWebsite || data.website,
        });
      }
    });

    if (candidateSchools.length === 0) {
      console.log("ℹ️ No schools with TES configuration found in DB.");
      return [];
    }

    console.log(`🛸 [TES CRAWLER] Found ${candidateSchools.length} schools configured with TES employer data.`);

    const allMatches: TesJobMatch[] = [];
    let totalPurgedCount = 0;

    // Process schools sequentially in small batches (3 at a time) with a short delay
    for (let i = 0; i < candidateSchools.length; i += BATCH_SIZE) {
      const batch = candidateSchools.slice(i, i + BATCH_SIZE);

      const batchResults = await Promise.all(
        batch.map(async (input) => {
          try {
            const rawRecords: RawJobRecord[] = await runTesAdaptor(input);

            // Collect active applyUrls discovered in this sweep for this school
            const activeApplyUrls = new Set<string>();
            const schoolMatches: TesJobMatch[] = [];

            for (const r of rawRecords) {
              if (r.applyUrl) {
                activeApplyUrls.add(r.applyUrl);
              }

              schoolMatches.push({
                jobId: `${input.schoolId}_${(r.applyUrl || r.rawTitle).toLowerCase().replace(/[^a-z0-9]/g, "")}`,
                title: r.rawTitle,
                applyUrl: r.applyUrl || "",
                schoolId: input.schoolId,
                schoolName: input.schoolName,
                city: input.city || "",
                country: input.country || "",
                source: "TES",
                sources: r.sources || ["TES"],
                sourceUrls: r.sourceUrls || (r.applyUrl ? { TES: r.applyUrl } : undefined),
                directUrl: r.directUrl || null,
                group: r.group,
                datePosted: r.datePosted || null,
                closingDate: r.closingDate || null,
              });
            }

            // Purge expired/removed TES vacancies strictly scoped to this school
            const purged = await purgeStaleTesVacancies(input.schoolId, activeApplyUrls);

            return { matches: schoolMatches, purged };
          } catch (err: any) {
            console.error(`⚠️ [TES CRAWLER] Error crawling school ${input.schoolName} (${input.schoolId}):`, err?.message || err);
            return { matches: [], purged: 0 };
          }
        })
      );

      for (const res of batchResults) {
        allMatches.push(...res.matches);
        totalPurgedCount += res.purged;
      }

      if (i + BATCH_SIZE < candidateSchools.length) {
        await sleep(BATCH_DELAY_MS);
      }
    }

    console.log(`✅ [TES CRAWLER] Sweep completed. Found ${allMatches.length} active vacancies, purged ${totalPurgedCount} stale records across ${candidateSchools.length} schools.`);
    return allMatches;
  } catch (error: any) {
    console.error("❌ [TES CRAWLER] Fatal sweep error:", error?.message || error);
    return [];
  }
}

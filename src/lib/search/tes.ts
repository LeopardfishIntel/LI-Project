import { getAdminDb } from "@/firebase/admin";
import { runTesAdaptor, purgeStaleTesVacancies, readTesPageRaw, cleanJobTitle } from "@/lib/crawler/adaptors/tes-adaptor";
import { isSupportOrNonTeachingRole } from "@/lib/crawler/roleClassifier";
import type { AdaptorInput, RawJobRecord } from "@/lib/crawler/adaptors/raw-job.types";
import { tesSchoolsToSkip, findGroupPages, attributeGroupJob, slugForeignCountry } from "./tesRules";

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
  matchConfidence?: "high" | "medium" | "low";
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
/** What the last call did: the queue items it read, how many are left, and the queue size. Read by the orchestrator. */
let lastRunInfo: { checked: string[]; remaining: number; total: number } = { checked: [], remaining: 0, total: 0 };
export function getTesRunInfo() { return lastRunInfo; }

/** Marks queue items as checked (call after their jobs were ingested). */
export async function markTesChecked(ids: string[]): Promise<void> {
  const db: any = getAdminDb();
  if (!db || !ids.length) return;
  const now = Date.now();
  for (let i = 0; i < ids.length; i += 400) {
    const batch = db.batch();
    ids.slice(i, i + 400).forEach((id) => batch.set(db.collection("tes_state").doc(id), { lastCheckedAt: now }, { merge: true }));
    await batch.commit();
  }
}

export async function searchTesDbSchools(opts?: { budgetMs?: number }): Promise<TesJobMatch[]> {
  lastRunInfo = { checked: [], remaining: 0, total: 0 };
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

    // Roger (2026-10-06): a TES page shared by several schools (a whole group, or another school's page) shows every school the same jobs.
    // Those schools are not read from their saved page; the group's own engine (Taaleem, GEMS, ...) supplies their jobs.
    const skipList = tesSchoolsToSkip(candidateSchools.map((c) => ({ schoolId: c.schoolId, name: c.schoolName, slug: c.tesEmployerSlug, org: c.tesOrganizationId })));
    const snapInfo = new Map<string, AdaptorInput>(candidateSchools.map((c) => [c.schoolId, c]));
    // Real group pages (no clear owner among the schools that share them) are read once, below, and each job is placed on a campus.
    const groupPages = findGroupPages(
      candidateSchools.map((c) => ({ schoolId: c.schoolId, name: c.schoolName, slug: c.tesEmployerSlug, org: c.tesOrganizationId })),
      new Set(skipList.map((x) => x.schoolId))
    );
    if (skipList.length) {
      const skipIds = new Set(skipList.map((x) => x.schoolId));
      console.warn(`🛑 [TES CRAWLER] Skipping ${skipIds.size} school(s) whose saved TES page is a group page or belongs to another school.`);
      skipList.forEach((x) => console.warn(`   - ${x.schoolId}: ${x.reason}`));
      for (let k = candidateSchools.length - 1; k >= 0; k--) if (skipIds.has(candidateSchools[k].schoolId)) candidateSchools.splice(k, 1);
    }

    if (candidateSchools.length === 0 && groupPages.length === 0) {
      console.log("ℹ️ No schools with TES configuration found in DB.");
      return [];
    }

    console.log(`🛸 [TES CRAWLER] Found ${candidateSchools.length} schools configured with TES employer data.`);

    // ── Work queue (Roger, 2026-10-07): a request is cut off by the host after about 5 minutes, and more schools will keep being added.
    // So each call reads the schools checked LONGEST AGO first and stops starting new ones when the time budget is used up.
    // The caller repeats the call until nothing is left. Schools are marked as checked only after their jobs are ingested (markTesChecked).
    const allMatches: TesJobMatch[] = [];
    let totalPurgedCount = 0;
    let groupLeftOut = 0;
    const deadline = Date.now() + (opts?.budgetMs ?? 120000);

    type QItem = { id: string; school?: AdaptorInput; group?: (typeof groupPages)[number] };
    const queue: QItem[] = [
      ...candidateSchools.map((c) => ({ id: c.schoolId, school: c })),
      ...groupPages.map((g) => ({ id: `GROUP:${g.slug}`, group: g })),
    ];
    const lastChecked = new Map<string, number>();
    try {
      const st = await db.collection("tes_state").get();
      st.docs.forEach((d: any) => lastChecked.set(d.id, Number(d.data()?.lastCheckedAt) || 0));
    } catch (e: any) { console.warn("⚠️ [TES CRAWLER] Could not read tes_state (reading in registry order):", e?.message || e); }
    queue.sort((x, y) => (lastChecked.get(x.id) || 0) - (lastChecked.get(y.id) || 0) || x.id.localeCompare(y.id));

    const readSchool = async (input: AdaptorInput) => {
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
                // Every TES job reaching here was read from the school's OWN TES employer page, passed the country check, and the employer named on
                // its vacancy page matched the school (Roger, 2026-10-06). Group / shared pages are skipped before this point. So the school match is certain.
                matchConfidence: "high",
              });
            }

            // Purge expired/removed TES vacancies strictly scoped to this school
            const purged = await purgeStaleTesVacancies(input.schoolId, activeApplyUrls);

            return { matches: schoolMatches, purged };
      } catch (err: any) {
        console.error(`⚠️ [TES CRAWLER] Error crawling school ${input.schoolName} (${input.schoolId}):`, err?.message || err);
        return { matches: [] as TesJobMatch[], purged: 0 };
      }
    };

    const readGroup = async (gp: (typeof groupPages)[number]) => {
      try {
        const memberInfo = gp.members.map((m) => candidateSchools.find((c) => c.schoolId === m.schoolId) || snapInfo.get(m.schoolId)).filter(Boolean) as AdaptorInput[];
        const jobs = await readTesPageRaw(`https://www.tes.com/jobs/employer/${gp.slug}`);
        const activeByMember = new Map<string, Set<string>>();
        memberInfo.forEach((m) => activeByMember.set(m.schoolId, new Set<string>()));
        for (const j of jobs) {
          const r = attributeGroupJob({ title: String(j.exactTitle || j.title), description: j.description, employer: j.hiringOrg }, memberInfo.map((m) => ({ schoolId: m.schoolId, name: m.schoolName })));
          const owner = r.schoolId ? memberInfo.find((m) => m.schoolId === r.schoolId) : undefined;
          if (!owner) { groupLeftOut++; console.warn(`   ↪ [TES GROUP] left out (${r.reason}): ${String(j.exactTitle || j.title).slice(0, 70)} [${gp.slug}]`); continue; }
          if (slugForeignCountry(j.href, owner.country)) continue;
          const title = cleanJobTitle(String(j.exactTitle || j.title), owner.schoolName);
          if (!title || isSupportOrNonTeachingRole(title)) continue;
          activeByMember.get(owner.schoolId)!.add(j.href);
          allMatches.push({
            jobId: `${owner.schoolId}_${j.href.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
            title, applyUrl: j.href, schoolId: owner.schoolId, schoolName: owner.schoolName,
            city: owner.city || "", country: owner.country || "",
            source: "TES", sources: ["TES"], sourceUrls: { TES: j.href },
            datePosted: null, closingDate: j.closingDate || null,
            // A campus named in the title is certain enough to go live; one found only in the description goes to pending for a look.
            matchConfidence: r.by === "title" ? "high" : "medium",
          });
        }
        for (const [sid, urls] of activeByMember) totalPurgedCount += await purgeStaleTesVacancies(sid, urls);
        console.log(`🛸 [TES GROUP] ${gp.slug}: ${jobs.length} vacancies read, ${[...activeByMember.values()].reduce((n, u) => n + u.size, 0)} placed on a campus.`);
      } catch (e: any) {
        console.error(`⚠️ [TES GROUP] Error reading group page ${gp.slug}:`, e?.message || e);
      }
    };

    let idx = 0;
    const checked: string[] = [];
    while (idx < queue.length && Date.now() < deadline) {
      const item = queue[idx];
      if (item.group) { await readGroup(item.group); checked.push(item.id); idx++; continue; }
      const batch: QItem[] = [];
      while (batch.length < BATCH_SIZE && idx < queue.length && queue[idx].school) { batch.push(queue[idx]); idx++; }
      const batchResults = await Promise.all(batch.map((b) => readSchool(b.school as AdaptorInput)));
      for (const res of batchResults) { allMatches.push(...res.matches); totalPurgedCount += res.purged; }
      batch.forEach((b) => checked.push(b.id));
      if (idx < queue.length) await sleep(BATCH_DELAY_MS);
    }
    lastRunInfo = { checked, remaining: queue.length - idx, total: queue.length };
    console.log(`🛸 [TES CRAWLER] This call read ${checked.length} of ${queue.length}; ${queue.length - idx} left for the next call.`);

    console.log(`✅ [TES CRAWLER] Sweep completed. Found ${allMatches.length} active vacancies, purged ${totalPurgedCount} stale records across ${candidateSchools.length} schools.`);
    return allMatches;
  } catch (error: any) {
    console.error("❌ [TES CRAWLER] Fatal sweep error:", error?.message || error);
    return [];
  }
}

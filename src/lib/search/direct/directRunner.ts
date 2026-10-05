/**
 * Direct engine - batch runner. Used by the preview script (write:false) and, later, by the scheduled route (write:true).
 * Start small: only the pilot schools below. Adding a school here is a deliberate change (locked by lockIn.test.ts).
 */
import { getAdminDb } from "@/firebase/admin";
import { runIngestionPipeline } from "@/lib/pipelines/pipeline1-ingestion";
import { pickRotation } from "./directRules";
import { runDirectForSchool, toRawRecords, DirectDeps, DirectResult, DirectSchool, DirectState } from "./directEngine";
import { realDeps } from "./directIo";

/**
 * Pilot set (Roger, 2026-10-05): the trial schools whose own careers page can be read without a real browser.
 * NOT included on purpose: Dulwich Beijing FLIS0017, Bombay International FLIS0030, Ecole Jeannine Manuel FLIS0037 (need a real browser / campus pages),
 * JESS Dubai FLIS0028, International School Nanshan FLIS0032, European Azerbaijan FLIS0014 (they only use TES / Teacher Horizons).
 */
export const DIRECT_PILOT_IDS: string[] = [
  "FLIS0001", "FLIS0002", "FLIS0003", "FLIS0004", "FLIS0005", "FLIS0007", "FLIS0008", "FLIS0009", "FLIS0010", "FLIS0012", "FLIS0016",
  "FLIS0019", "FLIS0020", "FLIS0023", "FLIS0025", "FLIS0029", "FLIS0031", "FLIS0033", "FLIS0036", "FLIS0038", "FLIS0040",
];

export interface DirectSchoolOutcome {
  school: DirectSchool; result: DirectResult;
  preview?: { title: string; status: string; closingDate: string | null; applyUrl: string; reasons: string[] | null }[];
  ingested?: { accepted: number; rejected: number; addedCount: number; removedCount: number };
  error?: string;
}

export async function runDirectBatch(opts: { ids?: string[]; write: boolean; deps?: DirectDeps; onSchool?: (o: DirectSchoolOutcome) => void; deadlineMs?: number }): Promise<DirectSchoolOutcome[]> {
  const db: any = getAdminDb();
  if (!db || typeof db.collection !== "function") throw new Error("database not available");
  const deps = opts.deps || realDeps;
  const out: DirectSchoolOutcome[] = [];
  const startMs = Date.now();
  for (const rawId of opts.ids || DIRECT_PILOT_IDS) {
    if (opts.deadlineMs && Date.now() > opts.deadlineMs) break; // out of time: the rest wait for the next run (oldest-checked go first)
    const id = rawId.toUpperCase().trim();
    const snap = await db.collection("schools").doc(id).get();
    if (!snap.exists) continue;
    const d: any = snap.data() || {};
    const school: DirectSchool = {
      id, name: String(d.name || d.schoolName || d.schoolname || id), city: d.city, country: d.country,
      careersUrl: [d.careersPageUrl, d.careersUrl].map((x: any) => String(x || "").trim()).find((x: string) => /^https?:\/\//i.test(x)) || "",
      website: d.website,
    };
    const stSnap = await db.collection("direct_state").doc(id).get();
    const prev: DirectState | null = stSnap.exists ? (stSnap.data() as DirectState) : null;
    const o: DirectSchoolOutcome = { school, result: { schoolId: id, status: "error", pageUrl: "", jobs: [], tokensIn: 0, tokensOut: 0, pagesRead: 0 } };
    try {
      o.result = await runDirectForSchool(school, prev, deps);
      const records = toRawRecords(school, o.result);
      if (records.length) {
        if (opts.write) {
          const r = await runIngestionPipeline(id, records);
          o.ingested = { accepted: r.accepted, rejected: r.rejected, addedCount: r.addedCount || 0, removedCount: 0 };
        } else {
          const r = await runIngestionPipeline(id, records, { dryRun: true });
          o.ingested = { accepted: r.accepted, rejected: r.rejected, addedCount: 0, removedCount: 0 };
          o.preview = (r.previewDocs || []).map((p) => ({ title: p.title, status: p.status, closingDate: p.closingDate, applyUrl: p.applyUrl, reasons: p.verificationReasons || null }));
        }
      }
      if (opts.write) {
        const ok = ["ok", "no_jobs", "unchanged", "board_only"].includes(o.result.status);
        const keepHash = o.result.status === "unchanged" ? prev?.textHash : o.result.textHash;
        await db.collection("direct_state").doc(id).set({
          pageUrl: o.result.pageUrl || prev?.pageUrl || null,
          repairedFrom: o.result.repairedFrom || (o.result.pageUrl && o.result.pageUrl !== school.careersUrl ? prev?.repairedFrom || null : null),
          textHash: keepHash || null,
          lastStatus: o.result.status,
          lastNote: o.result.note || null,
          lastCheckedAt: Date.now(),
          lastJobCount: o.result.jobs.length,
          failCount: ok ? 0 : (prev?.failCount || 0) + 1,
          schoolName: school.name,
        }, { merge: true });
      }
    } catch (e: any) {
      o.error = String(e?.message || e);
      o.result.status = "error";
    }
    out.push(o);
    opts.onSchool?.(o);
  }
  // Same crawl-log record the other engines write, so Direct shows in the admin telemetry table with its counts.
  if (opts.write && out.length) {
    try {
      await db.collection("crawllogs").add({
        engine: "DIRECT",
        addedCount: out.reduce((a, o) => a + (o.ingested?.addedCount || 0), 0),
        removedCount: 0,
        totalFound: out.reduce((a, o) => a + o.result.jobs.length, 0),
        dbMatched: out.reduce((a, o) => a + o.result.jobs.length, 0),
        durationMs: Date.now() - startMs,
        createdAt: new Date().toISOString(),
        createdAtMillis: Date.now(),
      });
    } catch (e: any) { console.warn("Direct: could not write the crawl log:", e?.message || e); }
  }
  return out;
}

/**
 * The scheduled run: reads up to `limit` pilot schools, the ones checked longest ago first, and stops starting new schools after `budgetMs`.
 * Jobs always arrive as pending (Direct is not signed off), so nothing goes live without Roger's review.
 */
export async function runDirectScheduled(opts?: { limit?: number; budgetMs?: number }): Promise<{ picked: string[]; outcomes: DirectSchoolOutcome[] }> {
  const db: any = getAdminDb();
  if (!db || typeof db.collection !== "function") throw new Error("database not available");
  const last: Record<string, number | undefined> = {};
  for (const id of DIRECT_PILOT_IDS) {
    const st = await db.collection("direct_state").doc(id).get();
    last[id] = st.exists ? (st.data() as any)?.lastCheckedAt : undefined;
  }
  const picked = pickRotation(DIRECT_PILOT_IDS, last, opts?.limit ?? 25);
  const outcomes = await runDirectBatch({ ids: picked, write: true, deadlineMs: Date.now() + (opts?.budgetMs ?? 240000) });
  return { picked, outcomes };
}

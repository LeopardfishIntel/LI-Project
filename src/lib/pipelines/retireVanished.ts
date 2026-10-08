/**
 * Retire jobs an engine no longer supplies.
 * After a HEALTHY run of a signed-off engine (not paused by the drift check, and it returned jobs), any approved board job that claims
 * that engine but is missing from the run is stale (the source took it down, or our own checks now reject it):
 *   - if another source also lists the job: only that engine's pill is removed (the card stays);
 *   - otherwise: the board job is deleted, and its school-folder copy is KEPT as history: marked expired + historical with the reason
 *     "taken_down_by_source". The folder copies are the school's job history (first-discovered date, lifespan), which the staff turnover
 *     figures use, so they must not be erased. The janitor only promotes APPROVED folder copies, so an expired one cannot come back.
 * Safety: if this would retire a large share of the engine's jobs, nothing is changed (a half-empty source list must never wipe the board).
 */
import { getAdminDb } from "@/firebase/admin";
import { decideRetire, normUrl } from "./retireRules";

export interface RetireItem {
  id: string;
  title: string;
  schoolId: string;
  schoolName: string;
  action: "delete" | "strip";
  why: string;
  boardBefore: any;
  folderPath: string | null;
  folderBefore: any | null;
  boardAfter?: any;
}
export interface RetirePlan {
  engineLabel: string;
  claims: number;
  items: RetireItem[];
  skipped?: string;
}


export async function planRetireVanished(opts: {
  engineLabel: string; // e.g. "GRC" (the pill / source name)
  urlHint: string; // e.g. "grcfair.org"
  liveUrls: string[]; // apply links the engine returned in this run
  maxCount?: number;
  maxFraction?: number;
  /** True when the caller has checked each job itself, so an empty live list really means "all of them are gone". */
  allowEmpty?: boolean;
}): Promise<RetirePlan> {
  const label = opts.engineLabel;
  const plan: RetirePlan = { engineLabel: label, claims: 0, items: [] };
  const db: any = getAdminDb();
  if (!db || typeof db.collection !== "function") { plan.skipped = "database not available"; return plan; }
  if (!opts.liveUrls.length && !opts.allowEmpty) { plan.skipped = "engine returned no jobs, so nothing is retired"; return plan; }
  const live = new Set(opts.liveUrls.map(normUrl));

  const snap = await db.collection("featured_jobs_cache").where("status", "==", "approved").get();
  for (const d of snap.docs) {
    const x: any = d.data() || {};
    const verdict = decideRetire(x, label, opts.urlHint, live);
    if (!verdict.claims) continue;
    plan.claims++;
    if (!verdict.retire) continue;

    const sid = String(x.schoolId || "").toUpperCase().trim();
    const folderPath = /^FLIS\d{4}$/.test(sid) ? `schools/${sid}/jobs/${d.id}` : null;
    let folderBefore: any = null;
    if (folderPath) { const f = await db.doc(folderPath).get(); if (f.exists) folderBefore = f.data() || {}; }

    const item: RetireItem = { id: d.id, title: String(x.title || ""), schoolId: sid, schoolName: String(x.schoolName || ""), action: verdict.action, why: verdict.why, boardBefore: x, folderPath, folderBefore };
    if (verdict.action === "strip") item.boardAfter = verdict.boardAfter;
    plan.items.push(item);
  }

  const maxCount = opts.maxCount ?? 25;
  const maxFraction = opts.maxFraction ?? 0.25;
  if (plan.items.length > maxCount || (plan.claims > 0 && plan.items.length / plan.claims > maxFraction)) {
    plan.skipped = `would retire ${plan.items.length} of ${plan.claims} ${label} jobs, more than the safety limit (${maxCount} jobs / ${Math.round(maxFraction * 100)}%). Nothing changed.`;
  }
  return plan;
}

/** Applies a plan made by planRetireVanished. Does nothing if the plan was skipped. */
export async function applyRetirePlan(plan: RetirePlan): Promise<{ deleted: number; stripped: number }> {
  const out = { deleted: 0, stripped: 0 };
  if (plan.skipped || !plan.items.length) return out;
  const db: any = getAdminDb();
  for (const it of plan.items) {
    if (it.action === "strip") {
      await db.collection("featured_jobs_cache").doc(it.id).update(it.boardAfter);
      out.stripped++;
    } else {
      if (it.folderPath && it.folderBefore) {
        const retiredAt = new Date().toISOString();
        await db.doc(it.folderPath).update({
          status: "expired",
          isHistorical: true,
          historicalMetadata: { ...(it.folderBefore.historicalMetadata || {}), archivedAt: retiredAt, lifecycleReason: "taken_down_by_source" },
          retiredAt,
        });
      }
      await db.collection("featured_jobs_cache").doc(it.id).delete();
      out.deleted++;
    }
  }
  return out;
}

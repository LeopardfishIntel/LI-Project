import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { getCollectionDocs, updateDocument, getDocument, setDocument, DatabaseBatch } from "@/firebase/admin";
import { CompensationDrift, CompensationAuditSummary } from "@/types/audit";
// Statically import fallback snapshot so Next.js & Vercel bundle it automatically into the Serverless build
import fallbackMasterSnapshot from "../../../../../../complete_school_fields_export.json";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BASELINE_DOC_COLLECTION = "system_metadata";
const BASELINE_DOC_ID = "master_compensation_baseline";

const LOCKED_FIELDS = [
  "salaryRange",
  "base_salary_eur",
  "base_salary_usd",
  "base_salary_dkk",
  "base_salary_cny",
  "base_salary_aed",
  "housingprovision",
  "housing_status",
  "package_descriptor",
  "savingspotential"
];

function normalizeVal(v: any): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return v.toString();
  if (typeof v === "boolean") return v ? "true" : "false";
  return String(v).trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeSalary(v: any): string {
  if (!v) return "";
  return String(v).replace(/\.00$/, "").replace(/\s+/g, "").toLowerCase();
}

/**
 * Loads baseline master snapshot:
 * 1. Starts with bundled fallback JSON (or local file if available)
 * 2. Merges any persistent overrides stored in Firestore (works seamlessly on Vercel Serverless)
 */
async function loadMasterSnapshot(): Promise<any[]> {
  let baseData: any[] = [];

  // Try local file first if in Node environment, fallback to bundled JSON
  try {
    const filePath = path.resolve(process.cwd(), "complete_school_fields_export.json");
    if (fs.existsSync(filePath)) {
      baseData = JSON.parse(fs.readFileSync(filePath, "utf8"));
    }
  } catch (_) {
    // If fs fails or read is restricted, use bundled snapshot
  }

  if (!baseData || baseData.length === 0) {
    baseData = Array.isArray(fallbackMasterSnapshot) ? [...fallbackMasterSnapshot] : [];
  }

  // Fetch Firestore baseline overrides (for serverless persistence)
  try {
    const baselineDoc = await getDocument(BASELINE_DOC_COLLECTION, BASELINE_DOC_ID);
    const overrides = baselineDoc && typeof (baselineDoc as any).data === "function" 
      ? (baselineDoc as any).data() 
      : (baselineDoc as any)?.data;

    if (overrides && overrides.schools) {
      const overrideMap = new Map<string, any>(Object.entries(overrides.schools));
      baseData = baseData.map((s) => {
        const ov = overrideMap.get(s.id);
        return ov ? { ...s, ...ov } : s;
      });
    }
  } catch (err) {
    console.warn("Could not load Firestore baseline overrides:", err);
  }

  return baseData;
}

/**
 * Saves baseline modifications:
 * 1. Persists to Firestore system_metadata/master_compensation_baseline (persists on Vercel)
 * 2. Best-effort write to local filesystem if running in local development
 */
async function saveMasterSnapshotOverrides(overrides: Record<string, any>, fullData?: any[]) {
  // 1. Persist to Firestore
  try {
    await setDocument(BASELINE_DOC_COLLECTION, BASELINE_DOC_ID, {
      schools: overrides,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.error("Failed to save baseline overrides to Firestore:", err);
  }

  // 2. Best-effort local file write (ignored on Vercel Serverless read-only filesystem)
  if (fullData && process.env.NODE_ENV !== "production") {
    try {
      const filePath = path.resolve(process.cwd(), "complete_school_fields_export.json");
      if (fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify(fullData, null, 2), "utf8");
      }
    } catch (_) {
      // Ignore EROFS or permission errors on serverless
    }
  }
}

/**
 * Commits Firestore updates in batches of up to 300 to avoid Vercel timeouts and limits.
 */
async function batchUpdateSchools(updates: { id: string; data: any }[]) {
  const CHUNK_SIZE = 300;
  for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
    const chunk = updates.slice(i, i + CHUNK_SIZE);
    const batch = new DatabaseBatch();
    for (const item of chunk) {
      batch.update("schools", item.id, item.data);
    }
    await batch.commit();
  }
}

export async function GET(req: NextRequest) {
  try {
    const masterSchools = await loadMasterSnapshot();
    const liveDocs = await getCollectionDocs("schools");
    const liveMap = new Map<string, any>();
    
    liveDocs.forEach((d: any) => {
      const data = typeof d.data === "function" ? d.data() : d;
      liveMap.set(d.id, { ...data, id: d.id });
    });

    const drifts: CompensationDrift[] = [];
    let lockedCount = 0;

    for (const master of masterSchools) {
      if (master.isLocked) lockedCount++;
      const live = liveMap.get(master.id);
      if (!live) continue;

      for (const field of LOCKED_FIELDS) {
        const masterVal = master[field];
        const liveVal = live[field];

        if (masterVal === undefined && liveVal === undefined) continue;

        let isDiff = false;
        if (field === "salaryRange") {
          isDiff = normalizeSalary(masterVal) !== normalizeSalary(liveVal);
        } else if (field === "housingprovision" || field === "housing_status") {
          isDiff = normalizeVal(masterVal) !== normalizeVal(liveVal);
        } else {
          isDiff = masterVal !== liveVal && normalizeVal(masterVal) !== normalizeVal(liveVal);
        }

        if (isDiff && (masterVal !== undefined || liveVal !== undefined)) {
          let reason: CompensationDrift["reason"] = "✍️ Manual Admin Edit";
          if (live.lastScrapedAt && new Date(live.lastScrapedAt).getTime() > Date.now() - 86400000) {
            reason = "🤖 Automated Web Scraper";
          } else if (field.includes("base_salary_") && liveVal && masterVal) {
            reason = "💱 Currency Exchange Drift";
          }

          drifts.push({
            id: master.id,
            schoolName: master.name || master.schoolname || live.name || live.schoolname || master.id,
            country: master.country || live.country || "",
            city: master.city || live.city || "",
            field,
            oldValue: masterVal ?? null,
            newValue: liveVal ?? null,
            reason,
            updatedAt: live.updatedAt ? (typeof live.updatedAt === "string" ? live.updatedAt : new Date().toISOString()) : new Date().toISOString()
          });
        }
      }
    }

    const summary: CompensationAuditSummary = {
      totalProtected: masterSchools.length,
      lockedCount,
      driftCount: drifts.length,
      drifts,
      status: drifts.length === 0 ? "SECURED" : "ACTION REQUIRED",
      lastAuditedAt: new Date().toISOString()
    };

    return NextResponse.json(summary);
  } catch (error: any) {
    console.error("Compensation Audit GET failed:", error);
    return NextResponse.json({ error: error.message || "Audit failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, schoolId, field, newValue } = body;

    const masterSchools = await loadMasterSnapshot();

    if (action === "revert" && schoolId) {
      const master = masterSchools.find((s) => s.id === schoolId);
      if (master) {
        if (field) {
          const revertVal = master[field] !== undefined ? master[field] : null;
          await updateDocument("schools", schoolId, {
            [field]: revertVal,
            isLocked: true,
            updatedAt: new Date().toISOString()
          });
        } else {
          const updatePayload: any = { isLocked: true, updatedAt: new Date().toISOString() };
          LOCKED_FIELDS.forEach((f) => {
            if (master[f] !== undefined) updatePayload[f] = master[f];
          });
          await updateDocument("schools", schoolId, updatePayload);
        }
      }
      return NextResponse.json({ success: true, message: `Reverted ${schoolId} to master snapshot.` });
    }

    if (action === "revert_all") {
      const updates: { id: string; data: any }[] = [];
      for (const master of masterSchools) {
        const updatePayload: any = { isLocked: true, updatedAt: new Date().toISOString() };
        LOCKED_FIELDS.forEach((f) => {
          updatePayload[f] = master[f] !== undefined ? master[f] : null;
        });
        updates.push({ id: master.id, data: updatePayload });
      }

      // Fast atomic batch commit to prevent Vercel Serverless timeout
      await batchUpdateSchools(updates);
      return NextResponse.json({ success: true, message: `Reverted ${updates.length} schools to master snapshot.` });
    }

    if (action === "approve" && schoolId && field) {
      const idx = masterSchools.findIndex((s) => s.id === schoolId);
      if (idx >= 0) {
        const valToSet = newValue !== undefined ? newValue : null;
        masterSchools[idx][field] = valToSet;
        masterSchools[idx].isLocked = true;
        masterSchools[idx].updatedAt = new Date().toISOString();

        // Persist override to Firestore and local disk if dev
        await saveMasterSnapshotOverrides({
          [schoolId]: {
            [field]: valToSet,
            isLocked: true,
            updatedAt: new Date().toISOString()
          }
        }, masterSchools);

        await updateDocument("schools", schoolId, {
          [field]: valToSet,
          isLocked: true,
          updatedAt: new Date().toISOString()
        });
      }
      return NextResponse.json({ success: true, message: `Approved ${field} for ${schoolId}.` });
    }

    if (action === "approve_all") {
      const liveDocs = await getCollectionDocs("schools");
      const liveMap = new Map<string, any>();
      liveDocs.forEach((d: any) => {
        const data = typeof d.data === "function" ? d.data() : d;
        liveMap.set(d.id, { ...data, id: d.id });
      });

      const overrides: Record<string, any> = {};
      const updates: { id: string; data: any }[] = [];

      for (let i = 0; i < masterSchools.length; i++) {
        const live = liveMap.get(masterSchools[i].id);
        if (live) {
          const schoolOverride: any = { isLocked: true };
          const updatePayload: any = { isLocked: true, updatedAt: new Date().toISOString() };
          
          LOCKED_FIELDS.forEach((f) => {
            if (live[f] !== undefined) {
              masterSchools[i][f] = live[f];
              schoolOverride[f] = live[f];
              updatePayload[f] = live[f];
            }
          });
          overrides[masterSchools[i].id] = schoolOverride;
          updates.push({ id: masterSchools[i].id, data: updatePayload });
        }
      }

      // Persist all approved values to Firestore and local disk if dev
      await saveMasterSnapshotOverrides(overrides, masterSchools);
      // Batch update live records to ensure isLocked is set
      await batchUpdateSchools(updates);

      return NextResponse.json({ success: true, message: `Approved and synced ${updates.length} schools.` });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Compensation Audit POST failed:", error);
    return NextResponse.json({ error: error.message || "Operation failed" }, { status: 500 });
  }
}
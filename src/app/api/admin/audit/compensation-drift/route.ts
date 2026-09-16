import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { getCollectionDocs, updateDocument } from "@/firebase/admin";
import { CompensationDrift, CompensationAuditSummary } from "@/types/audit";

function loadMasterSnapshot(): any[] {
  try {
    const filePath = path.resolve(process.cwd(), "complete_school_fields_export.json");
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, "utf8"));
    }
  } catch (e) {
    console.error("Failed to load master snapshot:", e);
  }
  return [];
}

function saveMasterSnapshot(data: any[]) {
  try {
    const filePath = path.resolve(process.cwd(), "complete_school_fields_export.json");
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  } catch (e) {
    console.error("Failed to save master snapshot:", e);
  }
}

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

export async function GET(req: NextRequest) {
  try {
    const masterSchools = loadMasterSnapshot();
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

    const masterSchools = loadMasterSnapshot();

    if (action === "revert" && schoolId) {
      const master = masterSchools.find((s) => s.id === schoolId);
      if (master) {
        await updateDocument("schools", schoolId, {
          ...master,
          isLocked: true,
          updatedAt: new Date().toISOString()
        });
      }
      return NextResponse.json({ success: true, message: "Reverted " + schoolId + " to master snapshot." });
    }

    if (action === "revert_all") {
      for (const master of masterSchools) {
        await updateDocument("schools", master.id, {
          ...master,
          isLocked: true,
          updatedAt: new Date().toISOString()
        });
      }
      return NextResponse.json({ success: true, message: "Reverted all schools to master snapshot." });
    }

    if (action === "approve" && schoolId && field) {
      const idx = masterSchools.findIndex((s) => s.id === schoolId);
      if (idx >= 0) {
        masterSchools[idx][field] = newValue;
        masterSchools[idx].isLocked = true;
        masterSchools[idx].updatedAt = new Date().toISOString();
        saveMasterSnapshot(masterSchools);

        await updateDocument("schools", schoolId, {
          [field]: newValue,
          isLocked: true,
          updatedAt: new Date().toISOString()
        });
      }
      return NextResponse.json({ success: true, message: "Approved " + field + " for " + schoolId + "." });
    }

    if (action === "approve_all") {
      const liveDocs = await getCollectionDocs("schools");
      const liveMap = new Map<string, any>();
      liveDocs.forEach((d: any) => liveMap.set(d.id, d));

      for (let i = 0; i < masterSchools.length; i++) {
        const live = liveMap.get(masterSchools[i].id);
        if (live) {
          LOCKED_FIELDS.forEach((f) => {
            if (live[f] !== undefined) {
              masterSchools[i][f] = live[f];
            }
          });
          masterSchools[i].isLocked = true;
        }
      }
      saveMasterSnapshot(masterSchools);
      return NextResponse.json({ success: true, message: "Approved and synced all production values." });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Compensation Audit POST failed:", error);
    return NextResponse.json({ error: error.message || "Operation failed" }, { status: 500 });
  }
}
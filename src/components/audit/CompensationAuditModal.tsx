"use client";

import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, 
  AlertTriangle, 
  RefreshCw, 
  RotateCcw, 
  CheckCheck, 
  Lock, 
  X, 
  ArrowRight,
  Database,
  Building2,
  FileSpreadsheet
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CompensationDrift, CompensationAuditSummary } from "@/types/audit";

interface CompensationAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuditUpdated?: (summary: CompensationAuditSummary) => void;
}

export function CompensationAuditModal({
  isOpen,
  onClose,
  onAuditUpdated
}: CompensationAuditModalProps) {
  const [summary, setSummary] = useState<CompensationAuditSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fetchAudit = async () => {
    setLoading(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/admin/audit/compensation-drift");
      if (!res.ok) throw new Error("Failed to fetch compensation audit");
      const data: CompensationAuditSummary = await res.json();
      setSummary(data);
      if (onAuditUpdated) onAuditUpdated(data);
    } catch (e: any) {
      console.error("Failed to load audit:", e);
      setStatusMessage("Error loading audit data: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAudit();
    }
  }, [isOpen]);

  const handleRevert = async (schoolId: string, field?: string) => {
    setActionLoading(`revert-${schoolId}`);
    try {
      const res = await fetch("/api/admin/audit/compensation-drift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revert", schoolId, field })
      });
      if (!res.ok) throw new Error("Revert failed");
      await fetchAudit();
      setStatusMessage(`✅ Reverted ${schoolId} to master snapshot.`);
    } catch (e: any) {
      setStatusMessage(`❌ Revert failed: ${e.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleApprove = async (schoolId: string, field: string, newValue: any) => {
    setActionLoading(`approve-${schoolId}-${field}`);
    try {
      const res = await fetch("/api/admin/audit/compensation-drift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", schoolId, field, newValue })
      });
      if (!res.ok) throw new Error("Approval failed");
      await fetchAudit();
      setStatusMessage(`✅ Approved and synced ${field} for ${schoolId}.`);
    } catch (e: any) {
      setStatusMessage(`❌ Approval failed: ${e.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevertAll = async () => {
    if (!confirm("Are you sure you want to revert all detected drifts to master snapshot baseline values?")) return;
    setActionLoading("revert-all");
    try {
      const res = await fetch("/api/admin/audit/compensation-drift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revert_all" })
      });
      if (!res.ok) throw new Error("Revert all failed");
      await fetchAudit();
      setStatusMessage("✅ Successfully reverted all schools to master snapshot.");
    } catch (e: any) {
      setStatusMessage(`❌ Revert all failed: ${e.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveAll = async () => {
    if (!confirm("Are you sure you want to approve all live production values and overwrite the master snapshot?")) return;
    setActionLoading("approve-all");
    try {
      const res = await fetch("/api/admin/audit/compensation-drift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve_all" })
      });
      if (!res.ok) throw new Error("Approve all failed");
      await fetchAudit();
      setStatusMessage("✅ Successfully approved and synced all production values to master snapshot.");
    } catch (e: any) {
      setStatusMessage(`❌ Approve all failed: ${e.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  if (!isOpen) return null;

  const driftCount = summary?.driftCount ?? 0;
  const isSecured = driftCount === 0;

  return (
    <div 
      className="fixed inset-x-0 bottom-0 top-[60px] sm:top-[68px] z-50 flex items-start justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-5xl bg-[#070c18] border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[calc(100vh-100px)] my-2 sm:my-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-950/60 border border-orange-500/40 text-orange-400">
              <Lock className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black tracking-widest uppercase bg-orange-500/20 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded">
                  System Intelligence Audit
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {summary?.lastAuditedAt ? new Date(summary.lastAuditedAt).toLocaleTimeString() : ""}
                </span>
              </div>
              <h3 className="text-base font-black uppercase text-white tracking-wide mt-0.5">
                Compensation & Net Baseline Monitor
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* STATUS ALERT NOTIFICATION */}
        {statusMessage && (
          <div className="px-6 py-2 bg-slate-900 border-b border-slate-800 text-xs font-mono text-slate-200 flex items-center justify-between">
            <span>{statusMessage}</span>
            <button onClick={() => setStatusMessage(null)} className="text-slate-500 hover:text-white">✕</button>
          </div>
        )}

        {/* SCROLLABLE BODY */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* METRICS ROW */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl">
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Protected Baselines</p>
                <Database className="size-4 text-slate-400" />
              </div>
              <p className="text-2xl font-black text-white mt-1">
                {summary?.totalProtected ?? 254} <span className="text-xs font-normal text-slate-400">Schools</span>
              </p>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl">
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Pending Drifts</p>
                <AlertTriangle className={cn("size-4", driftCount > 0 ? "text-amber-400" : "text-emerald-400")} />
              </div>
              <p className={cn("text-2xl font-black mt-1", driftCount > 0 ? "text-amber-400" : "text-emerald-400")}>
                {loading ? "..." : driftCount} <span className="text-xs font-normal text-slate-400">{driftCount === 1 ? "Mismatch" : "Mismatches"}</span>
              </p>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl">
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Lock Status</p>
                <ShieldCheck className={cn("size-4", isSecured ? "text-emerald-400" : "text-amber-400")} />
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className={cn("h-2.5 w-2.5 rounded-full", isSecured ? "bg-emerald-400 animate-pulse" : "bg-amber-400 animate-ping")} />
                <p className={cn("text-sm font-black uppercase tracking-wider", isSecured ? "text-emerald-400" : "text-amber-400")}>
                  {loading ? "Evaluating..." : isSecured ? "SECURED (100%)" : "ACTION REQUIRED"}
                </p>
              </div>
            </div>
          </div>

          {/* DRIFT DIFF TABLE */}
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <RefreshCw className="size-8 animate-spin text-orange-400 mx-auto" />
              <p className="text-xs font-mono text-slate-400 uppercase tracking-widest">
                Scanning Firestore Live vs. Master JSON Snapshot...
              </p>
            </div>
          ) : driftCount === 0 ? (
            <div className="py-12 border border-emerald-500/20 bg-emerald-950/10 rounded-xl text-center space-y-3 p-6">
              <div className="size-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                <ShieldCheck className="size-6" />
              </div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                All 254 Step 5 Compensation Baselines are Synchronized & Locked
              </h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                No unauthorized modifications, scraper overwrites, or exchange rate drifts detected against master snapshot.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2">
                  <AlertTriangle className="size-4" /> Detected Compensation Discrepancies ({driftCount})
                </h4>
                <span className="text-[10px] font-mono text-slate-400">
                  Master Snapshot (From) ➔ Live Production (To)
                </span>
              </div>

              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/80">
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900/90 border-b border-slate-800 text-[10px] font-mono uppercase text-slate-400">
                        <th className="p-3">School / ID</th>
                        <th className="p-3">Field</th>
                        <th className="p-3">Baseline (From)</th>
                        <th className="p-3">Live Current (To)</th>
                        <th className="p-3">Trigger / Source (Why)</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                      {summary?.drifts.map((d, i) => (
                        <tr key={i} className="hover:bg-slate-900/40 transition-colors">
                          <td className="p-3">
                            <div className="font-bold text-white font-sans text-xs">{d.schoolName}</div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <span className="text-amber-400 font-bold">[{d.id}]</span>
                              <span>• {d.city}, {d.country}</span>
                            </div>
                          </td>
                          <td className="p-3 text-slate-300 font-semibold">
                            <span className="bg-slate-800 px-1.5 py-0.5 rounded text-[10px] border border-slate-700">
                              {d.field}
                            </span>
                          </td>
                          <td className="p-3 text-emerald-400 bg-emerald-950/20 font-bold">
                            {String(d.oldValue ?? "null")}
                          </td>
                          <td className="p-3 text-amber-400 bg-amber-950/20 font-bold">
                            {String(d.newValue ?? "null")}
                          </td>
                          <td className="p-3 text-slate-400 text-[10px]">
                            <span className="bg-slate-800/80 border border-slate-700 px-2 py-0.5 rounded-full text-slate-300">
                              {d.reason}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleRevert(d.id, d.field)}
                                disabled={actionLoading !== null}
                                className="px-2.5 py-1 rounded bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/60 text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                                title="Overwrite live Firestore value with Master Snapshot"
                              >
                                Revert
                              </button>
                              <button
                                onClick={() => handleApprove(d.id, d.field, d.newValue)}
                                disabled={actionLoading !== null}
                                className="px-2.5 py-1 rounded bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/60 text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                                title="Approve live value and update Master Snapshot"
                              >
                                Approve
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER CONTROLS */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-slate-800/80 bg-slate-950/80">
          <div className="flex items-center gap-2">
            <button
              onClick={fetchAudit}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
            >
              <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
              Re-run Audit
            </button>
          </div>

          {driftCount > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleRevertAll}
                disabled={actionLoading !== null}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950 hover:bg-rose-900 border border-rose-700 text-rose-200 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                <RotateCcw className="size-3.5" />
                Revert All Drifts
              </button>
              <button
                onClick={handleApproveAll}
                disabled={actionLoading !== null}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 border border-emerald-700 text-emerald-200 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                <CheckCheck className="size-3.5" />
                Approve & Sync All
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  ShieldCheck, 
  AlertTriangle, 
  RefreshCw, 
  Lock, 
  Layers, 
  ChevronDown,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CompensationAuditSummary } from "@/types/audit";

interface AdminAuditDropdownProps {
  parityState: {
    loading: boolean;
    isMatch: boolean;
    conflictCount: number;
    totalFeatured: number;
    totalSchoolOpenJobs: number;
    mismatches: any[];
  } | null;
  onOpenJobParity: () => void;
  onOpenCompensationAudit: () => void;
  compensationSummary?: CompensationAuditSummary | null;
}

export function AdminAuditDropdown({
  parityState,
  onOpenJobParity,
  onOpenCompensationAudit,
  compensationSummary: externalSummary
}: AdminAuditDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [compSummary, setCompSummary] = useState<CompensationAuditSummary | null>(externalSummary || null);
  const [loadingComp, setLoadingComp] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Poll compensation audit lightly on mount
  useEffect(() => {
    let isMounted = true;
    const fetchCompensationAudit = async () => {
      try {
        setLoadingComp(true);
        const res = await fetch("/api/admin/audit/compensation-drift/");
        if (res.ok) {
          const data: CompensationAuditSummary = await res.json();
          if (isMounted) setCompSummary(data);
        }
      } catch (e) {
        console.error("Light compensation check failed:", e);
      } finally {
        if (isMounted) setLoadingComp(false);
      }
    };
    fetchCompensationAudit();
    return () => { isMounted = false; };
  }, []);

  // Update if external prop changes
  useEffect(() => {
    if (externalSummary) setCompSummary(externalSummary);
  }, [externalSummary]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  if (!parityState) return null;

  const driftCount = compSummary?.driftCount ?? 0;
  const hasDriftAlert = driftCount > 0;
  const isJobParityMatch = parityState.isMatch && parityState.conflictCount === 0;

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* TRIGGER BUTTON (INTELLIGENCE STATUS PILL) */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "hidden md:flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border transition-all cursor-pointer shadow-lg select-none",
          parityState.loading
            ? "bg-slate-900 text-slate-400 border-slate-800"
            : isJobParityMatch && !hasDriftAlert
            ? "bg-emerald-950/80 text-emerald-400 border-emerald-500/40 hover:border-emerald-400 hover:bg-emerald-900/50"
            : "bg-amber-950/90 text-amber-300 border-amber-500/60 hover:border-amber-400 hover:bg-amber-900/60"
        )}
        title="Admin System Intelligence Menu"
      >
        {parityState.loading ? (
          <>
            <RefreshCw className="size-3 animate-spin text-slate-400" />
            <span>Checking...</span>
          </>
        ) : isJobParityMatch ? (
          <>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>100 ({parityState.totalFeatured} / {parityState.totalSchoolOpenJobs})</span>
            {hasDriftAlert && (
              <span className="bg-amber-500 text-black px-1.5 py-0.2 rounded-full text-[9px] font-black tracking-tight flex items-center gap-0.5">
                <span>⚠️</span> {driftCount}
              </span>
            )}
          </>
        ) : (
          <>
            <AlertTriangle className="size-3 text-amber-400 animate-pulse" />
            <span>
              {parityState.conflictCount > 0 
                ? `${parityState.conflictCount} CONFLICT${parityState.conflictCount > 1 ? "S" : ""}` 
                : `Sync Alert (${parityState.mismatches.length})`}
            </span>
            {hasDriftAlert && (
              <span className="bg-rose-500 text-white px-1.5 py-0.2 rounded-full text-[9px] font-black tracking-tight">
                +{driftCount} Drift
              </span>
            )}
          </>
        )}
        <ChevronDown className={cn("size-3 text-slate-400 transition-transform duration-200", isOpen && "rotate-180")} />
      </button>

      {/* DROPDOWN MENU */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 rounded-xl bg-[#070c18] border border-slate-800 shadow-2xl z-50 overflow-hidden divide-y divide-slate-800/80 animate-in fade-in zoom-in-95 duration-150">
          {/* MENU HEADER */}
          <div className="px-4 py-2.5 bg-slate-950/90 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#d95f02] flex items-center gap-1.5">
              <Sparkles className="size-3" /> System Intelligence Menu
            </span>
            <span className="text-[9px] font-mono text-slate-400 uppercase">Admin Access</span>
          </div>

          {/* MENU ITEMS */}
          <div className="p-1.5 space-y-1">
            {/* OPTION 1: JOB PARITY */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenJobParity();
              }}
              className="w-full text-left p-2.5 rounded-lg hover:bg-slate-900/80 transition-colors flex items-start gap-3 group cursor-pointer"
            >
              <div className={cn(
                "p-2 rounded-lg shrink-0 mt-0.5",
                isJobParityMatch 
                  ? "bg-emerald-950/60 border border-emerald-500/30 text-emerald-400" 
                  : "bg-amber-950/60 border border-amber-500/30 text-amber-400"
              )}>
                <Layers className="size-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">
                    Job Parity & Sync Audit
                  </span>
                  <span className={cn(
                    "text-[9px] font-mono font-bold px-1.5 py-0.5 rounded",
                    isJobParityMatch 
                      ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50" 
                      : "bg-amber-950 text-amber-300 border border-amber-800/50"
                  )}>
                    {isJobParityMatch ? "100% Synced" : `${parityState.mismatches.length} Alerts`}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                  Validate parity between featured_jobs_cache ({parityState.totalFeatured}) and aggregate live openings.
                </p>
              </div>
            </button>

            {/* OPTION 2: COMPENSATION DRIFT */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenCompensationAudit();
              }}
              className="w-full text-left p-2.5 rounded-lg hover:bg-slate-900/80 transition-colors flex items-start gap-3 group cursor-pointer"
            >
              <div className={cn(
                "p-2 rounded-lg shrink-0 mt-0.5",
                !hasDriftAlert 
                  ? "bg-emerald-950/60 border border-emerald-500/30 text-emerald-400" 
                  : "bg-rose-950/60 border border-rose-500/30 text-rose-400"
              )}>
                <Lock className="size-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-bold text-white group-hover:text-orange-400 transition-colors">
                    Baseline Compensation Audit
                  </span>
                  <span className={cn(
                    "text-[9px] font-mono font-bold px-1.5 py-0.5 rounded",
                    !hasDriftAlert 
                      ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50" 
                      : "bg-rose-950 text-rose-300 border border-rose-800/50"
                  )}>
                    {loadingComp ? "Checking..." : !hasDriftAlert ? `${compSummary?.totalProtected ?? 351} Secured` : `${driftCount} Drifts`}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                  Protect 12-month net salaries, housing provisions, and package tiers against scraper drift.
                </p>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

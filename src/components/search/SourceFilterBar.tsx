"use client";

import React, { useState } from "react";
import { Sparkles, ChevronDown, ShieldAlert } from "lucide-react";

interface SourceFilterBarProps {
  engineCounts: Record<string, number>;
  totalCount: number;
  activeFilter: string;
  onSelectFilter: (filterKey: string) => void;
  isAdmin?: boolean;
}

interface SourceMeta {
  key: string;
  label: string;
  category: "BOARDS_AGENCIES" | "GROUPS" | "DIRECT";
}

const ALL_SOURCES: SourceMeta[] = [
  // Job Boards & Agencies
  { key: "TES", label: "TES", category: "BOARDS_AGENCIES" },
  { key: "GRC", label: "GRC", category: "BOARDS_AGENCIES" },
  { key: "GUARDIAN", label: "GUARDIAN JOBS", category: "BOARDS_AGENCIES" },
  { key: "TEACH_AWAY", label: "TEACH AWAY", category: "BOARDS_AGENCIES" },

  // School Groups
  { key: "GEMS", label: "GEMS", category: "GROUPS" },
  { key: "GLOBEDUCATE", label: "GLOBEDUCATE", category: "GROUPS" },
  { key: "ISP", label: "ISP", category: "GROUPS" },
  { key: "INSPIRED", label: "INSPIRED", category: "GROUPS" },
  { key: "COGNITA", label: "COGNITA", category: "GROUPS" },
  { key: "NORD_ANGLIA", label: "NORD ANGLIA", category: "GROUPS" },
  { key: "TAYLORS", label: "TAYLOR'S", category: "GROUPS" },
  { key: "MALVERN", label: "MALVERN", category: "GROUPS" },

  // Direct Links
  { key: "DIRECT", label: "DIRECT", category: "DIRECT" },
];

export const SourceFilterBar: React.FC<SourceFilterBarProps> = ({
  engineCounts,
  totalCount,
  activeFilter,
  onSelectFilter,
  isAdmin = false,
}) => {
  const [showInactive, setShowInactive] = useState(false);

  // Robust count resolver supporting key aliases (e.g. TEACH_AWAY / TEACHAWAY, NORD_ANGLIA / NORD ANGLIA)
  const getCount = (key: string): number => {
    if (key === "DIRECT") {
      return (engineCounts.DIRECT || 0) + (engineCounts.UWC || 0);
    }
    const spacedKey = key.replace(/_/g, " ");
    const strippedKey = key.replace(/_/g, "");
    return (
      engineCounts[key] ??
      engineCounts[spacedKey] ??
      engineCounts[strippedKey] ??
      0
    );
  };

  const isFilterActive = (key: string): boolean => {
    if (activeFilter === key) return true;
    if (activeFilter === key.replace(/_/g, " ")) return true;
    if (activeFilter === key.replace(/_/g, "")) return true;
    return false;
  };

  const inactiveSources = ALL_SOURCES.filter((s) => getCount(s.key) === 0);

  // Row 1: Boards, Agencies & Heavy-Hitter Groups (>= 15 jobs)
  const row1Items = ALL_SOURCES.filter(
    (s) =>
      (s.category === "BOARDS_AGENCIES" || (s.category === "GROUPS" && getCount(s.key) >= 15)) &&
      (isAdmin || getCount(s.key) > 0)
  ).sort((a, b) => getCount(b.key) - getCount(a.key));

  // Row 2: Direct Links (anchored first) & Secondary Groups (< 15 jobs)
  const row2Items = ALL_SOURCES.filter(
    (s) =>
      (s.category === "DIRECT" || (s.category === "GROUPS" && getCount(s.key) < 15)) &&
      (isAdmin || getCount(s.key) > 0)
  ).sort((a, b) => {
    if (a.category === "DIRECT") return -1;
    if (b.category === "DIRECT") return 1;
    return getCount(b.key) - getCount(a.key);
  });

  return (
    <div className="flex flex-col gap-2.5 p-3.5 bg-slate-900/95 border border-slate-800 rounded-2xl shadow-xl backdrop-blur-md w-full">
      {/* ROW 1: PRIMARY FEEDS & HIGH-YIELD GROUPS */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onSelectFilter("ALL")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeFilter === "ALL"
              ? "bg-[#FF6B35] text-white ring-2 ring-orange-400 shadow-lg shadow-orange-500/25"
              : "bg-slate-800/90 text-slate-300 hover:bg-slate-700/80 border border-slate-700/60"
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          ALL
          <span className="px-1.5 py-0.5 rounded bg-black/40 text-[10px]">{totalCount}</span>
        </button>

        {row1Items.map((item) => {
          const isActive = isFilterActive(item.key);
          const count = getCount(item.key);
          const isZero = count === 0;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelectFilter(item.key)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? "bg-slate-100 text-slate-950 font-bold ring-2 ring-slate-300 shadow-md"
                  : isZero
                  ? "bg-slate-900/60 text-slate-500 border border-slate-800/80 opacity-60 hover:opacity-100"
                  : "bg-slate-800/80 text-slate-300 hover:bg-slate-700/80 border border-slate-700/50"
              }`}
            >
              {item.label}
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] ${
                  isZero
                    ? "bg-slate-950 text-slate-600"
                    : isActive
                    ? "bg-black/20 text-slate-950 font-bold"
                    : "bg-slate-900/80 text-slate-400"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="h-px w-full bg-slate-800/60" />

      {/* ROW 2: DIRECT LINK HIGHLIGHT, SECONDARY GROUPS & INACTIVE DRAWER */}
      <div className="flex flex-wrap items-center gap-2">
        {row2Items.map((item) => {
          const isActive = isFilterActive(item.key);
          const isDirect = item.category === "DIRECT";
          const count = getCount(item.key);
          const isZero = count === 0;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelectFilter(item.key)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                isDirect
                  ? isActive
                    ? "bg-emerald-600 text-white ring-2 ring-emerald-400 shadow-lg shadow-emerald-600/30 font-bold"
                    : "bg-emerald-950/40 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-900/50 font-semibold"
                  : isActive
                  ? "bg-slate-200 text-slate-950 font-bold ring-2 ring-slate-400 shadow-md"
                  : isZero
                  ? "bg-slate-900/60 text-slate-500 border border-slate-800/80 opacity-60 hover:opacity-100"
                  : "bg-slate-800/50 text-slate-300 border border-slate-700/40 hover:bg-slate-700/50"
              }`}
            >
              {isDirect && <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />}
              {item.label}
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] ${
                  isDirect
                    ? "bg-black/40 text-emerald-200 font-bold"
                    : isZero
                    ? "bg-slate-950 text-slate-600"
                    : "bg-slate-900/60 text-slate-400"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}

        {/* CANDIDATE VIEW DRAWER (Rendered when isAdmin is FALSE) */}
        {!isAdmin && inactiveSources.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => setShowInactive(!showInactive)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors cursor-pointer"
            >
              {showInactive ? "Hide Inactive" : `+${inactiveSources.length} Inactive Feeds`}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showInactive ? "rotate-180" : ""}`} />
            </button>

            {showInactive &&
              inactiveSources.map((item) => {
                const isActive = isFilterActive(item.key);
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => onSelectFilter(item.key)}
                    className={`px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer ${
                      isActive
                        ? "bg-slate-700 text-white font-bold border border-slate-500"
                        : "text-slate-500 bg-slate-900/40 border border-slate-800/50 hover:text-slate-400 hover:bg-slate-800/40"
                    }`}
                  >
                    {item.label} (0)
                  </button>
                );
              })}
          </>
        )}

        {/* ADMIN OVERLAY BADGE */}
        {isAdmin && (
          <span className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold text-amber-400 bg-amber-950/50 border border-amber-500/40 shadow-sm">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            ADMIN: 15/15 PIPELINES VISIBLE
          </span>
        )}
      </div>
    </div>
  );
};

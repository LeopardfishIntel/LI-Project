"use client";

import React, { useState } from "react";

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

export type SourceEngineKey =
  | "SEARCH_ASSOCIATES"
  | "TES"
  | "GRC"
  | "GUARDIAN"
  | "GEMS"
  | "GLOBEDUCATE"
  | "ISP"
  | "INSPIRED"
  | "COGNITA"
  | "NORD_ANGLIA"
  | "TAYLORS"
  | "MALVERN"
  | "TAALEEM"
  | "ALDAR"
  | "QATAR_FOUNDATION"
  | "UWC"
  | "DIRECT";

export const ALL_SOURCES: SourceMeta[] = [
  // Job Boards & Agencies
  { key: "SEARCH_ASSOCIATES", label: "SEARCH ASSOCIATES", category: "BOARDS_AGENCIES" },
  { key: "TES", label: "TES", category: "BOARDS_AGENCIES" },
  { key: "GRC", label: "GRC", category: "BOARDS_AGENCIES" },
  { key: "GUARDIAN", label: "GUARDIAN", category: "BOARDS_AGENCIES" },

  // School Groups (Includes Direct MENA Operators)
  { key: "GEMS", label: "GEMS", category: "GROUPS" },
  { key: "GLOBEDUCATE", label: "GLOBEDUCATE", category: "GROUPS" },
  { key: "ISP", label: "ISP", category: "GROUPS" },
  { key: "INSPIRED", label: "INSPIRED", category: "GROUPS" },
  { key: "COGNITA", label: "COGNITA", category: "GROUPS" },
  { key: "NORD_ANGLIA", label: "NORD ANGLIA", category: "GROUPS" },
  { key: "TAYLORS", label: "TAYLOR'S", category: "GROUPS" },
  { key: "MALVERN", label: "MALVERN", category: "GROUPS" },
  { key: "TAALEEM", label: "TAALEEM", category: "GROUPS" },
  { key: "ALDAR", label: "ALDAR", category: "GROUPS" },
  { key: "QATAR_FOUNDATION", label: "QATAR FOUNDATION", category: "GROUPS" },
  { key: "UWC", label: "UWC", category: "GROUPS" },

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
    <div className="flex flex-col gap-1.5 p-2 bg-slate-900/95 border border-slate-800/90 rounded-xl shadow-lg backdrop-blur-md w-full">
      {/* ROW 1: PRIMARY FEEDS & HIGH-YIELD GROUPS */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => onSelectFilter("ALL")}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold tracking-tight transition-all cursor-pointer shrink-0 ${
            activeFilter === "ALL"
              ? "bg-[#FF6B35] text-white border border-[#FF6B35] shadow-md shadow-[#FF6B35]/25"
              : "bg-slate-800/90 text-slate-300 hover:bg-slate-700/80 border border-slate-700/60"
          }`}
        >
          ALL
          <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-semibold ${
            activeFilter === "ALL" ? "bg-black/30 text-white" : "bg-black/40 text-slate-300"
          }`}>
            {totalCount}
          </span>
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
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold tracking-tight transition-all cursor-pointer shrink-0 ${
                isActive
                  ? "bg-[#FF6B35] text-white border border-[#FF6B35] shadow-md shadow-[#FF6B35]/25"
                  : isZero
                  ? "bg-slate-900/50 text-slate-500 border border-slate-800/60 opacity-50 hover:opacity-100"
                  : "bg-slate-800/80 text-slate-300 hover:bg-slate-700/80 border border-slate-700/50"
              }`}
            >
              {item.label}
              <span
                className={`px-1.5 py-0.5 rounded text-[9.5px] font-semibold ${
                  isActive
                    ? "bg-black/30 text-white"
                    : isZero
                    ? "bg-slate-950 text-slate-600"
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

      {/* ROW 2: DIRECT LINK, SECONDARY GROUPS & INACTIVE DRAWER */}
      <div className="flex flex-wrap items-center gap-1.5">
        {row2Items.map((item) => {
          const isActive = isFilterActive(item.key);
          const count = getCount(item.key);
          const isZero = count === 0;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelectFilter(item.key)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold tracking-tight transition-all cursor-pointer shrink-0 ${
                isActive
                  ? "bg-[#FF6B35] text-white border border-[#FF6B35] shadow-md shadow-[#FF6B35]/25"
                  : isZero
                  ? "bg-slate-900/50 text-slate-500 border border-slate-800/60 opacity-50 hover:opacity-100"
                  : "bg-slate-800/50 text-slate-300 border border-slate-700/40 hover:bg-slate-700/50"
              }`}
            >
              {item.label}
              <span
                className={`px-1.5 py-0.5 rounded text-[9.5px] font-semibold ${
                  isActive
                    ? "bg-black/30 text-white"
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
              className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors cursor-pointer shrink-0"
            >
              {showInactive ? "Hide" : `+${inactiveSources.length} Inactive`}
              <span className="text-[8px] ml-0.5">{showInactive ? "▲" : "▼"}</span>
            </button>

            {showInactive &&
              inactiveSources.map((item) => {
                const isActive = isFilterActive(item.key);
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => onSelectFilter(item.key)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors cursor-pointer shrink-0 ${
                      isActive
                        ? "bg-[#FF6B35] text-white border border-[#FF6B35]"
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
          <span className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded-md text-[9.5px] font-mono font-bold text-amber-400 bg-amber-950/40 border border-amber-500/30 shrink-0">
            ADMIN: ${ALL_SOURCES.length}/${ALL_SOURCES.length} PIPELINES
          </span>
        )}
      </div>
    </div>
  );
};

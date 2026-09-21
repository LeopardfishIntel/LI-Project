'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Calculator, 
  Scale, 
  ShieldCheck, 
  TrendingUp, 
  Globe2, 
  X, 
  ArrowRight, 
  BookOpen, 
  Layers,
  Sparkles,
  Info
} from 'lucide-react';

export const OPEN_METHODOLOGY_EVENT = 'lfi_open_methodology_modal';

export function openMethodologyModal() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(OPEN_METHODOLOGY_EVENT));
  }
}

export function MethodologyModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'surplus' | 'oecd' | 'ratings' | 'currency' | 'compliance'>('surplus');

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    if (typeof window !== 'undefined') {
      window.addEventListener(OPEN_METHODOLOGY_EVENT, handleOpen);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(OPEN_METHODOLOGY_EVENT, handleOpen);
      }
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[9998] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="methodology-modal-title"
    >
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col bg-[#0f172a] border border-slate-700/80 text-slate-200 rounded-2xl shadow-2xl shadow-black/90 overflow-hidden">
        {/* Subtle accent header bar */}
        <div className="h-1 w-full bg-gradient-to-r from-teal-500 via-[#d95f02] to-teal-400" />

        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/70">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-teal-500/15 border border-teal-500/25 flex items-center justify-center text-teal-400 shrink-0">
              <Calculator className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="methodology-modal-title" className="text-base sm:text-lg font-bold text-slate-100 tracking-tight">
                  Calculation Methodology &amp; Benchmarking Engine
                </h2>
                <span className="hidden sm:inline-block px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-teal-500/10 text-teal-400 border border-teal-500/20 rounded-md">
                  v2.4 Live
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Transparent, mathematical models designed for objective international school comparisons.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="size-8 rounded-lg bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors flex items-center justify-center cursor-pointer"
            aria-label="Close modal"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-4 sm:px-5 py-2.5 bg-slate-900/40 border-b border-slate-800 overflow-x-auto scrollbar-none text-xs">
          {[
            { id: 'surplus', label: '1. Surplus Formula', icon: Calculator },
            { id: 'oecd', label: '2. OECD Basket', icon: Layers },
            { id: 'ratings', label: '3. School Ratings', icon: Sparkles },
            { id: 'currency', label: '4. Normalisation', icon: Globe2 },
            { id: 'compliance', label: '5. Compliance & Due Diligence', icon: ShieldCheck },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg font-semibold text-xs whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  isActive 
                    ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className="size-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-[13px] text-slate-300 leading-relaxed scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
          {activeTab === 'surplus' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-teal-400">The Core Equation</span>
                <div className="p-3 bg-black/40 border border-teal-500/20 rounded-lg text-sm sm:text-base font-mono font-bold text-teal-300 text-center tracking-tight">
                  Monthly Disposable Surplus = Total Inflows &minus; Total Outflows
                </div>
                <p className="text-slate-400 text-xs">
                  Monthly Disposable Surplus represents true unencumbered capital — the money remaining each month after all essential lifestyle, accommodation, and standard living costs are fully serviced.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1.5">
                  <h4 className="font-bold text-emerald-400 text-xs flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-emerald-400" />
                    Total Inflows Include
                  </h4>
                  <ul className="text-slate-400 text-xs space-y-1 list-disc list-inside">
                    <li>Net monthly base salary (post-local tax)</li>
                    <li>Cash housing allowances / stipends</li>
                    <li>Annual flight allowances (pro-rated monthly)</li>
                    <li>End-of-contract gratuity &amp; bonus accruals</li>
                  </ul>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1.5">
                  <h4 className="font-bold text-rose-400 text-xs flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-rose-400" />
                    Total Outflows Include
                  </h4>
                  <ul className="text-slate-400 text-xs space-y-1 list-disc list-inside">
                    <li>Accommodation / Rent &amp; Maintenance fees</li>
                    <li>OECD baseline groceries &amp; dining expenses</li>
                    <li>Utilities (Power, AC/Heating, Water)</li>
                    <li>High-speed home &amp; mobile telecom</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'oecd' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <h4 className="font-bold text-sky-300 text-xs flex items-center gap-1.5">
                  <Scale className="size-4" />
                  OECD Cost of Living Normalisation
                </h4>
                <p className="text-slate-300 text-xs sm:text-[13px]">
                  Rather than relying on unverified internet forum estimates or biased anecdotes, our cost-of-living models are grounded in standardized <strong>OECD Purchasing Power Parity (PPP)</strong> indices and localized statistical surveys.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
                  <div className="p-2.5 rounded-lg bg-black/30 border border-white/5 text-center">
                    <p className="text-[10px] text-slate-400 font-medium">Standard Basket</p>
                    <p className="text-xs font-bold text-slate-200 mt-0.5">Mid-Tier Expat Lifestyle</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-black/30 border border-white/5 text-center">
                    <p className="text-[10px] text-slate-400 font-medium">Payscale Baseline</p>
                    <p className="text-xs font-bold text-slate-200 mt-0.5">Step 5–8 (5+ Yrs Exp)</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-black/30 border border-white/5 text-center">
                    <p className="text-[10px] text-slate-400 font-medium">Revalidation</p>
                    <p className="text-xs font-bold text-slate-200 mt-0.5">Quarterly Indexing</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ratings' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <h4 className="font-bold text-amber-300 text-xs flex items-center gap-1.5">
                  <Sparkles className="size-4" />
                  Overall School Rating Formula (8.0 / 10)
                </h4>
                <p className="text-slate-300 text-xs">
                  Scores are calculated objectively using a tripartite weighted algorithm to ensure fairness across regions:
                </p>
                <div className="space-y-2 pt-2">
                  <div className="p-3 rounded-lg bg-black/30 border border-white/5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-emerald-400 text-xs">Financial Surplus &amp; Savings Velocity</span>
                      <p className="text-[11px] text-slate-400">Net monthly savings potential against local cost of living</p>
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-300 px-2 py-1 bg-emerald-500/10 rounded">50% Weight</span>
                  </div>

                  <div className="p-3 rounded-lg bg-black/30 border border-white/5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-sky-400 text-xs">Package Completeness &amp; Benefits</span>
                      <p className="text-[11px] text-slate-400">Housing quality, annual flights, medical insurance, tuition &amp; gratuity</p>
                    </div>
                    <span className="text-xs font-mono font-bold text-sky-300 px-2 py-1 bg-sky-500/10 rounded">30% Weight</span>
                  </div>

                  <div className="p-3 rounded-lg bg-black/30 border border-white/5 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-amber-400 text-xs">Retention &amp; Turnover Stability</span>
                      <p className="text-[11px] text-slate-400">Staff longevity, leadership continuity, and verified accreditation</p>
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-300 px-2 py-1 bg-amber-500/10 rounded">20% Weight</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'currency' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <h4 className="font-bold text-teal-300 text-xs flex items-center gap-1.5">
                  <Globe2 className="size-4" />
                  Multi-Currency Normalisation &amp; Volatility Buffers
                </h4>
                <p className="text-slate-300 text-xs">
                  We normalize local salary offers against global reference benchmarks (USD, GBP, EUR, AUD, CAD, SGD) using real-time interbank foreign exchange rates.
                </p>
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg space-y-1">
                  <p className="font-bold text-amber-300 text-xs">Volatile Currency Safeguard</p>
                  <p className="text-[11.5px] text-slate-300 leading-normal">
                    In high-inflation or depreciating markets (e.g., Argentina, Egypt, Turkey, Nigeria, Lebanon), figures reflect official interbank peg baselines and display active Currency Risk alerts to safeguard teacher decisions.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'compliance' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <h4 className="font-bold text-amber-300 text-xs flex items-center gap-1.5">
                  <ShieldCheck className="size-4" />
                  Legal &amp; Advisory Disclosure
                </h4>
                <p className="text-slate-300 text-xs leading-relaxed">
                  All models, cost-of-living indices, and financial surpluses generated by Leopardfish Intel are non-binding comparative research benchmarks. Individual outcomes vary based on payscale placement, family status, dependents, personal spending habits, and changes in local tax law.
                </p>
                <p className="text-slate-400 text-[11.5px] leading-relaxed pt-1">
                  Candidates must always verify binding contractual terms directly with the hiring school prior to executing employment agreements.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 bg-slate-900/90 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <Info className="size-3.5 text-teal-400 shrink-0" />
            <span>Non-binding mathematical model based on OECD baselines.</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Link
              href="/methodology"
              onClick={() => setIsOpen(false)}
              className="w-full sm:w-auto px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Full Methodology Page</span>
              <ArrowRight className="size-3.5" />
            </Link>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-full sm:w-auto px-5 py-2 rounded-lg bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

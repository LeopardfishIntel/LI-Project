'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { ShieldCheck, Calculator, ExternalLink, Scale, Check } from 'lucide-react';
import { useAuth, db } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';

const STORAGE_KEY = 'lfi_compliance_disclaimer_v1';
const THREE_MONTHS_MS = 90 * 24 * 60 * 60 * 1000; // 90 days (3 Months)

// 🛡️ Data & Calculation Routes (Trigger Modal on First Visit / After 3 Months)
const DATA_ROUTE_PREFIXES = [
  '/financial-forecaster',
  '/featured-jobs',
  '/schools',
  '/decide',
  '/prepare',
  '/discover',
  '/search',
  '/matrix',
  '/calculators',
  '/churn-calculator',
  '/find-your-fit',
  '/evaluate',
  '/compare',
  '/jobs',
  '/dashboard',
  '/profile',
  '/staging-preview'
];

// 📄 Exempt Informational & Static Routes (Skip Modal)
const EXEMPT_EXACT_ROUTES = new Set([
  '/',
  '/about',
  '/methodology',
  '/privacy',
  '/terms',
  '/contact',
  '/auth',
  '/login',
  '/signup',
  '/register',
  '/enquiry',
  '/admin'
]);

export function ComplianceDisclaimerModal() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);

  // Check whether current route requires compliance disclaimer
  const isDataRoute = useCallback((path: string | null): boolean => {
    if (!path) return false;
    const cleanPath = path.replace(/\/$/, '') || '/';
    if (EXEMPT_EXACT_ROUTES.has(cleanPath)) return false;
    return DATA_ROUTE_PREFIXES.some(prefix => cleanPath.startsWith(prefix) || path.startsWith(prefix));
  }, []);

  // Evaluate storage state immediately on mount or route change
  useEffect(() => {
    if (!pathname) return;

    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
      let needsAcceptance = true;

      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.acceptedAt && typeof parsed.acceptedAt === 'number') {
          const age = Date.now() - parsed.acceptedAt;
          if (age < THREE_MONTHS_MS) {
            needsAcceptance = false;
          }
        }
      }

      // If user needs acceptance AND is visiting a data route, trigger modal
      if (needsAcceptance && isDataRoute(pathname)) {
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    } catch (e) {
      console.warn('[Compliance Modal] Storage check fallback:', e);
      if (isDataRoute(pathname)) {
        setIsOpen(true);
      }
    } finally {
      setMounted(true);
    }
  }, [pathname, isDataRoute]);

  // Lock body scroll when modal is open
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

  const handleAccept = async () => {
    setIsAccepting(true);
    const timestamp = Date.now();
    const isoString = new Date(timestamp).toISOString();

    // 1. Store locally for instant fast-path (valid for 6 weeks)
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          acceptedAt: timestamp,
          isoDate: isoString,
          version: '1.0'
        })
      );
    } catch (err) {
      console.warn('[Compliance Modal] Local storage write failed:', err);
    }

    // 2. Persist audit trail in database for authenticated users
    if (user && db) {
      try {
        const userRef = doc(db, 'users', user.uid);
        await setDoc(
          userRef,
          {
            disclaimerAcceptedAt: isoString,
            disclaimerTimestamp: timestamp,
            disclaimerVersion: '1.0',
            lastComplianceCheckAt: isoString
          },
          { merge: true }
        );
      } catch (dbErr) {
        console.warn('[Compliance Modal] Database compliance log error:', dbErr);
      }
    }

    setIsOpen(false);
    setIsAccepting(false);
  };

  if (!mounted || !isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="compliance-modal-title"
    >
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col bg-[#0f172a] border border-slate-700/80 text-slate-200 rounded-2xl shadow-2xl shadow-black/90 overflow-hidden">
        {/* Subtle accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-amber-500/70 via-[#d95f02] to-amber-500/70" />

        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-start gap-3.5 bg-slate-900/60">
          <div className="size-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
            <ShieldCheck className="size-5" />
          </div>
          <div className="space-y-0.5">
            <h2 id="compliance-modal-title" className="text-base sm:text-lg font-bold text-amber-400 tracking-tight leading-snug">
              Before you dive in — a quick bit to keep the compliance team happy!
            </h2>
            <p className="text-[13px] text-slate-300 leading-normal">
              When crunching the numbers and comparing posts, there are a few key principles to keep in focus:
            </p>
          </div>
        </div>

        {/* Modal Body - 2-Column Responsive Grid, Glare-Free */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 text-xs text-slate-300 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Principle 1: Why Benchmarking Works (Apples-to-Apples) */}
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2">
                <div className="size-6 rounded-md bg-indigo-500/15 text-indigo-300 flex items-center justify-center shrink-0">
                  <Scale className="size-3.5" />
                </div>
                <h3 className="font-bold text-indigo-300 text-[13px] sm:text-[13.5px]">
                  Why Benchmarking Works (Apples-to-Apples)
                </h3>
              </div>
              <p className="text-slate-300 text-[12.5px] sm:text-[13px] leading-relaxed">
                Raw salaries on paper rarely tell the full story. Between tax-free perks, housing allowances, and local living costs, comparing two international offers face-to-value is like comparing apples to oranges. Our engine normalises tax, housing, and purchasing power so you can compare true financial surplus on a level playing field.
              </p>
            </div>

            {/* Principle 2: Consistent Data, Not Forum Noise */}
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2">
                <div className="size-6 rounded-md bg-blue-500/15 text-blue-300 flex items-center justify-center shrink-0">
                  <ShieldCheck className="size-3.5" />
                </div>
                <h3 className="font-bold text-sky-300 text-[13px] sm:text-[13.5px]">
                  Consistent Data, Not Forum Noise
                </h3>
              </div>
              <p className="text-slate-300 text-[12.5px] sm:text-[13px] leading-relaxed">
                Forum threads and word-of-mouth reviews offer fragmented, individual perspectives based on personal lifestyle choices. We use uniform, objective data models applied systematically across every school and region—giving you an unbiased, standardised baseline rather than anecdotal hearsay.
              </p>
            </div>

            {/* Principle 3: Indicative Benchmark Estimates */}
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2">
                <div className="size-6 rounded-md bg-cyan-500/15 text-cyan-300 flex items-center justify-center shrink-0">
                  <Calculator className="size-3.5" />
                </div>
                <h3 className="font-bold text-cyan-300 text-[13px] sm:text-[13.5px]">
                  Indicative Benchmark Estimates
                </h3>
              </div>
              <p className="text-slate-300 text-[12.5px] sm:text-[13px] leading-relaxed">
                All our surplus calculations, cost-of-living figures, and net take-home estimates are non-binding mathematical models. They use standardised OECD cost-of-living baselines, 5-year payscale assumptions, net salaries, and expected local tax rules. They are designed as a solid comparative guide for your research — not a guaranteed job offer or formal financial advice.
              </p>
            </div>

            {/* Principle 4: Straight to the Official Source */}
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2">
                <div className="size-6 rounded-md bg-emerald-500/15 text-emerald-300 flex items-center justify-center shrink-0">
                  <ExternalLink className="size-3.5" />
                </div>
                <h3 className="font-bold text-emerald-300 text-[13px] sm:text-[13.5px]">
                  Straight to the Official Source
                </h3>
              </div>
              <p className="text-slate-300 text-[12.5px] sm:text-[13px] leading-relaxed">
                Every job vacancy and PDF specification on the platform links directly to the hiring school&apos;s official public website or HR portal. We never host application forms or alter official job specs.
              </p>
            </div>
          </div>

          {/* Principle 5: Do Your Own Due Diligence (Full Width) */}
          <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="size-6 rounded-md bg-amber-500/15 text-amber-300 flex items-center justify-center shrink-0">
                <Scale className="size-3.5" />
              </div>
              <h3 className="font-bold text-amber-300 text-[13px] sm:text-[13.5px]">
                Do Your Own Due Diligence
              </h3>
            </div>
            <p className="text-slate-300 text-[12.5px] sm:text-[13px] leading-relaxed">
              Your actual take-home pay and savings will depend on your specific payscale step, family setup, spending habits, dependent school fee coverage, and personal tax status. It is your responsibility to verify exact contract details directly with the school before signing on the dotted line.
            </p>
          </div>

          {/* Closing acknowledgement text */}
          <div className="text-[12px] text-slate-300 bg-slate-950/40 px-3.5 py-2.5 rounded-lg border border-slate-800/80 leading-relaxed text-center sm:text-left">
            By clicking <strong className="text-white">&quot;Got It — Show Me the Data&quot;</strong>, you acknowledge that these tools are provided for comparative research purposes only. Happy hunting!
          </div>
        </div>

        {/* Modal Footer / Action Button */}
        <div className="p-3.5 sm:p-4 bg-slate-900/80 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <span className="inline-block size-2 rounded-full bg-emerald-400" />
            <span>Compliance Verified • Valid for 3 Months</span>
          </div>

          <button
            type="button"
            onClick={handleAccept}
            disabled={isAccepting}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#d95f02] hover:bg-[#b84e00] text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-[#d95f02]/20 transition-all transform active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Check className="size-4 stroke-[2.5]" />
            <span>Got It — Show Me the Data</span>
          </button>
        </div>
      </div>
    </div>
  );
}

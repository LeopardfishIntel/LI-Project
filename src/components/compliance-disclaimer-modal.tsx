'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { ShieldCheck, Calculator, ExternalLink, Scale, Check } from 'lucide-react';
import { useAuth, db } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';

const STORAGE_KEY = 'lfi_compliance_disclaimer_v1';
const SIX_WEEKS_MS = 42 * 24 * 60 * 60 * 1000; // 42 days

// 🛡️ Data & Calculation Routes (Trigger Modal on First Visit / After 6 Weeks)
const DATA_ROUTE_PREFIXES = [
  '/financial-forecaster',
  '/featured-jobs',
  '/schools',
  '/decide',
  '/discover',
  '/search',
  '/matrix',
  '/prepare',
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
  const [isOpen, setIsOpen] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);

  // Check whether current route requires compliance disclaimer
  const isDataRoute = useCallback((path: string | null): boolean => {
    if (!path) return false;
    if (EXEMPT_EXACT_ROUTES.has(path)) return false;
    return DATA_ROUTE_PREFIXES.some(prefix => path.startsWith(prefix));
  }, []);

  // Evaluate storage state on route change or initial load
  useEffect(() => {
    if (!pathname) return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      let needsAcceptance = true;

      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.acceptedAt && typeof parsed.acceptedAt === 'number') {
          const age = Date.now() - parsed.acceptedAt;
          if (age < SIX_WEEKS_MS) {
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
      setHasChecked(true);
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

  if (!hasChecked || !isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="compliance-modal-title"
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-[#0b1329] border border-amber-500/30 text-white rounded-2xl shadow-2xl shadow-black/80 overflow-hidden">
        {/* Subtle glowing header bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-[#d95f02] to-amber-400" />

        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-start gap-3.5 sm:gap-4 bg-slate-900/50">
          <div className="size-11 sm:size-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
            <ShieldCheck className="size-6 sm:size-7" />
          </div>
          <div className="space-y-1">
            <h2 id="compliance-modal-title" className="text-base sm:text-lg md:text-xl font-black text-white tracking-tight leading-snug">
              Before you dive in — a quick bit to keep the compliance team happy!
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              When crunching the numbers and comparing posts, there are a few key principles to keep in focus:
            </p>
          </div>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm leading-relaxed text-slate-200 divide-y divide-slate-800/80">
          
          {/* Principle 1 */}
          <div className="pt-1 flex items-start gap-3 sm:gap-3.5">
            <div className="size-8 rounded-lg bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
              <Calculator className="size-4" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-white text-xs sm:text-sm flex items-center gap-1.5">
                <span>Indicative Benchmark Estimates</span>
              </h3>
              <p className="text-slate-300 text-xs sm:text-[13px] leading-relaxed">
                All our surplus calculations, cost-of-living figures, and net take-home estimates are non-binding mathematical models. They use standardised OECD cost-of-living baselines, 5-year payscale assumptions, net salaries, and expected local tax rules. They are designed as a solid comparative guide for your research — not a guaranteed job offer or formal financial advice.
              </p>
            </div>
          </div>

          {/* Principle 2 */}
          <div className="pt-4 flex items-start gap-3 sm:gap-3.5">
            <div className="size-8 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
              <ExternalLink className="size-4" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-white text-xs sm:text-sm flex items-center gap-1.5">
                <span>Straight to the Official Source</span>
              </h3>
              <p className="text-slate-300 text-xs sm:text-[13px] leading-relaxed">
                Every job vacancy and PDF specification on the platform links directly to the hiring school's official public website or HR portal. We never host application forms or alter official job specs.
              </p>
            </div>
          </div>

          {/* Principle 3 */}
          <div className="pt-4 flex items-start gap-3 sm:gap-3.5">
            <div className="size-8 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
              <Scale className="size-4" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-white text-xs sm:text-sm flex items-center gap-1.5">
                <span>Do Your Own Due Diligence</span>
              </h3>
              <p className="text-slate-300 text-xs sm:text-[13px] leading-relaxed">
                Your actual take-home pay and savings will depend on your specific payscale step, family setup, spending habits, dependent school fee coverage, and personal tax status. It is your responsibility to verify exact contract details directly with the school before signing on the dotted line.
              </p>
            </div>
          </div>

          {/* Closing acknowledgement text */}
          <div className="pt-4 text-xs sm:text-[13px] text-slate-300 bg-slate-900/40 p-3.5 rounded-xl border border-slate-800">
            By clicking <strong>&quot;Got It — Show Me the Data&quot;</strong>, you acknowledge that these tools are provided for comparative research purposes only. Happy hunting!
          </div>
        </div>

        {/* Modal Footer / Action Button */}
        <div className="p-4 sm:p-6 bg-slate-900/80 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <span className="inline-block size-2 rounded-full bg-emerald-400" />
            <span>Compliance Verified • Valid for 6 Weeks</span>
          </div>

          <button
            type="button"
            onClick={handleAccept}
            disabled={isAccepting}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-[#d95f02] via-[#e56a0c] to-amber-500 hover:from-[#c45300] hover:to-amber-600 text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-[#d95f02]/25 transition-all transform active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Check className="size-4 stroke-[3]" />
            <span>Got It — Show Me the Data</span>
          </button>
        </div>
      </div>
    </div>
  );
}

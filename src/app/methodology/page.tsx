import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { 
  Calculator, 
  Scale, 
  ShieldCheck, 
  Sparkles, 
  Globe2, 
  ArrowLeft, 
  ArrowRight, 
  Layers, 
  CheckCircle2, 
  AlertCircle,
  FileSpreadsheet,
  Building2,
  PieChart
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: "Calculation Methodology & Benchmarking Engine | Leopardfish Intel",
  description: "Explore the mathematical models, OECD baselines, and weighted algorithms behind Leopardfish Intel's surplus forecasts and school evaluations.",
  alternates: {
    canonical: "https://leopardfishintel.com/methodology",
  },
};

export default function MethodologyPage() {
  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 selection:bg-[#d95f02]/30 selection:text-white pb-24">
      {/* Background radial glows */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-teal-500/10 blur-[140px] rounded-full" />
        <div className="absolute top-1/3 right-0 w-[500px] h-[500px] bg-[#d95f02]/10 blur-[160px] rounded-full" />
      </div>

      {/* Breadcrumb / Nav */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 pb-4">
        <div className="flex items-center justify-between gap-4">
          <Button variant="outline" asChild className="border-slate-800 bg-slate-900/60 text-slate-300 hover:text-white hover:bg-slate-800 px-4 py-2 text-xs">
            <Link href="/financial-forecaster">
              <ArrowLeft className="mr-2 size-3.5" /> Return to Forecaster
            </Link>
          </Button>
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-400 bg-teal-500/10 border border-teal-500/20 px-3 py-1 rounded-full">
            <CheckCircle2 className="size-3.5" />
            <span>Mathematical Audit Baseline v2.4</span>
          </div>
        </div>
      </div>

      {/* Hero Header */}
      <header className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 border-b border-slate-800/80">
        <div className="flex items-start gap-4 mb-4">
          <div className="size-14 rounded-2xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0 shadow-inner">
            <Calculator className="size-7" />
          </div>
          <div>
            <span className="text-xs font-black uppercase tracking-widest text-teal-400">Transparency &amp; Rigour</span>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mt-1">
              Methodology &amp; Calculation Engine
            </h1>
            <p className="text-sm sm:text-base text-slate-300 mt-2 max-w-3xl leading-relaxed">
              How Leopardfish Intel converts fragmented overseas compensation packages, local living expenses, and payscale tiers into verifiable, apples-to-apples financial intelligence.
            </p>
          </div>
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-12">
        
        {/* Section 1: The Core Surplus Equation */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-lg bg-teal-500/15 text-teal-400 flex items-center justify-center font-bold text-xs">
              01
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              The Monthly Disposable Surplus Equation
            </h2>
          </div>

          <div className="p-6 rounded-2xl bg-[#0f172a] border border-slate-800 space-y-4 shadow-xl">
            <p className="text-sm text-slate-300 leading-relaxed">
              Raw contract salaries rarely tell the complete story. A £50,000 gross salary in London often yields less unencumbered surplus than a SAR 16,000 tax-free package with furnished housing in Riyadh. We normalise all packages into a single key operational metric: <strong>Monthly Disposable Surplus</strong>.
            </p>

            <div className="p-4 sm:p-6 bg-black/50 border border-teal-500/30 rounded-xl text-center space-y-2">
              <span className="text-[11px] font-black uppercase tracking-widest text-teal-400">Core Formulation</span>
              <div className="text-base sm:text-2xl font-mono font-black text-teal-300 tracking-tight">
                Surplus = Total Inflows &minus; Total Outflows
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                  <span className="size-2 rounded-full bg-emerald-400" />
                  Monthly Inflows
                </h3>
                <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside leading-relaxed">
                  <li><strong>Base Net Salary:</strong> Monthly take-home salary after local statutory deductions, social insurance, and regional income taxes.</li>
                  <li><strong>Housing Stipend / Allowance:</strong> Monthly cash housing benefit if accommodation is not directly provided by the school.</li>
                  <li><strong>Flight Allowance:</strong> Annual return flight benefit pro-rated across the 12-month calendar.</li>
                  <li><strong>Gratuity Accrual:</strong> Pro-rated monthly accrual of contract-end severance bonuses or 13th/14th month structures.</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <h3 className="text-sm font-bold text-rose-400 flex items-center gap-2">
                  <span className="size-2 rounded-full bg-rose-400" />
                  Monthly Outflows
                </h3>
                <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside leading-relaxed">
                  <li><strong>Accommodation &amp; Utilities:</strong> Market rent (if self-leased), building maintenance fees, and heating/AC energy costs.</li>
                  <li><strong>OECD Standard Living Basket:</strong> Groceries, dining, household sundries, and personal essentials for an expat teacher profile.</li>
                  <li><strong>Connectivity &amp; Telecom:</strong> High-speed home fiber and local mobile data eSIM packages.</li>
                  <li><strong>Commuting &amp; Health Co-pays:</strong> Local transport costs, ride-hailing, and standard insurance copayment allowances.</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: OECD Baselines & Data Integrity */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-lg bg-sky-500/15 text-sky-400 flex items-center justify-center font-bold text-xs">
              02
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              OECD Baselines &amp; Standardized Data Models
            </h2>
          </div>

          <div className="p-6 rounded-2xl bg-[#0f172a] border border-slate-800 space-y-4 shadow-xl">
            <p className="text-sm text-slate-300 leading-relaxed">
              To eliminate the bias of forum noise and personal spending outliers, our cost-of-living models are indexed against verified <strong>OECD Purchasing Power Parity (PPP)</strong> baselines and cross-referenced with local statistical agency baskets.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-1">
                <span className="text-[10px] font-black uppercase text-sky-400 tracking-wider">Teacher Baseline</span>
                <h3 className="text-sm font-bold text-white">Step 5–8 Payscale</h3>
                <p className="text-xs text-slate-400">Assumes 5+ years of verified post-qualification teaching experience and standard curriculum leadership.</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-1">
                <span className="text-[10px] font-black uppercase text-sky-400 tracking-wider">Housing Standard</span>
                <h3 className="text-sm font-bold text-white">Mid-Tier Furnished</h3>
                <p className="text-xs text-slate-400">1–2 bedroom modern expat accommodation in safe, school-commutable residential districts.</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-1">
                <span className="text-[10px] font-black uppercase text-sky-400 tracking-wider">Revalidation</span>
                <h3 className="text-sm font-bold text-white">Quarterly Refresh</h3>
                <p className="text-xs text-slate-400">CPI indices, currency pegs, and inflation buffers are recalculated every 90 days.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: The 8.0 / 10 Overall Rating Algorithm */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center font-bold text-xs">
              03
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              School Scoring Algorithm (8.0 / 10 Framework)
            </h2>
          </div>

          <div className="p-6 rounded-2xl bg-[#0f172a] border border-slate-800 space-y-4 shadow-xl">
            <p className="text-sm text-slate-300 leading-relaxed">
              Every school rating on Leopardfish Intel is derived from an explicit mathematical formula, avoiding subjective opinion. The overall score is weighted across three fundamental pillars:
            </p>

            <div className="space-y-3 pt-2">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-400 text-sm">Financial Surplus &amp; Savings Potential</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-500/15 text-emerald-300 rounded">50% Weight</span>
                  </div>
                  <p className="text-xs text-slate-400">Evaluates actual disposable savings rate relative to local cost of living and regional peers.</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-sky-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sky-400 text-sm">Package Quality &amp; Contractual Perks</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-sky-500/15 text-sky-300 rounded">30% Weight</span>
                  </div>
                  <p className="text-xs text-slate-400">Housing standard, annual relocation flights, worldwide health cover, dependent tuition coverage, and gratuity terms.</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-amber-400 text-sm">Staff Retention &amp; Turnover Stability</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-500/15 text-amber-300 rounded">20% Weight</span>
                  </div>
                  <p className="text-xs text-slate-400">Historical staff tenure, senior leadership stability, international accreditation status (CIS, BSO, NEASC, WASC), and contract completion rates.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Currency Normalisation & Risk Buffers */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-lg bg-indigo-500/15 text-indigo-400 flex items-center justify-center font-bold text-xs">
              04
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Currency Normalisation &amp; Volatile Market Protections
            </h2>
          </div>

          <div className="p-6 rounded-2xl bg-[#0f172a] border border-slate-800 space-y-4 shadow-xl">
            <p className="text-sm text-slate-300 leading-relaxed">
              We normalize local compensation figures into key reference benchmarks (USD, GBP, EUR, AUD, CAD, SGD) using real-time interbank foreign exchange feeds.
            </p>

            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3.5">
              <AlertCircle className="size-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs text-slate-300">
                <h3 className="font-bold text-amber-300 text-sm">Volatile Currency Safeguard</h3>
                <p className="leading-relaxed">
                  In jurisdictions subject to rapid foreign exchange volatility or hyperinflation (e.g. Argentina, Egypt, Turkey, Nigeria, Lebanon), our engine applies real-time currency risk flags and cross-checks local payscales against hard-currency benchmarks to protect candidate budgeting.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 5: Legal & Due Diligence Advisory */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center font-bold text-xs">
              05
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Due Diligence &amp; Legal Compliance
            </h2>
          </div>

          <div className="p-6 rounded-2xl bg-[#0f172a] border border-slate-800 space-y-4 shadow-xl">
            <p className="text-sm text-slate-300 leading-relaxed">
              All figures, surplus estimates, and benchmarks displayed on Leopardfish Intel are non-binding mathematical models provided for comparative guidance only. Individual financial outcomes will vary depending on your specific payscale placement, family structure, dependent tuition discounts, and individual tax liabilities.
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every job vacancy on the platform links directly to the hiring school&apos;s official public website or HR recruitment portal. We never host application forms or modify original school specifications.
            </p>
          </div>
        </section>

        {/* CTA Footer */}
        <div className="p-8 rounded-2xl bg-gradient-to-r from-teal-950/40 via-slate-900 to-[#d95f02]/10 border border-teal-500/30 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="text-lg font-bold text-white">Ready to model your overseas surplus?</h3>
            <p className="text-xs text-slate-400">Put our mathematical engine to work with live school data.</p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button asChild className="bg-[#d95f02] hover:bg-[#b84e00] text-white font-bold text-xs uppercase tracking-wider px-6 py-3 w-full sm:w-auto">
              <Link href="/financial-forecaster">
                Launch Forecaster <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </div>
        </div>

      </main>
    </div>
  );
}

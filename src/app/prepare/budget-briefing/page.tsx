'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Binoculars, ShieldAlert, CheckCircle2, Info, Banknote, Home, Clock, ShoppingCart } from 'lucide-react';

export default function BudgetBriefingPage() {
  return (
    <div className="min-h-screen bg-white text-black p-4 md:p-12 font-sans selection:bg-primary/20">
      <div className="max-w-4xl mx-auto flex justify-start items-center gap-4 mb-12">
        <Button variant="outline" asChild className="border-black/20 hover:bg-black/5 text-black rounded-sm px-6">
          <Link href="/prepare">
            <ArrowLeft className="mr-2 size-4" /> Return to Prepare
          </Link>
        </Button>
      </div>

      <div className="max-w-4xl mx-auto border-[4px] border-black p-8 md:p-16 space-y-12 relative overflow-hidden bg-white shadow-2xl">
        <div className="absolute top-0 right-0 p-6 opacity-10 rotate-[15deg] pointer-events-none">
          <Binoculars className="size-48 text-black" />
        </div>

        <header className="border-b-[6px] border-black pb-8">
          <div className="flex items-center gap-3 mb-2">
            <Info className="size-8 text-black" />
            <h1 className="text-4xl font-black uppercase tracking-tighter leading-none">Budget Briefing</h1>
          </div>
          <div className="flex items-center gap-4 text-xs font-black uppercase tracking-[0.3em] text-gray-500">
            <span>Dossier ID: LFI-2026-BUDGET</span>
            <span className="border-l border-gray-300 h-3" />
            <span>Classification: Tactical Prep</span>
          </div>
        </header>

        <section className="space-y-10">
          <div className="p-6 border-2 border-black bg-black/5 space-y-4">
            <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
              <ShieldAlert className="size-5" /> The 'Gap Month' problem
            </h2>
            <p className="text-sm leading-relaxed font-medium">
              Most international teachers face a critical liquidity gap during their first 6 weeks. You will incur significant costs (housing deposits, document legalisation, initial setup) before your first full month's salary hits your account. Without a <span className="font-black text-black">Strategic Reserve</span>, this period often forces educators into high-interest debt or immediate mission failure.
            </p>
          </div>

          <div className="grid gap-12">
            {/* documentation */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 border-b-2 border-black pb-2">
                <Banknote className="size-5" />
                <h3 className="text-lg font-black uppercase tracking-tight">Visa & Documentation</h3>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed font-medium">
                Legalisation costs are often underestimated. Depending on your home country, a full set of apostilled and notarised documents (Degrees, PGCE, Marriage Certs, Police Checks) can exceed <span className="font-black">£500</span> per person. While some elite schools reimburse these, you must fund them upfront.
              </p>
            </div>

            {/* housing */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 border-b-2 border-black pb-2">
                <Home className="size-5" />
                <h3 className="text-lg font-black uppercase tracking-tight">Rent & Deposit</h3>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed font-medium">
                In markets like Vietnam, Thailand, or Spain, you will likely need to find your own accommodation. This typically requires <span className="font-black">1 month rent upfront + 1-2 months security deposit</span>. If your school provides a cash allowance, it may not be paid until your first salary cycle, leaving you to fund thousands in initial liquidity.
              </p>
            </div>

            {/* expenditure */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 border-b-2 border-black pb-2">
                <Clock className="size-5" />
                <h3 className="text-lg font-black uppercase tracking-tight">6-Week Burn Rate</h3>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed font-medium">
                Initial living costs are higher. You will be eating out more frequently, buying local SIM cards, and navigating transport before you settle into a routine. We benchmark a minimum of <span className="font-black">£1,000 per adult</span> for this period to ensure tactical survival.
              </p>
            </div>

            {/* setup */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 border-b-2 border-black pb-2">
                <ShoppingCart className="size-5" />
                <h3 className="text-lg font-black uppercase tracking-tight">The IKEA Test</h3>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed font-medium">
                "Unfurnished" often means a complete lack of white goods. You may need to purchase a fridge, washing machine, and microwave on Day 1. Even in furnished apartments, bedding, kitchenware, and connectivity setup will draw heavily on your reserve.
              </p>
            </div>
          </div>
        </section>

        <footer className="mt-16 pt-8 border-t-2 border-gray-200 flex flex-col md:flex-row justify-between items-center gap-6 opacity-60">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="size-10 text-black" />
            <div className="text-[10px] font-black uppercase tracking-widest leading-tight">
              <p>Leopardfish Intel</p>
              <p>Tactical Briefing</p>
            </div>
          </div>
          <div className="text-[9px] font-bold text-gray-400 text-center md:text-right max-w-xs leading-normal uppercase">
            Figures provided are indicative benchmarks for 2025/26 service. Adjust for specific city-tier inflation.
          </div>
        </footer>
      </div>
      <div className="fixed inset-0 -z-10 bg-[#080c18]"></div>
    </div>
  );
}

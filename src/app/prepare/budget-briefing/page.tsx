'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  Printer, 
  CheckCircle2, 
  ShieldAlert, 
  Banknote, 
  Home, 
  Clock, 
  ShoppingCart, 
  Globe,
  ArrowRight
} from 'lucide-react';
import { Binoculars } from '@/components/icons/Binoculars';

export default function BudgetBriefingPage() {
  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="min-h-screen bg-white text-black p-4 md:p-12 print:p-0 font-sans selection:bg-primary/20">
      <div className="max-w-4xl mx-auto flex justify-between items-center gap-4 mb-12 print:hidden">
        <Button variant="outline" asChild className="border-black/20 hover:bg-black/5 text-black rounded-sm px-6">
          <Link href="/prepare">
            <ArrowLeft className="mr-2 size-4" /> Return to Prepare
          </Link>
        </Button>
        <Button onClick={handlePrint} className="bg-black text-white hover:bg-black/90 font-bold rounded-sm px-8">
          <Printer className="mr-2 size-4" /> Print dossier
        </Button>
      </div>

      <div className="max-w-4xl mx-auto border-[4px] border-black p-8 md:p-16 space-y-12 relative overflow-hidden bg-white shadow-2xl print:shadow-none print:border-[2px]">
        <div className="absolute top-0 right-0 p-6 opacity-10 rotate-[15deg] pointer-events-none">
          <Binoculars className="size-48 text-black" />
        </div>

        <header className="border-b-[6px] border-black pb-8">
          <div className="flex items-center gap-3 mb-2">
            <ShieldAlert className="size-8 text-black" />
            <h1 className="text-4xl font-black uppercase tracking-tighter leading-none">The True Cost of Landing</h1>
          </div>
          <div className="flex items-center gap-4 text-xs font-black uppercase tracking-[0.3em] text-gray-500">
            <span>Dossier ID: LFI-2026-BUDGET</span>
            <span className="border-l border-gray-300 h-3" />
            <span>Classification: Tactical Prep</span>
          </div>
        </header>

        <div className="space-y-12">
          <section className="space-y-4">
            <p className="text-lg leading-relaxed font-bold">
              As with most other industries, international schools pay you in arrears. In reality, this means you may face a significant cash shortfall during your first six weeks in-country.
            </p>
            <p className="text-sm text-gray-600 leading-relaxed font-medium">
              During this time, you must cover substantial upfront costs—such as housing deposits, document legalisation, and initial setup—well before your first payday. Without adequate savings, this period frequently forces educators into expensive and highly stressful debt.
            </p>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3 border-b-2 border-black pb-2">
              <Banknote className="size-5" />
              <h3 className="text-xl font-black uppercase tracking-tight">Visas and Documentation</h3>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed font-medium">
              The cost of legalising your paperwork is frequently underestimated. Depending on your home country, obtaining a full set of notarised and apostilled documents (degrees, PGCEs, marriage certificates, and police checks) can easily exceed <span className="font-black text-black">£500 per person</span>. While many schools may eventually reimburse these expenses, you almost always have to fund them upfront.
            </p>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3 border-b-2 border-black pb-2">
              <Home className="size-5" />
              <h3 className="text-xl font-black uppercase tracking-tight">Rent and Deposits</h3>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed font-medium">
              In markets such as Vietnam, Thailand, or Spain, you will likely need to secure your own accommodation. This typically requires <span className="font-black text-black">one month’s rent in advance, plus a security deposit equal to one or two months' rent</span>. Even if your school provides a housing allowance, it is rarely paid before your first payday, leaving you to cover thousands of pounds upfront.
            </p>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3 border-b-2 border-black pb-2">
              <Clock className="size-5" />
              <h3 className="text-xl font-black uppercase tracking-tight">Your Six-Week Living Costs</h3>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed font-medium">
              Your daily outgoings will be significantly higher when you first arrive. You will be eating out more often, buying local SIM cards, and paying for temporary transport before you establish a settled routine. We strongly advise setting aside a <span className="font-black text-black">minimum of £1,000 per adult</span> to comfortably cover this initial transition period.
            </p>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3 border-b-2 border-black pb-2">
              <ShoppingCart className="size-5" />
              <h3 className="text-xl font-black uppercase tracking-tight">The 'Empty Flat' Reality</h3>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed font-medium">
              In many countries, an "unfurnished" property means a complete lack of furniture, white goods, or sometimes even a fitted kitchen. You may need to purchase a bed, a fridge, a washing machine, and an oven on your very first day. Even if your apartment is fully furnished, buying essential bedding, kitchenware, and setting up your internet will quickly drain your funds.
            </p>
          </section>

          <section className="space-y-6">
            <div className="flex items-center gap-3 border-b-2 border-black pb-2">
              <Globe className="size-5" />
              <h3 className="text-xl font-black uppercase tracking-tight">Proactive Financial Planning</h3>
            </div>
            <div className="space-y-4 text-sm text-gray-600 leading-relaxed font-medium">
              <p>
                To navigate this shortfall, preparation is essential. A critical first step is establishing a 'landing fund' that covers your total estimated upfront costs.
              </p>
              <p>
                To manage your money efficiently, use reputable digital transfer services (such as <span className="font-bold text-black underline">Wise</span>), which typically offer competitive exchange rates and lower fees, allowing you to move larger sums before arrival. For immediate needs, bring a small amount of local currency in cash, alongside a travel-friendly debit or credit card for daily transactions. Crucially, set up any necessary international banking services before you depart to ensure immediate access to your capital without relying on your first school paycheque.
              </p>
              <p>
                We highly recommend researching local property portals, Facebook Marketplace, or affordable furniture stores like <span className="font-bold text-black">IKEA</span> before you arrive to price up essential items. While your school may provide a general welcome pack with helpful links, these resources rarely address the stark financial realities of setting up a new home.
              </p>
              <p className="font-bold text-black italic border-l-4 border-black pl-4">
                Independent research is critical for accurate budgeting. Do not leave your financial security to chance.
              </p>
            </div>
          </section>

          <section className="pt-8 border-t-[4px] border-black space-y-6">
            <h2 className="text-2xl font-black uppercase tracking-tight">Your Next Step: Run the Numbers</h2>
            <p className="text-sm text-gray-600 leading-relaxed font-medium">
              Financial preparation requires exact figures. Access our Interactive Landing Calculator to factor in your specific variables—including your family size and regional costs. This will provide you with a clear, actionable total for the exact reserve fund you will need upon arrival.
            </p>
            <div className="pt-4 print:hidden">
              <Button asChild className="bg-black text-white hover:bg-black/90 font-black uppercase tracking-widest px-8 h-14 rounded-sm border-0">
                <Link href="/prepare">
                  Return to Calculator <ArrowRight className="ml-3 size-5" />
                </Link>
              </Button>
            </div>
          </section>
        </div>

        <footer className="mt-16 pt-8 border-t-2 border-gray-200 flex flex-col md:flex-row justify-between items-center gap-6 opacity-60">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="size-10 text-black" />
            <div className="text-[10px] font-black uppercase tracking-widest leading-tight">
              <p>Leopardfish Intel</p>
              <p>Tactical Briefing</p>
            </div>
          </div>
          <div className="text-[9px] font-bold text-gray-400 text-center md:text-right max-w-xs leading-normal uppercase">
            Intel contained herein is for guidance purposes only. Benchmarks reflect 2025/26 economic indicators.
          </div>
        </footer>
      </div>
      
      <div className="fixed inset-0 -z-10 bg-[#080c18] print:hidden"></div>
    </div>
  );
}

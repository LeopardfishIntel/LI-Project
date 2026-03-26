 'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Printer, CheckCircle2, ShieldAlert, Banknote, Home, Clock, ShoppingCart, Globe, ArrowRight } from 'lucide-react';
import { Binoculars } from '@/components/icons/Binoculars';

export default function BudgetBriefingPage() {
  const handlePrint = () => typeof window !== 'undefined' && window.print();

  return (
    <div className="min-h-screen bg-white text-black p-4 md:p-12 print:p-0 font-sans selection:bg-[#f97316]/20">
      <div className="max-w-4xl mx-auto flex justify-between items-center mb-12 print:hidden">
        <Button variant="outline" asChild className="border-black/20 text-black px-6">
          <Link href="/prepare"><ArrowLeft className="mr-2 size-4" /> Return to Prepare</Link>
        </Button>
        <Button onClick={handlePrint} className="bg-black text-white font-bold px-8">
          <Printer className="mr-2 size-4" /> Print dossier
        </Button>
      </div>

      <div className="max-w-4xl mx-auto border-[4px] border-black p-8 md:p-16 space-y-12 relative bg-white shadow-2xl print:shadow-none">
        <Binoculars className="absolute top-0 right-0 size-48 opacity-10 rotate-[15deg] pointer-events-none p-6" />
        
        <header className="border-b-[6px] border-black pb-8">
          <div className="flex items-center gap-3 mb-2">
            <ShieldAlert className="size-8" />
            <h1 className="text-4xl font-black uppercase tracking-tighter">The True Cost of Landing</h1>
          </div>
          <div className="text-xs font-black uppercase tracking-[0.3em] text-gray-500">Classification: Tactical Prep</div>
        </header>

        <div className="space-y-10">
          <section className="space-y-4">
            <p className="text-lg font-bold">Schools pay in arrears. Expect a 6-week cash shortfall upon arrival.</p>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3 border-b-2 border-black pb-2">
              <Banknote className="size-5" /><h3 className="text-xl font-black uppercase">Visas & Documents</h3>
            </div>
            <p className="text-sm text-gray-600 font-medium">Apostilles and notarisation often exceed £500 per person. Fund these upfront even if reimbursed later.</p>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3 border-b-2 border-black pb-2">
              <Home className="size-5" /><h3 className="text-xl font-black uppercase">Rent & Deposits</h3>
            </div>
            <p className="text-sm text-gray-600 font-medium">Securing properties usually requires 1 month rent + 2 months deposit. Expect to pay thousands before payday.</p>
          </section>

          <section className="pt-8 border-t-[4px] border-black">
             <Button asChild className="bg-black text-white font-black uppercase tracking-widest px-8 h-14 rounded-sm">
                <Link href="/prepare">Return to Calculator <ArrowRight className="ml-3 size-5" /></Link>
             </Button>
          </section>
        </div>
      </div>
      <div className="fixed inset-0 -z-10 bg-[#080c18] print:hidden"></div>
    </div>
  );
}
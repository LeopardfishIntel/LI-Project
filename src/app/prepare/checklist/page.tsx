 'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Printer, CheckCircle2 } from 'lucide-react';
import { Binoculars } from '@/components/icons/Binoculars';

export default function StrategicChecksheetPage() {
  const handlePrint = () => typeof window !== 'undefined' && window.print();

  return (
    <div className="min-h-screen bg-white text-black p-4 md:p-12 print:p-0 font-sans selection:bg-[#d95f02]/20">
      <div className="max-w-4xl mx-auto flex justify-between items-center mb-12 print:hidden">
        <Button variant="outline" asChild className="border-black/20 text-black px-6">
          <Link href="/prepare"><ArrowLeft className="mr-2 size-4" /> Return</Link>
        </Button>
        <Button onClick={handlePrint} className="bg-black text-white font-bold px-8">
          <Printer className="mr-2 size-4" /> Print dossier
        </Button>
      </div>

      <div className="max-w-4xl mx-auto border-[4px] border-black p-8 md:p-16 space-y-12 relative bg-white shadow-2xl">
        <Binoculars className="absolute top-0 right-0 size-48 opacity-10 rotate-[15deg] pointer-events-none p-6" />

        <header className="border-b-[6px] border-black pb-8">
          <h1 className="text-4xl font-black uppercase tracking-tighter leading-none">Strategic checksheet</h1>
        </header>

        <section className="space-y-6">
            <h2 className="text-xl font-black uppercase tracking-tight border-b-2 border-black pb-2">Contract Risks</h2>
            <div className="grid gap-4">
               {["NDA Clauses", "Pay Scale Transparency", "Relocation Frequency"].map((item, i) => (
                  <div key={i} className="flex items-start gap-4 p-2 rounded-sm hover:bg-gray-50">
                    <div className="mt-1 size-6 border-2 border-black rounded-sm bg-white"></div>
                    <p className="text-base font-black uppercase tracking-tight leading-tight">{item}</p>
                  </div>
               ))}
            </div>
        </section>

        <footer className="mt-16 pt-8 border-t-2 border-gray-200 flex flex-col md:flex-row justify-between items-center gap-6 opacity-60">
            <CheckCircle2 className="size-10" />
            <p className="text-[10px] font-black uppercase">Leopardfish Certified Protocol</p>
        </footer>
      </div>
      <div className="fixed inset-0 -z-10 bg-[#080c18] print:hidden"></div>
    </div>
  );
}
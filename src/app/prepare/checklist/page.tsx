'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Printer, Binoculars, CheckCircle2 } from 'lucide-react';

export default function StrategicChecksheetPage() {
  const phases = [
    {
      title: "Phase 1: The contract audit",
      description: "Ensure these terms are explicitly written, not just \"promised.\"",
      items: [
        { label: "Salary Transparency", sub: "Is there a fixed scale, or is it \"discretionary\"?" },
        { label: "Currency Protection", sub: "Is the salary pegged to the USD/GBP?" },
        { label: "The \"Contact Minute\" Cap", sub: "Is the weekly teaching time in minutes stated?" },
        { label: "PPA Guarantee", sub: "Is planning time \"protected\" in the contract?" },
        { label: "Medical Granularity", sub: "Do you have the Full Schedule of Benefits?" }
      ]
    },
    {
      title: "Phase 2: The onboarding cash-flow plan",
      description: "Calculate your \"Tactical Reserve\" (Minimum £4k–£6k for families).",
      items: [
        { label: "The First Payday", sub: "Count the days from arrival to the first paycheck." },
        { label: "Housing Deposit", sub: "Budget for 1–2 months' rent upfront." },
        { label: "The IKEA Test", sub: "Check local sites for the cost of white goods." },
        { label: "Legalisation Fees", sub: "Total cost of Apostilles and medicals." }
      ]
    },
    {
      title: "Phase 3: Professional due diligence",
      description: "Questions for the \"One-to-One\" interview with a current teacher.",
      items: [
        { label: "The \"Floating\" Audit", sub: "Do teachers have their own rooms?" },
        { label: "Admin Bloat", sub: "How many hours a week are spent on data entry?" },
        { label: "Parental Boundaries", sub: "Does leadership support teachers in behaviour disputes?" },
        { label: "Staff Children", sub: "Are all fees (trips, uniforms, levies) waived?" }
      ]
    }
  ];

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
            <ArrowLeft className="mr-2 size-4" /> Return
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
            <span className="text-3xl">🚩</span>
            <h1 className="text-4xl font-black uppercase tracking-tighter leading-none">Strategic checksheet</h1>
          </div>
          <div className="flex items-center gap-4 text-xs font-black uppercase tracking-[0.3em] text-gray-500">
            <span>Dossier ID: LFI-2026-CHKLST</span>
            <span className="border-l border-gray-300 h-3" />
            <span>Classification: Field Operational Use</span>
          </div>
        </header>

        <div className="bg-gray-100 p-6 border-l-8 border-black">
          <p className="text-sm font-bold leading-relaxed italic">
            "Verification is the difference between an adventure and an ordeal. Use this checksheet to validate institutional promises against regional realities."
          </p>
        </div>

        <div className="space-y-12">
          {phases.map((phase, idx) => (
            <section key={idx} className="space-y-6">
              <h2 className="text-2xl font-black uppercase tracking-tight border-b-2 border-black pb-2">{phase.title}</h2>
              <p className="text-sm font-medium text-gray-600 italic">{phase.description}</p>
              
              <div className="grid gap-4">
                {phase.items.map((item, iIdx) => (
                  <div key={iIdx} className="flex items-start gap-4 group p-2 -ml-2 rounded-sm transition-colors hover:bg-gray-50">
                    <div className="mt-1 size-6 border-2 border-black rounded-sm flex-shrink-0 bg-white"></div>
                    <div className="space-y-1">
                      <p className="text-base font-black uppercase tracking-tight leading-tight">{item.label}</p>
                      <p className="text-sm text-gray-600 font-medium leading-relaxed">{item.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <footer className="mt-16 pt-8 border-t-2 border-gray-200 flex flex-col md:flex-row justify-between items-center gap-6 opacity-60">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="size-10 text-black" />
            <div className="text-[10px] font-black uppercase tracking-widest leading-tight">
              <p>Leopardfish Intel</p>
              <p>Certified Protocol</p>
            </div>
          </div>
          <div className="text-[9px] font-bold text-gray-400 text-center md:text-right max-w-xs leading-normal uppercase">
            Intel contained herein is for guidance purposes only. Verify all final details with official sources.
          </div>
        </footer>
      </div>
      <div className="fixed inset-0 -z-10 bg-[#080c18] print:hidden"></div>
    </div>
  );
}
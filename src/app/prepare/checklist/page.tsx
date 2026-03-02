
'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Printer, Binoculars, CheckCircle2 } from 'lucide-react';

export default function StrategicChecksheetPage() {
  const phases = [
    {
      title: "Phase 1: The Contract Audit (The \"Evaluate\" Stage)",
      description: "Before you sign, ensure these terms are explicitly written, not just \"promised.\"",
      items: [
        { label: "Salary Transparency", sub: "Is there a fixed scale, or is it \"discretionary\"?" },
        { label: "Currency Protection", sub: "Is the salary pegged to the USD/GBP, or is there a clause for inflation/devaluation?" },
        { label: "The \"Contact Minute\" Cap", sub: "Is the exact weekly teaching time in minutes stated?" },
        { label: "PPA Guarantee", sub: "Is Planning, Prep, and Assessment time \"protected\" in the contract?" },
        { label: "The \"Disparagement\" Clause", sub: "Is the NDA reasonable, or does it silience you from discussing work-life balance?" },
        { label: "Gratuity Calculation", sub: "Is the End-of-Service bonus based on Basic salary or the Full package? Is it paid with the final salary?" },
        { label: "Medical Granularity", sub: "Do you have the Full Schedule of Benefits (not just a brochure)? Check for Dental/Chronic/Co-pays." }
      ]
    },
    {
      title: "Phase 2: The Onboarding \"Cash-Flow\" Plan",
      description: "Use this to calculate your \"Tactical Reserve\" (Minimum £4k–£6k for families).",
      items: [
        { label: "The First Payday", sub: "Count the days from arrival to the first full paycheck. (Target: 45 days of liquidity)." },
        { label: "Housing Deposit", sub: "Budget for 1–2 months' rent upfront." },
        { label: "Car Hire & Deposit", sub: "Budget for 30 days of rental + the \"Credit Card Block\" for the deposit." },
        { label: "The IKEA Test", sub: "Check local sites for the cost of a \"Starter Kit\" (Fridge, Washing Machine, Bed)." },
        { label: "Legalisation Fees", sub: "Total cost of 4+ Apostilles and medicals. Are these reimbursed?" },
        { label: "Utility Setup", sub: "Budget for connection fees (Water/Electricity/Internet)." }
      ]
    },
    {
      title: "Phase 3: Professional Due Diligence (The \"Intel\" Stage)",
      description: "Questions for the \"One-to-One\" interview with a current teacher.",
      items: [
        { label: "The \"Floating\" Audit", sub: "Do teachers have their own rooms, or do they lose time moving between blocks?" },
        { label: "Admin Bloat", sub: "How many hours a week are spent on data entry/social media evidence vs. teaching?" },
        { label: "Parental Boundaries", sub: "Does leadership support teachers in grade/behavior disputes?" },
        { label: "The \"Turnover\" Stat", sub: "What percentage of staff left in the last 2 years?" },
        { label: "Staff Children", sub: "Are all fees (books, trips, uniforms, levies) waived? How many children are covered, and are there costs for after-school clubs or induction childcare?" }
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
      {/* UI Navigation - Hidden on Print */}
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 mb-12 print:hidden">
        <Button variant="outline" asChild className="border-black/20 hover:bg-black/5 text-black rounded-sm px-6">
          <Link href="/prepare">
            <ArrowLeft className="mr-2 size-4" /> Return
          </Link>
        </Button>
        <div className="flex gap-3">
          <Button onClick={handlePrint} className="bg-black text-white hover:bg-black/90 font-bold rounded-sm px-8">
            <Printer className="mr-2 size-4" /> Print
          </Button>
        </div>
      </div>

      {/* Printable Area */}
      <div className="max-w-4xl mx-auto border-[4px] border-black p-8 md:p-16 space-y-12 relative overflow-hidden bg-white shadow-2xl print:shadow-none print:border-[2px]">
        
        {/* Dossier Header Decoration */}
        <div className="absolute top-0 right-0 p-6 opacity-10 rotate-[15deg] pointer-events-none">
          <Binoculars className="size-48 text-black" />
        </div>

        <header className="border-b-[6px] border-black pb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">🚩</span>
            <h1 className="text-4xl font-black uppercase tracking-tighter leading-none">Leopardfish Strategic Checksheet</h1>
          </div>
          <div className="flex flex-col md:flex-row md:items-center gap-4 text-xs font-black uppercase tracking-[0.3em] text-gray-500">
            <span>Dossier ID: LFI-2026-CHKLST</span>
            <span className="hidden md:inline border-l border-gray-300 h-3" />
            <span>Classification: Field Operational Use</span>
          </div>
        </header>

        {/* Tactical Advice Header */}
        <div className="bg-gray-100 p-6 border-l-8 border-black">
          <p className="text-sm font-bold leading-relaxed italic">
            "Verification is the difference between an adventure and an ordeal. Use this checksheet to validate institutional promises against regional realities. If a school avoids these specific points, assume the risk is being transferred to you."
          </p>
        </div>

        {/* Checksheet Phases */}
        <div className="space-y-12">
          {phases.map((phase, idx) => (
            <section key={idx} className="space-y-6">
              <div className="border-b-2 border-black pb-2 flex flex-col md:flex-row md:items-baseline justify-between gap-2">
                <h2 className="text-2xl font-black uppercase tracking-tight">{phase.title}</h2>
              </div>
              <p className="text-sm font-medium text-gray-600 italic">{phase.description}</p>
              
              <div className="grid gap-4">
                {phase.items.map((item, iIdx) => (
                  <div key={iIdx} className="flex items-start gap-4 group p-2 -ml-2 rounded-sm transition-colors hover:bg-gray-50">
                    <div className="mt-1 size-6 border-2 border-black rounded-sm flex-shrink-0 flex items-center justify-center bg-white group-hover:border-primary/50">
                      {/* Checkbox placeholder */}
                    </div>
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

        {/* Footer / Auth Seal */}
        <footer className="mt-16 pt-8 border-t-2 border-gray-200 flex flex-col md:flex-row justify-between items-center gap-6 opacity-60">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="size-10 text-black" />
            <div className="text-[10px] font-black uppercase tracking-widest leading-tight">
              <p>Leopardfish Intel</p>
              <p>Certified Protocol</p>
            </div>
          </div>
          <div className="text-[9px] font-bold text-gray-400 text-center md:text-right max-w-xs leading-normal uppercase">
            Intel contained herein is for guidance purposes only. Verify all final contractual and logistical details with the employer and local authorities.
          </div>
        </footer>
      </div>
      
      {/* Visual background element for UI view only */}
      <div className="fixed inset-0 -z-10 bg-[#080c18] print:hidden"></div>
    </div>
  );
}

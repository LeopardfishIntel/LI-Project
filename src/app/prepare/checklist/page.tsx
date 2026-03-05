'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Printer, Binoculars, CheckCircle2, Flag } from 'lucide-react';

export default function StrategicChecksheetPage() {
  const sections = [
    {
      title: "Material risks",
      description: "International school contracts evolve annually. Conduct a forensic review of your specific terms for the following risks. If any deal-breakers emerge, seek professional consultation before signing.",
      items: [
        { label: "Confidentiality Clauses", sub: "Ensure privacy clauses are limited to standard data protection." },
        { label: "Pay Scale Transparency", sub: "Confirmation of placement on a transparent institutional scale." },
        { label: "Flights and Relocation", sub: "Ensure the exact value and frequency of these benefits are clearly stated in your contract." },
        { label: "Medical Co-pay Audit", sub: "Full Schedule of Benefits obtained and audited for inpatient gaps." },
        { label: "Housing Standard", sub: "Specifications clearly defined and cash allowances tied to local rent inflation." },
        { label: "Exit Protocol", sub: "Confirmation that gratuity is independent of school-controlled conduct ratings." }
      ]
    },
    {
      title: "The True Cost of Landing",
      description: "Relocating abroad is rarely cost-neutral; use this audit to identify the upfront costs that will draw on your cash reserves before your first full month’s pay arrives.",
      items: [
        { label: "Visa and Documentation", sub: "Apostilles, notary public fees, and courier logistics accounted for." },
        { label: "Housing Liquidity", sub: "Provisions made for initial security deposit and upfront rent if required." },
        { label: "Daily expenditure", sub: "Confirmed liquid capital available for the initial 'Gap Month'." },
        { label: "Basic home comforts", sub: "Appliance and setup costs researched for local region (The IKEA Test)." }
      ]
    },
    {
      title: "Leadership & stability",
      description: "Senior leadership stability is the benchmark of a settled school; utilise these indicators to distinguish between a high-performing environment and one defined by systemic volatility.",
      items: [
        { label: "Stability Index", sub: "Replacement churn rate calculated (Excluding expansion growth seats)." },
        { label: "Tenure Audit", sub: "Principal and HOD confirmed in post for >2 years." }
      ]
    },
    {
      title: "The \"Hard-Talk\" inquiry",
      description: "Verification questions for final stage due diligence.",
      items: [
        { label: "Fee Waiver", sub: "Confirmation that all staff children levies/capital fees are waived." },
        { label: "PPA Protection", sub: "Is non-contact time contractually guaranteed?" },
        { label: "Legalisation Reimbursement", sub: "Does the school reimburse document fees upon arrival?" }
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
            <span>Classification: Operational Use</span>
          </div>
        </header>

        <div className="space-y-12">
          <section className="space-y-6">
            <h2 className="text-xl font-black uppercase tracking-tight border-b-2 border-black pb-2">Risk signal protocol</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border-2 border-black space-y-2">
                <p className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                  <Flag className="size-4 fill-black text-black" /> RED SIGNAL
                </p>
                <p className="text-xs font-bold leading-tight uppercase">Critical risk.</p>
                <p className="text-[11px] leading-relaxed">High-impact contractual pitfalls. One or two signals justify declining an offer unless total mitigation is possible.</p>
              </div>
              <div className="p-4 border-2 border-black space-y-2">
                <p className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                  <Flag className="size-4 text-black" /> AMBER SIGNAL
                </p>
                <p className="text-xs font-bold leading-tight uppercase">Operational caution.</p>
                <p className="text-[11px] leading-relaxed">Procedural risks. Multiple signals require a full re-evaluation of institutional stability.</p>
              </div>
            </div>
          </section>

          {sections.map((section, idx) => (
            <section key={idx} className="space-y-6">
              <h2 className="text-xl font-black uppercase tracking-tight border-b-2 border-black pb-2">{section.title}</h2>
              <p className="text-xs font-bold text-gray-600 italic leading-relaxed">{section.description}</p>
              
              <div className="grid gap-4">
                {section.items.map((item, iIdx) => (
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

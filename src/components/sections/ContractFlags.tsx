'use client';

import React, { useEffect, useState } from 'react';
import { ShieldAlert, Lock, Banknote, GraduationCap, Activity, ArrowRight } from 'lucide-react';
import Link from 'next/link';

/**
 * 🛡️ RESPONSIVE CONTRACT FLAGS DOSSIER
 * Refactored for Mobile-First layout and high-density technical briefing.
 * Optimized for Next.js 15 and Firebase App Hosting stability.
 */
export default function ContractFlags() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <section className="py-24 bg-[#020617] flex justify-center px-4">
        <div className="w-full max-w-4xl h-[400px] animate-pulse bg-white/5 rounded-sm" />
      </section>
    );
  }

  const flags = [
    {
      icon: <Lock className="size-6 text-[#f97316]" />,
      title: "PRIVACY TRAP",
      desc: "Aggressive NDAs silencing field reports."
    },
    {
      icon: <Banknote className="size-6 text-[#f97316]" />,
      title: "PAY TRANSPARENCY",
      desc: "Refusal to publish clear salary scales."
    },
    {
      icon: <GraduationCap className="size-6 text-[#f97316]" />,
      title: "EDUCATION FEES",
      desc: "Hidden costs for staff dependent seats."
    },
    {
      icon: <Activity className="size-6 text-[#f97316]" />,
      title: "MEDICAL CO-PAYS",
      desc: "Significant gaps in inpatient coverage."
    }
  ];

  return (
    <section className="py-24 bg-[#020617]">
      <div className="container mx-auto px-4 md:px-6">
        {/* Responsive Card Wrapper: Reduced padding on mobile, expanded on desktop */}
        <div className="max-w-4xl mx-auto border border-[rgba(255,255,255,0.1)] rounded-sm p-6 md:p-12 space-y-12">
          
          {/* Header Section */}
          <div className="flex items-center gap-4">
            <ShieldAlert className="size-10 text-[#f97316]" />
            <div className="space-y-1">
              <h2 className="text-3xl md:text-4xl font-black tracking-tighter text-white uppercase leading-none">
                CONTRACT FLAGS
              </h2>
              <p className="text-[#f97316] text-[10px] md:text-xs tracking-[0.3em] font-bold uppercase">
                CRITICAL DUE DILIGENCE
              </p>
            </div>
          </div>

          {/* Data Grid: Single column mobile, 2 columns desktop */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
            {flags.map((flag, i) => (
              <div key={i} className="flex items-start gap-4 group">
                <div className="mt-1 transition-transform group-hover:scale-110 duration-300 shrink-0">
                  {flag.icon}
                </div>
                <div className="space-y-1.5">
                  <h4 className="text-lg font-black tracking-tighter text-white uppercase leading-tight">
                    {flag.title}
                  </h4>
                  <p className="text-sm text-gray-400 font-medium leading-relaxed">
                    {flag.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Footer Action */}
          <div className="pt-10 border-t border-[rgba(255,255,255,0.1)] flex flex-col md:flex-row items-center justify-between gap-6">
            <p className="text-sm text-gray-400 italic font-medium text-center md:text-left">
              Get the full tactical briefing before signing your next offer.
            </p>
            <Link 
              href="/prepare" 
              className="group w-full md:w-auto flex items-center justify-center gap-3 border border-[#f97316] text-[#f97316] px-8 py-4 rounded-sm transition-all hover:bg-[#f97316]/10 uppercase font-bold text-xs tracking-widest"
            >
              ACCESS FULL FLAG REGISTRY
              <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

        </div>
      </div>
    </section>
  );
}

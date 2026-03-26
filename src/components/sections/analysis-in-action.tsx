 "use client";

import React from 'react';
import { 
  Wallet, Users, Globe, Pencil, 
  GitCompare, Search, FileText, ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const features = [
  {
    title: "TRUE NET SAVINGS",
    desc: "Calculate genuine disposable income by mapping real-world costs against net offers.",
    icon: Wallet,
    color: "text-[#007FFF]" // Tactical Blue
  },
  {
    title: "FAMILY SCALABILITY",
    desc: "Our estimates allow for the specific needs of both singles and families, using custom figures for every situation.",
    icon: Users,
    color: "text-[#f97316]" // Tactical Orange
  },
  {
    title: "COST OF LIVING INDEX",
    desc: "Review primary data on housing, utilities, and essential spending in international locations.",
    icon: Globe,
    color: "text-[#007FFF]"
  },
  {
    title: "LIVE OFFER INPUT",
    desc: "Add your offer details to see how this affects the finances.",
    icon: Pencil,
    color: "text-[#f97316]"
  },
  {
    title: "COMPARISON MATRIX",
    desc: "Analyse up to 3 school offers side-by-side with verified benchmarks.",
    icon: GitCompare,
    color: "text-[#007FFF]"
  },
  {
    title: "KEY FINDINGS",
    desc: "Receive curated analytical reports identifying strengths and risks.",
    icon: Search,
    color: "text-[#f97316]"
  },
  {
    title: "FINAL PLAN",
    desc: "Final review, includes audits of housing, medical care, and departure plans.",
    icon: FileText,
    color: "text-[#007FFF]"
  },
  {
    title: "CONTRACT FLAGS",
    desc: "Identify early renewal traps, hidden deductions, and ambiguous handbook clauses.",
    icon: ShieldAlert,
    color: "text-[#f97316]"
  }
];

export function AnalysisInAction() {
  return (
    <section className="py-24 bg-[#020617] border-t border-white/5">
      <div className="container mx-auto px-4 max-w-7xl">
        
        {/* 🎯 HEADER: Verbatim Content */}
        <div className="text-center mb-24 space-y-4">
          <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter uppercase leading-none">
            ANALYSIS IN ACTION
          </h2>
          <p className="text-[#f97316] text-[10px] md:text-xs font-black uppercase tracking-[0.45em]">
            Key examples of how we use data to drive decisions.
          </p>
        </div>

        {/* 📊 THE 4x2 PROTOCOL GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-12 gap-y-20 mb-32">
          {features.map((f, i) => (
            <div key={i} className="flex flex-col items-start group">
              <div className="flex items-center gap-3 mb-5">
                <f.icon className={`size-5 ${f.color}`} />
                <h3 className="text-[13px] font-black text-white uppercase tracking-wider">
                  {f.title}
                </h3>
              </div>
              <p className="text-[13px] text-slate-400 leading-relaxed font-medium">
                {f.desc}
              </p>
            </div>
          ))}
        </div>

        {/* 🏁 ACTIONABLE FOOTER */}
        <div className="pt-16 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-8">
          <p className="text-sm italic text-slate-400 font-medium tracking-tight">
            Make informed decisions with verified financial and school data.
          </p>
          
          <div className="flex gap-4">
            <Link href="/directory">
              <Button className="bg-[#f97316] hover:bg-[#f97316]/90 text-white rounded-none h-14 px-8 font-black uppercase text-[11px] tracking-widest transition-all">
                BROWSE SCHOOLS <ArrowRight className="ml-2 size-4" />
              </Button>
            </Link>
            <Link href="/discover">
              <Button className="bg-[#f97316] hover:bg-[#f97316]/90 text-white rounded-none h-14 px-8 font-black uppercase text-[11px] tracking-widest transition-all">
                FIND MY FIT <ArrowRight className="ml-2 size-4" />
              </Button>
            </Link>
          </div>
        </div>

      </div>
    </section>
  );
}
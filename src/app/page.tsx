"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Wallet, Users, Globe, Pencil, 
  GitCompare, Search, FileText, ShieldAlert,
  ArrowRight, Building2, Eye, BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import goldfishImg from '@/assets/goldfish.jpg';

const features = [
  { title: "TRUE NET SAVINGS", desc: "Calculate genuine disposable income by mapping real-world costs against net offers.", icon: Wallet, color: "text-[#007FFF]" },
  { title: "FAMILY SCALABILITY", desc: "Our estimates allow for the specific needs of both singles and families, using custom figures for every situation.", icon: Users, color: "text-[#f97316]" },
  { title: "COST OF LIVING INDEX", desc: "Review primary data on housing, utilities, and essential spending in international locations.", icon: Globe, color: "text-[#007FFF]" },
  { title: "LIVE OFFER INPUT", desc: "Add your offer details to see how this affects the finances.", icon: Pencil, color: "text-[#f97316]" },
  { title: "COMPARISON MATRIX", desc: "Analyse up to 3 school offers side-by-side with verified benchmarks.", icon: GitCompare, color: "text-[#007FFF]" },
  { title: "KEY FINDINGS", desc: "Receive curated analytical reports identifying strengths and risks.", icon: Search, color: "text-[#f97316]" },
  { title: "FINAL PLAN", desc: "Final review, includes audits of housing, medical care, and departure plans.", icon: FileText, color: "text-[#007FFF]" },
  { title: "CONTRACT FLAGS", desc: "Identify early renewal traps, hidden deductions, and ambiguous handbook clauses.", icon: ShieldAlert, color: "text-[#f97316]" }
];

const counters = [
  { label: 'INTL SCHOOLS', value: '125', icon: Building2, color: 'text-[#f97316]' },
  { label: 'COUNTRIES', value: '30', icon: Globe, color: 'text-[#007FFF]' },
  { label: 'VISITS', value: '1,525', icon: Eye, color: 'text-[#f97316]' },
  { label: 'COMPARISONS', value: '303', icon: BarChart3, color: 'text-[#007FFF]' },
];

function TacticalButton({ href, label, className }: { href: string; label: string; className?: string }) {
  return (
    <Link href={href} prefetch={false}>
      <Button 
        className={cn(
          "bg-zinc-950/60 backdrop-blur-xl border border-[#f97316] text-white font-bold rounded-none h-14 px-10 transition-all hover:bg-[#f97316]/20 shadow-2xl text-sm whitespace-nowrap",
          className
        )}
      >
        {label}
      </Button>
    </Link>
  );
}

export default function Home() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const steps = [
    { title: 'Discover', desc: "Find the right role for you. See which destinations suit your skill set and desired lifestyle.", link: '/find-your-fit/', imageUrl: 'https://images.unsplash.com/photo-1554366347-897a5113f6ab?q=80&w=1080&auto=format&fit=crop', label: 'Find Your Fit' },
    { title: 'Evaluate', desc: "See what your earnings could actually look like. Understand exactly what you’ll be paid.", link: '/financial-forecaster/', imageUrl: 'https://images.unsplash.com/photo-1720175646487-eba0c1846f80?q=80&w=1080&auto=format&fit=crop', label: 'Financial Forecast' },
    { title: 'Decide', desc: "Compare your options. View your choices side-by-side to help you make the best decision.", link: 'https://www.leopardfishintel.com/compare/', imageUrl: 'https://images.unsplash.com/photo-1762920738995-f393efe82205?q=80&w=1080&auto=format&fit=crop', label: 'Compare Offers' },
    { title: 'Prepare', desc: "Get ready to move. Everything you need to do before you head off.", link: '/prepare/', imageUrl: goldfishImg, label: 'Get Ready' },
  ];

  if (!mounted) return <div className="min-h-screen bg-[#020617]" />;

  return (
    <div className="flex flex-col min-h-screen bg-[#020617] text-white/90 selection:bg-[#f97316]">
      
      {/* 🏔️ HERO SECTION */}
      <section className="relative w-full h-[82vh] flex flex-col items-center justify-center overflow-hidden border-b border-white/5 px-4 text-center">
        <Image src="https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2070&auto=format&fit=crop" alt="Intelligence background" fill priority className="absolute inset-0 w-full h-full object-cover opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-[#020617] z-10"></div>
        
        <div className="relative z-30 max-w-5xl mx-auto flex flex-col items-center w-full pt-4">
           {/* 🛡️ BADGE: 900 weight, Sentence case, Shadow, No Outline */}
           <div className="inline-flex items-center gap-2 px-6 py-1.5 border border-[#f97316]/30 bg-[#f97316]/10 text-[#f97316] text-[13px] font-[900] tracking-[0.5em] mb-6 drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)]">
             ⦿ Actionable intelligence
           </div>

           {/* 🛡️ NEEDLE-THIN HERO: Inter 100, High Tracking, Zero Shadow, Light Bleed Fix */}
           <h1 
           className="text-6xl md:text-8xl tracking-[0.2em] mb-4 leading-none font-sans antialiased opacity-90"
           style={{ fontWeight: 100, textShadow: 'none' }}
           >
           <span className="text-[#f97316]">Leopard</span><span className="text-[#007FFF]">fish Intel</span>
           </h1>
           
           <p className="text-xl md:text-2xl text-white font-bold max-w-2xl mb-10 tracking-tight italic uppercase opacity-90">
             Move with certainty<span className="text-[#f97316]">,</span> not just hope.
           </p>
           
           <div className="flex flex-col sm:flex-row gap-4 mb-10">
              <TacticalButton href="/find-your-fit/" label="Find Your Fit" className="w-60 h-16" />
              <TacticalButton href="https://www.leopardfishintel.com/compare/" label="Check Your Offer" className="w-60 h-16" />
           </div>

           <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-16 w-full border-t border-white/10 pt-6">
              {counters.map((c) => (
                <div key={c.label} className="flex flex-col items-center space-y-1">
                  <c.icon className={cn("size-5", c.color)} />
                  <span className="text-3xl md:text-4xl font-black tracking-tighter text-white">{c.value}</span>
                  <span className="text-[10px] uppercase tracking-[0.4em] text-slate-500 font-bold">{c.label}</span>
                </div>
              ))}
           </div>
        </div>
      </section>

      {/* 🎯 MISSION STATEMENT: Slate-400 (Off-white) and py-8 */}
      <section className="py-8 bg-[#020617] border-y border-white/5">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-6xl uppercase tracking-tighter text-white font-black mb-4 leading-none">
            Know <span className="text-[#f97316]">before</span> you go
          </h1>
          <div className="space-y-4 max-w-4xl mx-auto">
            <p className="text-slate-400 text-lg md:text-xl leading-relaxed font-bold tracking-tight">
              Don’t fly blind. International teaching looks like a dream on Instagram, but the contract is where the reality lives. Leopardfish Intel strips away the gloss to show you the cold, hard facts.
            </p>
            <p className="text-slate-400 text-lg md:text-xl leading-relaxed font-bold tracking-tight">
              Every international teaching offer hides trade-offs, from medical coverage gaps to cost-of-living nuances that can drain a salary before it even hits your account. We make these invisible risks visible, ensuring your next move is a strategic advancement, not just a change of scenery.
            </p>
          </div>
        </div>
      </section>

      {/* 🧭 ZIG-ZAG PROTOCOLS: Tightened padding */}
      <section className="py-8 bg-[#020617]">
        <div className="container mx-auto px-4 space-y-12">
          {steps.map((step, index) => (
            <div key={step.title} className="grid md:grid-cols-12 gap-10 items-center max-w-6xl mx-auto border-b border-white/5 pb-8 last:border-0">
              <div className={cn("md:col-span-5 relative aspect-video border border-white/10 overflow-hidden group", index % 2 === 1 && "md:order-last")}>
                <Image src={step.imageUrl} alt={step.title} fill className="object-cover transition-transform group-hover:scale-105 duration-700" />
              </div>
              <div className={cn("md:col-span-7 flex flex-col space-y-2", index % 2 === 1 ? "md:items-end md:text-right" : "items-start")}>
                <h3 className="text-4xl md:text-5xl text-white font-black uppercase italic tracking-tighter leading-none">{step.title}</h3>
                <p className="text-slate-400 text-lg leading-relaxed max-w-lg font-bold">{step.desc}</p>
                <Link 
                  href={step.link} 
                  prefetch={false}
                  className="text-[#f97316] text-xs font-black tracking-[0.4em] uppercase flex items-center group pt-1 border-b border-transparent hover:border-[#f97316] transition-all"
                >
                  {step.label} <ArrowRight className="ml-3 size-4 group-hover:translate-x-2 transition-transform" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 📊 ANALYSIS IN ACTION: Tightened padding and Off-white subtitle */}
      <section className="py-12 bg-[#020617] border-t border-white/5">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="text-center mb-16 space-y-2">
            <h2 className="text-5xl md:text-7xl font-black text-[#f97316] tracking-tighter uppercase leading-none">
              ANALYSIS IN ACTION
            </h2>
            <p className="text-slate-400 text-[10px] md:text-xs font-black tracking-[0.45em]">
              Key examples of how we use data to drive decisions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-12 gap-y-12 mb-20">
            {features.map((f, i) => (
              <div key={i} className="flex flex-col items-start group">
                <div className="flex items-center gap-3 mb-4">
                  <f.icon className={`size-5 ${f.color}`} />
                  <h3 className="text-[13px] font-black text-white uppercase tracking-wider italic">
                    {f.title}
                  </h3>
                </div>
                <p className="text-[13px] text-slate-400 leading-relaxed font-medium">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="pt-8 border-t border-white/5 text-center">
            <p className="text-base italic text-slate-400 font-medium tracking-tight">
              Make informed decisions with verified financial and school data.
            </p>
          </div>
        </div>
      </section>
      
    </div>
  );
}
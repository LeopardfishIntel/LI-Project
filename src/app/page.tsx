 "use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic'; 
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// 🛰️ 1. STATIC ASSET IMPORT
import goldfishImg from '@/assets/goldfish.jpg';

// 📡 2. DYNAMIC COMPONENT IMPORTS
const KeyFactsSection = dynamic(
  () => import('@/components/key-facts-section').then((mod) => mod.KeyFactsSection),
  { ssr: false }
);

const AnalysisInAction = dynamic(
  () => import('@/components/sections/analysis-in-action').then((mod) => mod.AnalysisInAction),
  { ssr: false }
);

function TacticalButton({ href, label, className }: { href: string; label: string; className?: string }) {
  return (
    <Link href={href} prefetch={false}>
      <Button 
        className={cn(
          "bg-[#f97316]/10 backdrop-blur-md border border-[#f97316]/40 text-white font-bold rounded-none h-14 px-10 transition-all hover:bg-[#f97316]/30 shadow-xl text-sm whitespace-nowrap",
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
    { 
      id: '01', 
      title: 'Discover', 
      desc: "Find the right role for you. See which destinations suit your skill set and desired lifestyle. We match your personal profile with the real-world conditions of each location.", 
      link: '/discover', 
      imageUrl: 'https://images.unsplash.com/photo-1554366347-897a5113f6ab?q=80&w=1080&auto=format&fit=crop', 
      label: 'Explore Roles' 
    },
    { 
      id: '02', 
      title: 'Evaluate', 
      desc: "See what your earnings could actually look like. Understand exactly what you’ll be paid. Calculate your expected take-home pay and see how much you’ll have left to spend after local living costs.", 
      link: '/discover', // Updated to match your 'Evaluate' flow
      imageUrl: 'https://images.unsplash.com/photo-1720175646487-eba0c1846f80?q=80&w=1080&auto=format&fit=crop', 
      label: 'Calculate Pay' 
    },
    { 
      id: '03', 
      title: 'Decide', 
      desc: "Compare your options. View your choices side-by-side. Compare your potential costs, income and savings to help you make the best decision for your future.", 
      link: '/compare', 
      imageUrl: 'https://images.unsplash.com/photo-1762920738995-f393efe82205?q=80&w=1080&auto=format&fit=crop', 
      label: 'View Matrix' 
    },
    { 
      id: '04', 
      title: 'Prepare', 
      desc: "Get ready to move. Everything you need to do before you head off. Access simple, step-by-step checklists and clear timelines to manage your move with ease.", 
      link: '/prepare', 
      imageUrl: goldfishImg, 
      label: 'Start Checklist' 
    },
  ];

  if (!mounted) return <div className="min-h-screen bg-[#020617]" />;

  return (
    <div className="flex flex-col min-h-screen bg-[#020617] text-white/90 selection:bg-[#f97316]">
      
      {/* 🏔️ HERO SECTION */}
      <section className="relative w-full h-[88vh] flex flex-col items-center justify-center overflow-hidden border-b border-white/5 px-4 text-center">
        <Image 
          src="https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2070&auto=format&fit=crop" 
          alt="Intelligence background" 
          fill 
          priority={true} // 🏎️ PRIORITY ENABLED: Fixed LCP warning for above-the-fold content
          className="absolute inset-0 w-full h-full object-cover opacity-60" 
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#020617]/80 via-[#020617]/40 to-[#020617]"></div>
        
        <div className="relative z-30 max-w-5xl mx-auto flex flex-col items-center">
           <div className="inline-flex items-center gap-2 px-4 py-1 border border-[#f97316]/30 bg-[#f97316]/5 text-[#f97316] text-[10px] font-black uppercase tracking-[0.4em] mb-8 animate-pulse">
             Actionable Intelligence
           </div>

           <h1 className="text-6xl md:text-8xl tracking-tighter text-white font-black mb-6 leading-none italic drop-shadow-2xl">
             <span className="text-[#f97316]">Leopard</span><span className="text-[#007FFF]">fish Intel</span>
           </h1>
           
           <p className="text-xl md:text-2xl text-white font-bold max-w-2xl opacity-90 mb-10 tracking-tight leading-relaxed italic uppercase">
             Move with certainty<span className="text-[#f97316]">,</span> not just hope.
           </p>
           
           <div className="flex flex-col sm:flex-row gap-4 mb-16">
              <TacticalButton href="/discover" label="Find Your Fit" className="w-60 h-16 text-base" />
              <TacticalButton href="/compare" label="Check Your Offer" className="w-60 h-16 text-base" />
           </div>
           
           <div className="opacity-100">
             <KeyFactsSection />
           </div>
        </div>
      </section>

      {/* 🎯 MISSION STATEMENT */}
      <section className="py-16 md:py-24 bg-[#020617] border-y border-white/5">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-5xl uppercase tracking-[0.1em] text-white font-black italic mb-8 leading-none">
            Know <span className="text-[#f97316]">before</span> you go
          </h2>
          <div className="space-y-6">
            <p className="text-white/80 text-xl md:text-2xl leading-relaxed font-bold tracking-tight">
              Don’t fly blind. International teaching looks like a dream on Instagram, but the contract is where the reality lives. We strip away the gloss to show you the cold, hard facts.
            </p>
            <p className="text-[#007FFF] text-lg md:text-xl leading-relaxed font-black uppercase italic tracking-widest">
              Every international teaching offer hides trade-offs. We make them visible.
            </p>
          </div>
        </div>
      </section>

      {/* 🧭 ZIG-ZAG PROTOCOLS */}
      <section className="py-20 bg-[#020617]">
        <div className="container mx-auto px-4 space-y-32">
          {steps.map((step, index) => (
            <div key={step.id} className="grid md:grid-cols-12 gap-12 md:gap-20 items-center max-w-6xl mx-auto border-b border-white/5 pb-24 last:border-0">
              
              <div className={cn(
                "md:col-span-5 relative aspect-video border border-white/10 overflow-hidden group shadow-[0_0_50px_rgba(0,127,255,0.1)]", 
                index % 2 === 1 && "md:order-last"
              )}>
                <Image 
                  src={step.imageUrl} 
                  alt={step.title} 
                  fill 
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover opacity-80 transition-transform group-hover:scale-105 duration-700 group-hover:opacity-100" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-transparent opacity-60"></div>
              </div>

              <div className={cn(
                "md:col-span-7 flex flex-col space-y-4", 
                index % 2 === 1 ? "md:items-end md:text-right" : "items-start"
              )}>
                <span className="text-6xl font-black text-[#f97316] opacity-20 leading-none tracking-tighter italic">{step.id}</span>
                <h3 className="text-5xl md:text-6xl text-white font-black uppercase italic tracking-tighter leading-none">
                    {step.title}<span className="text-[#007FFF]">.</span>
                </h3>
                <p className="text-slate-400 text-lg leading-relaxed max-w-lg font-bold">
                    {step.desc}
                </p>
                <Link href={step.link} className="text-[#f97316] text-xs font-black tracking-[0.4em] uppercase flex items-center group pt-4 border-b-2 border-transparent hover:border-[#f97316] transition-all">
                  {step.label} <ArrowRight className="ml-3 size-5 group-hover:translate-x-2 transition-transform" />
                </Link>
              </div>

            </div>
          ))}
        </div>
      </section>

      <div className="pb-24">
        <AnalysisInAction />
      </div>
      
    </div>
  );
}
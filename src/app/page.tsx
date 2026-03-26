 "use client";

import React from 'react';
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
      link: '/financial-forecaster', 
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

  return (
    <div className="flex flex-col min-h-screen bg-[#020617] text-white/90">
      
      {/* 🏔️ HERO SECTION */}
      <section className="relative w-full h-[88vh] flex flex-col items-center justify-center overflow-hidden border-b border-white/5 px-4 text-center">
      <Image 
  src="https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2070&auto=format&fit=crop" 
  alt="Intelligence background" 
  fill 
  priority={false} // 🏎️ Set to false to stop the server from waiting on it
  className="absolute inset-0 w-full h-full object-cover opacity-90" 
/>
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-[#020617]"></div>
        
        <div className="relative z-30 max-w-5xl mx-auto flex flex-col items-center">
           <div className="inline-flex items-center gap-2 px-3 py-1 border border-[#f97316]/30 bg-[#f97316]/5 text-[#f97316] text-[10px] font-bold uppercase tracking-[0.3em] mb-8 animate-pulse">
             Actionable Intelligence
           </div>

           <h1 className="text-6xl md:text-8xl tracking-tighter text-white font-bold mb-6 leading-none italic drop-shadow-2xl">
             <span className="text-[#f97316]">Leopard</span><span className="text-[#007FFF]">fish Intel</span>
           </h1>
           
           <p className="text-xl md:text-2xl text-white font-medium max-w-2xl opacity-90 mb-10 tracking-tight leading-relaxed italic">
             Move with certainty, not just hope.
           </p>
           
           <div className="flex flex-col sm:flex-row gap-4 mb-16">
              <TacticalButton href="/discover" label="Find Your Fit" className="w-56" />
              <TacticalButton href="/compare" label="Check Your Offer" className="w-56" />
           </div>
           
           <div className="opacity-90">
             <KeyFactsSection />
           </div>
        </div>
      </section>

      {/* 🎯 MISSION STATEMENT: COMPACT & PROMINENT */}
      <section className="py-8 md:py-12 bg-[#020617] border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 text-center">
          {/* Header upgraded: bigger, brighter, more tracking */}
          <h2 className="text-2xl md:text-4xl uppercase tracking-[0.2em] text-white font-black italic mb-4 leading-none">
            Know before you go
          </h2>
          <div className="space-y-3">
            <p className="text-white/70 text-lg md:text-xl leading-relaxed font-medium">
              Don’t fly blind. International teaching looks like a dream on Instagram, but the contract is where the reality lives. We strip away the gloss to show you the cold, hard facts.
            </p>
            <p className="text-white/70 text-lg md:text-xl leading-relaxed font-medium italic">
              Every international teaching offer hides trade-offs. We make them visible.
            </p>
          </div>
        </div>
      </section>

      {/* 🧭 ZIG-ZAG PROTOCOLS */}
      <section className="py-12 bg-[#020617]">
        <div className="container mx-auto px-4 space-y-20">
          {steps.map((step, index) => (
            <div key={step.id} className="grid md:grid-cols-12 gap-10 md:gap-16 items-center max-w-5xl mx-auto border-b border-white/5 pb-16 last:border-0">
              
              <div className={cn(
                "md:col-span-5 relative aspect-video border border-white/10 overflow-hidden group shadow-2xl", 
                index % 2 === 1 && "md:order-last"
              )}>
                <Image 
                  src={step.imageUrl} 
                  alt={step.title} 
                  fill 
                  className="object-cover opacity-100 transition-transform group-hover:scale-110 duration-700" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#020617]/40 to-transparent"></div>
              </div>

              <div className={cn(
                "md:col-span-7 flex flex-col space-y-3", 
                index % 2 === 1 ? "md:items-end md:text-right" : "items-start"
              )}>
                <span className="text-5xl font-black text-[#f97316] opacity-10 leading-none tracking-tighter">{step.id}</span>
                <h3 className="text-4xl md:text-5xl text-white font-black uppercase italic tracking-tighter leading-none">{step.title}</h3>
                <p className="text-slate-400 text-base leading-relaxed max-w-lg font-medium">{step.desc}</p>
                <Link href={step.link} className="text-[#f97316] text-[10px] font-black tracking-[0.3em] uppercase flex items-center group pt-2">
                  {step.label} <ArrowRight className="ml-2 size-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

            </div>
          ))}
        </div>
      </section>

      <div className="pb-16">
        <AnalysisInAction />
      </div>
      
    </div>
  );
}
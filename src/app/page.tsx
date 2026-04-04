"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ArrowRight, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * 🛡️ LEOPARDFISH TACTICAL HOMEPAGE
 * Logic: Hard-coded HEX values and Tactical Glass signatures.
 * Hydration Guard: Only wraps interactive nodes to prevent blank-screen delays.
 */
export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const steps = [
    { 
      title: 'Discover', 
      desc: "Find the right role for you. See which destinations suit your lifestyle.", 
      link: '/find-your-fit', 
      imageUrl: 'https://images.unsplash.com/photo-1554366347-897a5113f6ab?q=80&w=1080&auto=format&fit=crop', 
      label: 'Explore roles' 
    },
    { 
      title: 'Evaluate', 
      desc: "Understand exactly what you’ll be paid. Calculate expected take-home pay.", 
      link: '/financial-forecaster', 
      imageUrl: 'https://images.unsplash.com/photo-1720175646487-eba0c1846f80?q=80&w=1080&auto=format&fit=crop', 
      label: 'Calculate pay' 
    },
    { 
      title: 'Decide', 
      desc: "Compare potential costs, income and savings to help you make the best decision.", 
      link: '/compare', 
      imageUrl: 'https://images.unsplash.com/photo-1762920738995-f393efe82205?q=80&w=1080&auto=format&fit=crop', 
      label: 'View matrix' 
    },
    { 
      title: 'Prepare', 
      desc: "Access step-by-step checklists and clear timelines to manage your move.", 
      link: '/prepare', 
      imageUrl: 'https://images.unsplash.com/photo-1638202947561-e372255007b3?q=80&w=1080&auto=format&fit=crop', 
      label: 'Start checklist' 
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#020617] text-white selection:bg-[#f97316]">
      
      {/* 🏔️ HERO SECTION */}
      <section className="relative w-full h-[85vh] flex flex-col items-center justify-center overflow-hidden border-b border-white/10 px-4 text-center">
        <Image 
          src="https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2070&auto=format&fit=crop" 
          alt="Intelligence background" 
          fill priority unoptimized
          className="absolute inset-0 w-full h-full object-cover opacity-40" 
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#020617]/80 via-[#020617]/40 to-[#020617]"></div>
        
        <div className="relative z-30 max-w-5xl mx-auto flex flex-col items-center">
           <div className="inline-flex items-center gap-2 px-4 py-1 border border-[#f97316]/30 bg-[#f97316]/10 text-[#f97316] text-[10px] font-bold uppercase tracking-[0.4em] mb-8">
             ⦿ Actionable intelligence
           </div>

           <h1 className="text-6xl md:text-8xl tracking-tighter text-white antialiased mb-4 leading-none font-extrabold">
              <span className="text-[#f97316]">Leopard</span>fish <span className="text-[#007FFF]">Intel</span>
           </h1>
           
           <p className="text-xl md:text-2xl text-slate-300 font-medium max-w-2xl mb-12 tracking-tight italic">
             "Move with certainty, not just hope."
           </p>
           
           {mounted && (
             <div className="flex flex-col sm:flex-row gap-6 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                <Link href="/find-your-fit" prefetch={false}>
                  <Button className="bg-[#E68A4D]/20 backdrop-blur-md border border-[#E68A4D]/40 text-white font-bold rounded-none h-14 min-w-[200px] transition-all hover:bg-[#E68A4D]/40 shadow-xl text-xs tracking-widest">
                    Discover
                  </Button>
                </Link>
                <Link href="/financial-forecaster" prefetch={false}>
                  <Button className="bg-[#E68A4D]/20 backdrop-blur-md border border-[#E68A4D]/40 text-white font-bold rounded-none h-14 min-w-[200px] transition-all hover:bg-[#E68A4D]/40 shadow-xl text-xs tracking-widest">
                    Evaluate
                  </Button>
                </Link>
             </div>
           )}
        </div>
      </section>

      {/* 🧭 ZIG-ZAG SECTIONS */}
      <section className="py-24 bg-[#020617]">
        <div className="container mx-auto px-4 space-y-32">
          {steps.map((step, index) => (
            <div key={step.title} className="grid md:grid-cols-12 gap-12 items-center max-w-6xl mx-auto">
              <div className={cn(
                "md:col-span-5 relative aspect-[4/3] border border-white/5 overflow-hidden shadow-2xl",
                index % 2 === 1 && "md:order-last"
              )}>
                <Image src={step.imageUrl} alt={step.title} fill unoptimized className="object-cover opacity-60 grayscale hover:grayscale-0 transition-all duration-700" />
              </div>
              <div className={cn(
                "md:col-span-7 flex flex-col space-y-4",
                index % 2 === 1 ? "md:items-end md:text-right" : "items-start"
              )}>
                <span className="text-[#f97316] text-[10px] font-black tracking-[0.5em] uppercase opacity-50">Protocol 0{index + 1}</span>
                <h3 className="text-5xl md:text-6xl text-white font-black uppercase tracking-tighter leading-none">{step.title}</h3>
                <p className="text-slate-400 text-lg md:text-xl font-medium leading-relaxed max-w-xl">{step.desc}</p>
                <Link href={step.link} prefetch={false} className="inline-flex items-center gap-3 text-[#f97316] text-xs font-bold tracking-[0.3em] uppercase group pt-6">
                  {step.label} <ArrowRight className="size-4 group-hover:translate-x-2 transition-transform" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 🏁 FINAL CTA */}
      <section className="py-32 border-t border-white/5 bg-[#0b1224]/30">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-8">
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-white uppercase italic leading-none">
            Know <span className="text-[#f97316]">before</span> you go
          </h2>
          <p className="text-slate-400 text-lg md:text-xl font-medium italic">
            "International teaching looks like a dream on Instagram, but reality lives in the contract."
          </p>
          <div className="pt-8 flex justify-center">
            {mounted && (
              <Link href="/find-your-fit" prefetch={false}>
                <Button className="bg-[#f97316] hover:bg-white hover:text-[#f97316] text-white font-black h-16 px-12 rounded-none transition-all uppercase tracking-widest text-sm shadow-[0_0_30px_rgba(249,115,22,0.3)]">
                  Initialize intel scan
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>
      
    </div>
  );
}

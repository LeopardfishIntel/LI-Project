 'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic'; // ⚡ TACTICAL REQUIREMENT
import { Button } from '@/components/ui/button';
import { ArrowRight, Target, Calculator, GitCompare, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

// 🛡️ TACTICAL LAZY LOAD: Defer heavy Firebase-dependent components
const KeyFactsSection = dynamic(
  () => import('@/components/key-facts-section').then((mod) => mod.KeyFactsSection),
  { ssr: false, loading: () => <div className="h-20 w-full animate-pulse bg-white/5 rounded-sm" /> }
);

const RedFlagRegistry = dynamic(
  () => import('@/components/red-flag-registry').then((mod) => mod.RedFlagRegistry),
  { ssr: false }
);

/**
 * 🛰️ TACTICAL GLASS BUTTON
 * Standardized: #E68A4D 20% opacity + backdrop-blur.
 */
function TacticalButton({ href, label, className, icon: Icon }: { href: string; label: string; className?: string; icon?: React.ElementType }) {
  return (
    <Link href={href} prefetch={false}>
      <Button 
        className={cn(
          "bg-[#E68A4D]/20 backdrop-blur-md border border-[#E68A4D] text-white font-bold rounded-sm h-12 px-8 transition-all hover:bg-[#E68A4D]/30 shadow-lg shadow-black/20 uppercase tracking-tighter",
          className
        )}
      >
        {label} {Icon && <Icon className="ml-2 size-4" />}
      </Button>
    </Link>
  );
}

export default function Home() {
  const steps = [
    {
      id: '01',
      title: 'Discover',
      icon: <Target className="w-8 h-8 text-[#f97316]" />,
      desc: "Find your fit matching engine. Intersection of profile and local realities.",
      link: '/discover',
      imageUrl: 'https://images.unsplash.com/photo-1554366347-897a5113f6ab?q=80&w=1080&auto=format&fit=crop',
      label: 'Find your fit'
    },
    {
      id: '02',
      title: 'Evaluate',
      icon: <Calculator className="w-8 h-8 text-[#f97316]" />,
      desc: "The contract decoder. Calculate actual take-home pay and disposable income.",
      link: '/financial-forecaster',
      imageUrl: 'https://images.unsplash.com/photo-1720175646487-eba0c1846f80?q=80&w=1080&auto=format&fit=crop',
      label: 'Decode offer'
    },
    {
      id: '03',
      title: 'Decide',
      icon: <GitCompare className="w-8 h-8 text-[#f97316]" />,
      desc: "Comparison matrix. View true net savings side-by-side with mission certainty.",
      link: '/compare',
      imageUrl: 'https://images.unsplash.com/photo-1762920738995-f393efe82205?q=80&w=1080&auto=format&fit=crop',
      label: 'Final verdict'
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#020617]">
      {/* Hero Section */}
      <section className="relative w-full h-[80vh] flex items-center justify-center overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2070&auto=format&fit=crop"
          alt="Tactical intelligence background"
          fill
          priority
          className="absolute inset-0 w-full h-full object-cover opacity-40 grayscale"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#020617]/60 to-[#020617]"></div>
        
        <div className="relative z-30 container mx-auto px-4 text-center">
          <div className="max-w-4xl mx-auto space-y-6 flex flex-col items-center">
            <div className="inline-flex items-center gap-2 bg-[#f97316]/10 border border-[#f97316]/30 px-3 py-1 rounded text-[#f97316] text-[10px] font-black uppercase tracking-[0.3em]">
              <ShieldCheck className="w-3.5 h-3.5" /> Actionable intelligence
            </div>

            {/* HEADER FIX: Non-Bold branding per tactical request */}
            <h1 className="text-5xl md:text-8xl tracking-tighter leading-none text-white font-normal drop-shadow-2xl">
              <span className="text-[#f97316]">Leopard</span><span className="text-[#007FFF]">fish Intel</span>
            </h1>
            
            <p className="text-xl md:text-3xl text-white/80 font-medium max-w-2xl leading-tight [text-shadow:0_2px_10px_rgba(0,0,0,0.5)]">
              Move with certainty, not just hope.
            </p>

            <div className="flex flex-wrap justify-center gap-6 pt-8">
              <TacticalButton href="/discover" label="Discover" className="min-w-[240px]" />
              <TacticalButton href="/financial-forecaster" label="Evaluate" className="min-w-[240px]" />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section - Dynamic */}
      <section className="relative z-40 -mt-12 container mx-auto px-4 md:px-6">
        <div className="glass border-white/10 rounded-sm py-10 px-4 md:px-12 bg-[#020617]/80 backdrop-blur-md">
          <KeyFactsSection />
        </div>
      </section>

      {/* Zig-Zag Insider Journey */}
      <section className="py-24 bg-[#020617]">
        <div className="container mx-auto px-4">
          <div className="space-y-32">
            {steps.map((step, index) => (
              <div key={step.id} className="grid md:grid-cols-2 gap-12 items-center">
                <div className={cn(
                  "relative aspect-[4/3] rounded-sm overflow-hidden border border-white/10 group shadow-2xl bg-white/5",
                  index % 2 === 1 && "md:order-last"
                )}>
                  <Image src={step.imageUrl} alt={step.title} fill className="object-cover opacity-60 group-hover:scale-105 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-transparent"></div>
                </div>
                <div className={cn("space-y-6 flex flex-col", index % 2 === 1 ? "md:items-end md:text-right" : "md:items-start")}>
                  <div className="p-4 bg-[#f97316]/10 rounded-sm w-fit border border-[#f97316]/20">{step.icon}</div>
                  <h3 className="text-3xl md:text-5xl text-white tracking-tighter font-bold">{step.title}</h3>
                  <p className="text-muted-foreground text-lg leading-relaxed max-w-lg font-medium">{step.desc}</p>
                  <TacticalButton href={step.link} label={step.label} icon={ArrowRight} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <RedFlagRegistry />
    </div>
  );
}
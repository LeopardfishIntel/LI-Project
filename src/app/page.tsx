 'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic'; 
import { Button } from '@/components/ui/button';
import { ArrowRight, Target, Calculator, GitCompare, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

// 🛡️ TACTICAL LAZY LOAD
const KeyFactsSection = dynamic(
  () => import('@/components/key-facts-section').then((mod) => mod.KeyFactsSection),
  { ssr: false, loading: () => <div className="h-20 w-full animate-pulse bg-white/5 rounded-sm" /> }
);

const RedFlagRegistry = dynamic(
  () => import('@/components/red-flag-registry').then((mod) => mod.RedFlagRegistry),
  { ssr: false }
);

function TacticalButton({ href, label, className, icon: Icon }: { href: string; label: string; className?: string; icon?: React.ElementType }) {
  return (
    <Link href={href} prefetch={false}>
      <Button 
        className={cn(
          "bg-[#E68A4D]/20 backdrop-blur-md border border-[#E68A4D] text-white font-black rounded-none h-14 px-10 transition-all hover:bg-[#E68A4D]/40 shadow-xl uppercase tracking-tighter",
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
      <section className="relative w-full h-[85vh] flex items-center justify-center overflow-hidden border-b border-white/5">
        <Image
          src="https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2070&auto=format&fit=crop"
          alt="Intelligence background"
          fill
          priority
          className="absolute inset-0 w-full h-full object-cover opacity-30 grayscale"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#020617]/20 via-[#020617]/80 to-[#020617]"></div>
        
        <div className="relative z-30 container mx-auto px-4 text-center">
          <div className="max-w-5xl mx-auto space-y-8 flex flex-col items-center">
            <div className="inline-flex items-center gap-2 bg-[#f97316]/10 border border-[#f97316]/30 px-4 py-1.5 rounded-full text-[#f97316] text-[10px] font-black uppercase tracking-[0.4em]">
              <ShieldCheck className="w-3.5 h-3.5" /> Actionable intelligence
            </div>

            <h1 className="text-6xl md:text-9xl tracking-tighter leading-[0.85] text-white font-normal">
              <span className="text-[#f97316] block md:inline">LEOPARD</span>
              <span className="text-[#007FFF] block md:inline italic">FISH</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-slate-400 font-medium max-w-2xl leading-tight uppercase tracking-tight">
              Move with certainty, <span className="text-white">not just hope.</span>
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4 pt-10">
              <TacticalButton href="/discover" label="Launch Discover" className="w-full sm:w-64" />
              <TacticalButton href="/financial-forecaster" label="Analyze Offer" className="w-full sm:w-64" />
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-40 -mt-16 container mx-auto px-4">
        <div className="border border-white/10 rounded-none py-12 px-6 md:px-12 bg-[#020617]/90 backdrop-blur-xl shadow-2xl">
          <KeyFactsSection />
        </div>
      </section>

      <section className="py-32 bg-[#020617]">
        <div className="container mx-auto px-4">
          <div className="space-y-40">
            {steps.map((step, index) => (
              <div key={step.id} className="grid md:grid-cols-2 gap-16 items-center">
                <div className={cn(
                  "relative aspect-video overflow-hidden border border-white/10 group shadow-2xl bg-white/5",
                  index % 2 === 1 && "md:order-last"
                )}>
                  <Image src={step.imageUrl} alt={step.title} fill className="object-cover opacity-50 grayscale group-hover:grayscale-0 transition-all duration-1000" />
                  <div className="absolute inset-0 bg-gradient-to-tr from-[#020617] via-transparent to-transparent"></div>
                </div>
                <div className={cn("space-y-8 flex flex-col", index % 2 === 1 ? "md:items-end md:text-right" : "md:items-start")}>
                  <div className="text-[#f97316] text-6xl font-black opacity-20">{step.id}</div>
                  <h3 className="text-4xl md:text-6xl text-white tracking-tighter font-black uppercase">{step.title}</h3>
                  <p className="text-slate-400 text-lg leading-relaxed max-w-md">{step.desc}</p>
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
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { KeyFactsSection } from '@/components/key-facts-section';
import { Button } from '@/components/ui/button';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { ArrowRight, Target, Calculator, GitCompare, Scan } from 'lucide-react';
import { cn } from '@/lib/utils';

const getImage = (id: string) => {
  const image = PlaceHolderImages?.find(img => img.id === id);
  return {
    imageUrl: image?.imageUrl ?? "https://picsum.photos/seed/intel/1920/1080",
    imageHint: image?.imageHint ?? "tactical campus",
    description: image?.description ?? "Professional intelligence background."
  };
};

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const heroImage = getImage('homepage-hero');

  useEffect(() => {
    setMounted(true);
  }, []);

  const steps = [
    {
      id: '01',
      title: 'Discover',
      icon: <Target className="size-8 text-[#f97316]" />,
      desc: "The fit finder matching engine. We look for the intersection of your profile and local realities, filtering for institutional context and visa feasibility.",
      link: '/discover',
      imageId: 'discover-step',
      label: 'Find your fit'
    },
    {
      id: '02',
      title: 'Evaluate',
      icon: <Calculator className="size-8 text-[#f97316]" />,
      desc: "The contract decoder. Calculate your actual take-home pay and map genuine disposable income with bespoke family scaling multipliers and cost buffers.",
      link: '/financial-forecaster',
      imageId: 'evaluate-step',
      label: 'Decode offer'
    },
    {
      id: '03',
      title: 'Decide',
      icon: <GitCompare className="size-8 text-[#f97316]" />,
      desc: "The comparison matrix. Select up to 3 school offers to view true net savings side-by-side. Weigh allowances and benefits with absolute mission certainty.",
      link: '/compare',
      imageId: 'decide-step',
      label: 'Final verdict'
    },
  ];

  if (!mounted) {
    return <div className="min-h-screen bg-[#020617]" />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#020617]">
      {/* Hero Section */}
      <section className="relative w-full h-[85vh] flex items-center justify-center overflow-hidden">
        <Image
          src={heroImage.imageUrl}
          alt={heroImage.description}
          fill
          priority
          className="absolute inset-0 w-full h-full object-cover opacity-60"
          data-ai-hint={heroImage.imageHint}
        />
        <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
          <div className="absolute w-[800px] h-[800px] bg-white/5 blur-[120px] rounded-full opacity-30"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#020617]/40 to-[#020617]"></div>
        </div>
        <div className="relative z-30 container mx-auto px-4 md:px-6 text-center">
          <div className="max-w-4xl mx-auto space-y-6 flex flex-col items-center">
            
            {/* Actionable Intelligence Badge */}
            <div className="inline-flex items-center gap-2 border border-[#f97316]/40 px-3 py-1.5 rounded-sm bg-[#f97316]/5">
              <Scan className="size-3.5 text-[#f97316]" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#f97316]">Actionable Intelligence</span>
            </div>

            {/* Split Heading */}
            <h1 className="text-5xl md:text-8xl font-black tracking-tighter leading-none text-white uppercase drop-shadow-2xl">
              <span className="text-[#f97316]">Leopard</span><span className="text-[#007FFF]">fish Intel</span>
            </h1>
            
            <p className="text-xl md:text-3xl text-white font-medium max-w-2xl leading-tight [text-shadow:0_2px_10px_rgba(0,0,0,0.5)]">
              Move with certainty, not just hope.
            </p>

            {/* Tactical Button Cluster */}
            <div className="flex flex-wrap justify-center gap-6 pt-8">
              <Button size="lg" className="h-14 min-w-[280px] bg-[#020617] border-2 border-[#f97316] text-white font-black uppercase tracking-widest rounded-sm hover:bg-white/5 transition-all shadow-xl" asChild>
                <Link href="/discover">Start journey</Link>
              </Button>
              <Button size="lg" className="h-14 min-w-[280px] bg-[#020617] border-2 border-[#f97316] text-white font-black uppercase tracking-widest rounded-sm hover:bg-white/5 transition-all shadow-xl" asChild>
                <Link href="/compare">Compare offers</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Counter Section */}
      <section className="relative z-40 -mt-12 container mx-auto px-4 md:px-6">
        <div className="glass border-white/10 rounded-sm py-10 px-4 md:px-12 bg-[#020617]/80">
          <KeyFactsSection />
        </div>
      </section>

      {/* Zig-Zag Insider Journey */}
      <section className="py-24 bg-[#020617]">
        <div className="container mx-auto px-4 md:px-6">
          <div className="space-y-32">
            {steps.map((step, index) => (
              <div key={step.id} className="grid md:grid-cols-2 gap-12 md:gap-24 items-center">
                <div className={cn(
                  "relative aspect-[4/3] rounded-sm overflow-hidden border border-white/10 group shadow-2xl",
                  index % 2 === 1 && "md:order-last"
                )}>
                  <Image 
                    src={getImage(step.imageId).imageUrl}
                    alt={step.title}
                    fill
                    className="object-cover opacity-80 group-hover:scale-105 transition-transform duration-700"
                    data-ai-hint={getImage(step.imageId).imageHint}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-transparent"></div>
                  <div className={cn(
                    "absolute bottom-4 text-[#f97316] text-6xl opacity-10 font-black",
                    index % 2 === 1 ? "right-4" : "left-4"
                  )}>{step.id}</div>
                </div>
                <div className={cn(
                  "space-y-6 flex flex-col",
                  index % 2 === 1 ? "md:items-end md:text-right" : "md:items-start"
                )}>
                  <div className="p-4 bg-[#f97316]/10 rounded-sm w-fit border border-[#f97316]/20">{step.icon}</div>
                  <h3 className="text-3xl md:text-5xl text-white tracking-tighter font-bold uppercase">{step.title}</h3>
                  <p className="text-muted-foreground text-lg leading-relaxed max-w-lg font-medium">{step.desc}</p>
                  <Button size="lg" className="bg-[#f97316] hover:bg-[#f97316]/90 text-white font-bold text-sm h-12 px-8 rounded-sm" asChild>
                    <Link href={step.link}>{step.label} <ArrowRight className="ml-2 w-4 h-4" /></Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

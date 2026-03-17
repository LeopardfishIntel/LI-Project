'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { KeyFactsSection } from '@/components/key-facts-section';
import { Button } from '@/components/ui/button';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import ContractFlags from '@/components/sections/ContractFlags';
import { ArrowRight, ShieldCheck, Scan, PiggyBank, Users, Globe, PencilLine, GitCompare, Sparkles, FileCheck, ShieldAlert } from 'lucide-react';
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
      desc: "Find the right schools for you. Our matching engine identifies opportunities that align with your experience, subject specialism, and preferred locations. We also account for school context and visa eligibility, helping you focus only on realistic options.",
      link: '/discover',
      imageId: 'discover-step',
      label: 'Find your fit'
    },
    {
      id: '02',
      title: 'Evaluate',
      desc: "Understand your real take-home pay. Our contract decoder breaks down salary packages so you can see what you’ll actually earn. We factor in tax, cost of living, family considerations, and typical allowances to estimate your true disposable income.",
      link: '/financial-forecaster',
      imageId: 'evaluate-step',
      label: 'Decode offer'
    },
    {
      id: '03',
      title: 'Decide',
      desc: "Compare offers with confidence. Review up to three school offers side-by-side to understand the real value of each package. Compare salary, benefits, housing, and allowances so you can choose the best fit for your career and lifestyle.",
      link: '/compare',
      imageId: 'decide-step',
      label: 'Final verdict'
    },
    {
      id: '04',
      title: 'Prepare',
      desc: "Get ready for your move abroad. Receive practical guidance on visas, medical checks, and document legalisation. We also help you plan the financial buffer needed for a smooth relocation.",
      link: '/prepare',
      imageId: 'prepare-step',
      label: 'Get ready'
    }
  ];

  const capabilities = [
    {
      icon: <PiggyBank className="size-5 text-[#f97316]/80" />,
      title: "Clear financial position",
      desc: "Establish your genuine disposable income by setting the net offer against realistic day-to-day living costs."
    },
    {
      icon: <Users className="size-5 text-[#f97316]/80" />,
      title: "Family scaling",
      desc: "Adjust projections to reflect family circumstances, with tailored modelling for households up to 2.5× the base structure."
    },
    {
      icon: <Globe className="size-5 text-[#f97316]/80" />,
      title: "Cost of living overview",
      desc: "Review core expenditure data covering housing, utilities, and essential living costs across international locations."
    },
    {
      icon: <PencilLine className="size-5 text-[#f97316]/80" />,
      title: "Live offer input",
      desc: "Enter confirmed contract details to assess the immediate financial implications of each regional posting."
    },
    {
      icon: <GitCompare className="size-5 text-[#f97316]/80" />,
      title: "Side-by-side comparison",
      desc: "Evaluate up to three school offers simultaneously against verified institutional benchmarks."
    },
    {
      icon: <Sparkles className="size-5 text-[#f97316]/80" />,
      title: "Key insights",
      desc: "Receive a structured summary outlining the strengths of each opportunity alongside any notable institutional risks."
    },
    {
      icon: <FileCheck className="size-5 text-[#f97316]/80" />,
      title: "Final preparation plan",
      desc: "A comprehensive readiness guide covering documentation, visa medical requirements, and prudent financial reserves."
    },
    {
      icon: <ShieldAlert className="size-5 text-[#f97316]/80" />,
      title: "Contract review flags",
      desc: "Highlight early renewal clauses, potential deductions, and ambiguous provisions within school handbooks."
    }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#020617]">
      {/* Hero Section */}
      <section className="relative w-full h-[80vh] flex items-center justify-center overflow-hidden">
        <Image
          src={heroImage.imageUrl}
          alt={heroImage.description}
          fill
          priority
          className="absolute inset-0 w-full h-full object-cover opacity-20"
          data-ai-hint={heroImage.imageHint}
        />
        <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
          <div className="absolute w-[800px] h-[800px] bg-white/5 blur-[120px] rounded-full opacity-30"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#020617]/20 to-[#020617]"></div>
        </div>
        
        <div className="relative z-30 container mx-auto px-4 md:px-6 text-center">
          <div className="max-w-4xl mx-auto flex flex-col items-center">
            <div className="space-y-6 flex flex-col items-center">
              <div className="inline-flex items-center gap-2 bg-[#f97316]/10 border border-[#f97316]/30 px-3 py-1 rounded text-[#f97316] text-[10px] font-black uppercase tracking-widest">
                {mounted ? <Scan className="size-3.5 animate-pulse" /> : <ShieldCheck className="size-3.5" />}
                Actionable Intelligence
              </div>
              <h1 className="text-4xl md:text-7xl font-bold tracking-tighter leading-tight text-white">
                <span className="text-[#f97316]">Leopardfish</span> <span className="text-[#007FFF]">Intel</span>
              </h1>
              <p className="text-xl md:text-3xl text-white font-medium max-w-2xl leading-tight">
                Move with certainty, not just hope.
              </p>
              <div className="flex flex-wrap justify-center gap-4 pt-4">
                <Button size="lg" className="h-14 px-10 bg-[#f97316] hover:bg-[#f97316]/90 text-white font-bold rounded-sm border-0 shadow-lg shadow-[#f97316]/20 transition-all" asChild>
                  <Link href="/discover">Discover</Link>
                </Button>
                <Button size="lg" variant="outline" className="h-14 px-10 border-[#f97316] text-[#f97316] hover:bg-[#f97316]/10 font-bold rounded-sm shadow-lg transition-all" asChild>
                  <Link href="/financial-forecaster">Evaluate</Link>
                </Button>
              </div>
            </div>

            <div className="mt-12 w-full max-w-4xl">
              <KeyFactsSection />
            </div>
          </div>
        </div>
      </section>

      {/* Mission Bridge */}
      <section className="py-20 bg-[#020617] border-b border-white/5">
        <div className="container mx-auto px-4 md:px-6 text-center">
          <div className="max-w-3xl mx-auto space-y-6">
            <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">Know before you go</h2>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed font-medium">
              Don’t fly blind. International teaching looks like a dream on Instagram, but the contract is where the reality lives. Leopardfish Intel strips away the gloss, mapping the true financial and institutional signature of your next move.
            </p>
          </div>
        </div>
      </section>

      {/* Zig-Zag Journey */}
      <section className="bg-[#020617]">
        <div className="container mx-auto px-4 md:px-6 max-w-6xl">
          {steps.map((step, index) => (
            <div key={step.id} className="grid md:grid-cols-2 gap-12 md:gap-24 items-center py-14 border-b border-white/5 last:border-0">
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
                  priority={index === 0}
                  loading={index === 0 ? undefined : "lazy"}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#020617]/40 via-transparent to-transparent"></div>
              </div>
              <div className={cn(
                "space-y-6 flex flex-col",
                index % 2 === 1 ? "md:items-end md:text-right" : "md:items-start"
              )}>
                <h3 className="text-3xl md:text-4xl text-[#f97316] font-bold tracking-tight leading-none uppercase">{step.title}</h3>
                <p className="text-muted-foreground text-base md:text-lg leading-relaxed max-w-lg font-medium">{step.desc}</p>
                <Button size="lg" variant="link" className="text-[#f97316] p-0 h-auto font-bold text-sm uppercase tracking-widest hover:text-white transition-colors" asChild>
                  <Link href={step.link}>{step.label} <ArrowRight className="ml-2 w-4 h-4" /></Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Analysis in Action Grid */}
      <section className="py-16 md:py-24 bg-[#020617] border-t border-white/5">
        <div className="container mx-auto px-4 md:px-6 max-w-6xl">
          <div className="space-y-12">
            <div className="text-center">
              <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight leading-none">Analysis in action</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {capabilities.map((cap, i) => (
                <div key={i} className="flex flex-col gap-4 p-6 bg-white/[0.02] border border-white/5 rounded-sm hover:border-[#f97316]/20 transition-all duration-500 group">
                  <div className="transition-transform group-hover:scale-110 duration-300">
                    {cap.icon}
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-base font-bold text-white tracking-tight">{cap.title}</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed font-medium opacity-80">
                      {cap.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-10 flex flex-wrap justify-center gap-4">
                <Button 
                  className="bg-[#f97316] hover:bg-[#f97316]/90 text-white font-bold uppercase tracking-widest text-xs h-12 px-10 rounded-sm min-w-[200px] shadow-lg shadow-[#f97316]/10 transition-all hover:scale-[1.02] border-0" 
                  asChild
                >
                    <Link href="/directory">Browse schools</Link>
                </Button>
                <Button 
                  className="bg-[#f97316] hover:bg-[#f97316]/90 text-white font-bold uppercase tracking-widest text-xs h-12 px-10 rounded-sm min-w-[200px] shadow-lg shadow-[#f97316]/10 transition-all hover:scale-[1.02] border-0" 
                  asChild
                >
                    <Link href="/discover">Discover</Link>
                </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Contract Flags Briefing */}
      <ContractFlags />
    </div>
  );
}

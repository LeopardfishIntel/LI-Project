"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Wallet, Users, Globe, Pencil,
  GitCompare, Search, FileText, ShieldAlert,
  ArrowRight, Building2, Eye, BarChart3,
  Target, SlidersHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import type { School, AppMetrics } from '@/lib/types';
import goldfishImg from '@/assets/goldfish.jpg';
import evaluateSchoolImg from '@/assets/evaluate-school.jpg';
import featuredJobsImg from '@/assets/featured-jobs.png';

const features = [
  { title: "TRUE NET SAVINGS", desc: "Calculate genuine disposable income by mapping real-world costs and tax-adjusted net offers.", icon: Wallet, color: "text-[#FF6B00]" },
  { title: "FAMILY SCALABILITY", desc: "Adjust estimates for singles, couples, or families to see the true cost of dependents in specific regions.", icon: Users, color: "text-[#007FFF]" },
  { title: "COST OF LIVING INDEX", desc: "Primary data on housing, utilities, and essential spending—benchmarked for expat lifestyles.", icon: Globe, color: "text-[#FF6B00]" },
  { title: "LIVE OFFER INPUT", desc: "Plug in your actual contract offer to see how it stacks up against our regional 5-year medians.", icon: Pencil, color: "text-[#007FFF]" },
  { title: "COMPARISON MATRIX", desc: "Analyse up to 3 school offers side-by-side using verified, standardized benchmarks.", icon: GitCompare, color: "text-[#FF6B00]" },
  { title: "KEY FINDINGS", desc: "Receive curated analytical reports identifying strengths and hidden risks in your specific location.", icon: Search, color: "text-[#007FFF]" },
  { title: "CONTRACT FLAGS", desc: "Identify early renewal traps, hidden deductions, and ambiguous handbook clauses before you sign.", icon: ShieldAlert, color: "text-[#FF6B00]" },
  { title: "SAVINGS TARGETING", desc: "New: Work out the exact number you need to meet your personal wealth and savings goals.", icon: Target, color: "text-[#007FFF]" }
];

// 🛰️ HARDCODED FALLBACKS (If DB is slow)
const COUNTER_FALLBACKS = {
  schools: 251,
  countries: 46,
  visits: 1525,
  comparisons: 303
};

function TacticalButton({ href, label, className }: { href: string; label: string; className?: string }) {
  return (
    <Link href={href} prefetch={false}>
      <Button
        className={cn(
          "bg-zinc-950/60 backdrop-blur-xl border border-[#d95f02] text-white font-bold rounded-none h-14 px-10 transition-all hover:bg-[#d95f02]/20 shadow-2xl text-sm whitespace-nowrap",
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
  const firestore = useFirestore();

  // 🛰️ DB UPLINKS
  const { data: schoolsData, isLoading: sLoading } = useCollection<School>(useMemoFirebase(() => (mounted && firestore ? collection(firestore, 'schools') : null), [firestore, mounted]));
  const { data: colData, isLoading: cLoading } = useCollection<any>(useMemoFirebase(() => (mounted && firestore ? collection(firestore, 'locations_costOfLiving') : null), [firestore, mounted]));

  const metricsRef = useMemo(() => (mounted && firestore ? doc(firestore, 'app_metrics', 'page_views') : null), [firestore, mounted]);
  const { data: metrics, isLoading: mLoading } = useDoc<AppMetrics>(metricsRef as any);

  useEffect(() => { setMounted(true); }, []);

  // 🌍 CALCULATED METRICS
  const isAnyLoading = sLoading || cLoading || mLoading;

  const schoolCount = useMemo(() => {
    if (!schoolsData || schoolsData.length === 0) return COUNTER_FALLBACKS.schools;
    const unique = new Set(schoolsData.map(s => (s.name || s.schoolname || s.id).toLowerCase().trim()));
    return unique.size || COUNTER_FALLBACKS.schools;
  }, [schoolsData]);

  const countryCount = useMemo(() => {
    if (!schoolsData || schoolsData.length === 0) return COUNTER_FALLBACKS.countries;
    const uniqueSchools = Array.from(new Map(schoolsData.map(s => [(s.name || s.schoolname || s.id).toLowerCase().trim(), s])).values());
    const countries = new Set(uniqueSchools.map(s => s.country).filter(Boolean));
    return countries.size || COUNTER_FALLBACKS.countries;
  }, [schoolsData]);

  const visitsCount = metrics?.site_visits || COUNTER_FALLBACKS.visits;
  const comparisonsCount = metrics?.comparisons_made || COUNTER_FALLBACKS.comparisons;

  const counters = [
    { label: 'INTL SCHOOLS', value: schoolCount.toLocaleString(), icon: Building2, color: 'text-[#d95f02]', loading: isAnyLoading },
    { label: 'COUNTRIES', value: countryCount.toLocaleString(), icon: Globe, color: 'text-[#007FFF]', loading: isAnyLoading },
    { label: 'VISITS', value: visitsCount.toLocaleString(), icon: Eye, color: 'text-[#d95f02]', loading: isAnyLoading },
    { label: 'COMPARISONS', value: comparisonsCount.toLocaleString(), icon: BarChart3, color: 'text-[#007FFF]', loading: isAnyLoading },
  ];

  const steps = [
    { title: 'Featured Jobs', desc: "Curate active international school opportunities from across the globe.", link: '/featured-jobs/', imageUrl: (featuredJobsImg as any).src || featuredJobsImg, label: 'Featured Vacancies' },
    { title: 'Discover', desc: "Find the right role for you. See which destinations suit your skill set and desired lifestyle.", link: '/find-your-fit/', imageUrl: 'https://images.unsplash.com/photo-1554366347-897a5113f6ab?q=80&w=1080&auto=format&fit=crop', label: 'Find Your Fit' },
    { title: 'Evaluate a school', desc: "See what your earnings could actually look like. Understand exactly what you’ll be paid and identify the exact salary required to meet your personal savings target.", link: '/financial-forecaster/', imageUrl: (evaluateSchoolImg as any).src || evaluateSchoolImg, label: 'Financial Forecast' },
    { title: 'Compare a school', desc: "Compare your options. View your choices side-by-side to help you make the best decision.", link: '/decide/', imageUrl: 'https://images.unsplash.com/photo-1762920738995-f393efe82205?q=80&w=1080&auto=format&fit=crop', label: 'Compare Offers' },
    { title: 'Prepare', desc: "Get ready to move. Everything you need to do before you head off.", link: '/prepare/', imageUrl: (goldfishImg as any).src || goldfishImg, label: 'Get Ready' },
  ];

  if (!mounted) return <div className="min-h-screen bg-[#020617]" />;

  return (
    <div className="flex flex-col min-h-screen bg-[#020617] text-white/90 selection:bg-[#d95f02]">

      {/* 🏔️ HERO SECTION */}
      <section className="relative w-full h-[82vh] flex flex-col items-center justify-center overflow-hidden border-b border-white/5 px-4 text-center">
        <Image src="https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2070&auto=format&fit=crop" alt="Intelligence background" fill priority className="absolute inset-0 w-full h-full object-cover opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-[#020617] z-10"></div>

        <div className="relative z-30 max-w-5xl mx-auto flex flex-col items-center w-full pt-4">
          {/* 🛡️ BADGE */}
          <div className="inline-flex items-center gap-2 px-6 py-1.5 border border-[#d95f02]/30 bg-[#d95f02]/10 text-[#d95f02] text-[13px] font-[900] tracking-[0.5em] mb-6 drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)]">
            ⦿ Actionable intelligence
          </div>

          {/* 🛡️ SURGICAL UPDATE: Applied Sharpening, Shadow, and Stroke to your existing H1 */}
          <h1
            className="text-6xl md:text-8xl tracking-[0.2em] mb-4 leading-none font-sans antialiased opacity-90"
            style={{
              fontWeight: 100,
              // 1. Tactical Lift (Shadow) + 4. Edge Definition (Stroke)
              textShadow: '0 2px 4px rgba(0,0,0,0.6), 0 0 1px rgba(0,0,0,1)',
              WebkitTextStroke: '0.5px rgba(0,0,0,0.25)',
              // 3. Sub-Pixel Sharpening
              WebkitFontSmoothing: 'antialiased',
              MozOsxFontSmoothing: 'grayscale',
              textRendering: 'optimizeLegibility'
            }}
          >
            <span className="text-[#d95f02]">Leopard</span><span className="text-[#007FFF]">fish Intel</span>
          </h1>

          <p className="text-xl md:text-2xl text-white font-bold max-w-2xl mb-10 tracking-tight italic uppercase opacity-90">
            Move with certainty, not just hope.
          </p>

          <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-4 mb-10">
            <TacticalButton href="/featured-jobs" label="Featured Jobs" className="w-52 sm:w-56 h-16" />
            <TacticalButton href="/financial-forecaster" label="Evaluate A School" className="w-52 sm:w-56 h-16" />
            <TacticalButton href="/decide" label="Compare Schools" className="w-52 sm:w-56 h-16" />
          </div>

          <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-16 w-full border-t border-white/10 pt-6">
            {counters.map((c) => (
              <div key={c.label} className="flex flex-col items-center space-y-1 group">
                <c.icon className={cn("size-5 transition-transform group-hover:scale-110", c.color)} />
                <span className={cn(
                  "text-3xl md:text-4xl font-black tracking-tighter transition-all tabular-nums",
                  c.loading ? "text-white/20 animate-pulse" : "text-white"
                )}>
                  {c.value}
                </span>
                <span className="text-[10px] uppercase tracking-[0.4em] text-slate-500 font-bold group-hover:text-[#d95f02] transition-colors">{c.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 🎯 MISSION STATEMENT */}
      <section className="py-8 bg-[#020617] border-y border-white/5">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-6xl uppercase tracking-tighter text-white font-black mb-4 leading-none">
            Know <span className="text-[#d95f02]">before</span> you go
          </h1>
          <div className="space-y-4 max-w-4xl mx-auto">
            <p className="text-slate-400 text-lg md:text-xl leading-relaxed font-bold tracking-tight">
              Don’t fly blind. International teaching looks like a dream on Instagram, but the contract is where the reality lives. Leopardfish Intel strips away the gloss to show you the cold, hard facts.
            </p>
            <div className="py-2 border-y border-white/5">
              <h2 className="text-xl md:text-3xl font-black italic tracking-tighter text-[#007FFF] uppercase leading-none">
                Don't move for the salary. Move for the surplus.
              </h2>
            </div>
            <p className="text-slate-400 text-lg md:text-xl leading-relaxed font-bold tracking-tight">
              Every international teaching offer hides trade-offs, from medical coverage gaps to cost-of-living nuances that can drain a salary before it even hits your account. We make these invisible risks visible, ensuring your next move is a strategic advancement, not just a change of scenery.
            </p>
          </div>
        </div>
      </section>

      {/* 🧭 ZIG-ZAG PROTOCOLS */}
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
                  className="text-[#d95f02] text-xs font-black tracking-[0.4em] uppercase flex items-center group pt-1 border-b border-transparent hover:border-[#d95f02] transition-all"
                >
                  {step.label} <ArrowRight className="ml-3 size-4 group-hover:translate-x-2 transition-transform" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 📊 THE INTEL ENGINE: ANALYSIS IN ACTION */}
      <section className="py-20 bg-[#0B0E14] border-t border-white/5 relative overflow-hidden">
        {/* Antigravity Ambient Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-[#FF6B00]/5 blur-[120px] pointer-events-none" />

        <div className="container mx-auto px-4 max-w-7xl relative z-10">

          {/* 1. The Header Layer */}
          <div className="text-center mb-16 space-y-4 border-b border-white/5 pb-8">
            <h2 className="text-5xl md:text-7xl font-black text-[#FF6B00] tracking-tighter uppercase leading-none drop-shadow-[0_0_20px_rgba(255,107,0,0.2)]">
              ANALYSIS IN ACTION
            </h2>
            <p className="text-slate-400 text-sm md:text-base font-bold italic tracking-tight max-w-2xl mx-auto">
              Key examples of how we use 22+ intelligence sources to drive your negotiation strategy.
            </p>
          </div>

          {/* 2. The Logic Layer (Two 50% Width Power Cards) */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {/* Card A: Benchmark */}
            <div className="bg-white/[0.02] border border-white/10 p-8 rounded-sm shadow-[0_20px_40px_rgba(0,0,0,0.4)] backdrop-blur-md hover:border-white/20 transition-all group">
              <div className="flex flex-col md:flex-row items-start gap-5">
                <div className="p-4 bg-[#FF6B00]/10 rounded-sm border border-[#FF6B00]/20 group-hover:bg-[#FF6B00]/20 transition-colors shrink-0">
                  <Globe className="size-6 text-[#FF6B00]" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">The 5-Year Benchmark</h3>
                  <p className="text-sm text-slate-400 leading-relaxed font-medium">
                    To ensure a true &apos;apples-to-apples&apos; comparison, all Leopardfish data is benchmarked to a 5-year teacher experience median. We triangulate filings from schools, verified teacher reports, and regional economic data to give you a reliable starting point in any country.
                  </p>
                </div>
              </div>
            </div>

            {/* Card B: Override */}
            <div className="bg-white/[0.02] border border-white/10 p-8 rounded-sm shadow-[0_20px_40px_rgba(0,0,0,0.4)] backdrop-blur-md hover:border-white/20 transition-all group">
              <div className="flex flex-col md:flex-row items-start gap-5">
                <div className="p-4 bg-[#007FFF]/10 rounded-sm border border-[#007FFF]/20 group-hover:bg-[#007FFF]/20 transition-colors shrink-0">
                  <SlidersHorizontal className="size-6 text-[#007FFF]" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Dynamic Command</h3>
                  <p className="text-sm text-slate-400 leading-relaxed font-medium">
                    Our baseline data is just your starting point. While the standard measurements are a helpful guide, you can use the custom boxes to add or remove any financial detail at any time. This allows you to map out your &apos;survival budget&apos; versus your &apos;ideal savings plan&apos; based on what matters most.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 3. The Tactical Grid (8 Small 25% Width Cards) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
            {features.map((f, i) => (
              <div key={i} className="bg-white/[0.02] border border-white/10 p-6 rounded-sm shadow-[0_20px_40px_rgba(0,0,0,0.4)] backdrop-blur-md flex flex-col items-start group hover:border-[#FF6B00]/30 transition-all">
                <div className="flex items-center gap-3 mb-4">
                  <f.icon className={`size-5 ${f.color} group-hover:scale-110 transition-transform`} />
                  <h3 className="text-[12px] font-black text-white uppercase tracking-widest italic leading-tight">
                    {f.title}
                  </h3>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed font-medium">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>

          {/* 4. The Footer Call-to-Action */}
          <div className="border-t border-white/5 pt-12 flex flex-col items-center justify-center text-center space-y-8">
            <p className="text-base italic text-slate-400 font-medium tracking-tight">
              Informed decisions start with Leopardfish Intel—the gold standard for indexed school and financial data.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <TacticalButton href="/find-your-fit" label="Discover" className="w-48 h-14" />
              <TacticalButton href="/financial-forecaster" label="Evaluate a School" className="w-48 h-14" />
              <TacticalButton href="/decide" label="Compare Schools" className="w-48 h-14" />
              <TacticalButton href="/prepare" label="Prepare" className="w-48 h-14" />
            </div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest max-w-4xl leading-relaxed">
              * All data is adjusted for local tax jurisdictions and when known includes benefit quantifiers (Flights, CPD, Insurance) for a total compensation view. Refer to page footer for full disclosure.
            </p>
          </div>

        </div>
      </section>

    </div>
  );
}
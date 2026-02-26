'use client';
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Globe, Search } from 'lucide-react';
import { useLiveStats } from '@/hooks/use-live-stats';

export default function Home() {
  const stats = useLiveStats();

  const steps = [
    {
      title: "DISCOVER",
      step: "STEP 1",
      image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b",
      description: "By aligning your specific expertise and personal profile with our insider data, we identify the 'nook' where you won't just fit the brief—you'll belong to the community.",
      cta: "Discover",
      to: "/discover",
    },
    {
      title: "EVALUATE",
      step: "STEP 2",
      image: "https://images.unsplash.com/photo-1488459711615-de64ef5996f6",
      description: "Our Contract Decoder cuts through the fluff, calculate your actual take-home pay, and map your genuine disposable income. Focus on your real financial position, can you save or will you be treading water.",
      cta: "Evaluate",
      to: "/evaluate",
    },
    {
      title: "DECIDE",
      step: "STEP 3",
      image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb",
      description: "Weighing up multiple offers is a challenge. Our comparison tool breaks down the finer details of your potential contracts—from headline salary and housing allowances and more. We lay out the data, so you can make your final decision with total peace of mind.",
      cta: "Decide",
      to: "/compare",
    },
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans">
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full bg-[#020617]/80 backdrop-blur-md border-b border-white/10 px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search className="text-[#007FFF] h-6 w-6" />
            <span className="text-xl font-bold tracking-tight uppercase">Leopardfish <span className="text-[#007FFF]">Intel</span></span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-semibold uppercase tracking-wider opacity-80">
            <Link href="/discover" className="hover:text-[#007FFF] transition-colors">Discover</Link>
            <Link href="/evaluate" className="hover:text-[#f97316] transition-colors text-[#f97316]">Evaluate</Link>
            <Link href="/compare" className="hover:text-[#007FFF] transition-colors">Decide</Link>
            <Link href="/directory" className="hover:text-[#007FFF] transition-colors">Directory</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative h-screen w-full flex items-center justify-center overflow-hidden">
        <Image 
          src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=2073&auto=format&fit=crop" 
          fill 
          className="object-cover -z-10 brightness-[0.7]" 
          alt="Exotic beach landscape" 
          priority
        />
        <div className="relative z-10 text-center px-4">
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter drop-shadow-2xl uppercase">
            <span className="text-[#f97316]">Leopard</span><span className="text-[#007FFF]">fish Intel</span>
          </h1>
          <p className="mt-6 text-xl md:text-3xl font-medium drop-shadow-md">
            Move with certainty, not just hope.
          </p>
          <Link href="/discover" className="mt-12 inline-block rounded-xl bg-[#f97316] px-12 py-4 text-lg font-bold shadow-2xl hover:scale-105 transition-all">
            Start Your Journey
          </Link>
        </div>
      </section>

      {/* Intelligence & Counters Section */}
      <section className="py-16 bg-slate-900/80 border-y border-slate-800 text-center px-6 backdrop-blur-sm">
        <p className="max-w-4xl mx-auto text-lg md:text-xl font-medium text-[#007FFF] mb-12 italic leading-relaxed">
          "We assist international educators in conducting proper due diligence. By reviewing the real-world impact of your contract and your future living environment, we help you replace uncertainty with evidence-led insight."
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 max-w-5xl mx-auto">
          <StatBox value={stats.schools} label="Schools" />
          <StatBox value={stats.countries} label="Countries" />
          <StatBox value={stats.teachers} label="Teachers Registered" />
          <StatBox value={stats.comparisons} label="Comparisons Made" />
        </div>
      </section>

      {/* Steps Heading */}
      <section className="py-16 text-center">
        <h2 className="text-3xl md:text-4xl font-black uppercase tracking-widest text-slate-500">
          Teach Overseas: Know Before You Go
        </h2>
      </section>

      {/* Zig-Zag Steps Section */}
      <section className="pb-32 px-6">
        <div className="max-w-6xl mx-auto space-y-24">
          {steps.map((step, i) => {
            const imageLeft = i % 2 === 0;
            return (
              <div key={i} className={`flex flex-col gap-12 md:flex-row md:items-center ${!imageLeft ? "md:flex-row-reverse" : ""}`}>
                <div className="md:w-1/2 relative h-[350px] rounded-3xl overflow-hidden shadow-2xl border border-white/10 group">
                  <Image src={step.image} fill className="object-cover group-hover:scale-110 transition-transform duration-700" alt={step.title} />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="text-6xl font-black italic text-white drop-shadow-2xl">{step.step}</span>
                  </div>
                </div>
                <div className="md:w-1/2">
                  <h3 className="text-4xl font-black text-white mb-6 tracking-tighter uppercase">{step.title}</h3>
                  <p className="text-lg leading-relaxed text-slate-400 mb-8">{step.description}</p>
                  <Link href={step.to} className="inline-block rounded-lg bg-[#f97316] px-8 py-3 text-sm font-bold uppercase tracking-widest hover:bg-[#ea580c] transition-all shadow-lg">
                    {step.cta}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#020617] py-20 px-8">
        <div className="max-w-7xl mx-auto grid gap-16 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2">
              <Globe className="h-6 w-6 text-[#007FFF]" />
              <span className="text-lg font-bold">Leopardfish Intel</span>
            </div>
            <p className="mt-6 text-sm leading-relaxed text-slate-500">
              Your international teaching journey, mapped. Find your ideal destination, calculate your real-world savings, and compare school offers side-by-side.
            </p>
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-8">QUICK LINKS</h4>
            <div className="flex flex-col gap-4 text-sm font-medium text-slate-500">
              <Link href="/discover" className="hover:text-[#007FFF]">Discover</Link>
              <Link href="/evaluate" className="hover:text-[#007FFF]">Evaluate</Link>
              <Link href="/compare" className="hover:text-[#007FFF]">Decide</Link>
            </div>
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-8">CONNECT</h4>
            <div className="flex flex-col gap-4 text-sm font-medium text-slate-300">
              <a href="https://linkedin.com" className="hover:text-[#007FFF]">LinkedIn</a>
              <a href="https://facebook.com" className="hover:text-[#007FFF]">Facebook</a>
              <Link href="/contact" className="hover:text-[#007FFF]">Contact</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function StatBox({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <p className="text-5xl font-black text-white tabular-nums">
        {value.toLocaleString()}+
      </p>
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500 mt-2 font-bold">{label}</p>
    </div>
  );
}

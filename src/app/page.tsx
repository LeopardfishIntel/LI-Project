'use client';
import React from 'react';
import Image from 'next/image';
import { useLiveStats } from '@/hooks/use-live-stats';

export default function Home() {
  const stats = useLiveStats();

  return (
    <main className="min-h-screen bg-[#020617] text-white">
      {/* Hero Section */}
      <section className="relative h-[85vh] w-full flex flex-col items-center justify-center text-center px-4 overflow-hidden">
        <Image 
          src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=2073&auto=format&fit=crop" 
          fill 
          className="object-cover -z-10 brightness-[0.8]" 
          alt="Exotic beach landscape" 
          priority
        />
        <div className="z-10">
          <h1 className="text-7xl font-black drop-shadow-2xl tracking-tighter uppercase sm:text-9xl">
            <span className="text-[#f97316]">Leopard</span><span className="text-[#007FFF]">fish Intel</span>
          </h1>
          <p className="text-2xl font-medium mt-6 drop-shadow-md text-white sm:text-4xl">
            Move with certainty, not just hope.
          </p>
          <button className="mt-12 bg-[#f97316] px-16 py-5 rounded-xl text-2xl font-bold shadow-[0_0_50px_rgba(249,115,22,0.4)] hover:scale-105 transition-all active:scale-95">
            Start Your Journey
          </button>
        </div>
      </section>

      {/* Due Diligence Intelligence Row */}
      <section className="py-16 bg-slate-900/80 border-y border-slate-800 text-center px-6 backdrop-blur-sm">
        <p className="max-w-4xl mx-auto text-xl font-medium text-[#007FFF] mb-12 italic leading-relaxed">
          "We assist international educators in conducting proper due diligence. By reviewing the real-world impact of your contract and your future living environment, we help you replace uncertainty with evidence-led insight."
        </p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 max-w-5xl mx-auto">
          <StatBox value={stats.schools} label="International Schools" />
          <StatBox value={stats.countries} label="Countries" />
          <StatBox value={stats.teachers} label="Teachers Registered" />
          <StatBox value={stats.comparisons} label="Comparisons Made" />
        </div>
      </section>

      {/* Roadmap Zig-Zag Section */}
      <section className="py-24 max-w-7xl mx-auto px-6 space-y-32">
        <h2 className="text-center text-4xl font-black uppercase tracking-widest text-slate-500 mb-20">The Path Ahead</h2>
        
        {/* Step 1: Discover */}
        <div className="flex flex-col md:flex-row items-center gap-16">
          <div className="w-full md:w-1/2 relative h-[400px] rounded-3xl overflow-hidden shadow-2xl border border-white/10 group">
            <Image src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b" fill className="object-cover group-hover:scale-110 transition-transform duration-700" alt="Discover" />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="text-6xl font-black italic text-white drop-shadow-2xl">STEP 1</span>
            </div>
          </div>
          <div className="w-full md:w-1/2">
            <h3 className="text-4xl font-black text-[#f97316] mb-6 uppercase">Discover</h3>
            <p className="text-xl text-slate-400 leading-relaxed">
              Take the guesswork out of your next move. Use our specialist intelligence to navigate the complexities of the international circuit. By aligning your profile with our data, we identify the 'nook' where you truly belong.
            </p>
          </div>
        </div>

        {/* Step 2: Evaluate */}
        <div className="flex flex-col md:flex-row-reverse items-center gap-16">
          <div className="w-full md:w-1/2 relative h-[400px] rounded-3xl overflow-hidden shadow-2xl border border-white/10 group">
            <Image src="https://images.unsplash.com/photo-1488459711615-de64ef5996f6" fill className="object-cover group-hover:scale-110 transition-transform duration-700" alt="Evaluate" />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="text-6xl font-black italic text-white drop-shadow-2xl">STEP 2</span>
            </div>
          </div>
          <div className="w-full md:w-1/2">
            <h3 className="text-4xl font-black text-[#007FFF] mb-6 uppercase">Evaluate</h3>
            <p className="text-xl text-slate-400 leading-relaxed">
              Our Contract Decoder hacks through the fluff. We calculate your actual take-home pay and map your genuine disposable income. Focus on your real financial position and see if you’ll thrive or just tread water.
            </p>
          </div>
        </div>
      </section>
    </main>
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

'use client';
import React from 'react';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#020617]">
      {/* 1. TOP MENU */}
      <nav className="fixed top-0 z-50 w-full bg-[#020617]/90 backdrop-blur-md border-b border-white/10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="text-xl font-black tracking-tighter uppercase">
            LEOPARDFISH <span className="text-[#007FFF]">INTEL</span>
          </div>
          <div className="hidden md:flex gap-8 text-xs font-bold uppercase tracking-widest text-slate-400">
            <Link href="/discover" className="hover:text-white transition-colors">Discover</Link>
            <Link href="/evaluate" className="text-[#f97316]">Evaluate</Link>
            <Link href="/compare" className="hover:text-white transition-colors">Decide</Link>
          </div>
        </div>
      </nav>

      {/* 2. HERO */}
      <section className="relative h-screen w-full flex items-center justify-center text-center">
        <img 
          src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e" 
          className="absolute inset-0 w-full h-full object-cover -z-10 brightness-[0.5]"
          alt="Beach"
        />
        <div className="z-10 px-4">
          <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter">
            Leopard<span className="text-[#f97316]">fish</span> Intel
          </h1>
          <p className="mt-4 text-xl md:text-3xl font-medium text-slate-300">Move with certainty, not just hope.</p>
          <Link href="/discover" className="mt-10 inline-block bg-[#f97316] px-10 py-4 rounded-lg font-bold uppercase tracking-widest shadow-2xl hover:scale-105 transition-all">
            Start Your Journey
          </Link>
        </div>
      </section>

      {/* 3. ZIG-ZAG ROADMAP */}
      <section className="py-24 max-w-6xl mx-auto px-6 space-y-24">
        <h2 className="text-center text-3xl font-black uppercase tracking-[0.3em] text-slate-600 mb-20">Know Before You Go</h2>
        
        {/* Step 1 */}
        <div className="flex flex-col md:flex-row items-center gap-12">
          <div className="md:w-1/2 rounded-2xl overflow-hidden shadow-2xl border border-white/10">
            <img src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b" className="w-full h-80 object-cover" />
          </div>
          <div className="md:w-1/2">
            <span className="text-[#f97316] font-bold tracking-widest uppercase text-sm">Step 1</span>
            <h3 className="text-4xl font-black text-white mt-2 mb-4">DISCOVER</h3>
            <p className="text-slate-400 text-lg leading-relaxed">By aligning your profile with our data, we find the 'nook' where you belong.</p>
          </div>
        </div>

        {/* Step 2 */}
        <div className="flex flex-col md:flex-row-reverse items-center gap-12">
          <div className="md:w-1/2 rounded-2xl overflow-hidden shadow-2xl border border-white/10">
            <img src="https://images.unsplash.com/photo-1488459711615-de64ef5996f6" className="w-full h-80 object-cover" />
          </div>
          <div className="md:w-1/2 text-right md:text-left">
            <span className="text-[#007FFF] font-bold tracking-widest uppercase text-sm">Step 2</span>
            <h3 className="text-4xl font-black text-white mt-2 mb-4">EVALUATE</h3>
            <p className="text-slate-400 text-lg leading-relaxed">Our Contract Decoder hacks through the fluff to find your real take-home pay.</p>
          </div>
        </div>
      </section>
    </main>
  );
}

'use client';
import React from 'react';
import { useLiveStats } from '@/hooks/use-live-stats';

export default function Home() {
  const stats = useLiveStats();

  return (
    <main className="min-h-screen bg-[#0f172a] text-white font-sans">
      {/* Hero Section */}
      <section className="relative h-[75vh] w-full flex flex-col items-center justify-center text-center px-4">
        <h1 className="text-7xl font-black drop-shadow-2xl tracking-tighter uppercase">
          <span className="text-[#f97316]">Leopard</span><span className="text-[#007FFF]">fish Intel</span>
        </h1>
        <p className="text-2xl font-medium mt-4 text-slate-300">Move with certainty, not just hope.</p>
        <button className="mt-12 bg-[#f97316] px-14 py-4 rounded-xl text-xl font-bold shadow-[0_0_30px_rgba(249,115,22,0.4)] hover:scale-105 transition-all active:scale-95">
          Start Your Journey
        </button>
      </section>

      {/* Intelligence Row with Live Counters */}
      <section className="py-16 bg-slate-900/60 border-y border-slate-800 text-center px-6">
        <p className="max-w-4xl mx-auto text-lg font-medium text-[#007FFF] mb-12 italic leading-relaxed">
          "We assist international educators in conducting proper due diligence. By reviewing the real-world impact of your contract and your future living environment, we help you replace uncertainty with evidence-led insight."
        </p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 max-w-5xl mx-auto">
          <StatBox value={stats.schools} label="International Schools" />
          <StatBox value={stats.countries} label="Countries" />
          <StatBox value={stats.teachers} label="Teachers Registered" />
          <StatBox value={stats.comparisons} label="Comparisons Made" />
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

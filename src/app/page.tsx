import React from 'react';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0f172a] text-white">
      <section className="relative h-[70vh] w-full flex flex-col items-center justify-center text-center px-4">
        <h1 className="text-7xl font-black drop-shadow-xl">
          <span className="text-[#f97316]">Leopard</span><span className="text-[#007FFF]">fish Intel</span>
        </h1>
        <p className="text-2xl font-medium mt-4 text-white/90">Move with certainty, not just hope.</p>
        <button className="mt-12 bg-[#f97316] px-14 py-4 rounded-xl text-xl font-bold shadow-2xl hover:scale-105 transition-all">
          Start Your Journey
        </button>
      </section>

      <section className="py-12 bg-slate-900/50 border-y border-slate-800 text-center">
        <p className="max-w-4xl mx-auto px-6 text-lg font-medium text-[#007FFF]">
          We assist international educators in conducting proper due diligence. By reviewing the real-world impact of your contract and your future living environment, we help you replace uncertainty with evidence-led insight.
        </p>
      </section>
    </main>
  );
}

import React from 'react';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-white selection:bg-primary/30">
      <div className="relative z-10 flex flex-col items-center justify-center px-4 text-center">
        <h1 className="mb-4 text-6xl font-black tracking-tighter uppercase sm:text-8xl">
          Leopardfish <span className="text-[#007FFF]">Intel</span>
        </h1>
        
        <div className="mb-12 max-w-2xl rounded-2xl border border-slate-800 bg-slate-900/50 p-8 backdrop-blur-xl shadow-2xl">
          <p className="text-xl font-light tracking-wide text-slate-300 sm:text-2xl">
            Due Diligence Row — Intelligence Systems Active
          </p>
        </div>

        <button className="group relative flex items-center justify-center overflow-hidden rounded-full bg-[#007FFF] px-12 py-5 text-xl font-bold text-white transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(0,127,255,0.6)] active:scale-95">
          <span className="relative z-10">Start Your Journey</span>
          <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
        </button>
      </div>
      
      {/* Subtle Background Detail */}
      <div className="fixed inset-0 z-0 opacity-20 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-[#007FFF] blur-[128px]" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-slate-500 blur-[128px]" />
      </div>
    </main>
  );
}

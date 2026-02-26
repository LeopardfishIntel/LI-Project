import React from 'react';

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
      {/* Dynamic Background Glow */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-[#007FFF]/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full bg-slate-800/30 blur-[120px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center px-4 text-center">
        <div className="mb-6 rounded-full border border-[#007FFF]/30 bg-[#007FFF]/10 px-4 py-1 text-xs font-bold uppercase tracking-widest text-[#007FFF]">
          Systems Online
        </div>
        
        <h1 className="mb-6 text-6xl font-black tracking-tighter sm:text-8xl lg:text-9xl">
          LEOPARDFISH <br />
          <span className="bg-gradient-to-b from-white to-slate-500 bg-clip-text text-transparent">INTEL</span>
        </h1>

        <p className="mb-10 max-w-xl text-lg font-light leading-relaxed text-slate-400 sm:text-xl">
          Precision intelligence for high-stakes due diligence. <br />
          Monitoring <span className="text-white font-medium">Due Diligence Row</span> in real-time.
        </p>

        <button className="group relative flex items-center justify-center overflow-hidden rounded-full bg-[#007FFF] px-12 py-5 text-xl font-bold text-white transition-all hover:scale-105 hover:shadow-[0_0_50px_rgba(0,127,255,0.6)] active:scale-95">
          <span className="relative z-10">Start Your Journey</span>
          <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
        </button>
      </div>
    </main>
  );
}

import React from 'react';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0f172a] text-white">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm flex flex-col space-y-8">
        <h1 className="text-6xl font-extrabold tracking-tighter text-white uppercase text-center">
          Leopardfish Intel
        </h1>
        
        <div className="p-8 border border-slate-700 bg-slate-800/50 rounded-2xl backdrop-blur-sm shadow-2xl text-center">
          <p className="text-2xl font-semibold text-slate-200">
            Due Diligence Row — Systems Active
          </p>
        </div>

        <button className="px-12 py-4 bg-[#007FFF] hover:bg-[#0066CC] text-white font-bold text-xl rounded-full transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(0,127,255,0.5)]">
          Azure Blue Button
        </button>
      </div>
    </main>
  );
}

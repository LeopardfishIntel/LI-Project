'use client';
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Binoculars } from 'lucide-react';
import { useLiveStats } from '@/hooks/use-live-stats';

export default function Home() {
  const stats = useLiveStats();

  return (
    <main className="min-h-screen bg-[#020617] text-white">
      {/* 1. MAIN NAVIGATION (TOP MENU) */}
      <nav className="fixed top-0 z-50 w-full bg-[#020617]/80 backdrop-blur-md border-b border-white/10 px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Binoculars className="text-[#007FFF] h-6 w-6" />
            <span className="text-xl font-bold tracking-tight uppercase">Leopardfish <span className="text-[#007FFF]">Intel</span></span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-semibold uppercase tracking-wider opacity-80">
            <Link href="/discover" className="hover:text-[#007FFF] transition-colors">Discover</Link>
            <Link href="/evaluate" className="hover:text-[#007FFF] transition-colors text-[#f97316]">Evaluate</Link>
            <Link href="/compare" className="hover:text-[#007FFF] transition-colors">Decide</Link>
            <Link href="/directory" className="hover:text-[#007FFF] transition-colors">Directory</Link>
          </div>
          <button className="rounded-full bg-white/5 p-2 border border-white/10 hover:bg-white/10 transition-all">
             <div className="h-5 w-5 rounded-full border-2 border-white/50" />
          </button>
        </div>
      </nav>

      {/* 2. HERO SECTION */}
      <section className="relative h-[85vh] w-full flex flex-col items-center justify-center text-center px-4 overflow-hidden pt-20">
        <Image 
          src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=2073&auto=format&fit=crop" 
          fill 
          className="object-cover -z-10 brightness-[0.7]" 
          alt="Exotic beach landscape" 
          priority
        />
        <h1 className="text-7xl font-black drop-shadow-2xl tracking-tighter uppercase sm:text-9xl mb-4">
          <span className="text-[#f97316]">Leopard</span><span className="text-[#007FFF]">fish Intel</span>
        </h1>
        <p className="text-2xl font-medium drop-shadow-md text-white sm:text-4xl mb-12">
          Move with certainty, not just hope.
        </p>
        <Link href="/discover" className="bg-[#f97316] px-16 py-5 rounded-xl text-2xl font-bold shadow-[0_0_50px_rgba(249,115,22,0.4)] hover:scale-105 transition-all active:scale-95">
          Start Your Journey
        </Link>
      </section>

      {/* 3. DUE DILIGENCE & COUNTERS */}
      <section className="py-16 bg-slate-900/80 border-y border-slate-800 text-center px-6">
        <p className="max-w-4xl mx-auto text-xl font-medium text-[#007FFF] mb-12 italic leading-relaxed">
          "We assist international educators in conducting proper due diligence. By reviewing the real-world impact of your contract and your future living environment, we help you replace uncertainty with evidence-led insight."
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 max-w-5xl mx-auto">
          <StatBox value={stats.schools} label="Schools" />
          <StatBox value={stats.countries} label="Countries" />
          <StatBox value={stats.teachers} label="Teachers Registered" />
          <StatBox value={stats.comparisons} label="Comparisons Made" />
        </div>
      </section>

      {/* 4. ROADMAP (ZIG-ZAG STYLE) */}
      <section className="py-24 max-w-7xl mx-auto px-6 space-y-32">
        <h2 className="text-center text-4xl font-black uppercase tracking-widest text-slate-500 mb-20">Teach Overseas: Know Before You Go</h2>
        
        {/* Step 1: Discover */}
        <div className="flex flex-col md:flex-row items-center gap-16">
          <div className="w-full md:w-1/2 relative h-[450px] rounded-3xl overflow-hidden border border-white/10 group shadow-2xl">
            <Image src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b" fill className="object-cover group-hover:scale-110 transition-transform duration-700" alt="Discover" />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="text-7xl font-black italic text-white drop-shadow-2xl opacity-80">STEP 1</span>
            </div>
          </div>
          <div className="w-full md:w-1/2">
            <h3 className="text-5xl font-black text-[#f97316] mb-6 uppercase tracking-tighter">Discover</h3>
            <p className="text-xl text-slate-400 leading-relaxed mb-8">
              Take the guesswork out of your next move. Use our specialist intelligence to navigate the complexities of the international circuit. We identify the 'nook' where you truly belong.
            </p>
            <Link href="/discover" className="text-[#007FFF] font-bold text-lg hover:underline underline-offset-8 decoration-2 italic">Find Your Nook →</Link>
          </div>
        </div>

        {/* Step 2: Evaluate */}
        <div className="flex flex-col md:flex-row-reverse items-center gap-16">
          <div className="w-full md:w-1/2 relative h-[450px] rounded-3xl overflow-hidden border border-white/10 group shadow-2xl">
            <Image src="https://images.unsplash.com/photo-1488459711615-de64ef5996f6" fill className="object-cover group-hover:scale-110 transition-transform duration-700" alt="Evaluate" />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="text-7xl font-black italic text-white drop-shadow-2xl opacity-80">STEP 2</span>
            </div>
          </div>
          <div className="w-full md:w-1/2">
            <h3 className="text-5xl font-black text-[#007FFF] mb-6 uppercase tracking-tighter">Evaluate</h3>
            <p className="text-xl text-slate-400 leading-relaxed mb-8">
              Our Contract Decoder hacks through the fluff. We calculate your actual take-home pay and map your genuine disposable income. See if you will thrive or just tread water.
            </p>
            <Link href="/evaluate" className="text-[#f97316] font-bold text-lg hover:underline underline-offset-8 decoration-2 italic">Decode Your Contract →</Link>
          </div>
        </div>
      </section>

      {/* 5. FOOTER (BOTTOM MENU) */}
      <footer className="bg-[#020617] border-t border-white/10 py-20 px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-16">
          <div>
             <div className="flex items-center gap-2 mb-6">
                <Binoculars className="text-[#007FFF] h-5 w-5" />
                <span className="font-bold tracking-tight">Leopardfish Intel</span>
             </div>
             <p className="text-sm text-slate-500 leading-relaxed">
               Advanced intelligence systems for high-stakes due diligence. Monitoring "Due Diligence Row" in real-time to protect international educators.
             </p>
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-6">Quick Links</h4>
            <div className="flex flex-col gap-4 text-sm font-medium text-slate-300">
              <Link href="/discover" className="hover:text-[#007FFF]">Discover</Link>
              <Link href="/evaluate" className="hover:text-[#007FFF]">Evaluate</Link>
              <Link href="/compare" className="hover:text-[#007FFF]">Decide</Link>
              <Link href="/directory" className="hover:text-[#007FFF]">Directory</Link>
            </div>
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-6">Connect</h4>
            <div className="flex flex-col gap-4 text-sm text-slate-300">
              <a href="https://linkedin.com" className="hover:text-[#007FFF]">LinkedIn</a>
              <a href="https://facebook.com" className="hover:text-[#007FFF]">Facebook</a>
              <Link href="/contact" className="hover:text-[#007FFF]">Contact Support</Link>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-white/5 text-center text-xs text-slate-600">
          © 2026 Leopardfish Intel. Evidence-led insights for the international teaching community.
        </div>
      </footer>
    </main>
  );
}

function StatBox({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <p className="text-5xl font-black text-white">{value.toLocaleString()}+</p>
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500 mt-2 font-bold">{label}</p>
    </div>
  );
}

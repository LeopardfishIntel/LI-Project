'use client';
import React from 'react';
import Link from 'next/link';
import { Globe, Search, ArrowRight } from "lucide-react";

export default function LovableHome() {
  return (
    <div className="min-h-screen bg-[#020617]">
      {/* HEADER */}
      <nav className="fixed top-0 w-full z-50 bg-[#020617]/80 backdrop-blur-md border-b border-white/10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Globe className="text-[#f97316] w-6 h-6" />
            <span className="font-bold text-xl uppercase tracking-tighter">
              Leopardfish <span className="text-[#007FFF]">Intel</span>
            </span>
          </div>
          <div className="hidden md:flex gap-8 text-xs font-bold uppercase tracking-widest text-slate-400">
            <Link href="/discover" className="hover:text-white">Discover</Link>
            <Link href="/evaluate" className="text-[#f97316]">Evaluate</Link>
            <Link href="/compare" className="hover:text-white">Compare</Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative h-screen flex items-center justify-center text-center px-4">
        <img 
          src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e" 
          className="absolute inset-0 w-full h-full object-cover -z-10 brightness-[0.4]"
          alt="Hero"
        />
        <div className="max-w-4xl">
          <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter text-white">
            Move with <span className="text-[#f97316]">certainty</span>
          </h1>
          <p className="mt-6 text-xl text-slate-300">Evidence-led insights for international educators.</p>
          <Link href="/discover" className="mt-10 inline-flex items-center gap-2 bg-[#f97316] px-8 py-4 rounded-full font-bold uppercase tracking-widest hover:scale-105 transition-all">
            Start Journey <ArrowRight w-4 h-4 />
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-20 bg-[#020617] border-t border-white/10 text-center">
        <p className="text-slate-500 text-sm">© 2026 Leopardfish Intel. All rights reserved.</p>
      </footer>
    </div>
  );
}

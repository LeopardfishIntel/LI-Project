'use client';
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Search } from 'lucide-react';
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
    <div className="min-h-screen bg-[#020617] text-white overflow-x-hidden">
      {/* Hero Section with Layering Fix */}
      <section className="relative h-screen w-full flex items-center justify-center">
        {/* The Image - Layer -10 */}
        <Image 
          src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e" 
          fill 
          className="object-cover -z-10 brightness-[0.6]" 
          alt="Exotic beach" 
          priority
        />
        {/* The Text - Layer 10 */}
        <div className="relative z-10 text-center px-4">
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter drop-shadow-2xl uppercase">
            <span className="text-[#f97316]">Leopard</span><span className="text-[#007FFF]">fish Intel</span>
          </h1>
          <p className="mt-6 text-xl md:text-3xl font-medium drop-shadow-md text-white/90">
            Move with certainty, not just hope.
          </p>
          <Link href="/discover" className="mt-12 inline-block rounded-xl bg-[#f97316] px-12 py-4 text-lg font-bold shadow-2xl hover:scale-105 transition-all">
            Start Your Journey
          </Link>
        </div>
      </section>

      {/* Stats Row */}
      <section className="relative z-20 py-16 bg-[#020617]/90 border-y border-white/10 text-center px-6">
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

      {/* Zig-Zag Section with Grid Fix */}
      <section className="py-32 px-6 max-w-7xl mx-auto space-y-32">
        <h2 className="text-center text-3xl md:text-4xl font-black uppercase tracking-widest text-slate-500 mb-20">
          Know Before You Go
        </h2>
        {steps.map((step, i) => (
          <div key={i} className={`flex flex-col gap-12 md:flex-row md:items-center ${i % 2 !== 0 ? "md:flex-row-reverse" : ""}`}>
            <div className="md:w-1/2 relative h-[400px] rounded-3xl overflow-hidden shadow-2xl border border-white/10 group">
              <Image src={step.image} fill className="object-cover group-hover:scale-110 transition-transform duration-700" alt={step.title} />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <span className="text-6xl font-black italic text-white drop-shadow-2xl">{step.step}</span>
              </div>
            </div>
            <div className="md:w-1/2">
              <h3 className="text-4xl font-black text-white mb-6 uppercase tracking-tighter">{step.title}</h3>
              <p className="text-xl leading-relaxed text-slate-400 mb-8">{step.description}</p>
              <Link href={step.to} className="inline-block rounded-lg bg-[#f97316] px-8 py-3 text-sm font-bold uppercase tracking-widest hover:bg-[#ea580c] transition-all">
                {step.cta}
              </Link>
            </div>
          </div>
        ))}
      </section>
    </div>
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

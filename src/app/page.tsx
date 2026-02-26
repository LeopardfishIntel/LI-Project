'use client';
import React from 'react';
import Link from 'next/link';
import { Globe } from "lucide-react";

const steps = [
  {
    title: "DISCOVER",
    step: "STEP 1",
    image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b",
    description:
      "By aligning your specific expertise and personal profile with our insider data, we identify the 'nook' where you won't just fit the brief—you'll belong to the community.",
    cta: "Discover",
    href: "/discover",
  },
  {
    title: "EVALUATE",
    step: "STEP 2",
    image: "https://images.unsplash.com/photo-1488459711615-de64ef5996f6",
    description:
      "Our Contract Decoder cuts through the fluff, calculate your actual take-home pay, and map your genuine disposable income. Focus on your real financial position, can you save or will you be treading water.",
    cta: "Evaluate",
    href: "/evaluate",
  },
  {
    title: "DECIDE",
    step: "STEP 3",
    image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb",
    description:
      "Weighing up multiple offers is a challenge. Our comparison tool breaks down the finer details of your potential contracts—from headline salary and housing allowances and more. We lay out the data, so you can make your final decision with total peace of mind.",
    cta: "Decide",
    href: "/compare",
  },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-[#020617]">
      {/* Hero - full viewport */}
      <section className="relative h-screen w-full flex items-center justify-center">
        <img
          src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e"
          alt="Boat on alpine lake"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 text-center px-4">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter">
            <span className="text-white">Leopard</span>
            <span className="text-[#f97316]">fish</span>
            <span className="text-white"> Intel</span>
          </h1>
          <p className="mt-4 text-lg md:text-xl text-white/80">
            Move with certainty, not just hope.
          </p>
          <Link
            href="/discover"
            className="mt-12 inline-block rounded bg-[#f97316] px-8 py-3 text-sm font-bold text-white hover:bg-[#ea580c] transition-colors shadow-lg"
          >
            Start Your Journey
          </Link>
        </div>
      </section>

      {/* Steps heading */}
      <section className="bg-[#020617] py-16">
        <h2 className="text-center text-2xl md:text-3xl font-bold text-white uppercase tracking-widest">
          Teach Overseas: Know Before You Go
        </h2>
      </section>

      {/* Steps */}
      <section className="bg-[#020617] pb-20">
        <div className="max-w-7xl mx-auto px-6 space-y-24">
          {steps.map((step, i) => {
            const imageLeft = i % 2 === 0;
            return (
              <div
                key={i}
                className={`flex flex-col gap-12 md:flex-row md:items-center ${
                  !imageLeft ? "md:flex-row-reverse" : ""
                }`}
              >
                {/* Image */}
                <div className="md:w-1/2">
                  <div className="relative overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
                    <img
                      src={step.image}
                      alt={step.title}
                      className="w-full h-64 md:h-96 object-cover"
                    />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <span className="text-5xl font-black italic text-white drop-shadow-2xl">
                        {step.step}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Text */}
                <div className="md:w-1/2">
                  <h3 className="text-3xl md:text-4xl font-black text-white tracking-tighter mb-4">
                    {step.title}
                  </h3>
                  <p className="text-lg leading-relaxed text-slate-400 max-w-md mb-8">
                    {step.description}
                  </p>
                  <Link
                    href={step.href}
                    className="inline-block rounded-lg border border-[#f97316] bg-[#f97316] px-8 py-3 text-sm font-bold text-white hover:bg-[#ea580c] transition-colors uppercase tracking-widest"
                  >
                    {step.cta}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#020617] py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid gap-12 md:grid-cols-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded bg-[#f97316]">
                  <Globe className="h-5 w-5 text-white" />
                </div>
                <span className="font-bold text-lg text-white">
                  Leopardfish Intel
                </span>
              </div>
              <p className="mt-4 text-xs leading-relaxed text-slate-500 max-w-xs">
                Your international teaching journey, mapped. Find your ideal destination, calculate
                your real-world savings, and compare school offers side-by-side.
              </p>
            </div>

            <div>
              <h4 className="text-sm font-bold text-white mb-6 uppercase tracking-widest">QUICK LINKS</h4>
              <div className="space-y-3">
                {[
                    {label: "Discover", path: "/discover"}, 
                    {label: "Evaluate", path: "/evaluate"}, 
                    {label: "Decide", path: "/compare"}
                ].map((link) => (
                  <Link
                    key={link.label}
                    href={link.path}
                    className="block text-xs text-slate-500 hover:text-[#007FFF] transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold text-white mb-6 uppercase tracking-widest">CONNECT</h4>
              <div className="space-y-3">
                {["Contact", "Data Admin", "Terms of Service"].map((label) => (
                  <span
                    key={label}
                    className="block text-xs text-slate-500"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;

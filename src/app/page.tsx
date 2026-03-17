import Link from 'next/link';
import { KeyFactsSection } from '@/components/key-facts-section';
import { Button } from '@/components/ui/button';
import { RedFlagRegistry } from '@/components/red-flag-registry';
import { ArrowRight, ShieldCheck, Target, Calculator, GitCompare } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-[#020617]">
      {/* Hero Section */}
      <section className="relative w-full h-[80vh] flex items-center justify-center overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(249,115,22,0.05),transparent_70%)]"></div>
        <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
          <div className="absolute w-[800px] h-[800px] bg-white/5 blur-[120px] rounded-full animate-pulse opacity-30"></div>
        </div>
        <div className="relative z-30 container mx-auto px-4 md:px-6 text-center">
          <div className="max-w-3xl mx-auto space-y-6 flex flex-col items-center">
            <div className="inline-flex items-center gap-2 bg-[#f97316]/10 border border-[#f97316]/30 px-3 py-1 rounded text-[#f97316] text-[10px] font-black uppercase tracking-widest animate-pulse">
              <ShieldCheck className="w-3.5 h-3.5" /> Intelligence Grade Protocol
            </div>
            <h1 className="text-5xl md:text-8xl font-black tracking-tighter leading-none uppercase">
              <span className="text-[#f97316]">LEOPARD</span><span className="text-[#007FFF] italic">FISH INTEL</span>
            </h1>
            <p className="text-xl md:text-3xl text-muted-foreground font-medium max-w-2xl leading-tight">
              Move with certainty, not just hope.
            </p>
            <div className="flex flex-wrap justify-center gap-4 pt-4">
              <Button size="lg" className="h-14 px-10 bg-[#f97316] hover:bg-[#f97316]/90 text-white font-bold rounded-sm shadow-lg shadow-[#f97316]/20" asChild>
                <Link href="/discover">Initialize Journey</Link>
              </Button>
              <Button size="lg" variant="outline" className="h-14 px-10 font-bold border-white/20 hover:bg-white/5 rounded-sm" asChild>
                <Link href="/directory">Browse dossiers</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 border-b border-white/5">
        <div className="container mx-auto px-4 md:px-6">
          <KeyFactsSection />
        </div>
      </section>

      {/* Strategic Steps */}
      <section className="py-24">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="glass p-8 space-y-6 rounded-sm border-white/5 hover:border-[#f97316]/30 transition-all duration-500 group">
                <div className="flex justify-between items-start">
                    <div className="p-3 bg-[#f97316]/10 rounded-sm"><Target className="size-8 text-[#f97316]" /></div>
                    <span className="text-4xl font-black text-white/5 group-hover:text-[#f97316]/20 transition-colors">01</span>
                </div>
                <h3 className="text-2xl stamped-dossier text-white">Discover</h3>
                <p className="text-muted-foreground leading-relaxed text-sm font-medium">The Fit Finder matching engine. We look for the intersection of your profile and local realities, filtering for institutional context.</p>
                <Link href="/discover" className="inline-flex items-center text-[#f97316] font-bold text-xs uppercase tracking-widest group-hover:translate-x-2 transition-transform">
                    Find your nook <ArrowRight className="ml-2 size-4" />
                </Link>
            </div>

            <div className="glass p-8 space-y-6 rounded-sm border-white/5 hover:border-[#f97316]/30 transition-all duration-500 group">
                <div className="flex justify-between items-start">
                    <div className="p-3 bg-[#f97316]/10 rounded-sm"><Calculator className="size-8 text-[#f97316]" /></div>
                    <span className="text-4xl font-black text-white/5 group-hover:text-[#f97316]/20 transition-colors">02</span>
                </div>
                <h3 className="text-2xl stamped-dossier text-white">Evaluate</h3>
                <p className="text-muted-foreground leading-relaxed text-sm font-medium">The Contract Decoder. Calculate your actual take-home pay and map genuine disposable income with bespoke family scaling multipliers.</p>
                <Link href="/financial-forecaster" className="inline-flex items-center text-[#f97316] font-bold text-xs uppercase tracking-widest group-hover:translate-x-2 transition-transform">
                    Decode offer <ArrowRight className="ml-2 size-4" />
                </Link>
            </div>

            <div className="glass p-8 space-y-6 rounded-sm border-white/5 hover:border-[#f97316]/30 transition-all duration-500 group">
                <div className="flex justify-between items-start">
                    <div className="p-3 bg-[#f97316]/10 rounded-sm"><GitCompare className="size-8 text-[#f97316]" /></div>
                    <span className="text-4xl font-black text-white/5 group-hover:text-[#f97316]/20 transition-colors">03</span>
                </div>
                <h3 className="text-2xl stamped-dossier text-white">Decide</h3>
                <p className="text-muted-foreground leading-relaxed text-sm font-medium">The Comparison Matrix. Select school offers to view True Net savings side-by-side. Weigh allowances with absolute mission certainty.</p>
                <Link href="/compare" className="inline-flex items-center text-[#f97316] font-bold text-xs uppercase tracking-widest group-hover:translate-x-2 transition-transform">
                    Final verdict <ArrowRight className="ml-2 size-4" />
                </Link>
            </div>
          </div>
        </div>
      </section>

      <RedFlagRegistry />
    </div>
  );
}
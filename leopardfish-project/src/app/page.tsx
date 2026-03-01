
import Link from 'next/link';
import Image from 'next/image';
import { KeyFactsSection } from '@/components/key-facts-section';
import { Button } from '@/components/ui/button';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { RedFlagRegistry } from '@/components/red-flag-registry';
import { ArrowRight, ShieldCheck, Binoculars, Target, Calculator, GitCompare } from 'lucide-react';
import { FieldIntelligenceTrigger } from '@/components/field-intelligence-trigger';

const getImage = (id: string) => {
  const image = PlaceHolderImages.find(img => img.id === id);
  return {
    imageUrl: image?.imageUrl ?? "https://picsum.photos/seed/intel/1920/1080",
    imageHint: image?.imageHint ?? "tactical campus",
    description: image?.description ?? "Professional intelligence background."
  };
};

export default function Home() {
  const heroImage = getImage('homepage-hero');

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section: Tactical Intel with Searchlight */}
      <section className="relative w-full h-[80vh] flex items-center justify-center overflow-hidden bg-background">
        <Image
          src={heroImage.imageUrl}
          alt={heroImage.description}
          fill
          priority
          className="absolute inset-0 w-full h-full object-cover opacity-20"
          data-ai-hint={heroImage.imageHint}
        />
        
        {/* Animated Searchlight Overlay */}
        <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
          <div className="absolute w-[800px] h-[800px] bg-white/5 blur-[120px] rounded-full animate-scan opacity-30"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/20 to-background"></div>
        </div>
        
        <div className="relative z-30 container mx-auto px-4 md:px-6 text-center">
          <div className="max-w-3xl mx-auto space-y-6 flex flex-col items-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/30 px-3 py-1 rounded text-primary text-[10px] font-black uppercase tracking-widest animate-pulse">
              <ShieldCheck className="w-3.5 h-3.5" /> Intel Grade Perspectives
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter leading-tight normal-case">
              <span className="text-primary">Leopard</span><span className="text-accent">fish Intel</span>
            </h1>
            <p className="text-xl md:text-3xl text-muted-foreground font-medium max-w-2xl leading-tight">
              Move with certainty, not just hope.
            </p>
            <div className="flex flex-wrap justify-center gap-4 pt-4">
              <Button size="lg" className="h-12 px-8 bg-slate-950 hover:bg-slate-900 text-white border border-white/20 font-bold text-sm rounded-sm" asChild>
                <Link href="/discover">Start Journey</Link>
              </Button>
              <Button size="lg" className="h-12 px-8 bg-slate-950 hover:bg-slate-900 text-white border border-white/20 font-bold text-sm rounded-sm" asChild>
                <Link href="/directory">Browse Dossiers</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Counter Section */}
      <section className="py-8 border-b border-white/5 bg-background">
        <div className="container mx-auto px-4 md:px-6">
          <KeyFactsSection />
        </div>
      </section>

      {/* Tactical Tagline Section */}
      <section className="py-6 bg-background border-b border-white/5">
        <div className="container mx-auto px-4 md:px-6 text-center">
            <p className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tighter opacity-90 leading-none">
              Teach Overseas: Know Before You Go
            </p>
        </div>
      </section>

      {/* The Insider Journey Steps - Zig Zag Design */}
      <section className="py-24 bg-background border-b border-white/5">
        <div className="container mx-auto px-4 md:px-6">
          <div className="space-y-32">
            
            {/* Step 01 - Discover */}
            <div className="grid md:grid-cols-2 gap-12 md:gap-24 items-center">
              <div className="relative aspect-[4/3] rounded-sm overflow-hidden border border-white/10 group">
                <Image 
                  src={getImage('discover-step').imageUrl}
                  alt="Discover Step"
                  fill
                  className="object-cover opacity-60 group-hover:scale-105 transition-transform duration-700"
                  data-ai-hint={getImage('discover-step').imageHint}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent"></div>
                <div className="absolute bottom-4 left-4 stamped-dossier text-primary text-4xl opacity-20">01</div>
              </div>
              <div className="space-y-6">
                <div className="p-3 bg-primary/10 rounded-sm w-fit"><Target className="w-8 h-8 text-primary" /></div>
                <h3 className="text-3xl md:text-4xl stamped-dossier text-white">Discover</h3>
                <p className="text-muted-foreground text-lg leading-relaxed">The Fit Finder matching engine. It doesn't just find jobs; it looks for places where your profile fits the local reality and institutional context.</p>
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-white font-bold rounded-sm h-12 px-8 uppercase tracking-widest text-xs" asChild>
                  <Link href="/discover">Find Your Fit <ArrowRight className="ml-2 w-4 h-4" /></Link>
                </Button>
              </div>
            </div>

            {/* Step 02 - Evaluate */}
            <div className="grid md:grid-cols-2 gap-12 md:gap-24 items-center">
              <div className="md:order-last relative aspect-[4/3] rounded-sm overflow-hidden border border-white/10 group">
                <Image 
                  src={getImage('evaluate-step').imageUrl}
                  alt="Evaluate Step"
                  fill
                  className="object-cover opacity-60 group-hover:scale-105 transition-transform duration-700"
                  data-ai-hint={getImage('evaluate-step').imageHint}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent"></div>
                <div className="absolute bottom-4 right-4 stamped-dossier text-primary text-4xl opacity-20">02</div>
              </div>
              <div className="space-y-6 text-center md:text-right flex flex-col md:items-end">
                <div className="p-3 bg-primary/10 rounded-sm w-fit"><Calculator className="w-8 h-8 text-primary" /></div>
                <h3 className="text-3xl md:text-4xl stamped-dossier text-white">Evaluate</h3>
                <p className="text-muted-foreground text-lg leading-relaxed max-w-lg">The Contract Decoder. Calculate your actual take-home pay and map genuine disposable income with bespoke family scaling multipliers.</p>
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-white font-bold rounded-sm h-12 px-8 uppercase tracking-widest text-xs" asChild>
                  <Link href="/financial-forecaster">Decode Offer <ArrowRight className="ml-2 w-4 h-4" /></Link>
                </Button>
              </div>
            </div>

            {/* Step 03 - Decide */}
            <div className="grid md:grid-cols-2 gap-12 md:gap-24 items-center">
              <div className="relative aspect-[4/3] rounded-sm overflow-hidden border border-white/10 group">
                <Image 
                  src={getImage('decide-step').imageUrl}
                  alt="Decide Step"
                  fill
                  className="object-cover opacity-60 group-hover:scale-105 transition-transform duration-700"
                  data-ai-hint={getImage('decide-step').imageHint}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent"></div>
                <div className="absolute bottom-4 left-4 stamped-dossier text-primary text-4xl opacity-20">03</div>
              </div>
              <div className="space-y-6">
                <div className="p-3 bg-primary/10 rounded-sm w-fit"><GitCompare className="w-8 h-8 text-primary" /></div>
                <h3 className="text-3xl md:text-4xl stamped-dossier text-white">Decide</h3>
                <p className="text-muted-foreground text-lg leading-relaxed">The Comparison Matrix. Select up to 3 school offers to view True Net savings side-by-side and move with absolute mission certainty.</p>
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-white font-bold rounded-sm h-12 px-8 uppercase tracking-widest text-xs" asChild>
                  <Link href="/compare">Final Verdict <ArrowRight className="ml-2 w-4 h-4" /></Link>
                </Button>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Field Intel Uplink Section */}
      <section className="py-16 bg-primary/5 border-b border-white/5">
        <div className="container mx-auto px-4 md:px-6">
          <div className="glass p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8 rounded-sm">
            <div className="max-w-2xl space-y-4 text-center md:text-left">
              <h3 className="text-2xl md:text-3xl stamped-dossier text-primary flex items-center justify-center md:justify-start gap-3">
                <Binoculars className="size-8" /> Field Intel Uplink
              </h3>
              <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
                Contribute to the collective safety of the international educator network. Help our analysts identify institutional risks by transmitting on-the-ground reports. All transmissions are strictly <span className="text-white font-bold underline decoration-primary underline-offset-4">anonymous</span>.
              </p>
            </div>
            <div className="shrink-0">
              <FieldIntelligenceTrigger />
            </div>
          </div>
        </div>
      </section>

      {/* Red Flag Registry */}
      <RedFlagRegistry />
    </div>
  );
}

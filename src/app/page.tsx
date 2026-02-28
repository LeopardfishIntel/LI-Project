import Link from 'next/link';
import Image from 'next/image';
import { KeyFactsSection } from '@/components/key-facts-section';
import { Button } from '@/components/ui/button';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { RedFlagRegistry } from '@/components/red-flag-registry';
import { ShieldCheck } from 'lucide-react';

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
          className="absolute inset-0 w-full h-full object-cover brightness-[0.2]"
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
              <ShieldCheck className="w-3.5 h-3.5" /> Intelligence Grade Perspectives
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

      {/* Stats Counter Section - Repositioned directly below Hero */}
      <section className="py-8 border-b border-white/5 bg-background">
        <div className="container mx-auto px-4 md:px-6">
          <KeyFactsSection />
        </div>
      </section>

      {/* Tactical Tagline Section - Sentence case and full width */}
      <section className="py-6 bg-background border-b border-white/5">
        <div className="container mx-auto px-4 md:px-6 text-center">
            <p className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tighter opacity-90 leading-none">
              Teach Overseas: Know Before You Go
            </p>
        </div>
      </section>

      {/* The Insider Journey Steps - Tightened Spacing */}
      <section className="py-16 bg-background border-b border-white/5">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="glass p-8 space-y-6 flex flex-col justify-between group transition-all hover:border-primary/50 rounded-sm">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className="p-3 bg-primary/10 rounded-sm"><ShieldCheck className="w-8 h-8 text-primary" /></div>
                  <span className="text-4xl font-black text-white/5 group-hover:text-primary/20 transition-colors">01</span>
                </div>
                <h3 className="text-xl stamped-dossier">Discover</h3>
                <p className="text-muted-foreground leading-relaxed text-sm">The Nook Finder matching engine. We look for the intersection of your profile and local realities.</p>
              </div>
              <Button variant="link" className="p-0 text-primary group-hover:translate-x-2 transition-transform self-start h-auto font-bold text-xs uppercase tracking-widest" asChild>
                <Link href="/discover">Find Your Nook</Link>
              </Button>
            </div>

            <div className="glass p-8 space-y-6 flex flex-col justify-between group transition-all hover:border-primary/50 rounded-sm">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className="p-3 bg-primary/10 rounded-sm"><ShieldCheck className="w-8 h-8 text-primary" /></div>
                  <span className="text-4xl font-black text-white/5 group-hover:text-primary/20 transition-colors">02</span>
                </div>
                <h3 className="text-xl stamped-dossier">Evaluate</h3>
                <p className="text-muted-foreground leading-relaxed text-sm">The Contract Decoder. Calculate your actual take-home pay and map genuine disposable income.</p>
              </div>
              <Button variant="link" className="p-0 text-primary group-hover:translate-x-2 transition-transform self-start h-auto font-bold text-xs uppercase tracking-widest" asChild>
                <Link href="/financial-forecaster">Decode Offer</Link>
              </Button>
            </div>

            <div className="glass p-8 space-y-6 flex flex-col justify-between group transition-all hover:border-primary/50 rounded-sm">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className="p-3 bg-primary/10 rounded-sm"><ShieldCheck className="w-8 h-8 text-primary" /></div>
                  <span className="text-4xl font-black text-white/5 group-hover:text-primary/20 transition-colors">03</span>
                </div>
                <h3 className="text-xl stamped-dossier">Decide</h3>
                <p className="text-muted-foreground leading-relaxed text-sm">The Comparison Matrix. Select up to 3 school offers to view True Net savings side-by-side.</p>
              </div>
              <Button variant="link" className="p-0 text-primary group-hover:translate-x-2 transition-transform self-start h-auto font-bold text-xs uppercase tracking-widest" asChild>
                <Link href="/compare">Final Verdict</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <RedFlagRegistry />
    </div>
  );
}

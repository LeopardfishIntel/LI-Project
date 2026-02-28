import Link from 'next/link';
import Image from 'next/image';
import { KeyFactsSection } from '@/components/key-facts-section';
import { Button } from '@/components/ui/button';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { RedFlagRegistry } from '@/components/red-flag-registry';
import { Roadmap } from '@/components/roadmap';
import { ArrowRight, ShieldCheck } from 'lucide-react';

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
      <section className="relative w-full h-[80vh] flex items-center overflow-hidden">
        <Image
          src={heroImage.imageUrl}
          alt={heroImage.description}
          fill
          priority
          className="absolute inset-0 w-full h-full object-cover brightness-[0.25]"
          data-ai-hint={heroImage.imageHint}
        />
        
        {/* Animated Searchlight Overlay */}
        <div className="absolute inset-0 pointer-events-none z-10 animate-searchlight opacity-40" 
             style={{ 
               background: 'radial-gradient(circle 400px at center, transparent 0%, rgba(8, 12, 24, 0.95) 100%)', 
               backgroundSize: '200% 200%' 
             }}></div>
        
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/20 to-background z-20"></div>
        
        <div className="relative z-30 container mx-auto px-4 md:px-6 text-center lg:text-left">
          <div className="max-w-2xl space-y-6">
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/30 px-3 py-1 rounded text-primary text-[10px] font-black uppercase tracking-widest animate-pulse">
              <ShieldCheck className="w-3.5 h-3.5" /> Intelligence Grade Perspectives
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter leading-none normal-case">
              <span className="text-primary">Leopard</span><span className="text-white italic">fish Intel</span>
            </h1>
            <p className="text-base md:text-xl text-muted-foreground font-medium max-w-lg leading-tight">
              Move with certainty, not just hope.
            </p>
            <div className="flex flex-wrap justify-center lg:justify-start gap-4 pt-4">
              <Link href="/discover">
                <Button size="lg" className="h-12 px-8 bg-primary hover:bg-primary/90 text-white font-bold text-sm rounded-sm">
                  Initialize Journey <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <Link href="/directory">
                <Button size="lg" variant="outline" className="h-12 px-8 font-bold text-sm rounded-sm border-white/20 hover:bg-white/10">
                  Browse Dossiers
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Tactical Tagline Section - Small, White, Tracked */}
      <section className="py-12 bg-background border-y border-white/5">
        <div className="container mx-auto px-4 md:px-6 text-center">
            <p className="text-[10px] sm:text-xs font-black text-white tracking-[0.4em] uppercase">
              Teach Overseas: Know Before You Go
            </p>
        </div>
      </section>

      {/* The Insider Journey */}
      <Roadmap />

      {/* Stats Counter Section */}
      <section className="py-12 border-t border-white/5">
        <div className="container mx-auto px-4 md:px-6">
          <KeyFactsSection />
        </div>
      </section>

      <RedFlagRegistry />
    </div>
  );
}

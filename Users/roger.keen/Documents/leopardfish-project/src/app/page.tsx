import Link from 'next/link';
import Image from 'next/image';
import { KeyFactsSection } from '@/components/key-facts-section';
import { Button } from '@/components/ui/button';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { RedFlagRegistry } from '@/components/red-flag-registry';
import { ArrowRight, ShieldCheck, Target, Calculator, GitCompare } from 'lucide-react';

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
          className="absolute inset-0 w-full h-full object-cover brightness-[0.3]"
          data-ai-hint={heroImage.imageHint}
        />
        
        {/* Animated Searchlight Overlay */}
        <div className="absolute inset-0 pointer-events-none z-10 animate-searchlight opacity-40" 
             style={{ 
               background: 'radial-gradient(circle 400px at center, transparent 0%, rgba(8, 12, 24, 0.95) 100%)', 
               backgroundSize: '200% 200%' 
             }}></div>
        
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/20 to-background z-20"></div>
        
        <div className="relative z-30 container mx-auto px-4 md:px-6">
          <div className="max-w-2xl space-y-6">
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/30 px-3 py-1 rounded text-primary text-[10px] font-black uppercase tracking-widest animate-pulse">
              <ShieldCheck className="w-4 h-4" /> Intelligence Grade Protocol
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter leading-tight normal-case">
              <span className="text-primary">Leopard</span><span className="text-white italic">fish Intel</span>
            </h1>
            <p className="text-base md:text-xl text-muted-foreground font-medium max-w-lg leading-relaxed">
              Move with certainty, not just hope. We provide <span className="text-white underline decoration-primary/50 underline-offset-4">evidence-led insight</span> for the international education sector.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <Button size="lg" className="h-12 px-8 bg-primary hover:bg-primary/90 text-white font-bold text-sm rounded-sm" asChild>
                <Link href="/discover">Initialize Journey <ArrowRight className="ml-2 w-4 h-4" /></Link>
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-8 font-bold text-sm rounded-sm border-white/20 hover:bg-white/10" asChild>
                <Link href="/directory">Browse Dossiers</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Tactical Tagline Section */}
      <section className="py-8 bg-background border-y border-white/5">
        <div className="container mx-auto px-4 md:px-6 text-center">
            <p className="text-[10px] sm:text-xs font-black text-white tracking-[0.4em] uppercase opacity-80">
              Teach Overseas: Know Before You Go
            </p>
        </div>
      </section>

      {/* The Insider Journey */}
      <section className="py-24 bg-background border-b border-white/5">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid md:grid-cols-3 gap-8">
            <JourneyStep 
              num="01"
              icon={<Target className="w-8 h-8 text-primary" />}
              title="Discover"
              description="The Nook Finder matching engine. We look for the intersection of your profile and local visa/salary realities."
              href="/discover"
              label="Find Your Nook"
            />
            <JourneyStep 
              num="02"
              icon={<Calculator className="w-8 h-8 text-primary" />}
              title="Evaluate"
              description="The Contract Decoder. Calculate your actual take-home pay and map genuine disposable income."
              href="/financial-forecaster"
              label="Decode Offer"
            />
            <JourneyStep 
              num="03"
              icon={<GitCompare className="w-8 h-8 text-primary" />}
              title="Decide"
              description="The Comparison Matrix. Select up to 3 school offers to view True Net savings side-by-side."
              href="/compare"
              label="Final Verdict"
            />
          </div>
        </div>
      </section>

      {/* Stats Counter Section */}
      <section className="py-16">
        <div className="container mx-auto px-4 md:px-6">
          <KeyFactsSection />
        </div>
      </section>

      {/* Red Flag Registry */}
      <RedFlagRegistry />
    </div>
  );
}

function JourneyStep({ num, icon, title, description, href, label }: { num: string, icon: React.ReactNode, title: string, description: string, href: string, label: string }) {
  return (
    <div className="glass p-8 space-y-6 flex flex-col justify-between group transition-all hover:border-primary/50 rounded-sm">
      <div className="space-y-4">
        <div className="flex justify-between items-start">
          <div className="p-3 bg-primary/10 rounded-sm">{icon}</div>
          <span className="text-4xl font-black text-white/5 group-hover:text-primary/20 transition-colors">{num}</span>
        </div>
        <h3 className="text-xl stamped-dossier">{title}</h3>
        <p className="text-muted-foreground leading-relaxed text-sm">{description}</p>
      </div>
      <Button variant="link" className="p-0 text-primary group-hover:translate-x-2 transition-transform self-start h-auto" asChild>
        <Link href={href}>{label} <ArrowRight className="ml-2 w-4 h-4" /></Link>
      </Button>
    </div>
  );
}

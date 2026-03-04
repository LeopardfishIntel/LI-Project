
import Link from 'next/link';
import Image from 'next/image';
import { KeyFactsSection } from '@/components/key-facts-section';
import { Button } from '@/components/ui/button';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { RedFlagRegistry } from '@/components/red-flag-registry';
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
    <div className="flex flex-col min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative w-full h-[75vh] flex items-center justify-center overflow-hidden">
        <Image
          src={heroImage.imageUrl}
          alt={heroImage.description}
          fill
          priority
          className="absolute inset-0 w-full h-full object-cover opacity-60"
          data-ai-hint={heroImage.imageHint}
        />
        <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
          <div className="absolute w-[800px] h-[800px] bg-white/5 blur-[120px] rounded-full animate-scan opacity-30"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/20 to-background"></div>
        </div>
        <div className="relative z-30 container mx-auto px-4 md:px-6 text-center">
          <div className="max-w-4xl mx-auto space-y-6 flex flex-col items-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/30 px-3 py-1 rounded text-primary text-[10px] font-black uppercase tracking-widest animate-pulse">
              <ShieldCheck className="w-3.5 h-3.5" /> Intelligence Grade Insights
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tighter leading-tight">
              <span className="text-primary">Leopardfish</span> <span className="text-white">Intel</span>
            </h1>
            <p className="text-xl md:text-2xl text-white font-bold max-w-2xl leading-tight">
              Move with certainty, not just hope.
            </p>
            <p className="text-base md:text-lg text-muted-foreground font-medium max-w-2xl leading-relaxed">
              Safeguard your career with real-world field intelligence, side-by-side offer comparisons, and verified school data.
            </p>
            <div className="flex flex-wrap justify-center gap-4 pt-4">
              <Button size="lg" className="h-12 px-10 bg-primary hover:bg-primary/90 text-white font-bold rounded-sm shadow-lg shadow-primary/20 border-0" asChild>
                <Link href="/discover">Discover</Link>
              </Button>
              <Button size="lg" className="h-12 px-10 bg-primary hover:bg-primary/90 text-white font-bold rounded-sm shadow-lg shadow-primary/20 border-0" asChild>
                <Link href="/financial-forecaster">Evaluate</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Counter Section: Positioned immediately underneath Hero */}
      <section className="py-8 border-b border-white/5 bg-background">
        <div className="container mx-auto px-4 md:px-6">
          <KeyFactsSection />
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 border-b border-white/5 bg-background">
        <div className="container mx-auto px-4 md:px-6 max-w-4xl text-center space-y-8">
          <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">
            Know before you go
          </h2>
          <div className="space-y-8 text-lg text-muted-foreground font-medium leading-relaxed text-left">
            <p className="text-white/90 font-bold">
              In an industry where the full story is often hidden, our mission is to give you an independent advantage. We bridge the information gap by creating a joined-up view of international experiences, drawing from a range of sources including field-reported facts, economic trends, and wider research.
            </p>
            <p>
              We don’t just collect information; we make sense of it. Our focus is on hard data rather than gossip or opinion. By combining verified figures with cost-of-living indices and regional history, we turn scattered details into a clear, honest picture of what you can actually expect.
            </p>
            <p className="italic opacity-60">
              Please note: Our insights are only as sharp as the latest reports. We reach out to schools to verify data and invite institutions to <Link href="mailto:roger@leopardfishintel.com" className="text-primary hover:text-white underline transition-colors">contact us</Link> directly to ensure their details remain accurate.
            </p>
          </div>
        </div>
      </section>

      {/* Journey Keywords Section */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Link href="/discover" className="group space-y-4">
              <h3 className="text-2xl font-black stamped-dossier group-hover:text-primary transition-colors">Discover</h3>
              <p className="text-sm text-muted-foreground font-medium leading-relaxed">The fit finder matching engine. Filter for institutional context and visa feasibility.</p>
            </Link>
            <Link href="/financial-forecaster" className="group space-y-4">
              <h3 className="text-2xl font-black stamped-dossier group-hover:text-primary transition-colors">Evaluate</h3>
              <p className="text-sm text-muted-foreground font-medium leading-relaxed">The contract decoder. Calculate actual take-home pay with scaling multipliers.</p>
            </Link>
            <Link href="/compare" className="group space-y-4">
              <h3 className="text-2xl font-black stamped-dossier group-hover:text-primary transition-colors">Decide</h3>
              <p className="text-sm text-muted-foreground font-medium leading-relaxed">The comparison matrix. View True Net savings side-by-side with absolute certainty.</p>
            </Link>
            <Link href="/prepare" className="group space-y-4">
              <h3 className="text-2xl font-black stamped-dossier group-hover:text-primary transition-colors">Prepare</h3>
              <p className="text-sm text-muted-foreground font-medium leading-relaxed">The strategic checksheet. Finalise your due diligence before you depart.</p>
            </Link>
          </div>
        </div>
      </section>

      {/* Consolidated Red Flag Registry Tease */}
      <RedFlagRegistry />
    </div>
  );
}

import Link from 'next/link';
import Image from 'next/image';
import { KeyFactsSection } from '@/components/key-facts-section';
import { Button } from '@/components/ui/button';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { FeatureHighlights } from '@/components/feature-highlights';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

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

  const steps = [
    {
      id: '01',
      title: 'Discover',
      desc: "The fit finder matching engine. We look for the intersection of your profile and local realities, filtering for institutional context and visa feasibility.",
      link: '/discover',
      imageId: 'discover-step',
      label: 'Find your fit'
    },
    {
      id: '02',
      title: 'Evaluate',
      desc: "The contract decoder. Calculate your actual take-home pay and map genuine disposable income with bespoke family scaling multipliers and cost buffers.",
      link: '/financial-forecaster',
      imageId: 'evaluate-step',
      label: 'Decode offer'
    },
    {
      id: '03',
      title: 'Decide',
      icon: <ArrowRight className="w-8 h-8 text-primary" />,
      desc: "The comparison matrix. Select up to 3 school offers to view True Net savings side-by-side. Weigh allowances and benefits with absolute mission certainty.",
      link: '/compare',
      imageId: 'decide-step',
      label: 'Final verdict'
    },
    {
      id: '04',
      title: 'Prepare',
      desc: "The strategic checksheet. Finalise your due diligence before you depart. Verify housing, medical co-pays, and local exit protocols with field-grade precision.",
      link: '/prepare',
      imageId: 'prepare-step',
      label: 'Get ready'
    }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Intelligence Grade Hero */}
      <section className="relative w-full h-[85vh] min-h-[600px] flex flex-col justify-between overflow-hidden">
        <Image
          src={heroImage.imageUrl}
          alt={heroImage.description}
          fill
          priority
          style={{ objectFit: 'cover' }}
          className="absolute inset-0 w-full h-full opacity-70"
          data-ai-hint={heroImage.imageHint}
        />
        
        {/* Animated Scan Lines */}
        <div className="absolute inset-0 z-10 pointer-events-none">
          <div className="absolute w-[800px] h-[800px] bg-white/5 blur-[120px] rounded-full animate-scan opacity-20"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-background"></div>
        </div>

        {/* Centered Content Overlay */}
        <div className="relative z-20 flex-grow flex items-center justify-center pt-16">
          <div className="container mx-auto px-4 md:px-6 text-center">
            <div className="max-w-4xl mx-auto space-y-8 flex flex-col items-center">
              <div className="inline-flex items-center gap-3 bg-primary/10 border border-primary/30 px-6 py-2 rounded text-primary text-xs md:text-lg font-black uppercase tracking-widest animate-pulse shadow-[0_0_25px_rgba(249,115,22,0.2)]">
                <ShieldCheck className="size-5 md:size-7" /> Actionable International School Intelligence
              </div>
              
              <h1 className="text-4xl md:text-7xl font-black tracking-tighter leading-tight">
                <span className="text-primary">Leopard</span><span className="text-accent">fish Intel</span>
              </h1>
              
              <div className="space-y-4">
                <p className="text-xl md:text-3xl text-white font-bold tracking-tight [text-shadow:0_2px_10px_rgba(0,0,0,0.5)]">
                  Move with certainty, not just hope.
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-4 pt-4">
                <Button size="lg" className="h-12 md:h-14 px-10 bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest rounded-sm border-0" asChild>
                  <Link href="/discover">Discover</Link>
                </Button>
                <Button size="lg" className="h-12 md:h-14 px-10 bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest rounded-sm border-0" asChild>
                  <Link href="/financial-forecaster">Evaluate</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Counter - Integrated into Hero Bottom */}
        <div className="relative z-30 container mx-auto px-4 md:px-6 pb-8">
          <KeyFactsSection />
        </div>
      </section>

      {/* Tagline Section */}
      <section className="py-12 border-b border-white/5 bg-background">
        <div className="container mx-auto px-4 md:px-6 text-center">
            <p className="text-[10px] sm:text-xs font-black text-white tracking-[0.4em] uppercase">
              Teach Overseas: Know Before You Go
            </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-12 md:py-20 border-b border-white/5 bg-background">
        <div className="container mx-auto px-4 md:px-6 max-w-4xl text-center space-y-6">
          <h2 className="text-2xl md:text-4xl font-black tracking-tighter text-white">
            Know before you go
          </h2>
          <div className="space-y-6 text-sm md:text-base text-muted-foreground font-medium leading-relaxed">
            <p>
              In an industry where the full story is often hidden, our mission is to give you an independent advantage. We bridge the information gap by creating a joined-up view of international experiences, drawing from a range of sources including field-reported facts, economic trends, and wider research.
            </p>
            <p>
              We don’t just collect information; we make sense of it. Our focus is on hard data rather than gossip or opinion. By combining verified figures with cost-of-living indices and regional history, we turn scattered details into a clear, honest picture of what you can actually expect.
            </p>
          </div>
        </div>
      </section>

      {/* Zig-Zag Insider Journey */}
      <section className="py-12 md:py-20 bg-background">
        <div className="container mx-auto px-4 md:px-6">
          <div className="space-y-16 md:space-y-24">
            {steps.map((step, index) => (
              <div key={step.id} className="grid md:grid-cols-2 gap-8 lg:gap-24 items-center">
                <div className={cn(
                  "relative aspect-video rounded-sm overflow-hidden border border-white/10 group shadow-2xl",
                  index % 2 === 1 && "md:order-last"
                )}>
                  <Image 
                    src={getImage(step.imageId).imageUrl}
                    alt={step.title}
                    fill
                    style={{ objectFit: 'cover' }}
                    className="opacity-50 group-hover:scale-105 transition-transform duration-700"
                    data-ai-hint={getImage(step.imageId).imageHint}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent"></div>
                  <div className={cn(
                    "absolute bottom-4 stamped-dossier text-primary text-6xl opacity-10 font-black",
                    index % 2 === 1 ? "right-4" : "left-4"
                  )}>{step.id}</div>
                </div>
                <div className={cn(
                  "space-y-6 flex flex-col",
                  index % 2 === 1 ? "md:items-end md:text-right" : "md:items-start"
                )}>
                  <h3 className="text-2xl md:text-4xl stamped-dossier text-white tracking-tighter leading-none">{step.title}</h3>
                  <p className="text-muted-foreground text-sm md:text-base leading-relaxed max-w-lg font-medium">{step.desc}</p>
                  <Button size="lg" className="bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-[10px] h-10 px-8 rounded-sm border-0 shadow-lg shadow-primary/10" asChild>
                    <Link href={step.link}>{step.label} <ArrowRight className="ml-2 w-3.5 h-3.5" /></Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <FeatureHighlights />
    </div>
  );
}

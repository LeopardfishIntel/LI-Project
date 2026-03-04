import Link from 'next/link';
import Image from 'next/image';
import { KeyFactsSection } from '@/components/key-facts-section';
import { Button } from '@/components/ui/button';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { RedFlagRegistry } from '@/components/red-flag-registry';
import { ArrowRight, ShieldCheck, Target, Calculator, GitCompare, PackageCheck } from 'lucide-react';
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
      icon: <Target className="w-8 h-8 text-primary" />,
      desc: "The Fit Finder matching engine. We look for the intersection of your profile and local realities, filtering for institutional context and visa feasibility.",
      link: '/discover',
      imageId: 'discover-step',
      label: 'Find your fit'
    },
    {
      id: '02',
      title: 'Evaluate',
      icon: <Calculator className="w-8 h-8 text-primary" />,
      desc: "The Contract Decoder. Calculate your actual take-home pay and map genuine disposable income with bespoke family scaling multipliers and cost buffers.",
      link: '/financial-forecaster',
      imageId: 'evaluate-step',
      label: 'Decode offer'
    },
    {
      id: '03',
      title: 'Decide',
      icon: <GitCompare className="w-8 h-8 text-primary" />,
      desc: "The Comparison Matrix. Select up to 3 school offers to view True Net savings side-by-side. Weigh allowances and benefits with absolute mission certainty.",
      link: '/compare',
      imageId: 'decide-step',
      label: 'Final verdict'
    },
    {
      id: '04',
      title: 'Prepare',
      icon: <PackageCheck className="w-8 h-8 text-primary" />,
      desc: "The Strategic Checksheet. Finalise your due diligence. From hidden costs to professional boundaries, ensure you are operational before you depart.",
      link: '/prepare',
      imageId: 'prepare-step',
      label: 'Get prepared'
    },
  ];

  const heroButtonClass = "h-12 px-10 bg-primary/20 hover:bg-primary/30 text-white font-bold rounded-sm border border-primary/30 shadow-lg shadow-primary/10 transition-all";

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative w-full h-[75vh] flex items-center justify-center overflow-hidden">
        <Image
          src={heroImage.imageUrl}
          alt={heroImage.description}
          fill
          priority
          className="absolute inset-0 w-full h-full object-cover opacity-20"
          data-ai-hint={heroImage.imageHint}
        />
        <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
          <div className="absolute w-[800px] h-[800px] bg-white/5 blur-[120px] rounded-full animate-scan opacity-30"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/20 to-background"></div>
        </div>
        <div className="relative z-30 container mx-auto px-4 md:px-6 text-center">
          <div className="max-w-4xl mx-auto space-y-8 flex flex-col items-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/30 px-4 py-1.5 rounded text-primary text-[10px] font-black uppercase tracking-widest animate-pulse">
              <ShieldCheck className="w-3.5 h-3.5" /> Intelligence Grade Protocol
            </div>
            
            <h1 className="text-5xl md:text-8xl font-black tracking-tighter leading-tight">
              <span className="text-primary">Leopard</span><span className="text-accent italic">fish Intel</span>
            </h1>
            
            <div className="space-y-4">
              <p className="text-2xl md:text-4xl text-white font-bold max-w-3xl mx-auto leading-tight">
                Move with certainty, not just hope.
              </p>
              <p className="text-base md:text-xl text-muted-foreground font-medium max-w-2xl mx-auto leading-relaxed">
                Safeguard your career with real-world field intelligence, side-by-side offer comparisons, and verified school data.
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-4 pt-4">
              <Button size="lg" className={heroButtonClass} asChild>
                <Link href="/discover">Discover</Link>
              </Button>
              <Button size="lg" className={heroButtonClass} asChild>
                <Link href="/financial-forecaster">Evaluate</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Signature Tagline Row - Compressed Gaps */}
      <section className="py-4 bg-background border-y border-white/5">
        <div className="container mx-auto px-4 md:px-6 text-center">
            <p className="text-3xl md:text-5xl lg:text-6xl text-white font-bold tracking-tight">
              Teach overseas - Know before you go
            </p>
        </div>
      </section>

      {/* Unified Mission Section */}
      <section className="py-12 border-b border-white/5 bg-background">
        <div className="container mx-auto px-4 md:px-6 max-w-4xl text-center">
          <div className="space-y-8 text-base md:text-lg text-muted-foreground font-medium leading-relaxed text-center">
            <p className="text-white/90 font-bold">
              In an industry where the full story is often hidden, our mission is to give you an independent advantage. We bridge the information gap by creating a joined-up view of international experiences, drawing from a range of sources including field-reported facts, economic trends, and wider research.
            </p>
            <p>
              We don’t just collect information; we make sense of it. Our focus is on hard data rather than gossip or opinion. By combining verified figures with cost-of-living indices and regional history, we turn scattered details into a clear, honest picture of what you can actually expect.
            </p>
            <p className="text-sm border-t border-white/5 pt-8 italic opacity-60">
              Please note: Our insights are only as sharp as the latest reports. We reach out to schools to verify data and invite institutions to <Link href="mailto:roger@leopardfishintel.com" className="text-primary hover:text-white underline transition-colors">contact us</Link> directly to ensure their details remain accurate.
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-8 border-b border-white/5 bg-background">
        <div className="container mx-auto px-4 md:px-6">
          <KeyFactsSection />
        </div>
      </section>

      {/* Zig-Zag Insider Journey */}
      <section className="py-12 bg-background">
        <div className="container mx-auto px-4 md:px-6">
          <div className="space-y-16">
            {steps.map((step, index) => (
              <div key={step.id} className="grid md:grid-cols-2 gap-8 md:gap-16 items-center">
                <div className={cn(
                  "relative aspect-video rounded-sm overflow-hidden border border-white/10 group shadow-2xl",
                  index % 2 === 1 && "md:order-last"
                )}>
                  <Image 
                    src={getImage(step.imageId).imageUrl}
                    alt={step.title}
                    fill
                    className="object-cover opacity-40 group-hover:scale-105 transition-transform duration-700"
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
                  <Link href={step.link} className="group inline-flex items-center text-primary hover:text-white transition-colors">
                    <h3 className="text-3xl md:text-5xl stamped-dossier tracking-tighter mr-3">{step.title}</h3>
                    <ArrowRight className="size-6 md:size-8 group-hover:translate-x-2 transition-transform" />
                  </Link>
                  <p className="text-muted-foreground text-lg leading-relaxed max-w-lg font-medium">{step.desc}</p>
                  <Link href={step.link} className="text-xs font-black uppercase tracking-widest text-primary/60 hover:text-primary transition-colors">
                    {step.label}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <RedFlagRegistry />
    </div>
  );
}
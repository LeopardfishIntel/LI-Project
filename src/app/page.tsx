
import Link from 'next/link';
import Image from 'next/image';
import { KeyFactsSection } from '@/components/key-facts-section';
import { Button } from '@/components/ui/button';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { RedFlagRegistry } from '@/components/red-flag-registry';
import { ArrowRight } from 'lucide-react';
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
      desc: "The comparison matrix. Select up to 3 school offers to view true net savings side-by-side. Weigh allowances and benefits with absolute mission certainty.",
      link: '/compare',
      imageId: 'decide-step',
      label: 'Final verdict'
    },
    {
      id: '04',
      title: 'Prepare',
      desc: "The strategic checksheet. Finalise your due diligence. From hidden costs to professional boundaries, ensure you are operational before you depart.",
      link: '/prepare',
      imageId: 'prepare-step',
      label: 'Final audit'
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative w-full h-[60vh] flex items-center justify-center overflow-hidden">
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
          <div className="max-w-3xl mx-auto space-y-6 flex flex-col items-center">
            <h1 className="text-4xl md:text-7xl font-extrabold tracking-tighter leading-tight [text-shadow:0_4px_12px_rgba(0,0,0,0.8)] normal-case">
              <span className="text-primary">Leopard</span><span className="text-accent italic">fish Intel</span>
            </h1>
            <p className="text-xl md:text-3xl text-white font-medium max-w-2xl leading-tight [text-shadow:0_2px_8px_rgba(0,0,0,0.9)]">
              Move with certainty, not just hope.
            </p>
            <div className="flex flex-wrap justify-center gap-4 pt-4">
              <Button size="lg" className="h-14 px-10 bg-primary/20 hover:bg-primary/30 text-white font-bold rounded-sm border border-primary/30 shadow-lg" asChild>
                <Link href="/discover">Discover</Link>
              </Button>
              <Button size="lg" className="h-14 px-10 bg-primary/20 hover:bg-primary/30 text-white font-bold rounded-sm border border-primary/30 shadow-lg" asChild>
                <Link href="/financial-forecaster">Evaluate</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 border-b border-white/5 bg-background">
        <div className="container mx-auto px-4 md:px-6">
          <KeyFactsSection />
        </div>
      </section>

      {/* Integrity Row */}
      <section className="py-24 border-b border-white/5 bg-background/50">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-4xl mx-auto space-y-8">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white normal-case leading-tight">
              <span className="text-accent">Leopardfish Intel:</span> A Clearer Picture: Built on Integrity
            </h2>
            <div className="space-y-6 text-lg md:text-xl text-muted-foreground leading-relaxed font-medium">
              <p>
                In an industry where the full story is often hidden, Leopardfish Intel gives you an independent advantage. We bridge the information gap by creating a joined-up view of international schools, drawing from a variety of sources—including teacher reports, local economic trends, and official school records.
              </p>
              <p>
                We don’t just collect information; we make sense of it. By combining real-world accounts with wider research and school history, we turn scattered details into a clear, honest picture of what you can actually expect. Our commitment is to support the teaching community—ensuring your next career move is based on a complete global perspective, not just a recruitment brochure.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Zig-Zag Insider Journey */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 md:px-6">
          <div className="space-y-32">
            {steps.map((step, index) => (
              <div key={step.id} className="grid md:grid-cols-2 gap-12 md:gap-24 items-center">
                <div className={cn(
                  "relative aspect-[4/3] rounded-sm overflow-hidden border border-white/10 group shadow-2xl",
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
                  <h3 className="text-3xl md:text-5xl stamped-dossier text-white tracking-tighter">{step.title}</h3>
                  <p className="text-muted-foreground text-lg leading-relaxed max-w-lg font-medium">{step.desc}</p>
                  <Button size="lg" className="bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-xs h-12 px-8 rounded-sm" asChild>
                    <Link href={step.link}>{step.label} <ArrowRight className="ml-2 w-4 h-4" /></Link>
                  </Button>
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

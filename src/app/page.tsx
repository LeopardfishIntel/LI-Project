import Link from 'next/link';
import Image from 'next/image';
import { KeyFactsSection } from '@/components/key-facts-section';
import { Button } from '@/components/ui/button';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { RedFlagRegistry } from '@/components/red-flag-registry';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

const getImage = (id: string) => {
  const image = PlaceHolderImages?.find(img => img.id === id);
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
      desc: "The readiness protocol. Forensic guidance on visa medicals, document legalisation, and mapping the tactical reserve required for a successful transition.",
      link: '/prepare',
      imageId: 'prepare-step',
      label: 'Get ready'
    }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#020617]">
      {/* Hero Section */}
      <section className="relative w-full min-h-screen flex items-center justify-center overflow-hidden py-20">
        <Image
          src={heroImage.imageUrl}
          alt={heroImage.description}
          fill
          priority
          className="absolute inset-0 w-full h-full object-cover opacity-60"
          data-ai-hint={heroImage.imageHint}
        />
        <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
          <div className="absolute w-[800px] h-[800px] bg-white/5 blur-[120px] rounded-full animate-pulse opacity-30"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-[#020617]/20 via-[#020617]/40 to-[#020617]"></div>
        </div>
        
        <div className="relative z-30 container mx-auto px-4 md:px-6 text-center">
          <div className="max-w-4xl mx-auto flex flex-col items-center">
            <div className="space-y-6 flex flex-col items-center">
              <div className="inline-flex items-center gap-2 bg-[#f97316]/10 border border-[#f97316]/30 px-3 py-1 rounded text-[#f97316] text-xs font-bold tracking-widest animate-pulse uppercase">
                <ShieldCheck className="w-3.5 h-3.5" /> Actionable Intelligence
              </div>
              <h1 className="text-4xl md:text-7xl font-bold tracking-tighter leading-tight text-white">
                <span className="text-[#f97316]">Leopardfish</span> <span className="text-[#007FFF]">Intel</span>
              </h1>
              <p className="text-xl md:text-3xl text-white font-medium max-w-2xl leading-tight">
                Move with certainty, not just hope.
              </p>
              <div className="flex flex-wrap justify-center gap-4 pt-4">
                <Button size="lg" className="h-14 px-12 bg-[#f97316]/20 hover:bg-[#f97316]/30 text-white font-bold rounded-sm border border-[#f97316]/30 shadow-lg transition-all" asChild>
                  <Link href="/discover">Discover</Link>
                </Button>
                <Button size="lg" className="h-14 px-12 bg-[#f97316]/20 hover:bg-[#f97316]/30 text-white font-bold rounded-sm border border-[#f97316]/30 shadow-lg transition-all" asChild>
                  <Link href="/financial-forecaster">Evaluate</Link>
                </Button>
              </div>
            </div>

            <div className="mt-12 w-full max-w-4xl">
              <KeyFactsSection />
            </div>
          </div>
        </div>
      </section>

      {/* Mission Bridge */}
      <section className="py-20 bg-[#020617] border-b border-white/5">
        <div className="container mx-auto px-4 md:px-6 text-center">
          <div className="max-w-3xl mx-auto space-y-6">
            <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">Know before you go</h2>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed font-medium">
              Don’t fly blind. International teaching looks like a dream on Instagram, but the contract is where the reality lives. Leopardfish Intel strips away the gloss, mapping the true financial and institutional signature of your next move. No recruitment spin. Just field-grade data for educators who move with intent.
            </p>
          </div>
        </div>
      </section>

      {/* Zig-Zag Insider Journey */}
      <section className="py-24 bg-[#020617]">
        <div className="container mx-auto px-4 md:px-6">
          <div className="space-y-32">
            {steps?.map((step, index) => (
              <div key={step.id} className="grid md:grid-cols-2 gap-12 md:gap-24 items-center">
                <div className={cn(
                  "relative aspect-[4/3] rounded-sm overflow-hidden border border-white/10 group shadow-2xl",
                  index % 2 === 1 && "md:order-last"
                )}>
                  <Image 
                    src={getImage(step.imageId).imageUrl}
                    alt={step.title}
                    fill
                    className="object-cover opacity-80 group-hover:scale-105 transition-transform duration-700"
                    data-ai-hint={getImage(step.imageId).imageHint}
                    priority={index === 0}
                    loading={index === 0 ? undefined : "lazy"}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-transparent"></div>
                </div>
                <div className={cn(
                  "space-y-6 flex flex-col",
                  index % 2 === 1 ? "md:items-end md:text-right" : "md:items-start"
                )}>
                  <h3 className="text-3xl md:text-5xl text-white font-bold tracking-tighter leading-none">{step.title}</h3>
                  <p className="text-muted-foreground text-lg leading-relaxed max-w-lg font-medium">{step.desc}</p>
                  <Button size="lg" className="bg-[#f97316] hover:bg-[#f97316]/90 text-white font-bold text-sm h-12 px-8 rounded-sm" asChild>
                    <Link href={step.link}>{step.label} <ArrowRight className="ml-2 w-4 h-4" /></Link>
                  </Button>
                </div>
              </div>
            )) ?? []}
          </div>
        </div>
      </section>

      <RedFlagRegistry />
    </div>
  );
}

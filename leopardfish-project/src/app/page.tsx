
import Link from 'next/link';
import Image from 'next/image';
import { KeyFactsSection } from '@/components/key-facts-section';
import { Button } from '@/components/ui/button';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { RedFlagRegistry } from '@/components/red-flag-registry';
import { ArrowRight, ShieldCheck, Target, Calculator, GitCompare } from 'lucide-react';
import { FieldIntelligenceTrigger } from '@/components/field-intelligence-trigger';
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
      label: 'Find Your Fit'
    },
    {
      id: '02',
      title: 'Evaluate',
      icon: <Calculator className="w-8 h-8 text-primary" />,
      desc: "The Contract Decoder. Calculate your actual take-home pay and map genuine disposable income with bespoke family scaling multipliers and cost buffers.",
      link: '/financial-forecaster',
      imageId: 'evaluate-step',
      label: 'Decode Offer'
    },
    {
      id: '03',
      title: 'Decide',
      icon: <GitCompare className="w-8 h-8 text-primary" />,
      desc: "The Comparison Matrix. Select up to 3 school offers to view True Net savings side-by-side. Weigh allowances and benefits with absolute mission certainty.",
      link: '/compare',
      imageId: 'decide-step',
      label: 'Final Verdict'
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Hero Section: Tactical Intel with Searchlight */}
      <section className="relative w-full h-[80vh] flex items-center justify-center overflow-hidden">
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
          <div className="max-w-3xl mx-auto space-y-6 flex flex-col items-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/30 px-3 py-1 rounded text-primary text-[10px] font-black uppercase tracking-widest animate-pulse">
              <ShieldCheck className="w-3.5 h-3.5" /> Intelligence Grade Protocol
            </div>
            <h1 className="text-4xl md:text-7xl font-extrabold tracking-tighter leading-tight">
              <span className="text-primary">LEOPARD</span><span className="text-accent italic">FISH INTEL</span>
            </h1>
            <p className="text-xl md:text-3xl text-muted-foreground font-medium max-w-2xl leading-tight">
              Move with certainty, not just hope.
            </p>
            <div className="flex flex-wrap justify-center gap-4 pt-4">
              <Button size="lg" className="h-14 px-10 bg-primary hover:bg-primary/90 text-white font-bold rounded-sm shadow-lg shadow-primary/20" asChild>
                <Link href="/discover">Initialize Journey</Link>
              </Button>
              <Button size="lg" variant="outline" className="h-14 px-10 font-bold border-white/20 hover:bg-white/5 rounded-sm" asChild>
                <Link href="/directory">Browse dossiers</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Counter Section */}
      <section className="py-12 border-b border-white/5 bg-background">
        <div className="container mx-auto px-4 md:px-6">
          <KeyFactsSection />
        </div>
      </section>

      {/* Zig-Zag Insider Journey */}
      <section className="py-24">
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
                    "absolute bottom-4 stamped-dossier text-primary text-6xl opacity-10",
                    index % 2 === 1 ? "right-4" : "left-4"
                  )}>{step.id}</div>
                </div>
                <div className={cn(
                  "space-y-6 flex flex-col",
                  index % 2 === 1 ? "md:items-end md:text-right" : "md:items-start"
                )}>
                  <div className="p-4 bg-primary/10 rounded-sm w-fit border border-primary/20">{step.icon}</div>
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

      {/* Field Intel Uplink Section */}
      <section className="py-24 bg-primary/5 border-y border-white/5">
        <div className="container mx-auto px-4 md:px-6">
          <div className="glass p-8 md:p-16 flex flex-col md:flex-row items-center justify-between gap-12 rounded-sm">
            <div className="max-w-2xl space-y-6 text-center md:text-left">
              <h3 className="text-3xl md:text-4xl stamped-dossier text-white flex items-center justify-center md:justify-start gap-4">
                FIELD INTEL UPLINK
              </h3>
              <p className="text-muted-foreground text-lg leading-relaxed font-medium">
                Contribute to the collective safety of the network. Help our analysts identify institutional risks by transmitting on-the-ground reports. All transmissions are strictly <span className="text-primary underline decoration-primary/30 underline-offset-8">anonymous</span>.
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

import Link from 'next/link';
import Image from 'next/image';
import { KeyFactsSection } from '@/components/key-facts-section';
import { Button } from '@/components/ui/button';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, ShieldCheck, Target, Calculator, GitCompare, ShieldAlert, AlertTriangle, TrendingDown, BookOpen, Wallet } from 'lucide-react';

const getImage = (id: string) => {
  const image = PlaceHolderImages.find(img => img.id === id);
  return {
    imageUrl: image?.imageUrl ?? "https://picsum.photos/seed/intel/1920/1080",
    imageHint: image?.imageHint ?? "tactical campus",
    description: image?.description ?? "Professional intelligence background."
  };
};

function RedFlagRegistry() {
  const flags = [
    {
      icon: <AlertTriangle className="w-6 h-6 text-destructive" />,
      title: "The October Trap",
      desc: "Alerting teachers to early 'intent to renew' deadlines that trigger before they have even settled into their environment."
    },
    {
      icon: <TrendingDown className="w-6 h-6 text-destructive" />,
      title: "Currency Fluctuation",
      desc: "Identifying regions where salaries are paid in local currency without protection, risking major savings loss."
    },
    {
      icon: <BookOpen className="w-6 h-6 text-destructive" />,
      title: "The Handbook Clause",
      desc: "Warning that signing a contract legally binds you to handbooks that can unilaterally change your duties."
    },
    {
      icon: <Wallet className="w-6 h-6 text-destructive" />,
      title: "Hidden Deductions",
      desc: "Breaking down the 'net' vs 'gross' discrepancy in regions where social security is omitted from offers."
    }
  ];

  return (
    <section className="py-24 bg-black/40">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-center gap-4 mb-12">
          <ShieldAlert className="w-10 h-10 text-destructive" />
          <div>
            <h2 className="text-3xl md:text-4xl text-white">Red Flag Registry</h2>
            <p className="text-muted-foreground uppercase text-xs font-bold tracking-tighter">Critical Due Diligence</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {flags.map((flag, i) => (
            <Card key={i} className="bg-destructive/5 border-destructive/20 rounded-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2 text-white stamped-dossier">
                  <span>🚩</span> {flag.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">{flag.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const heroImage = getImage('homepage-hero');

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section: Tactical Intel */}
      <section className="relative w-full h-[80vh] flex items-center overflow-hidden">
        <Image
          src={heroImage.imageUrl}
          alt={heroImage.description}
          fill
          priority
          className="absolute inset-0 w-full h-full object-cover brightness-[0.25]"
          data-ai-hint={heroImage.imageHint}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background"></div>
        
        <div className="relative z-10 container mx-auto px-4 md:px-6 text-center lg:text-left">
          <div className="max-w-4xl mx-auto lg:mx-0 space-y-6">
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/30 px-3 py-1 rounded text-primary text-[10px] font-black uppercase tracking-widest animate-pulse">
              <ShieldCheck className="w-3.5 h-3.5" /> Intelligence Grade Protocol
            </div>
            <h1 className="text-5xl md:text-8xl font-extrabold tracking-tighter leading-none">
              LEOPARD<span className="text-accent italic">FISH INTEL</span>
            </h1>
            <p className="text-xl md:text-3xl text-muted-foreground font-medium max-w-2xl leading-tight">
              Move with certainty, not just hope. We replace recruitment marketing with <span className="text-white underline decoration-primary underline-offset-4">evidence-led insight</span>.
            </p>
            <div className="flex flex-wrap justify-center lg:justify-start gap-4 pt-4">
              <Link href="/discover">
                <Button size="lg" className="h-14 px-8 bg-primary hover:bg-primary/90 text-white font-bold text-lg rounded-sm">
                  Initialize Journey <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="/directory">
                <Button size="lg" variant="outline" className="h-14 px-8 font-bold text-lg rounded-sm border-white/20 hover:bg-white/10">
                  Browse Dossiers
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Tactical Tagline Section */}
      <section className="py-12 bg-background border-y border-white/5">
        <div className="container mx-auto px-4 md:px-6 text-center">
            <p className="text-[10px] sm:text-xs font-black text-white tracking-[0.4em] uppercase">
              Teach Overseas: Know Before You Go
            </p>
        </div>
      </section>

      {/* The Insider Journey */}
      <section className="py-24 bg-background/50">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid md:grid-cols-3 gap-8">
            <JourneyStep 
              num="01"
              icon={<Target className="w-8 h-8 text-primary" />}
              title="Discover"
              description="The Nook Finder matching engine. It doesn't just find jobs; it looks for places where your profile fits the local reality."
              href="/discover"
              label="Find Your Nook"
            />
            <JourneyStep 
              num="02"
              icon={<Calculator className="w-8 h-8 text-primary" />}
              title="Evaluate"
              description="The Contract Decoder. We calculate your actual take-home pay and map your genuine disposable income."
              href="/financial-forecaster"
              label="Decode Offer"
            />
            <JourneyStep 
              num="03"
              icon={<GitCompare className="w-8 h-8 text-primary" />}
              title="Decide"
              description="The Comparison Matrix. Select up to 3 school offers to view 'True Net' savings side-by-side."
              href="/compare"
              label="Final Verdict"
            />
          </div>
        </div>
      </section>

      {/* Stats Counter Section */}
      <section className="py-12 border-t border-white/5">
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
        <h3 className="text-2xl stamped-dossier">{title}</h3>
        <p className="text-muted-foreground leading-relaxed text-sm">{description}</p>
      </div>
      <Link href={href} className="inline-flex items-center text-primary group-hover:translate-x-2 transition-transform self-start font-bold text-xs uppercase tracking-widest">
        {label} <ArrowRight className="ml-2 w-4 h-4" />
      </Link>
    </div>
  );
}

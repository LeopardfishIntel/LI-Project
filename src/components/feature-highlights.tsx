
import { 
  PiggyBank, 
  Users, 
  Globe, 
  PencilLine, 
  GitCompare, 
  Sparkles, 
  FileCheck, 
  ShieldAlert, 
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export function FeatureHighlights() {
  const capabilities = [
    {
      icon: <PiggyBank className="size-5 text-accent" />,
      title: "True net savings",
      desc: "Calculate genuine disposable income by mapping real-world costs against net offers."
    },
    {
      icon: <Users className="size-5 text-primary" />,
      title: "Family scalability",
      desc: "Adjust all projections with bespoke multipliers for units up to 2.5x scaling."
    },
    {
      icon: <Globe className="size-5 text-accent" />,
      title: "Cost of Living Index",
      desc: "Review primary data on housing, utilities, and essential spending in international locations."
    },
    {
      icon: <PencilLine className="size-5 text-primary" />,
      title: "Live offer input",
      desc: "Input your confirmed contract details to see immediate regional financial impact."
    },
    {
      icon: <GitCompare className="size-5 text-accent" />,
      title: "Comparison matrix",
      desc: "Analyse up to 3 school offers side-by-side with verified institutional benchmarks."
    },
    {
      icon: <Sparkles className="size-5 text-primary" />,
      title: "SWOT verdicts",
      desc: "Receive curated analytical reports identifying strengths and institutional risks."
    },
    {
      icon: <FileCheck className="size-5 text-accent" />,
      title: "Strategic checksheet",
      desc: "Finalise due diligence with audits covering housing, medical, and exit protocols."
    },
    {
      icon: <ShieldAlert className="size-5 text-primary" />,
      title: "Contract flags",
      desc: "Identify early renewal traps, hidden deductions, and ambiguous handbook clauses."
    }
  ];

  return (
    <section className="py-16 md:py-24 bg-black/40 border-t border-white/5">
      <div className="container mx-auto px-4 md:px-6">
        <div className="space-y-12">
          <div className="text-center md:text-left">
            <h2 className="text-3xl md:text-5xl font-black stamped-dossier text-white leading-none">Analysis in action</h2>
            <p className="text-muted-foreground text-[10px] md:text-xs font-black uppercase tracking-[0.3em] mt-2 opacity-60">Core examples of our decision-led analysis</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-10 gap-y-12">
            {capabilities.map((cap, i) => (
              <div key={i} className="flex flex-col gap-4 group">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white/5 rounded-sm group-hover:bg-primary/10 transition-colors">
                    {cap.icon}
                  </div>
                  <h4 className="text-base font-bold text-white uppercase tracking-tight stamped-dossier">{cap.title}</h4>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed font-medium opacity-80 pl-1">
                  {cap.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-8">
            <p className="text-sm text-muted-foreground italic font-medium text-center md:text-left">Make informed decisions with verified financial and institutional data.</p>
            <div className="flex flex-wrap justify-center gap-4">
                <Button className="bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-[10px] h-11 px-8 rounded-sm shadow-lg shadow-primary/10 border-0" asChild>
                    <Link href="/directory">Browse Schools</Link>
                </Button>
                <Button className="bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-[10px] h-11 px-8 rounded-sm shadow-lg shadow-primary/10 border-0" asChild>
                    <Link href="/discover">Find my fit <ArrowRight className="ml-2 size-3" /></Link>
                </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

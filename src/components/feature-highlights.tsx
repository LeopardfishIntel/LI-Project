
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
import { Card, CardContent } from '@/components/ui/card';
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
    <section className="py-16 bg-black/40 border-t border-white/5">
      <div className="container mx-auto px-4 md:px-6">
        <div className="space-y-8">
          <div>
            <h2 className="text-3xl md:text-4xl text-white normal-case leading-none">Analysis in action</h2>
            <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mt-1">Core examples of our decision-led analysis</p>
          </div>

          <Card className={cn("glass rounded-sm overflow-hidden border-primary/20 shadow-2xl")}>
            <CardContent className="p-8 md:p-12 space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-10">
                {capabilities.map((cap, i) => (
                  <div key={i} className="flex items-start gap-4 group">
                    <div className="p-2.5 bg-white/5 rounded-sm mt-1 group-hover:bg-primary/10 transition-colors">
                      {cap.icon}
                    </div>
                    <div className="space-y-1.5">
                      <h4 className="text-sm font-bold text-white leading-tight uppercase tracking-tight">{cap.title}</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed font-medium opacity-80">
                        {cap.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-10 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
                <p className="text-sm text-muted-foreground italic font-medium">Make informed decisions with verified financial and institutional data.</p>
                <div className="flex gap-3">
                    <Button className="bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-[10px] h-10 px-6 rounded-sm shadow-lg shadow-primary/10 border-0" asChild>
                        <Link href="/directory">Browse Schools</Link>
                    </Button>
                    <Button className="bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-[10px] h-10 px-6 rounded-sm shadow-lg shadow-primary/10 border-0" asChild>
                        <Link href="/discover">Find my fit <ArrowRight className="ml-2 size-3" /></Link>
                    </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

import { ShieldAlert, ArrowRight, Lock, Banknote, GraduationCap, HeartPulse } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';

export function RedFlagRegistry() {
  const flags = [
    {
      icon: <Lock className="size-4 text-destructive" />,
      title: "Privacy Trap",
      desc: "Aggressive NDAs silencing field reports."
    },
    {
      icon: <Banknote className="size-4 text-destructive" />,
      title: "Pay Transparency",
      desc: "Refusal to publish clear salary scales."
    },
    {
      icon: <GraduationCap className="size-4 text-destructive" />,
      title: "Education Fees",
      desc: "Hidden costs for staff dependent seats."
    },
    {
      icon: <HeartPulse className="size-4 text-amber-500" />,
      title: "Medical Co-pays",
      desc: "Significant gaps in inpatient coverage."
    }
  ];

  return (
    <section className="py-24 bg-black/40 border-t border-white/5">
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="flex items-center gap-4">
            <ShieldAlert className="w-10 h-10 text-primary" />
            <div>
              <h2 className="text-3xl md:text-4xl text-white">Contract flags</h2>
              <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">Critical due diligence</p>
            </div>
          </div>

          <Card className="glass rounded-sm overflow-hidden border-primary/20 shadow-2xl">
            <CardContent className="p-8 md:p-12 space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                {flags.map((flag, i) => (
                  <div key={i} className="flex items-start gap-4 group">
                    <div className="p-2.5 bg-destructive/10 rounded-sm mt-1 group-hover:bg-destructive/20 transition-colors">
                      {flag.icon}
                    </div>
                    <div className="space-y-1.5">
                      <h4 className="text-lg font-bold text-white leading-tight">{flag.title}</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed font-medium opacity-80">
                        {flag.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-10 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
                <p className="text-sm text-muted-foreground italic font-medium">Get the full tactical briefing before signing your next offer.</p>
                <Link href="/prepare" className="group flex items-center gap-3 bg-primary/10 hover:bg-primary/20 border border-primary/30 px-8 py-4 rounded-sm transition-all shadow-lg shadow-primary/5">
                  <span className="text-xs font-black uppercase tracking-[0.2em] text-primary">Access full flag registry</span>
                  <ArrowRight className="size-4 text-primary group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

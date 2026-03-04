import { Lock, Banknote, GraduationCap, HeartPulse, ShieldAlert, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export function RedFlagRegistry() {
  const flags = [
    {
      icon: <Lock className="w-6 h-6 text-destructive" />,
      title: "Privacy trap",
      desc: "Aggressive NDAs silencing field reports."
    },
    {
      icon: <Banknote className="w-6 h-6 text-destructive" />,
      title: "Pay transparency",
      desc: "Refusal to publish clear salary scales."
    },
    {
      icon: <GraduationCap className="w-6 h-6 text-destructive" />,
      title: "Education fees",
      desc: "Hidden costs for staff dependent seats."
    },
    {
      icon: <HeartPulse className="w-6 h-6 text-amber-500" />,
      title: "Medical co-pays",
      desc: "Significant gaps in inpatient coverage."
    }
  ];

  return (
    <section className="py-24 bg-black/40 border-t border-white/5">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
          <div className="flex items-center gap-4">
            <ShieldAlert className="w-10 h-10 text-primary" />
            <div>
              <h2 className="text-3xl md:text-4xl text-white normal-case">Contract flags</h2>
              <p className="text-muted-foreground text-[10px] font-black tracking-widest uppercase">Critical due diligence</p>
            </div>
          </div>
          <Link href="/prepare" className="group flex items-center gap-2 text-primary font-bold uppercase tracking-widest text-[10px] hover:text-white transition-colors">
            Access full flag registry <ArrowRight className="size-3 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {flags.map((flag, i) => (
            <Card key={i} className="glass rounded-sm overflow-hidden hover:border-primary/30 transition-all group cursor-pointer">
              <Link href="/prepare">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-3 text-white font-bold normal-case">
                    <div className="p-2 bg-background/50 rounded-sm group-hover:bg-primary/10 transition-colors">
                      {flag.icon}
                    </div>
                    {flag.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed font-medium mb-4">{flag.desc}</p>
                  <span className="text-[9px] font-black uppercase text-primary/40 group-hover:text-primary transition-colors">Read more</span>
                </CardContent>
              </Link>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

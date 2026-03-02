
import { Lock, Banknote, GraduationCap, HeartPulse, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function RedFlagRegistry() {
  const flags = [
    {
      icon: <Lock className="w-6 h-6 text-destructive" />,
      title: "Privacy trap",
      desc: "Aggressive NDAs silening staff from discussing internal school culture or work-life balance."
    },
    {
      icon: <Banknote className="w-6 h-6 text-destructive" />,
      title: "Pay transparency",
      desc: "Schools refusing to publish clear frameworks or salary bands, often leading to low-ball offers."
    },
    {
      icon: <GraduationCap className="w-6 h-6 text-destructive" />,
      title: "Education fees",
      desc: "Hidden costs for staff children like levies, uniforms, and mandatory international trip fees."
    },
    {
      icon: <HeartPulse className="w-6 h-6 text-amber-500" />,
      title: "Medical co-pays",
      desc: "Significant out-of-pocket expenses for emergency care despite having 'premium' coverage."
    }
  ];

  return (
    <section className="py-24 bg-black/40 border-t border-white/5">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-center gap-4 mb-12">
          <ShieldAlert className="w-10 h-10 text-primary" />
          <div>
            <h2 className="text-3xl md:text-4xl text-white normal-case">Contract flags</h2>
            <p className="text-muted-foreground text-[10px] font-black tracking-widest uppercase">Critical due diligence</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {flags.map((flag, i) => (
            <Card key={i} className="glass rounded-sm overflow-hidden hover:border-primary/30 transition-colors">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-3 text-white font-bold normal-case">
                  <div className="p-2 bg-background/50 rounded-sm">
                    {flag.icon}
                  </div>
                  {flag.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed font-medium">{flag.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

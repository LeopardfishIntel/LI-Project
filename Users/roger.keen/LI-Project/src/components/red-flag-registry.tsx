import { ShieldAlert, AlertTriangle, TrendingDown, BookOpen, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * RedFlagRegistry Component
 * Displays critical due diligence alerts for international educators.
 * Styled for the Tactical Ember design system.
 */
export function RedFlagRegistry() {
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
    <section className="py-24 bg-black/40 border-t border-white/5">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-center gap-4 mb-12">
          <ShieldAlert className="w-10 h-10 text-destructive" />
          <div>
            <h2 className="text-3xl md:text-4xl text-white">Red Flag Registry</h2>
            <p className="text-muted-foreground uppercase text-[10px] font-black tracking-widest">Critical Due Diligence</p>
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

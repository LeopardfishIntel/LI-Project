
'use client';

import Link from 'next/link';
import { 
  FileText, 
  Search, 
  Trophy, 
  PlaneLanding, 
  ShoppingCart,
  MessageSquareQuote, 
  Lock,
  Banknote,
  PackageCheck,
  ShieldAlert,
  FileCheck,
  Flag,
  BarChart3,
  Stethoscope,
  Home,
  Globe,
  Users,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function PreparePage() {
  return (
    <div className="container mx-auto px-4 md:px-6 py-12">
      <div className="mb-16 text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-center normal-case text-white">
            4. Are you prepared?
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto font-medium text-xs leading-relaxed uppercase tracking-[0.3em] opacity-60">
            The final audit. Ensure your tactical transition is fully operational.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto space-y-20">
        
        {/* Phase 1: The Integrity Baseline */}
        <section className="space-y-8">
          <div className="flex items-center gap-3">
            <span className="text-primary font-black text-xl italic">Phase 1:</span>
            <h2 className="text-2xl md:text-3xl font-black stamped-dossier text-white normal-case">The integrity baseline (The "Gold Standard")</h2>
          </div>
          <Card className="glass border-primary/20 bg-primary/5">
            <CardContent className="pt-8">
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <Trophy className="size-12 text-primary shrink-0" />
                <p className="text-lg md:text-xl text-white leading-relaxed font-bold italic">
                  "Before diving into the pitfalls, note that elite international schools already know everything on this page. For the best employers, these points aren't 'negotiables'—they are the baseline for staff wellbeing. Excellent schools provide transparency because they want focused, happy teachers. If a school struggles with these questions, that tells you all you need to know."
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Phase 2: Risk Factor Matrix */}
        <section className="space-y-8">
          <div className="flex items-center gap-3">
            <span className="text-primary font-black text-xl italic">Phase 2:</span>
            <h2 className="text-2xl md:text-3xl font-black stamped-dossier text-white normal-case">Risk factor matrix (The flag system)</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="p-4 rounded-sm border border-red-500/20 bg-red-500/5 flex items-start gap-4">
              <div className="mt-1"><Flag className="size-4 fill-red-500 text-red-500" /></div>
              <div>
                <p className="text-[10px] font-black text-red-400 tracking-widest mb-1 uppercase">RED SIGNAL</p>
                <p className="text-xs text-muted-foreground leading-relaxed font-medium">Critical risk. One or two signals are enough to justify declining an offer unless total mitigation is possible.</p>
              </div>
            </div>
            <div className="p-4 rounded-sm border border-amber-500/20 bg-amber-500/5 flex items-start gap-4">
              <div className="mt-1"><Flag className="size-4 fill-amber-500 text-amber-500" /></div>
              <div>
                <p className="text-[10px] font-black text-amber-400 tracking-widest mb-1 uppercase">AMBER SIGNAL</p>
                <p className="text-xs text-muted-foreground leading-relaxed font-medium">Operational caution. Consider mitigation strategies. Multiple signals require a full re-evaluation of risk.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="glass border-red-500/20">
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-white normal-case"><Lock className="size-5 text-primary" /> Over-zealous privacy clauses</CardTitle>
                <Flag className="size-4 fill-red-500 text-red-500" />
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground leading-relaxed space-y-4 font-medium">
                <p>Watch for contracts with aggressive NDAs or "disparagement" clauses. If a school threatens legal action for discussing "internal climate" even after you leave, it indicates a paranoid leadership culture.</p>
              </CardContent>
            </Card>

            <Card className="glass border-red-500/20">
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-white normal-case"><Banknote className="size-5 text-primary" /> Pay scale ambiguity</CardTitle>
                <Flag className="size-4 fill-red-500 text-red-500" />
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground leading-relaxed space-y-4 font-medium">
                <p>Professional institutions use transparent pay scales. Refusal to show your position on a scale suggests you are being low-balled compared to the institutional baseline.</p>
              </CardContent>
            </Card>

            <Card className="glass border-amber-500/20">
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-white normal-case"><Globe className="size-5 text-primary" /> Vague logistical terms</CardTitle>
                <Flag className="size-4 fill-amber-500 text-amber-500" />
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground leading-relaxed space-y-4 font-medium">
                <p>Ambiguity in housing or flight definitions leads to mission creep. Ensure the standard of provision is explicitly documented to prevent unilateral changes.</p>
              </CardContent>
            </Card>

            <Card className="glass border-amber-500/20">
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-white normal-case"><ShieldAlert className="size-5 text-primary" /> Exit & reference control</CardTitle>
                <Flag className="size-4 fill-amber-500 text-amber-500" />
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground leading-relaxed space-y-4 font-medium">
                <p>Verify regional exit protocols. If a school has the legal power to block your next move or withhold gratuity based on "conduct," the tactical risk is high.</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Phase 3: Tactical Readiness & Capital Requirements */}
        <section className="space-y-8">
          <div className="flex items-center gap-3">
            <span className="text-primary font-black text-xl italic">Phase 3:</span>
            <h2 className="text-2xl md:text-3xl font-black stamped-dossier text-white normal-case">Tactical readiness & capital requirements</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2 normal-case"><PlaneLanding className="size-5 text-primary" /> Upfront & hidden costs</h3>
                <Flag className="size-4 fill-amber-500 text-amber-500" />
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed font-medium">Initial outlays for visa medicals, document legalisation, and housing deposits can create immediate fiscal strain. Most "settling-in" allowances arrive after these costs are incurred.</p>
              <div className="p-6 glass border-primary/20 bg-primary/5 rounded-sm">
                <p className="text-[10px] font-black text-primary tracking-[0.2em] uppercase mb-2">Tactical reserve requirement</p>
                <p className="text-3xl font-black text-white tracking-tighter">£4,000 – £6,000</p>
                <p className="text-xs text-muted-foreground mt-2 font-medium italic">Minimum capital for family moves adjusted for the initial 6-week "gap month" before the first full salary cycle.</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2 normal-case"><ShoppingCart className="size-5 text-primary" /> The IKEA test</h3>
                <Flag className="size-4 fill-amber-500 text-amber-500" />
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed font-medium">"Unfurnished" often means zero appliances. Check local IKEA sites before arrival. A £1,000 allowance may only cover basic white goods, leaving no budget for furniture or comfort.</p>
              <div className="p-6 glass border-accent/20 bg-accent/5 rounded-sm">
                <div className="flex items-center gap-3 mb-3">
                  <Stethoscope className="size-5 text-accent" />
                  <h4 className="text-white font-bold text-sm">The medical co-pay gap</h4>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed font-medium">Verify deductibles for inpatient care. In some regions, even "comprehensive" plans require a 20% co-pay on every bill, which can be ruinous for families.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Phase 4: Leadership & Stability Intel */}
        <section className="space-y-8">
          <div className="flex items-center gap-3">
            <span className="text-primary font-black text-xl italic">Phase 4:</span>
            <h2 className="text-2xl md:text-3xl font-black stamped-dossier text-white normal-case">Leadership & stability intel</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="glass border-red-500/20">
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-white normal-case"><BarChart3 className="size-5 text-primary" /> Toxic churn signals (GASCI)</CardTitle>
                <Flag className="size-4 fill-red-500 text-red-500" />
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground leading-relaxed space-y-4 font-medium">
                <p>If a school is consistently advertising mid-year vacancies (October/November), it signals unmanaged exits. Use our Growth-Adjusted Staff Churn Index to identify replacement rates versus expansion.</p>
              </CardContent>
            </Card>

            <Card className="glass border-amber-500/20">
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-white normal-case"><Users className="size-5 text-primary" /> Leadership tenure audit</CardTitle>
                <Flag className="size-4 fill-amber-500 text-amber-500" />
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground leading-relaxed space-y-4 font-medium">
                <p>High leadership turnover leads to inconsistent policy enforcement. If the Principal and Head of Department have both been in post for less than 2 years, proceed with extreme caution.</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Phase 5: The "Hard-Talk" Inquiry */}
        <section className="space-y-8 pb-12">
          <div className="flex items-center gap-3">
            <span className="text-primary font-black text-xl italic">Phase 5:</span>
            <h2 className="text-2xl md:text-3xl font-black stamped-dossier text-white normal-case">The "Hard-Talk" inquiry (Essential questions)</h2>
          </div>
          
          <p className="text-base text-muted-foreground font-medium mb-8">Verification is the difference between an adventure and an ordeal. Put these questions to current staff or during your final interview stage.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              "What is the weekly cap on teacher contact minutes?",
              "Is the EOS gratuity based on basic salary or total package?",
              "Can I see the full Schedule of Benefits for health insurance?",
              "What is the deductible and co-pay for inpatient care?",
              "Are all capital levies and mandatory fees waived for staff children?",
              "Can I speak to a current teacher in my department privately?",
              "What was the replacement churn rate in the last two years?",
              "Does the school pay for document legalisation fees upfront?",
              "Is the provided housing 'turnkey' or completely unfurnished?",
              "Is there a monthly cap on utility-inclusive housing?"
            ].map((q, i) => (
              <div key={i} className="flex items-start gap-4 p-5 bg-background/40 border border-border/10 rounded-sm hover:border-primary/30 transition-colors group">
                <MessageSquareQuote className="size-5 text-primary shrink-0 mt-1 opacity-50 group-hover:opacity-100 transition-opacity" />
                <p className="text-base font-medium text-white/90 leading-relaxed italic">"{q}"</p>
              </div>
            ))}
          </div>
        </section>

        <div className="flex justify-center pt-8">
            <Button asChild size="lg" className="h-14 px-10 bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest rounded-sm shadow-[0_0_25px_rgba(249,115,22,0.2)] border-0">
                <Link href="/prepare/checklist">
                <FileCheck className="mr-3 size-5" /> Download strategic checksheet
                </Link>
            </Button>
        </div>

      </div>
    </div>
  );
}

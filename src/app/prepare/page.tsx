'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { 
  PlaneLanding, 
  ShoppingCart,
  MessageSquareQuote, 
  Lock,
  Banknote,
  ShieldAlert,
  FileCheck,
  Flag,
  BarChart3,
  Stethoscope,
  Globe,
  Users,
  Home,
  Calculator,
  Milestone,
  ArrowRight,
  FileText,
  Wallet,
  Clock,
  Compass,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn, formatCurrency } from '@/lib/utils';

const CONVERSION_FROM_GBP: Record<string, number> = {
  GBP: 1,
  USD: 1.28,
  AUD: 1.95,
};

const SCALING_MULTIPLIERS: Record<string, number> = {
  single: 1,
  couple: 1.6,
  family: 2.1,
  family2: 2.5
};

const BASE_BREAKDOWN = [
  { id: 'docs', title: "Document integrity", base: 500, icon: <FileText className="size-3.5" /> },
  { id: 'rent', title: "Housing liquidity", base: 2000, icon: <Wallet className="size-3.5" /> },
  { id: 'gap', title: "The 6-week gap", base: 1000, icon: <Clock className="size-3.5" /> },
  { id: 'setup', title: "Mission setup", base: 500, icon: <Compass className="size-3.5" /> },
];

export default function PreparePage() {
  const [calcStatus, setCalcStatus] = useState<string>('single');
  const [currency, setCurrency] = useState<string>('GBP');
  const [dateStamp, setDateStamp] = useState('');

  useEffect(() => {
    setDateStamp(new Date().toLocaleDateString('en-GB').replace(/\//g, '.'));
  }, []);

  const multiplier = useMemo(() => SCALING_MULTIPLIERS[calcStatus] || 1, [calcStatus]);
  const exchRate = useMemo(() => CONVERSION_FROM_GBP[currency] || 1, [currency]);

  const liveBreakdown = useMemo(() => {
    return BASE_BREAKDOWN.map(item => ({
      ...item,
      amount: item.base * multiplier * exchRate
    }));
  }, [multiplier, exchRate]);

  const totalReserve = useMemo(() => {
    return liveBreakdown.reduce((acc, curr) => acc + curr.amount, 0);
  }, [liveBreakdown]);

  return (
    <div className="container mx-auto px-4 md:px-6 py-12 text-white">
      <div className="mb-12 text-center space-y-3">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white normal-case text-center">
          4. Are you prepared?
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto font-medium text-[10px] leading-relaxed uppercase tracking-[0.3em] opacity-60">
          Professional educator due diligence and risk assessment.
        </p>
      </div>

      <div className="max-w-5xl mx-auto space-y-16">
        
        {/* Section 1: Material Risks */}
        <section className="space-y-8">
          <div className="space-y-4">
            <h2 className="text-2xl md:text-3xl font-black stamped-dossier text-white normal-case border-l-4 border-primary pl-4">Material risks</h2>
            <p className="text-sm font-bold text-muted-foreground italic max-w-3xl leading-relaxed">
              International school contracts evolve annually. Conduct a forensic review of your specific terms for the following risks. If you identify any deal-breakers, seek professional consultation.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="glass border-red-500/20">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-white normal-case"><Lock className="size-5 text-primary" /> Over-zealous privacy clauses</CardTitle>
                <Flag className="size-4 fill-red-500 text-red-500" />
              </CardHeader>
              <CardContent className="text-sm md:text-base text-muted-foreground leading-relaxed font-medium">
                <p>Watch for contracts with aggressive NDAs or "disparagement" clauses. If a school threatens legal action for discussing "internal climate" even after you leave, it indicates a paranoid leadership culture.</p>
              </CardContent>
            </Card>

            <Card className="glass border-red-500/20">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-white normal-case"><Banknote className="size-5 text-primary" /> Pay scale ambiguity</CardTitle>
                <Flag className="size-4 fill-red-500 text-red-500" />
              </CardHeader>
              <CardContent className="text-sm md:text-base text-muted-foreground leading-relaxed font-medium">
                <p>Professional institutions use transparent pay scales. Refusal to show your position on a scale suggests you are being low-balled compared to the institutional baseline.</p>
              </CardContent>
            </Card>

            <Card className="glass border-amber-500/20">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-white normal-case"><Stethoscope className="size-5 text-primary" /> Medical co-pay gap</CardTitle>
                <Flag className="size-4 fill-amber-500 text-amber-500" />
              </CardHeader>
              <CardContent className="text-sm md:text-base text-muted-foreground leading-relaxed font-medium">
                <p>Verify deductibles for inpatient care. In some regions, even "comprehensive" plans require a 20% co-pay on every bill, which can be ruinous for families.</p>
              </CardContent>
            </Card>

            <Card className="glass border-amber-500/20">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-white normal-case"><Home className="size-5 text-primary" /> Housing quality audit</CardTitle>
                <Flag className="size-4 fill-amber-500 text-amber-500" />
              </CardHeader>
              <CardContent className="text-sm md:text-base text-muted-foreground leading-relaxed font-medium">
                <p>Ambiguity in housing definitions leads to mission creep. Ensure the standard of provision is explicitly documented to prevent unilateral changes.</p>
              </CardContent>
            </Card>

            <Card className="glass border-amber-500/20">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-white normal-case"><Globe className="size-5 text-primary" /> Vague logistical terms</CardTitle>
                <Flag className="size-4 fill-amber-500 text-amber-500" />
              </CardHeader>
              <CardContent className="text-sm md:text-base text-muted-foreground leading-relaxed font-medium">
                <p>Ambiguity in flight definitions or relocation allowances leads to mission creep. Ensure the standard of provision is explicitly documented.</p>
              </CardContent>
            </Card>

            <Card className="glass border-amber-500/20">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-white normal-case"><ShieldAlert className="size-5 text-primary" /> Exit & reference control</CardTitle>
                <Flag className="size-4 fill-amber-500 text-amber-500" />
              </CardHeader>
              <CardContent className="text-sm md:text-base text-muted-foreground leading-relaxed font-medium">
                <p>Verify regional exit protocols. If a school has the legal power to block your next move or withhold gratuity based on "conduct," the tactical risk is high.</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Section 2: The True Cost of Landing (Compact Calculator) */}
        <section className="space-y-8">
          <div className="space-y-4">
            <h2 className="text-2xl md:text-3xl font-black stamped-dossier text-white normal-case border-l-4 border-primary pl-4">The True Cost of Landing</h2>
            <p className="text-sm font-bold text-muted-foreground italic max-w-3xl leading-relaxed">
              Relocating abroad is rarely cost-neutral; use this audit to identify the upfront costs that will draw on your cash reserves before your first full month’s pay arrives.
            </p>
          </div>
          
          <div className="space-y-6">
            <Card className="glass border-primary/30 bg-primary/5 rounded-sm overflow-hidden shadow-2xl relative">
              <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12 pointer-events-none">
                <Calculator className="size-48 text-white" />
              </div>
              
              <div className="p-6 md:p-8 space-y-8 relative z-10">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <p className="text-[10px] font-black text-primary tracking-[0.3em] uppercase">Tactical reserve requirement</p>
                        {dateStamp && (
                            <span className="hidden sm:inline-block text-[8px] font-black text-white/30 uppercase tracking-[0.2em] border border-white/5 px-2 py-0.5 rounded-sm">
                                LFI.{dateStamp}
                            </span>
                        )}
                    </div>
                    <p className="text-5xl md:text-6xl font-black text-white tracking-tighter transition-all duration-500">
                      {formatCurrency(totalReserve, currency)}
                    </p>
                    <p className="text-xs md:text-sm text-muted-foreground font-medium leading-relaxed max-w-lg">
                      Minimum capital for {calcStatus.startsWith('family') ? 'family' : calcStatus === 'couple' ? 'couple' : 'single'} units adjusted for the initial 6-week "gap month" before the first full salary cycle.
                    </p>
                  </div>

                  <div className="w-full lg:w-64 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-[9px] font-black uppercase text-primary tracking-widest opacity-80">Scaling</Label>
                            <Select value={calcStatus} onValueChange={setCalcStatus}>
                                <SelectTrigger className="h-9 bg-background/60 border-white/10 text-white font-bold text-xs rounded-sm">
                                <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="glass">
                                <SelectItem value="single">Single</SelectItem>
                                <SelectItem value="couple">Couple</SelectItem>
                                <SelectItem value="family">Family (2+1)</SelectItem>
                                <SelectItem value="family2">Family (2+2)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[9px] font-black uppercase text-primary tracking-widest opacity-80">Currency</Label>
                            <Select value={currency} onValueChange={setCurrency}>
                                <SelectTrigger className="h-9 bg-background/60 border-white/10 text-white font-bold text-xs rounded-sm">
                                <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="glass">
                                    <SelectItem value="GBP">GBP</SelectItem>
                                    <SelectItem value="USD">USD</SelectItem>
                                    <SelectItem value="AUD">AUD</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-white/5 rounded-sm border border-white/5">
                      <Calculator className="size-3 text-accent animate-pulse" />
                      <span className="text-[9px] font-black text-accent uppercase tracking-widest">Real-time projection active</span>
                    </div>
                  </div>
                </div>

                {/* Compact Item-by-item breakdown row */}
                <div className="pt-6 border-t border-white/10">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
                        {liveBreakdown.map((item) => (
                            <div key={item.id} className="space-y-1 group">
                                <div className="flex items-center gap-2 border-b border-white/5 pb-1 group-hover:border-primary/30 transition-colors">
                                    <span className="text-primary group-hover:scale-110 transition-transform">{item.icon}</span>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-white transition-colors">
                                        {item.title}
                                    </span>
                                </div>
                                <p className="text-base md:text-lg font-black text-white/90 group-hover:text-primary transition-colors">
                                    {formatCurrency(item.amount, currency)}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
              <div className="space-y-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2 normal-case"><PlaneLanding className="size-4 text-primary" /> Upfront & hidden costs</h3>
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed font-medium">Initial outlays for visa medicals, document legalisation, and housing deposits can create immediate fiscal strain. Most "settling-in" allowances arrive after these costs are incurred.</p>
              </div>

              <div className="space-y-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2 normal-case"><ShoppingCart className="size-4 text-primary" /> The IKEA test</h3>
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed font-medium">"Unfurnished" often means zero appliances. Check local IKEA sites before arrival. A £1,000 allowance may only cover basic white goods, leaving no budget for furniture or comfort.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Leadership & Stability */}
        <section className="space-y-8">
          <div className="space-y-4">
            <h2 className="text-2xl md:text-3xl font-black stamped-dossier text-white normal-case border-l-4 border-primary pl-4">Leadership & stability</h2>
            <p className="text-sm font-bold text-muted-foreground italic max-w-3xl leading-relaxed">
              Senior leadership stability is the benchmark of a settled school; utilise these indicators to distinguish between a high-performing environment and one defined by systemic volatility.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="glass border-red-500/20">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-white normal-case"><BarChart3 className="size-5 text-primary" /> Toxic churn signals</CardTitle>
                <Flag className="size-4 fill-red-500 text-red-500" />
              </CardHeader>
              <CardContent className="text-sm md:text-base text-muted-foreground leading-relaxed font-medium">
                <p>If a school is consistently advertising mid-year vacancies (October/November), it signals unmanaged exits. Use our Growth-Adjusted Staff Churn Index to identify replacement rates versus expansion.</p>
              </CardContent>
            </Card>

            <Card className="glass border-amber-500/20">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-white normal-case"><Users className="size-5 text-primary" /> Leadership tenure</CardTitle>
                <Flag className="size-4 fill-amber-500 text-amber-500" />
              </CardHeader>
              <CardContent className="text-sm md:text-base text-muted-foreground leading-relaxed font-medium">
                <p>High leadership turnover leads to inconsistent policy enforcement. If the Principal and Head of Department have both been in post for less than 2 years, proceed with extreme caution.</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Section 4: The "Hard-Talk" inquiry */}
        <section className="space-y-8 pb-12">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl md:text-3xl font-black stamped-dossier text-white normal-case border-l-4 border-primary pl-4">The "Hard-Talk" inquiry</h2>
          </div>
          
          <p className="text-base text-muted-foreground font-medium mb-8">Verification is the difference between an adventure and an ordeal. Put these questions to current staff or during your final interview stage.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              "What is the weekly cap on teacher contact time?",
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

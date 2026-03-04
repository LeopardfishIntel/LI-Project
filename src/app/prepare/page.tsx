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
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn, formatCurrency } from '@/lib/utils';

const RESERVE_ITEMS = [
  { id: 'docs', label: 'Documents', baseGbp: 500, icon: <FileText className="size-3" /> },
  { id: 'housing', label: 'Housing deposit', baseGbp: 2000, icon: <Wallet className="size-3" /> },
  { id: 'gap', label: '6-Week gap', baseGbp: 1000, icon: <Clock className="size-3" /> },
  { id: 'setup', label: 'Mission setup', baseGbp: 500, icon: <Compass className="size-3" /> },
];

const CURRENCY_RATES: Record<string, number> = {
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

export default function PreparePage() {
  const [calcStatus, setCalcStatus] = useState<string>('single');
  const [calcCurrency, setCalcCurrency] = useState<string>('GBP');
  const baseReserve = 4000;

  const multiplier = SCALING_MULTIPLIERS[calcStatus] || 1;
  const rate = CURRENCY_RATES[calcCurrency] || 1;

  const calculatedTotal = useMemo(() => {
    return baseReserve * multiplier * rate;
  }, [multiplier, rate]);

  return (
    <div className="container mx-auto px-4 md:px-6 py-12 text-white font-body">
      <div className="mb-12 text-center space-y-3">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white normal-case">
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
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-white normal-case"><Lock className="size-5 text-primary" /> Confidentiality Clauses</CardTitle>
                <Flag className="size-4 fill-red-500 text-red-500" />
              </CardHeader>
              <CardContent className="text-sm md:text-base text-muted-foreground leading-relaxed font-medium">
                <p>Audit your contract for over-zealous Non-Disclosure Agreements or terms suppressing reputational commentary. A school that threatens legal recourse for discussing its internal climate after your departure is signalling a deeply insecure governance structure.</p>
              </CardContent>
            </Card>

            <Card className="glass border-red-500/20">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-white normal-case"><Banknote className="size-5 text-primary" /> Pay scale transparency</CardTitle>
                <Flag className="size-4 fill-red-500 text-red-500" />
              </CardHeader>
              <CardContent className="text-sm md:text-base text-muted-foreground leading-relaxed font-medium">
                <p>Professional institutions use transparent pay scales. Refusal to show your position on a scale suggests you are being low-balled compared to the school or city baseline.</p>
              </CardContent>
            </Card>

            <Card className="glass border-amber-500/20">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-white normal-case"><Stethoscope className="size-5 text-primary" /> Medical co-pay gap</CardTitle>
                <Flag className="size-4 fill-amber-500 text-amber-500" />
              </CardHeader>
              <CardContent className="text-sm md:text-base text-muted-foreground leading-relaxed font-medium">
                <p>Verify the schedule of benefits regarding inpatient excess. In many markets, 'comprehensive' insurance still carries a 20% co-insurance clause on every bill, which can prove financially untenable for families.</p>
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

        {/* Section 2: Tactical Reserve Calculator */}
        <section className="space-y-8">
          <div className="space-y-4">
            <h2 className="text-2xl md:text-3xl font-black stamped-dossier text-white normal-case border-l-4 border-primary pl-4">The true cost of landing</h2>
            <p className="text-sm font-bold text-muted-foreground italic max-w-3xl leading-relaxed">
              Relocating abroad is rarely cost-neutral. Use this calculator to identify the upfront liquid capital required for the initial 6-week "gap month" before your first full salary cycle.
            </p>
          </div>
          
          <Card className="glass border-primary/30 bg-primary/5 rounded-sm shadow-2xl relative overflow-hidden">
            <CardContent className="p-6 md:p-8 space-y-8">
              <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-8">
                <div className="space-y-2 text-center md:text-left">
                  <p className="text-[10px] font-black text-primary tracking-[0.3em] uppercase">Tactical reserve requirement</p>
                  <p className="text-5xl md:text-6xl font-black text-white tracking-tighter">
                    {formatCurrency(calculatedTotal, calcCurrency)}
                  </p>
                  <p className="text-xs text-muted-foreground font-medium max-w-sm leading-relaxed">
                    Indicative liquid capital for {calcStatus.startsWith('family') ? 'family' : calcStatus === 'couple' ? 'couple' : 'single'} moves adjusted for the initial 6-week window.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Scaling</Label>
                    <Select value={calcStatus} onValueChange={setCalcStatus}>
                      <SelectTrigger className="h-9 bg-background/60 border-white/10 text-white font-bold text-xs rounded-sm w-36">
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
                    <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Currency</Label>
                    <Select value={calcCurrency} onValueChange={setCalcCurrency}>
                      <SelectTrigger className="h-9 bg-background/60 border-white/10 text-white font-bold text-xs rounded-sm w-24">
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
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-white/5">
                {RESERVE_ITEMS.map((item) => (
                  <div key={item.id} className="space-y-1.5">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      {item.icon}
                      <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
                    </div>
                    <p className="text-sm font-bold text-white/90">
                      {formatCurrency(item.baseGbp * multiplier * rate, calcCurrency)}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
            <div className="space-y-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2 normal-case"><PlaneLanding className="size-4 text-primary" /> Upfront & hidden costs</h3>
              <p className="text-xs md:text-sm text-muted-foreground leading-relaxed font-medium">Initial outlays for visa medicals, document legalisation, and housing deposits can create immediate fiscal strain. Most "settling-in" allowances arrive after these costs are incurred.</p>
            </div>

            <div className="space-y-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2 normal-case"><ShoppingCart className="size-4 text-primary" /> The IKEA test</h3>
              <p className="text-xs md:text-sm text-muted-foreground leading-relaxed font-medium">"Unfurnished" often means zero appliances. Check local IKEA sites before arrival. A £1,000 allowance may only cover basic white goods, leaving no budget for furniture or comfort.</p>
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
                <CheckCircle2 className="mr-3 size-5" /> Access strategic checksheet
                </Link>
            </Button>
        </div>

      </div>
    </div>
  );
}

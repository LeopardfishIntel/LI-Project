
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
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn, formatCurrency } from '@/lib/utils';

const RESERVE_ITEMS = [
  { id: 'docs', label: 'Visa and Documentation', baseGbp: 500, icon: <FileText className="size-4" />, num: '01' },
  { id: 'housing', label: 'Housing liquidity', baseGbp: 2000, icon: <Wallet className="size-4" />, num: '02' },
  { id: 'expenditure', label: 'Daily expenditure', baseGbp: 1000, icon: <Clock className="size-4" />, num: '03' },
  { id: 'comforts', label: 'Basic home comforts', baseGbp: 500, icon: <Compass className="size-4" />, num: '04' },
];

const SCALING_MULTIPLIERS: Record<string, number> = {
  single: 1,
  couple: 1.6,
  family: 2.1,
  family2: 2.5
};

export default function PreparePage() {
  const [calcStatus, setCalcStatus] = useState<string>('single');
  const baseReserve = 4000;
  
  const multiplier = SCALING_MULTIPLIERS[calcStatus] || 1;
  const calculatedReserve = useMemo(() => {
    return baseReserve * multiplier;
  }, [multiplier]);

  return (
    <div className="container mx-auto px-4 md:px-6 py-12 text-white font-body">
      <div className="mb-16 text-center space-y-4">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white normal-case">
          4. Are you prepared?
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto font-medium text-xs leading-relaxed uppercase tracking-[0.3em] opacity-60">
          Professional educator due diligence and risk assessment.
        </p>
      </div>

      <div className="max-w-5xl mx-auto space-y-20">
        
        {/* Section 1: Material Risks */}
        <section className="space-y-8">
          <div className="space-y-4">
            <h2 className="text-2xl md:text-3xl font-black stamped-dossier text-white normal-case border-l-4 border-primary pl-4">Material risks</h2>
            <p className="text-sm font-bold text-muted-foreground italic max-w-3xl leading-relaxed">
              International school contracts evolve annually. Conduct a forensic review of your specific terms for the following risks. If any deal-breakers emerge, seek professional consultation before signing.
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
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-white normal-case"><Banknote className="size-5 text-primary" /> Pay scale ambiguity</CardTitle>
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

        {/* Section 2: Tactical Reserve Calculator - Unified Layout */}
        <section className="space-y-8">
          <div className="space-y-4">
            <h2 className="text-2xl md:text-3xl font-black stamped-dossier text-white normal-case border-l-4 border-primary pl-4">The true cost of landing</h2>
            <p className="text-sm font-bold text-muted-foreground italic max-w-3xl leading-relaxed">
              Relocating abroad is rarely cost-neutral; use this audit to identify the upfront costs that will draw on your cash reserves before your first full month’s pay arrives.
            </p>
          </div>
          
          <div className="glass border-primary/30 bg-primary/5 rounded-sm shadow-2xl overflow-hidden flex flex-col">
            {/* Top Part: The Projection Summary */}
            <div className="p-8 md:p-12 flex flex-col md:flex-row gap-12 items-center md:items-start border-b border-white/5">
              <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12 pointer-events-none">
                <Calculator className="size-48 text-white" />
              </div>
              
              <div className="flex-1 space-y-4 relative z-10">
                <p className="text-xs font-black text-primary tracking-[0.3em] uppercase">Tactical reserve requirement</p>
                <p className="text-6xl md:text-7xl font-black text-white tracking-tighter">
                  {formatCurrency(calculatedReserve, 'GBP')}
                </p>
                <p className="text-sm md:text-base text-muted-foreground font-medium leading-relaxed max-w-md">
                  <strong>Estimated</strong> Upfront Capital required to bridge the gap between Touchdown and your Initial Payday.
                </p>
              </div>

              <div className="w-full md:w-64 space-y-6 pt-2 relative z-10">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-primary tracking-widest opacity-80">Scaling profile</Label>
                  <Select value={calcStatus} onValueChange={setCalcStatus}>
                    <SelectTrigger className="h-12 bg-background/60 border-white/10 text-white font-bold text-base rounded-sm">
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
                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-sm border border-white/5">
                  <Calculator className="size-4 text-accent animate-pulse" />
                  <span className="text-[10px] font-black text-accent uppercase tracking-widest">Real-time projection</span>
                </div>
              </div>
            </div>

            {/* Bottom Part: The Itemised Registry */}
            <div className="p-6 md:p-8 bg-black/20">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {RESERVE_ITEMS.map((item) => (
                  <div key={item.id} className="glass p-5 space-y-3 bg-white/2 border-white/5 hover:border-primary/20 transition-all duration-500 rounded-sm">
                    <div className="flex items-center justify-between">
                      <div className="p-2 bg-primary/10 rounded-sm">{item.icon}</div>
                      <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">{item.num}</span>
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-[10px] font-black uppercase tracking-tight text-white/90">{item.label}</h4>
                      <p className="text-sm font-bold text-primary">
                        {formatCurrency(item.baseGbp * multiplier, 'GBP')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-4">
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 normal-case"><PlaneLanding className="size-5 text-primary" /> Upfront & hidden costs</h3>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed font-medium">Initial outlays for visa medicals, document legalisation, and housing deposits can create immediate fiscal strain. Most "settling-in" allowances arrive after these costs are incurred.</p>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 normal-case"><ShoppingCart className="size-5 text-primary" /> The IKEA test</h3>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed font-medium">"Unfurnished" often means zero appliances. Check local IKEA sites before arrival. A £1,000 allowance may only cover basic white goods, leaving no budget for furniture or comfort.</p>
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


'use client';

import React, { useState, useEffect } from 'react';
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
  ArrowRight,
  FileText,
  Wallet,
  Clock,
  Compass,
  Table as TableIcon,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

const RESERVE_BENCHMARKS = [
  { country: 'UAE', visa: '$1,100', rent: '$0 (School Paid)', furnishing: '$2,700 – $5,400', transport: '$350 – $500', connectivity: '$150 – $250', total: '$4,300+' },
  { country: 'China', visa: '$1,200', rent: '$0 (School Paid)', furnishing: '$500 – $1,200', transport: 'N/A (E-bike)', connectivity: '$40 – $80', total: '$1,740+' },
  { country: 'Japan', visa: '$1,300', rent: '$1,500 – $2,500', furnishing: '$1,700 – $2,700', transport: '$800 – $1,200', connectivity: '$80 – $150', total: '$5,380+' },
  { country: 'Spain', visa: '$900', rent: '$1,600 – $3,000', furnishing: '$800 – $1,500', transport: '$400 – $700', connectivity: '$70 – $120', total: '$3,770+' },
  { country: 'Thailand', visa: '$1,000', rent: '$1,000 – $1,800', furnishing: '$400 – $900', transport: '$400 – $600', connectivity: '$50 – $100', total: '$2,850+' },
  { country: 'Vietnam', visa: '$1,000', rent: '$600 – $1,200', furnishing: '$300 – $700', transport: '$100 (Scooter)', connectivity: '$30 – $60', total: '$2,030+' }
];

const BREAKDOWN_ITEMS = [
  {
    icon: <FileText className="size-4 text-primary" />,
    title: "Document Integrity",
    desc: "Legalisation, notary fees, and international courier logistics for entry visa processing."
  },
  {
    icon: <Wallet className="size-4 text-primary" />,
    title: "Housing Liquidity",
    desc: "Upfront first month's rent + security deposit for non-provided accommodation."
  },
  {
    icon: <Clock className="size-4 text-primary" />,
    title: "The 6-Week Gap",
    desc: "Daily survival costs (food, transport, telco) before the first full salary cycle."
  },
  {
    icon: <Compass className="size-4 text-primary" />,
    title: "Mission Setup",
    desc: "The 'IKEA Test'—initial appliances, bedding, and local connectivity installation."
  }
];

export default function PreparePage() {
  const [dateStamp, setDateStamp] = useState('');

  useEffect(() => {
    setDateStamp(new Date().toLocaleDateString('en-GB').replace(/\//g, '.'));
  }, []);

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
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-white normal-case"><Lock className="size-5 text-primary" /> NDA signal audit</CardTitle>
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

        {/* Section 2: Tactical Reserve Benchmarks */}
        <section className="space-y-8">
          <div className="space-y-4">
            <h2 className="text-2xl md:text-3xl font-black stamped-dossier text-white normal-case border-l-4 border-primary pl-4">The true cost of landing</h2>
            <p className="text-sm font-bold text-muted-foreground italic max-w-3xl leading-relaxed">
              Relocating abroad is rarely cost-neutral. Use this comparative registry to identify the upfront liquid capital required for the initial 6-week "gap month" before your first full salary cycle.
            </p>
          </div>
          
          <Card className="glass border-primary/20 bg-primary/5 rounded-sm overflow-hidden shadow-2xl">
            <CardHeader className="border-b border-white/5 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <TableIcon className="size-5 text-primary" />
                  <CardTitle className="text-base normal-case font-bold">Regional Entry Matrix (USD)</CardTitle>
                </div>
                {dateStamp && (
                  <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] border border-white/5 px-2 py-0.5 rounded-sm">
                    Ref: LFI.{dateStamp}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-white/5">
                    <TableRow className="border-b-white/5 hover:bg-transparent">
                      <TableHead className="text-[10px] font-black uppercase text-white tracking-widest h-12">Country</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-muted-foreground tracking-widest text-center">Visa & docs</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-muted-foreground tracking-widest text-center">Rent (1.5mo)</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-muted-foreground tracking-widest text-center">Furnishing</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-muted-foreground tracking-widest text-center">Transport</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-muted-foreground tracking-widest text-center">Connectivity</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-primary tracking-widest text-right pr-6">6-Week total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {RESERVE_BENCHMARKS.map((row, idx) => (
                      <TableRow key={idx} className="border-b-white/5 hover:bg-white/5 transition-colors">
                        <TableCell className="py-4 font-bold text-sm text-white">{row.country}</TableCell>
                        <TableCell className="text-center text-xs font-medium text-muted-foreground">{row.visa}</TableCell>
                        <TableCell className="text-center text-xs font-medium text-muted-foreground">{row.rent}</TableCell>
                        <TableCell className="text-center text-xs font-medium text-muted-foreground">{row.furnishing}</TableCell>
                        <TableCell className="text-center text-xs font-medium text-muted-foreground">{row.transport}</TableCell>
                        <TableCell className="text-center text-xs font-medium text-muted-foreground">{row.connectivity}</TableCell>
                        <TableCell className="text-right pr-6 font-black text-primary text-sm">{row.total}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {BREAKDOWN_ITEMS.map((item, idx) => (
              <div key={idx} className="glass p-5 space-y-3 bg-white/2 border-white/5 hover:border-primary/20 transition-all duration-500 rounded-sm">
                <div className="flex items-center justify-between">
                  <div className="p-2 bg-primary/10 rounded-sm">{item.icon}</div>
                  <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">0{idx + 1}</span>
                </div>
                <h4 className="text-xs font-black uppercase tracking-tight text-white/90">{item.title}</h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>

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

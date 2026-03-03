'use client';

import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { 
  Copy, 
  Check, 
  BarChart3, 
  ShieldAlert, 
  Loader2, 
  Download,
  AlertTriangle,
  TrendingUp,
  Scale,
  Users
} from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { School } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export default function ChurnCalculatorPage() {
  const [copied, setCopied] = useState(false);
  const firestore = useFirestore();
  const schoolsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'schools') : null),
    [firestore]
  );
  const { data: schools, isLoading } = useCollection<School>(schoolsQuery);

  const promptText = `Role: Senior Data Auditor for [leopardfishintel.com].

Task: Calculate the Growth-Adjusted Staff Churn Index (GASCI) for [Insert School Name].

Step 0: Headcount Delta
Identify Teacher Headcount in Year T-1 (e.g., 2024) and Year T (2025).
Calculate Growth Seats: (Year T Headcount) minus (Year T-1 Headcount). If the number is negative, treat Growth Seats as 0.

Step 1: Vacancy Audit
Count all unique subject-specific vacancies advertised for the August start.
Deduplication Rule: Multiple ads for the same "Maths Teacher" role for the same start date = 1 vacancy.

Step 2: Adjusted Churn Calculation
Formula: (Total Unique Vacancies - Growth Seats) ÷ (Year T-1 Headcount).
This represents the "Replacement Rate."

Step 3: Leadership & Stability Check
Check for "Mid-Contract Breaks" (ads appearing for immediate starts in Oct/Nov or Feb/March).

Assign a Stability Tier:
0-12% = Fortress
13-20% = Stable
21-30% = Volatile
31%+ = High Risk

Output Format (JSON for Sheets Import):
{
"School": "[Name]",
"Previous_Headcount": [Number],
"Current_Headcount": [Number],
"Growth_Seats": [Number],
"Total_Vacancies": [Number],
"Adjusted_Churn_Rate": "[%]",
"Stability_Tier": "[Tier]",
"Audit_Notes": "[Briefly explain any mid-year vacancies found]"
}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(promptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getTierColor = (tier?: string) => {
    switch (tier) {
      case 'Fortress': return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'Stable': return 'text-sky-400 bg-sky-500/10 border-sky-500/20';
      case 'Volatile': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'High Risk': return 'text-red-400 bg-red-500/10 border-red-500/20';
      default: return 'text-muted-foreground border-white/10';
    }
  };

  return (
    <div className="container mx-auto px-4 md:px-6 py-12">
      <div className="mb-16 text-center space-y-4">
        <h1 className="text-3xl md:text-5xl font-black tracking-tighter normal-case">Stability audit registry</h1>
        <p className="text-muted-foreground max-w-3xl mx-auto font-medium leading-relaxed uppercase text-xs tracking-widest opacity-60">
          Professional institutional audit protocol for identifying mission-critical retention risk.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">
        <div className="lg:col-span-5 space-y-6">
          <Card className="glass border-primary/30 h-full">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-primary normal-case">
                <ShieldAlert className="size-5" /> The GASCI auditor prompt
              </CardTitle>
              <CardDescription className="text-xs font-medium leading-relaxed">
                Copy this tactical prompt into Gemini or ChatGPT alongside school inspection reports or job board data to generate a Growth-Adjusted audit.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative group">
                <div className="absolute top-2 right-2 z-10">
                  <Button size="icon" variant="ghost" onClick={handleCopy} className="h-8 w-8 hover:bg-white/10">
                    {copied ? <Check className="size-4 text-green-400" /> : <Copy className="size-4" />}
                  </Button>
                </div>
                <pre className="bg-background/50 border border-white/10 p-4 rounded-sm text-[10px] text-muted-foreground font-mono leading-relaxed whitespace-pre-wrap h-[350px] overflow-y-auto">
                  {promptText}
                </pre>
              </div>
              <div className="p-4 bg-accent/5 border border-accent/20 rounded-sm flex items-start gap-3">
                <Scale className="size-4 text-accent shrink-0 mt-0.5" />
                <p className="text-[11px] text-muted-foreground leading-tight font-medium">
                  <strong>Growth adjustment:</strong> This protocol distinguishes between 'Expansion Churn' (adding new seats) and 'Replacement Churn' (losing existing staff). Only replacement churn flags risk.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass p-6 rounded-sm space-y-3 border-white/5 bg-white/2 hover:border-primary/20 transition-all duration-500 group h-full">
            <div className="p-3 bg-white/5 w-fit rounded-sm group-hover:bg-primary/10 transition-colors"><Users className="size-5 text-sky-400" /></div>
            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-white">Headcount delta</h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">Identifying the net difference in faculty size between years. Essential for isolating growth from genuine attrition.</p>
          </div>
          <div className="glass p-6 rounded-sm space-y-3 border-white/5 bg-white/2 hover:border-primary/20 transition-all duration-500 group h-full">
            <div className="p-3 bg-white/5 w-fit rounded-sm group-hover:bg-primary/10 transition-colors"><TrendingUp className="size-5 text-green-400" /></div>
            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-white">Replacement rate</h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">Formula: (Total Vacancies - Growth Seats) / Total Staff. Measures how many staff are being replaced, not added.</p>
          </div>
          <div className="glass p-6 rounded-sm space-y-3 border-white/5 bg-white/2 hover:border-primary/20 transition-all duration-500 group h-full">
            <div className="p-3 bg-white/5 w-fit rounded-sm group-hover:bg-primary/10 transition-colors"><AlertTriangle className="size-5 text-red-400" /></div>
            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-white">Mid-contract breaks</h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">Toxic churn indicator. Identifying ads for immediate mid-year starts, suggesting unmanaged exits.</p>
          </div>
          <div className="glass p-6 rounded-sm space-y-3 border-white/5 bg-white/2 hover:border-primary/20 transition-all duration-500 group h-full">
            <div className="p-3 bg-white/5 w-fit rounded-sm group-hover:bg-primary/10 transition-colors"><BarChart3 className="size-5 text-primary" /></div>
            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-white">Fortress vs High risk</h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">A quantitative tier system from 'Fortress' (0-12%) to 'High Risk' (31%+) based on verified replacement data.</p>
          </div>
        </div>
      </div>

      <Card className="glass border-white/5 overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 py-4">
          <div>
            <CardTitle className="text-lg normal-case">Stability registry</CardTitle>
            <CardDescription className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60">GASCI audited replacement rates across the network</CardDescription>
          </div>
          <Button variant="outline" size="sm" className="h-8 border-white/10 text-[10px] font-black uppercase tracking-widest">
            <Download className="size-3 mr-2" /> Export registry
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-24 flex flex-col items-center justify-center space-y-4 opacity-30">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="text-xs font-black uppercase tracking-widest">Initialising audit ledger...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-white/2">
                  <TableRow className="border-b-white/5 hover:bg-transparent">
                    <TableHead className="text-[10px] font-black uppercase text-muted-foreground tracking-widest h-12">School signature</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-muted-foreground tracking-widest text-center">Prev HC</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-muted-foreground tracking-widest text-center">Curr HC</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-muted-foreground tracking-widest text-center">Vacancies</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-muted-foreground tracking-widest text-center">GASCI %</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-muted-foreground tracking-widest text-center">Stability tier</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-muted-foreground tracking-widest text-right pr-6">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schools?.map((school) => {
                    const m = (school as any).stabilityMetrics;
                    return (
                      <TableRow key={school.id} className="border-b-white/5 hover:bg-white/5 transition-colors">
                        <TableCell className="py-4">
                          <p className="text-sm font-bold text-white">{school.name}</p>
                          <p className="text-[10px] font-medium text-muted-foreground/60 uppercase">{school.location}, {school.country}</p>
                        </TableCell>
                        <TableCell className="text-center font-bold text-sm">{m?.previousHeadcount ?? '—'}</TableCell>
                        <TableCell className="text-center font-bold text-sm">{m?.currentHeadcount ?? '—'}</TableCell>
                        <TableCell className="text-center font-bold text-sm">{m?.totalVacancies ?? '—'}</TableCell>
                        <TableCell className="text-center">
                          <span className={cn(
                            "text-lg font-black tracking-tighter",
                            (m?.adjustedChurnRate ?? 0) <= 12 ? "text-green-400" : (m?.adjustedChurnRate ?? 0) <= 20 ? "text-sky-400" : "text-amber-400"
                          )}>
                            {m?.adjustedChurnRate ?? '—'}%
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={cn("text-[9px] font-black uppercase rounded-sm border px-2 py-0.5", getTierColor(m?.stabilityTier))}>
                            {m?.stabilityTier ?? 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          {m?.redFlagAlert ? (
                            <div className="flex items-center justify-end gap-2 text-red-400 animate-pulse">
                              <AlertTriangle className="size-3" />
                              <span className="text-[9px] font-black uppercase tracking-widest cursor-help">Toxic churn</span>
                            </div>
                          ) : (
                            <span className="text-[9px] font-black uppercase tracking-widest text-green-500/60">Operational</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

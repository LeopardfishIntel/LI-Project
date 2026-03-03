
'use client';

import React, { useState, useMemo } from 'react';
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
  History,
  Scale
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

  const promptText = `Role: You are a Senior Data Analyst for a global teacher recruitment intelligence platform. Your task is to calculate the Staff Churn Index (SCI) and Stability Score for [Insert School Name] for the 2025–2026 academic cycle.

Input Sources provided by User: > 1. Latest Inspection Report (ADEK/BSO/KHDA/CSI/WASC).
2. Historical Job Board Postings (TES/Schrole/LinkedIn) for the last 24 months.
3. LinkedIn Company Insights (Average Tenure).

Step 1: Data Normalization (Filter for Duplicates)
Identify all unique vacancies.
Rule: If a "Science Teacher" role is posted in Jan, Feb, and March for an August start, count this as ONE vacancy.
Rule: If a role is posted for a "January Start" mid-year, flag this as Mid-Contract Attrition (Toxic Churn).

Step 2: Calculate Primary Metrics
Crude Turnover Rate (CTR): (Unique Leavers ÷ Total Faculty) × 100.
The 5-Year Anchor Rate: Estimate % of staff with 5+ years tenure based on inspection mentions of "settled/long-term staff."
Leadership Continuity: Identify if the Head of School has been in post for <3 years (High Risk) or >5 years (Stabilizer).

Step 3: The Leopardfish Stability Score (0-100)
Assign a weighted score based on:
40%: Low CTR (<15% = High Score).
30%: Tenure/Anchor Rate (>30% = High Score).
30%: Leadership Stability.

Output Format (Table for Google Sheets Import):
| Field | Value | Confidence Level |
| :--- | :--- | :--- |`;

  const handleCopy = () => {
    navigator.clipboard.writeText(promptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getRatingColor = (rating?: string) => {
    switch (rating) {
      case 'Elite': return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'High': return 'text-sky-400 bg-sky-500/10 border-sky-500/20';
      case 'Medium': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'Low': return 'text-red-400 bg-red-500/10 border-red-500/20';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="container mx-auto px-4 md:px-6 py-12">
      <div className="mb-16 text-center space-y-4">
        <h1 className="text-3xl md:text-5xl font-black tracking-tighter normal-case">Staff churn & stability calculator</h1>
        <p className="text-muted-foreground max-w-3xl mx-auto font-medium leading-relaxed uppercase text-xs tracking-widest opacity-60">
          Professional institutional audit protocol for identifying mission-critical retention risk.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">
        <div className="lg:col-span-5 space-y-6">
          <Card className="glass border-primary/30 h-full">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-primary normal-case">
                <ShieldAlert className="size-5" /> The Leopardfish auditor prompt
              </CardTitle>
              <CardDescription className="text-xs font-medium leading-relaxed">
                Copy this tactical prompt into Gemini or ChatGPT alongside a school's latest inspection report or job history to generate a stability audit.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative group">
                <div className="absolute top-2 right-2 z-10">
                  <Button size="icon" variant="ghost" onClick={handleCopy} className="h-8 w-8 hover:bg-white/10">
                    {copied ? <Check className="size-4 text-green-400" /> : <Copy className="size-4" />}
                  </Button>
                </div>
                <pre className="bg-background/50 border border-white/5 p-4 rounded-sm text-[10px] text-muted-foreground font-mono leading-relaxed whitespace-pre-wrap h-[300px] overflow-y-auto">
                  {promptText}
                </pre>
              </div>
              <div className="p-4 bg-accent/5 border border-accent/20 rounded-sm flex items-start gap-3">
                <AlertTriangle className="size-4 text-accent shrink-0 mt-0.5" />
                <p className="text-[11px] text-muted-foreground leading-tight font-medium">
                  <strong>Normalization rule:</strong> AI agents are instructed to ignore duplicate postings within a 3-month recruitment window to ensure "Crude Turnover" isn't inflated by repeated ads.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-6">
          <StatHighlight 
            icon={<TrendingUp className="size-5 text-green-400" />}
            title="CTR (Crude Turnover)"
            desc="The percentage of faculty leaving annually. Targets below 15% indicate a stable institutional mission."
          />
          <StatHighlight 
            icon={<Scale className="size-5 text-sky-400" />}
            title="5-Year anchor rate"
            desc="Percentage of staff with 5+ years tenure. High anchor rates suggest competitive packages and healthy culture."
          />
          <StatHighlight 
            icon={<History className="size-5 text-amber-400" />}
            title="Leadership tenure"
            desc="Head of School stability. Tenure <3 years is a high-risk indicator for pending policy shifts."
          />
          <StatHighlight 
            icon={<BarChart3 className="size-5 text-primary" />}
            title="The stability score"
            desc="A weighted index (0-100) combining CTR, Anchor, and Continuity metrics for field-grade due diligence."
          />
        </div>
      </div>

      <Card className="glass border-white/5 overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 py-4">
          <div>
            <CardTitle className="text-lg normal-case">Stability registry</CardTitle>
            <CardDescription className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60">Real-time audit results across the network</CardDescription>
          </div>
          <Button variant="outline" size="sm" className="h-8 border-white/10 text-[10px] font-black uppercase tracking-widest">
            <Download className="size-3 mr-2" /> Export to csv
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-24 flex flex-col items-center justify-center space-y-4 opacity-30">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="text-xs font-black uppercase tracking-widest">Accessing master registry...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-white/2">
                  <TableRow className="border-b-white/5 hover:bg-transparent">
                    <TableHead className="text-[10px] font-black uppercase text-muted-foreground tracking-widest h-12">School signature</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-muted-foreground tracking-widest text-center">CTR %</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-muted-foreground tracking-widest text-center">Anchor %</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-muted-foreground tracking-widest text-center">Leadership</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-muted-foreground tracking-widest text-center">Stability score</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-muted-foreground tracking-widest text-center">Rating</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-muted-foreground tracking-widest text-right pr-6">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schools?.map((school) => {
                    const metrics = school.stabilityMetrics;
                    return (
                      <TableRow key={school.id} className="border-b-white/5 hover:bg-white/5 transition-colors">
                        <TableCell className="py-4">
                          <p className="text-sm font-bold text-white">{school.name}</p>
                          <p className="text-[10px] font-medium text-muted-foreground/60 uppercase">{school.location}, {school.country}</p>
                        </TableCell>
                        <TableCell className="text-center font-bold text-sm">{metrics?.crudeTurnoverRate ?? '—'}%</TableCell>
                        <TableCell className="text-center font-bold text-sm">{metrics?.fiveYearAnchorRate ?? '—'}%</TableCell>
                        <TableCell className="text-center font-bold text-sm">{metrics?.leadershipTenure ?? '—'} yrs</TableCell>
                        <TableCell className="text-center">
                          <span className={cn(
                            "text-lg font-black tracking-tighter",
                            (metrics?.stabilityScore ?? 0) > 85 ? "text-green-400" : (metrics?.stabilityScore ?? 0) > 70 ? "text-sky-400" : "text-amber-400"
                          )}>
                            {metrics?.stabilityScore ?? '—'}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={cn("text-[9px] font-black uppercase rounded-sm border px-2 py-0.5", getRatingColor(metrics?.stabilityRating))}>
                            {metrics?.stabilityRating ?? 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          {metrics?.redFlagAlert ? (
                            <PopoverAlert content={metrics.redFlagReasoning} />
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

function StatHighlight({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="glass p-6 rounded-sm space-y-3 border-white/5 bg-white/2 hover:border-primary/20 transition-all duration-500 group h-full">
      <div className="p-3 bg-white/5 w-fit rounded-sm group-hover:bg-primary/10 transition-colors">{icon}</div>
      <h4 className="text-xs font-black uppercase tracking-[0.2em] text-white">{title}</h4>
      <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">{desc}</p>
    </div>
  );
}

function PopoverAlert({ content }: { content?: string }) {
  return (
    <div className="flex items-center justify-end gap-2 text-red-400 animate-pulse">
      <AlertTriangle className="size-3" />
      <span className="text-[9px] font-black uppercase tracking-widest cursor-help" title={content}>Toxicity risk</span>
    </div>
  );
}

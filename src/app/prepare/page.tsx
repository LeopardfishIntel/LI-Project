 "use client";

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
  PencilLine,
  CheckCircle2,
  Info,
  Loader2,
  Trophy
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { cn, formatCurrency } from '@/lib/utils';
// Protocol: Using centralized Isomorphic Bridge
import { useCollection, useFirestore, useMemoFirebase, db } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { School } from '@/lib/types';
import { getRentForFamily, type FamilyStatus } from '@/lib/rent-calculator';

const noSpinners = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

const SCALING_MULTIPLIERS: Record<string, number> = {
  single: 1,
  couple: 1.6,
  family: 2.1,
  family2: 2.5
};

export default function PreparePage() {
  const { data: schools, isLoading: isLoadingSchools } = useCollection<School>('schools');

  const [calcStatus, setCalcStatus] = useState<string>('single');
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  
  const [budget, setBudget] = useState({
    docs: 500,
    housing: 2000,
    expenditure: 1000,
    comforts: 500
  });

  const selectedSchool = useMemo(() => {
    if (!selectedSchoolId || !schools) return null;
    return schools.find(s => s.id === selectedSchoolId);
  }, [selectedSchoolId, schools]);

  useEffect(() => {
    const multiplier = SCALING_MULTIPLIERS[calcStatus] || 1;
    
    let rentEstimate = 2000;
    if (selectedSchool) {
      // FIXED: Tactical Guard for nested properties
      if (selectedSchool.intel?.housing?.provided) {
        rentEstimate = 0;
      } else {
        // Fallback to avoid crash if costOfLiving is missing
        const { rent } = getRentForFamily(selectedSchool.costOfLiving || {}, calcStatus as FamilyStatus);
        rentEstimate = Math.round(rent * 2); 
      }
    }

    setBudget({
      docs: Math.round(500 * multiplier),
      housing: Math.round(rentEstimate),
      expenditure: Math.round(1000 * multiplier),
      comforts: Math.round(500 * multiplier)
    });
  }, [calcStatus, selectedSchool]);

  const totalReserve = useMemo(() => {
    return budget.docs + budget.housing + budget.expenditure + budget.comforts;
  }, [budget]);

  const budgetItems = [
    { id: 'docs', label: 'Visa and documentation' },
    { id: 'housing', label: 'Rent and deposit' },
    { id: 'expenditure', label: 'Daily expenditure - 6 weeks' },
    { id: 'comforts', label: 'Basic home comforts' },
  ];

  if (isLoadingSchools) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#020617]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 md:px-6 py-12 text-white font-body bg-[#020617]">
      <div className="mb-12 text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white uppercase italic">
          4. Prepare for deployment
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto font-bold text-[10px] leading-relaxed uppercase tracking-[0.4em] opacity-60">
          Professional educator due diligence and risk assessment.
        </p>
      </div>

      <div className="max-w-5xl mx-auto space-y-16">
        {/* Material Risks Section */}
        <section className="space-y-8">
          <div className="space-y-4">
            <h2 className="text-2xl md:text-3xl font-black text-white uppercase italic border-l-4 border-primary pl-4 tracking-tighter">Material risks</h2>
            <p className="text-sm font-bold text-muted-foreground italic max-w-3xl leading-relaxed">
              International school contracts evolve annually. Conduct a forensic review of your specific terms for the following risks.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-[#1f2937]/50 backdrop-blur-md border-white/10 hover:border-primary/30 transition-colors">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
                <CardTitle className="text-lg font-black text-white uppercase tracking-tighter flex items-center gap-3">
                  <Lock className="size-5 text-primary" /> NDA Clauses
                </CardTitle>
                <Flag className="size-4 fill-red-500 text-red-500" />
              </CardHeader>
              <CardContent className="text-sm text-[#94a3b8] leading-relaxed font-bold">
                <p>Audit your contract for over-zealous non-disclosure agreements. A school that threatens legal recourse for discussing its internal climate is signalling systemic insecurity.</p>
              </CardContent>
            </Card>

            <Card className="bg-[#1f2937]/50 backdrop-blur-md border-white/10 hover:border-primary/30 transition-colors">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
                <CardTitle className="text-lg font-black text-white uppercase tracking-tighter flex items-center gap-3">
                  <Banknote className="size-5 text-primary" /> Scale Ambiguity
                </CardTitle>
                <Flag className="size-4 fill-red-500 text-red-500" />
              </CardHeader>
              <CardContent className="text-sm text-[#94a3b8] leading-relaxed font-bold">
                <p>Professional institutions use transparent pay scales. Refusal to show your position on a scale suggests you are being low-balled compared to the institutional baseline.</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Tactical Budget Section */}
        <section className="space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-4">
              <h2 className="text-2xl md:text-3xl font-black text-white uppercase italic border-l-4 border-primary pl-4 tracking-tighter">Tactical landing cost</h2>
              <p className="text-sm font-bold text-muted-foreground italic max-w-3xl leading-relaxed">
                Upfront capital required to bridge the gap between touchdown and your initial payday.
              </p>
            </div>
          </div>
          
          <div className="bg-[#1f2937]/70 backdrop-blur-xl border border-white/10 rounded-sm shadow-2xl overflow-hidden flex flex-col">
            <div className="p-8 md:p-12 flex flex-col md:flex-row gap-12 items-center md:items-start border-b border-white/5 relative">
              <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12 pointer-events-none">
                <Calculator className="size-48 text-white" />
              </div>
              
              <div className="flex-1 space-y-4 relative z-10">
                <p className="text-[10px] font-black text-primary tracking-[0.4em] uppercase">Target Reserve</p>
                <p className="text-6xl md:text-7xl font-black text-white tracking-tighter italic">
                  {formatCurrency(totalReserve, 'GBP')}
                </p>
              </div>

              <div className="w-full md:w-72 space-y-5 relative z-10">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-primary tracking-widest">Operative Profile</Label>
                  <Select value={calcStatus} onValueChange={setCalcStatus}>
                    <SelectTrigger className="bg-black/40 border-white/10 text-white font-black uppercase text-xs h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1f2937] border-white/10 text-white">
                      <SelectItem value="single">Single Agent</SelectItem>
                      <SelectItem value="couple">Couple</SelectItem>
                      <SelectItem value="family">Family (2+1)</SelectItem>
                      <SelectItem value="family2">Family (2+2)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-primary tracking-widest">Target Dossier</Label>
                  <Select value={selectedSchoolId ?? ''} onValueChange={setSelectedSchoolId}>
                    <SelectTrigger className="bg-black/40 border-white/10 text-white font-black uppercase text-xs h-12">
                      <SelectValue placeholder="Select target..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1f2937] border-white/10 text-white">
                      {schools?.map(s => <SelectItem key={s.id} value={s.id}>{s.name.toUpperCase()}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Budget Adjustment Grid */}
            <div className="p-8 bg-black/40">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {budgetItems.map((item) => (
                  <div key={item.id} className="space-y-3">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-[#94a3b8] leading-tight">{item.label}</h4>
                    <div className="flex items-center gap-3 bg-black/40 border border-white/10 rounded-sm px-4 py-2">
                      <span className="text-lg font-black text-primary">£</span>
                      <Input 
                        type="number"
                        value={budget[item.id as keyof typeof budget]}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setBudget(prev => ({ ...prev, [item.id]: val }));
                        }}
                        className={cn("bg-transparent border-0 h-10 p-0 text-2xl font-black text-white focus-visible:ring-0 shadow-none", noSpinners)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Final Strategy CTA */}
        <div className="flex justify-center pt-12 pb-24">
            <Button asChild size="lg" className="h-16 px-12 bg-primary hover:bg-orange-600 text-white font-black uppercase tracking-widest italic rounded-sm shadow-2xl transition-all hover:scale-105">
                <Link href="/prepare/checklist">
                  <CheckCircle2 className="mr-3 size-6" /> ACCESS CHECKLIST
                </Link>
            </Button>
        </div>
      </div>
    </div>
  );
}
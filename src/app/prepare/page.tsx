 "use client";

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { 
  Lock, Banknote, Flag, LineChart, Calculator, ArrowRight, 
  CheckCircle2, Loader2, ShieldAlert, Zap, ShoppingCart,
  Home, Clock, Wallet
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { cn, formatCurrency } from '@/lib/utils';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';

const noSpinners = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

// 📈 UPDATED: Granular Scaling Multipliers to match your new dropdown
const STATUS_MULTIPLIERS: Record<string, number> = {
  "single": 1.0,
  "married-sole": 1.5,
  "married-dual": 1.6, 
  "family-1": 1.9,
  "family-2": 2.3,
  "family-3": 3.0 // 🚀 Scaled for 3+ children
};

export default function PreparePage() {
  const firestore = useFirestore();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const { data: schools, isLoading: isLoadingSchools } = useCollection<any>(
    useMemoFirebase(() => (mounted && firestore ? collection(firestore, 'schools') : null), [firestore, mounted])
  );

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

  // 🧮 1. RESTORED: Tactical Scaling Logic
  useEffect(() => {
    const multiplier = STATUS_MULTIPLIERS[calcStatus] || 1;
    let rentEstimate = 2000 * multiplier;

    if (selectedSchool) {
      const provision = selectedSchool.housingprovision?.toLowerCase() || "";
      if (provision.includes('provided')) rentEstimate = 0;
      else if (provision.includes('subsidised')) rentEstimate = 1000 * multiplier;
    }

    setBudget({
      docs: Math.round(500 * multiplier),
      housing: Math.round(rentEstimate),
      expenditure: Math.round(1000 * multiplier),
      comforts: Math.round(500 * multiplier) // 🏠 The IKEA Test
    });
  }, [calcStatus, selectedSchool]);

  const totalReserve = useMemo(() => budget.docs + budget.housing + budget.expenditure + budget.comforts, [budget]);

  if (!mounted || isLoadingSchools) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#020617]">
        <Loader2 className="h-10 w-10 animate-spin text-[#f97316]" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 md:px-12 py-12 text-white bg-[#020617] min-h-screen font-sans selection:bg-[#f97316]">
      
      <div className="mb-16 space-y-4">
        <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-white uppercase italic leading-none">
          Tactical <span className="text-[#f97316]">Preparation.</span>
        </h1>
        <p className="text-[#94a3b8] font-black uppercase text-[10px] tracking-[0.4em] opacity-60">
          Phase 4: Operational due diligence and capital reserve mapping.
        </p>
      </div>

      <div className="max-w-6xl mx-auto space-y-20">
        
        {/* 2. RESTORED: MATERIAL RISK SIGNALS */}
        <section className="space-y-8">
          <div className="flex items-center gap-4 border-l-4 border-[#f97316] pl-6">
            <ShieldAlert className="size-8 text-[#f97316]" />
            <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">Material Risks</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-[#0b1224] border-white/5 hover:border-[#f97316]/30 transition-all group">
              <CardHeader className="flex flex-row items-start justify-between pb-4">
                <CardTitle className="text-lg font-black text-white uppercase tracking-tighter flex items-center gap-3">
                  <Lock className="size-5 text-[#f97316]" /> NDA Clauses
                </CardTitle>
                <Flag className="size-5 fill-rose-600 text-rose-600 animate-pulse" />
              </CardHeader>
              <CardContent className="text-[12px] text-slate-400 leading-relaxed font-bold uppercase tracking-tight">
                <p>Forensic audit required. Schools that threaten legal recourse for climate discussion signal systemic volatility and low psychological safety.</p>
              </CardContent>
            </Card>

            <Card className="bg-[#0b1224] border-white/5 hover:border-[#f97316]/30 transition-all">
              <CardHeader className="flex flex-row items-start justify-between pb-4">
                <CardTitle className="text-lg font-black text-white uppercase tracking-tighter flex items-center gap-3">
                  <Banknote className="size-5 text-[#f97316]" /> Scale Ambiguity
                </CardTitle>
                <Flag className="size-5 text-[#f97316]" />
              </CardHeader>
              <CardContent className="text-[12px] text-slate-400 leading-relaxed font-bold uppercase tracking-tight">
                <p>Refusal to declare a specific point on a transparent institutional scale is a red signal. Suggests arbitrary salary bands.</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* 3. RESTORED: LANDING CALCULATOR WITH NEW STATUSES */}
        <section className="space-y-8">
          <div className="flex items-center gap-4 border-l-4 border-sky-400 pl-6">
            <Calculator className="size-8 text-sky-400" />
            <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">Landing Cost Reserve</h2>
          </div>
          
          <div className="bg-[#0b1224] border border-white/10 rounded-sm shadow-2xl flex flex-col overflow-hidden">
            <div className="p-10 flex flex-col lg:flex-row gap-12 items-center lg:items-end border-b border-white/5 relative bg-gradient-to-br from-[#0b1224] to-[#020617]">
              <div className="absolute top-0 right-0 p-8 opacity-5 rotate-12 pointer-events-none text-white">
                <Zap className="size-64" />
              </div>
              
              <div className="flex-1 space-y-4 relative z-10 text-center lg:text-left">
                <p className="text-[11px] font-black text-[#f97316] tracking-[0.5em] uppercase">Target Reserve Fund</p>
                <p className="text-7xl md:text-9xl font-black text-white tracking-tighter italic leading-none">
                  {formatCurrency(totalReserve, 'GBP')}
                </p>
              </div>

              <div className="w-full lg:w-80 space-y-6 relative z-10">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-sky-400 tracking-widest">Operative Profile</Label>
                  <Select value={calcStatus} onValueChange={setCalcStatus}>
                    <SelectTrigger className="bg-black/60 border-white/10 text-white font-black h-12 uppercase text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0b1224] border-white/10 text-white font-bold uppercase text-xs">
                      <SelectItem value="single">single</SelectItem>
                      <SelectItem value="married-sole">married (sole earner)</SelectItem>
                      <SelectItem value="married-dual">married (dual income)</SelectItem>
                      <SelectItem value="family-1">family (1 child)</SelectItem>
                      <SelectItem value="family-2">family (2 children)</SelectItem>
                      <SelectItem value="family-3">family (3 or more)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-sky-400 tracking-widest">Target Asset</Label>
                  <Select value={selectedSchoolId ?? ''} onValueChange={setSelectedSchoolId}>
                    <SelectTrigger className="bg-black/60 border-white/10 text-white font-black h-12 uppercase text-xs">
                      <SelectValue placeholder="Select target..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0b1224] border-white/10 text-white font-bold uppercase text-xs">
                      {schools?.map(s => <SelectItem key={s.id} value={s.id}>{s.schoolname?.toUpperCase()}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="p-10 bg-black/60 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { id: 'docs', label: 'Visas & Documentation', icon: Clock },
                { id: 'housing', label: 'Rent & Deposit', icon: Home },
                { id: 'expenditure', label: '6-Week Living Gap', icon: Wallet },
                { id: 'comforts', label: 'Home Setup (IKEA Test)', icon: ShoppingCart }
              ].map((item) => (
                <div key={item.id} className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                    <item.icon className="size-3 text-sky-400" />
                    {item.label}
                  </h4>
                  <div className="flex items-center gap-3 bg-black/40 border border-white/10 rounded-sm px-4 py-3">
                    <span className="text-xl font-black text-[#f97316]">£</span>
                    <Input 
                      type="number"
                      value={budget[item.id as keyof typeof budget]}
                      onChange={(e) => setBudget(prev => ({ ...prev, [item.id]: parseInt(e.target.value) || 0 }))}
                      className={cn("bg-transparent border-0 h-10 p-0 text-3xl font-black text-white focus-visible:ring-0 shadow-none", noSpinners)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 4. RESTORED: DOSSIER ACTION UNIT */}
        <div className="flex flex-col md:flex-row justify-center gap-8 pt-10 pb-32">
            <Button asChild size="lg" className="h-20 px-12 bg-white text-black hover:bg-sky-400 hover:text-white font-black uppercase tracking-widest italic rounded-sm transition-all shadow-2xl">
                <Link href="/prepare/budget-briefing">
                  <LineChart className="mr-3 size-6" /> Budget Briefing
                </Link>
            </Button>
            <Button asChild size="lg" className="h-20 px-12 bg-[#f97316] hover:bg-white hover:text-black text-white font-black uppercase tracking-widest italic rounded-sm transition-all shadow-2xl">
                <Link href="/prepare/checklist">
                  <CheckCircle2 className="mr-3 size-6" /> Strategic Checklist
                </Link>
            </Button>
        </div>
      </div>
    </div>
  );
}
"use client";

import React, { useState, useMemo, useEffect, ChangeEvent } from 'react';
import { 
  Lock, Banknote, Loader2, Zap, ShoppingCart,
  Home, Clock, Wallet, Car, Ship, CalendarDays, 
  FileText, Landmark, MapPin, Navigation, ArrowRight,
  Stethoscope, Download, Info, Coins, Package, Monitor, Baby,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { cn, formatCurrency } from '@/lib/utils';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { calculateBudget, canonicalCountry, RATES } from '@/lib/calculations';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';



export default function PreparePage() {
  const firestore = useFirestore();
  const [mounted, setMounted] = useState(false);

  // 🕹️ State
  const [calcStatus, setCalcStatus] = useState<string>('single');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [doYouDrive, setDoYouDrive] = useState<boolean>(true);
  const [setupDays, setSetupDays] = useState<string>('45'); 
  const [arrivalAllowance, setArrivalAllowance] = useState<number>(0);
  const [monthlyCommitments, setMonthlyCommitments] = useState<number>(0);
  const [hasLoadedMemory, setHasLoadedMemory] = useState(false);
  const [currency, setCurrency] = useState<string>('GBP');
  const [baggageCount, setBaggageCount] = useState<number>(0);
  const [baggageOverride, setBaggageOverride] = useState<number | null>(null);
  const [shippingCost, setShippingCost] = useState<number>(2000);
  const [uniformOverride, setUniformOverride] = useState<number | null>(null);
  const [electronicsTotal, setElectronicsTotal] = useState<number>(500);
  const [showDependents, setShowDependents] = useState(false);

  // 🛰️ Data
  const { data: schools, isLoading: isLoadingSchools } = useCollection<any>(
    useMemoFirebase(() => (mounted && firestore ? collection(firestore, 'schools') : null), [firestore, mounted])
  );
  const { data: cities } = useCollection<any>(
    useMemoFirebase(() => (mounted && firestore ? collection(firestore, 'locations_costOfLiving') : null), [firestore, mounted])
  );
  const { data: requirements } = useCollection<any>(
    useMemoFirebase(() => (mounted && firestore ? collection(firestore, 'teacher_requirements') : null), [firestore, mounted])
  );

  // 💾 Memory
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('leopardfish-prep-state');
    if (saved) {
      const parsed = JSON.parse(saved);
      setCalcStatus(parsed.calcStatus || 'single');
      setSelectedCountry(parsed.selectedCountry || 'all');
      setSelectedSchoolId(parsed.selectedSchoolId || null);
      setDoYouDrive(parsed.doYouDrive ?? true);
      setSetupDays(parsed.setupDays || '45');
      setArrivalAllowance(parsed.arrivalAllowance || 0);
      setMonthlyCommitments(parsed.monthlyCommitments || 0);
      setBaggageCount(parsed.baggageCount || 0);
      setBaggageOverride(parsed.baggageOverride ?? null);
      setShippingCost(parsed.shippingCost ?? 2000);
      setUniformOverride(parsed.uniformOverride ?? null);
      setElectronicsTotal(parsed.electronicsTotal ?? 500);
    }
    setHasLoadedMemory(true);
  }, []);

  useEffect(() => {
    if (hasLoadedMemory) {
      localStorage.setItem('leopardfish-prep-state', JSON.stringify({ 
        calcStatus, selectedCountry, selectedSchoolId, doYouDrive, setupDays, arrivalAllowance, monthlyCommitments,
        baggageCount, baggageOverride, shippingCost, uniformOverride, electronicsTotal
      }));
    }
  }, [calcStatus, selectedCountry, selectedSchoolId, doYouDrive, setupDays, arrivalAllowance, monthlyCommitments, baggageCount, baggageOverride, shippingCost, uniformOverride, electronicsTotal, hasLoadedMemory]);

  // 🏎️ Filters — country list driven by SCHOOLS (not cities), matching other pages
  const availableCountries = useMemo(() => {
    if (!schools) return [];
    return Array.from(new Set(schools.map((s: any) => s.country).filter(Boolean))).sort() as string[];
  }, [schools]);

  const filteredSchools = useMemo(() => {
    if (!schools) return [];
    if (!selectedCountry || selectedCountry === 'all') return schools;
    return schools.filter((s: any) => canonicalCountry(s.country) === canonicalCountry(selectedCountry));
  }, [selectedCountry, schools]);

  const countryIntel = useMemo(() => {
    if (!selectedCountry || selectedCountry === 'all' || !cities) return null;
    const canon = canonicalCountry(selectedCountry);
    return cities.find((c: any) => canonicalCountry(c.country) === canon) || null;
  }, [selectedCountry, cities]);

  const selectedSchool = useMemo(() => schools?.find(s => s.id === selectedSchoolId), [selectedSchoolId, schools]);
  
  const cityData = useMemo(() => {
    if (!selectedSchool || !cities) return null;
    const schoolCity = (selectedSchool.city || '').toLowerCase().trim();
    return cities.find(c => (c.city || '').toLowerCase().trim() === schoolCity) || null;
  }, [selectedSchool, cities]);

  // Set default commitments from DB if available and not yet set
  useEffect(() => {
    if (cityData?.studentLoans && monthlyCommitments === 0) {
      setMonthlyCommitments(cityData.studentLoans);
    }
  }, [cityData]);

  // 🧮 Calculation Logic — uses shared engine
  const budget = useMemo(() => {
    return calculateBudget({
      calcStatus,
      selectedSchool,
      cityData,
      countryIntel,
      doYouDrive,
      setupDays,
      currency,
      monthlyCommitments,
      baggageCount,
      baggageOverride,
      shippingCost,
      uniformOverride,
      electronicsTotal
    });
  }, [calcStatus, selectedSchool, cityData, countryIntel, doYouDrive, setupDays, currency, monthlyCommitments, baggageCount, baggageOverride, shippingCost, uniformOverride, electronicsTotal]);

  const totalReserve = useMemo(() => {
    return Math.max(0, budget.total - arrivalAllowance);
  }, [budget.total, arrivalAllowance]);

  if (!mounted || isLoadingSchools) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-[#f97316]" /></div>;

  return (
    <div className="container mx-auto px-4 md:px-12 py-10 text-white bg-[#020617] min-h-screen font-sans">
      
      {/* Header */}
      <div className="mb-6 space-y-1">
        <h1 className="text-4xl md:text-6xl font-black tracking-tighter italic leading-none">
          Sorting your <span className="text-[#f97316]">start.</span>
        </h1>
        <p className="text-[#94a3b8] font-bold text-[11px] tracking-[0.2em] opacity-80 italic">Getting your ducks in a row before your first day in the classroom.</p>
      </div>

      <div className="max-w-7xl mx-auto space-y-5">
        
        {/* Tactical Warning Alert */}
        <div className="bg-amber-500/10 border border-amber-500/20 p-4 flex items-start gap-4 animate-in slide-in-from-top-4 duration-700">
          <AlertCircle className="size-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-[11px] font-black uppercase tracking-widest text-amber-500 italic">Tactical Warning: Regional Estimates</p>
            <p className="text-[10px] font-bold text-slate-400 italic leading-snug">
              Calculations are based on regional indices. School-specific benefits (like hotel stays or flight caps) can significantly shift these requirements. Verify your contract against the Field Manual below.
            </p>
          </div>
        </div>
        
        {/* ROW 1: Details & Dashboard (Height Matched) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          <div className="lg:col-span-4 flex">
            <Card className="bg-[#0b1224] border-white/10 p-6 w-full space-y-5 flex flex-col justify-center">
              <h3 className="text-[11px] font-black text-[#f97316] tracking-widest uppercase italic underline underline-offset-8 mb-2">Your details</h3>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-slate-500 italic">1. Which country?</Label>
                  <Select value={selectedCountry} onValueChange={(val: string) => { setSelectedCountry(val); setSelectedSchoolId(null); }}>
                    <SelectTrigger className="bg-black/40 border-white/10 h-10 text-[11px] font-black italic text-[#fafaf9]"><SelectValue placeholder="Select country..." /></SelectTrigger>
                    <SelectContent className="bg-[#0b1224] border-white/10 text-white font-bold text-xs">
                      <SelectItem value="all">Everywhere</SelectItem>
                      {availableCountries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-slate-500 italic">2. Which school?</Label>
                  <Select value={selectedSchoolId ?? ''} onValueChange={(val: string) => setSelectedSchoolId(val)}>
                    <SelectTrigger className="bg-black/40 border-white/10 h-10 text-[11px] font-black italic text-[#fafaf9]"><SelectValue placeholder="Pick your school..." /></SelectTrigger>
                    <SelectContent className="bg-[#0b1224] border-white/10 text-white font-bold text-xs">
                      {filteredSchools.map(s => <SelectItem key={s.id} value={s.id}>{s.schoolname}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 pt-2 border-t border-white/5">
                  <Label className="text-[10px] font-bold text-slate-500 italic">3. Family status</Label>
                  <Select value={calcStatus} onValueChange={(val: string) => setCalcStatus(val)}>
                    <SelectTrigger className="bg-black/40 border-white/10 h-10 text-[11px] font-black italic text-[#fafaf9]"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[#0b1224] border-white/10 text-white font-bold text-xs">
                      <SelectItem value="single">Single</SelectItem>
                      <SelectItem value="married-dual">Married (dual income)</SelectItem>
                      <SelectItem value="family-1">Family (1 child)</SelectItem>
                      <SelectItem value="family-2">Family (2 children)</SelectItem>
                      <SelectItem value="family-3">Family (3+ children)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 pt-2 border-t border-white/5">
                  <Label className="text-[10px] font-bold text-slate-500 italic">4. Home commitments?</Label>
                  <div className="relative">
                    <Coins className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-sky-400" />
                    <Input 
                      type="number" 
                      value={monthlyCommitments || ''} 
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setMonthlyCommitments(Number(e.target.value))}
                      placeholder="e.g. Student loans"
                      className="bg-black/40 border-white/10 h-10 pl-7 text-[11px] font-black italic text-[#fafaf9] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                  <p className="text-[8px] font-bold text-slate-600 italic">Include student loans or property costs back home.</p>
                </div>

                {/* 👶 Dependents Expandable (Conditional) */}
                {calcStatus !== 'single' && (
                  <div className="pt-2 border-t border-white/5 space-y-3">
                    <button 
                      onClick={() => setShowDependents(!showDependents)}
                      className="flex items-center justify-between w-full group"
                    >
                      <div className="flex items-center gap-2">
                        <Baby className="size-3 text-[#f97316]" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic group-hover:text-white transition-colors">Dependents costs</span>
                      </div>
                      {showDependents ? <ChevronUp className="size-3 text-slate-500" /> : <ChevronDown className="size-3 text-slate-500" />}
                    </button>

                    {showDependents && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-bold text-slate-500 italic">School uniform override?</Label>
                          <div className="relative">
                            <Coins className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-[#f97316]" />
                            <Input 
                              type="number" 
                              value={uniformOverride ?? ''} 
                              onChange={(e: ChangeEvent<HTMLInputElement>) => setUniformOverride(e.target.value ? Number(e.target.value) : null)}
                              placeholder={`Estimate: £${(budget.family / (RATES[budget.displayCurrency] || 1)).toFixed(0)} total`}
                              className="bg-black/40 border-white/10 h-10 pl-7 text-[11px] font-black italic text-[#fafaf9] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          </div>
                        </div>
                        <div className="bg-amber-500/5 border border-amber-500/10 p-3 rounded-sm space-y-1">
                          <div className="flex items-center gap-2">
                            <Info className="size-3 text-amber-500" />
                            <p className="text-[9px] font-black text-amber-500 uppercase italic">Childcare Alert</p>
                          </div>
                          <p className="text-[8px] font-bold text-slate-400 italic leading-snug">
                            Availability and rates vary wildly. Contact your school HR early to secure a spot and verify current subsidies.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          </div>

          <div className="lg:col-span-8 flex">
            <div className="bg-[#0b1224] border border-white/10 rounded-sm overflow-hidden shadow-2xl w-full flex flex-col">
              {/* 🏔️ DASHBOARD TOP: Primary Intelligence */}
              <div className="relative bg-gradient-to-br from-[#0b1224] to-[#020617] p-8 lg:p-12 border-b border-white/5 overflow-hidden">
                <Zap className="absolute -top-10 -right-10 size-96 opacity-[0.03] rotate-12 pointer-events-none text-white" />
                
                {/* 🛰️ DATA HIERARCHY */}
                {/* 🛰️ ROW 1: PRIMARY INTELLIGENCE */}
                <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-10">
                  
                  {/* Reserve Counter */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-3">
                      <p className="text-[11px] font-black text-[#f97316] tracking-[0.4em] uppercase leading-none italic whitespace-nowrap">Arrival & setup reserve</p>
                    </div>
                    <p className={cn(
                      "font-black italic tracking-tighter leading-none transition-all duration-300 drop-shadow-2xl",
                      totalReserve > 9999 ? "text-5xl lg:text-6xl" : "text-6xl lg:text-7xl"
                    )}>
                      {formatCurrency(totalReserve, budget.displayCurrency)}
                    </p>
                    
                    {/* Tactical Currency Switcher */}
                    <div className="flex bg-black/60 backdrop-blur-md rounded-none p-0.5 border border-white/10 w-fit mt-4">
                      {['GBP', 'USD', 'EUR', 'Local'].map((c) => (
                        <button
                          key={c}
                          disabled={c === 'Local' && selectedCountry === 'all'}
                          onClick={() => setCurrency(c)}
                          className={cn(
                            "px-3 py-1 text-[10px] font-black transition-all uppercase",
                            currency === c ? "bg-[#f97316] text-white" : "text-slate-500 hover:text-white disabled:opacity-20"
                          )}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Operational Inputs (Top Tier - Vertically Stacked) */}
                  <div className="flex flex-col gap-5 w-full lg:w-auto">
                    <div className="space-y-1.5 min-w-[200px]">
                      <Label className="text-[10px] font-bold text-slate-500 italic flex items-center gap-2 uppercase tracking-widest">
                        First payday? 
                        <div className="group relative">
                          <Info className="size-3 text-sky-400 cursor-help" />
                          <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-56 p-3 bg-black border border-white/10 rounded-sm text-[10px] font-bold text-slate-300 leading-tight italic opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-2xl">
                            Paperwork delays often push your first pay to the 60-day mark.
                          </div>
                        </div>
                      </Label>
                      <Select value={setupDays} onValueChange={(val: string) => setSetupDays(val)}>
                        <SelectTrigger className="bg-black/60 border-white/10 h-12 text-[11px] font-black italic text-[#fafaf9] rounded-none focus:ring-[#f97316]"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-[#0b1224] border-white/10 text-white font-bold text-xs">
                          <SelectItem value="30">30 days (On time)</SelectItem>
                          <SelectItem value="45">45 days (Gap likely)</SelectItem>
                          <SelectItem value="60">60 days (Safety)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 min-w-[150px]">
                      <Label className="text-[10px] font-bold text-slate-500 italic uppercase tracking-widest">Arrival allowances?</Label>
                      <div className="relative">
                        <Coins className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#f97316]" />
                        <Input 
                          type="number" 
                          value={arrivalAllowance || ''} 
                          onChange={(e: ChangeEvent<HTMLInputElement>) => setArrivalAllowance(Number(e.target.value))}
                          placeholder="e.g. 1500"
                          className="bg-black/60 border-white/10 h-12 pl-10 text-[11px] font-black italic text-[#fafaf9] rounded-none focus-visible:ring-[#f97316] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* 📊 ROW 2 & 3: SECONDARY INPUTS & BREAKDOWN STATS (Consistently Boxed) */}
              <div className="p-8 lg:p-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4 bg-black/20 border-t border-white/5">
                
                {/* Secondary Inputs (Logistics) - In Boxes */}
                <div className="bg-black/40 border border-white/5 p-5 space-y-4 hover:border-[#f97316]/20 transition-all">
                  <Label className="text-[10px] font-black text-[#f97316] tracking-widest uppercase italic leading-none">Bags (£100/ea)</Label>
                  <div className="flex items-center gap-2">
                    <Select value={String(baggageCount)} onValueChange={(val: string) => setBaggageCount(Number(val))}>
                      <SelectTrigger className="bg-black/40 border-white/10 h-10 text-[11px] font-black italic text-[#fafaf9] rounded-none focus:ring-[#f97316] w-16"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-[#0b1224] border-white/10 text-white font-bold text-xs">
                        {[0,1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <div className="relative flex-1">
                      <Input 
                        type="number" 
                        value={baggageOverride ?? ''} 
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setBaggageOverride(e.target.value ? Number(e.target.value) : null)}
                        placeholder="Override..."
                        className="bg-black/40 border-white/10 h-10 text-[11px] font-black italic text-[#fafaf9] rounded-none focus-visible:ring-[#f97316] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-black/40 border border-white/5 p-5 space-y-4 hover:border-[#f97316]/20 transition-all">
                  <Label className="text-[10px] font-black text-[#f97316] tracking-widest uppercase italic leading-none">Shipping Cost</Label>
                  <div className="space-y-2">
                    <div className="relative">
                      <Package className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-sky-400" />
                      <Input 
                        type="number" 
                        value={shippingCost || ''} 
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setShippingCost(Number(e.target.value))}
                        placeholder="Avg £2,000"
                        className="bg-black/40 border-white/10 h-10 pl-8 text-[11px] font-black italic text-[#fafaf9] rounded-none focus-visible:ring-[#f97316] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                    <p className="text-[8px] font-bold text-slate-600 italic">Global avg estimate: £2,000</p>
                  </div>
                </div>

                {/* Stat Outputs */}
                <StatItem label="Visas & docs" sub="Legal fees." value={budget.docs} icon={FileText} currency={budget.displayCurrency} />
                <StatItem label="Rent & deposit" sub={budget.isSubsidised ? "Subsidised (50%)" : "New home keys."} value={budget.housing} icon={Home} currency={budget.displayCurrency} />
                <StatItem label={`Living (${setupDays} days)`} sub="Food & basics." value={budget.expenditure} icon={Wallet} currency={budget.displayCurrency} />

                {/* Row 2 Stats */}
                <StatItem label="Logistics" sub="Bags & shipping." value={budget.logistics} icon={Package} currency={budget.displayCurrency} />
                <StatItem 
                  label="Electronics" 
                  sub="Base setup total." 
                  value={budget.electronics} 
                  icon={Monitor} 
                  currency={budget.displayCurrency} 
                  info="Covers: 42-inch Smart TV, Toaster, Hair Dryer, Kettle. Estimates based on regional averages."
                />
                <StatItem label="Transport entry" sub="Commute setup." value={budget.transport} icon={Car} currency={budget.displayCurrency} />
                
                {budget.family > 0 ? (
                  <StatItem label="Family setup" sub="Uniforms & docs." value={budget.family} icon={Baby} currency={budget.displayCurrency} />
                ) : (
                  <div className="hidden xl:block"></div>
                )}
                
                <div className="hidden xl:block"></div>
              </div>
        </div>
      </div>
    </div>

        {/* ROW 2: Risks & IKEA (Height Matched) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          <div className="lg:col-span-4 flex flex-col gap-3">
             <RiskCard icon={Banknote} title="Pay scale ambiguity" desc="Treat a lack of clear salary scales as a warning sign." />
             <RiskCard icon={Lock} title="NDA clauses" desc="Check restrictions on discussing pay or the school climate." />
          </div>

          <div className="lg:col-span-8 flex">
            <Card className={cn("border-white/10 p-5 flex items-center justify-between w-full shadow-lg transition-all", countryIntel ? "bg-[#0b1224]" : "bg-slate-900/50 opacity-50")}>
              <div className="flex items-center gap-4">
                <div className={cn("p-3 rounded-full", countryIntel?.ikea?.hasIkea ? "bg-green-500/10 text-green-500" : "bg-rose-500/10 text-rose-500")}>
                  <ShoppingCart className="size-6" />
                </div>
                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-white italic leading-tight">
                    IKEA readiness check: <span className="text-sky-400 underline decoration-sky-400/30 underline-offset-4">{selectedCountry !== 'all' ? selectedCountry : 'Your destination'}</span>
                  </h4>
                  <p className="text-[10px] font-bold text-slate-500 tracking-tight italic mt-1">Getting the basics—bedding and kitchen bits for week one.</p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* BOTTOM GRID: The Rest */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <IntelCard title="Documentation" icon={Clock} subtext="Paperwork delays can stop you from getting paid on time." items={["Visa & work permits", "Degree certificates", "Embassy registration"]} />
          <IntelCard title="Accommodation" icon={MapPin} subtext="Sort this early so you're not living out of a suitcase for weeks." items={["First 14 days sorted?", "Searching for a flat", calcStatus.includes('family') ? "Childcare availability" : "School house keys", "Rental contracts"]} />
          <Card className="bg-[#0b1224] border-white/5 p-5 hover:border-sky-400/30 transition-all flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Navigation className="size-4 text-sky-400 -rotate-90" />
                <CardTitle className="text-[11px] font-black uppercase tracking-widest text-white">Transport</CardTitle>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setDoYouDrive(false)} className={cn("flex-1 py-1.5 text-[9px] font-black uppercase italic rounded-sm border transition-all", !doYouDrive ? "bg-sky-400 text-black border-sky-400" : "bg-black/20 border-white/10 text-slate-500")}>Public</button>
                <button onClick={() => setDoYouDrive(true)} className={cn("flex-1 py-1.5 text-[9px] font-black uppercase italic rounded-sm border transition-all", doYouDrive ? "bg-[#f97316] text-white border-[#f97316]" : "bg-black/20 border-white/10 text-slate-500")}>Driving</button>
              </div>
              <ul className="space-y-2 text-[10px] font-bold text-slate-400 italic">
                <li className="flex gap-3"><span className="text-[#f97316]">●</span> {doYouDrive ? "Driving licence" : "Metro registration"}</li>
                <li className="flex gap-3"><span className="text-[#f97316]">●</span> {doYouDrive ? "Hiring or buying" : "Taxi app setup"}</li>
              </ul>
            </div>
          </Card>
          <IntelCard title="Salary runway" icon={CalendarDays} subtext="Most teachers land in August but won't be paid until late September." items={["Pay dates confirmed", `Funds for the first ${setupDays} days`, "Bank account set up"]} />
          <IntelCard title="Money & banking" icon={Landmark} subtext="Work out how to send money back home and where your final payout goes." items={["Transfer apps set up", "International wire costs", "Payout plans"]} />
          <IntelCard title="Health & registration" icon={Stethoscope} subtext="Check if your school cover starts when you land or only on day one." items={["Insurance start date", "Short-term cover", "Hospital locations"]} />
        </div>

        <Card className="bg-[#0b1224] border-[#f97316]/30 p-6 flex flex-col md:flex-row justify-between items-center group hover:bg-[#f97316]/5 transition-all gap-6">
          <div className="space-y-1 text-white">
            <div className="flex items-center gap-3">
              <Download className="size-5 text-[#f97316]" />
              <h3 className="text-lg font-black italic tracking-tight">Download the field manual</h3>
            </div>
            <p className="text-[11px] font-bold text-slate-400 leading-tight italic">Essential first-week checklists and packing guides.</p>
          </div>
          <Button asChild className="w-full md:w-auto h-11 bg-[#f97316] text-white font-black uppercase text-[10px] italic rounded-none px-8 border-none hover:bg-white hover:text-black transition-all">
            <Link href={{
              pathname: '/prepare/report',
              query: { 
                reserve: totalReserve,
                currency: budget.displayCurrency,
                country: selectedCountry,
                school: selectedSchool?.schoolname || '',
                days: setupDays,
                status: calcStatus,
                docs: budget.docs,
                rent: budget.housing,
                living: budget.expenditure,
                transport: budget.transport,
                commitments: budget.commitments
              }
            }}>
              Get arrival manual
            </Link>
          </Button>
        </Card>
        
        <div className="h-12" />
      </div>
    </div>
  );
}

// 📎 Helpers
function StatItem({ label, sub, value, icon: Icon, currency, info }: { label: string, sub: string, value: number, icon: any, currency: string, info?: string }) {
  return (
    <div className="bg-black/40 border border-white/5 p-5 space-y-4 hover:border-[#f97316]/20 transition-all group relative">
      <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 leading-none">
        <Icon className="size-3 text-sky-400" /> {label}
        {info && (
          <div className="group/info relative">
            <Info className="size-2.5 text-slate-600 cursor-help" />
            <div className="absolute left-0 bottom-full mb-2 w-48 p-2 bg-black border border-white/10 rounded-sm text-[8px] font-bold text-slate-300 leading-tight italic opacity-0 group-hover/info:opacity-100 transition-opacity pointer-events-none z-50 shadow-2xl">
              {info}
            </div>
          </div>
        )}
      </div>
      <div className="space-y-1">
        <p className="text-2xl font-black italic leading-none">{formatCurrency(value, currency)}</p>
        <p className="text-[9px] font-bold text-slate-500/60 leading-none italic">{sub}</p>
      </div>
    </div>
  );
}

function IntelCard({ title, icon: Icon, items, subtext }: { title: string, icon: any, items: string[], subtext: string }) {
  return (
    <Card className="bg-[#0b1224] border-white/5 p-5 hover:border-sky-400/30 transition-all group text-white">
      <CardHeader className="p-0 mb-3 space-y-1 text-white">
        <div className="flex items-center gap-3 text-white">
          <Icon className="size-4 text-sky-400 text-white" />
          <CardTitle className="text-[11px] font-black uppercase tracking-widest text-white">{title}</CardTitle>
        </div>
        <p className="text-[10px] text-slate-500 font-bold leading-tight italic text-white opacity-80">{subtext}</p>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="space-y-2.5 pt-1">
          {items.map((item, i) => (
            <li key={i} className="text-[10px] font-bold text-slate-400 flex items-start gap-3 leading-tight italic">
              <span className="text-[#f97316]">●</span> {item}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function RiskCard({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) {
  return (
    <div className="p-4 bg-[#0b1224] border border-white/5 rounded-sm hover:border-[#f97316]/40 transition-all group w-full">
      <div className="flex items-center gap-3 mb-1.5 text-white">
        <Icon className="size-4 text-[#f97316]" />
        <h4 className="text-[11px] font-black text-white italic tracking-tight">{title}</h4>
      </div>
      <p className="text-[10px] text-slate-500 font-bold leading-tight italic">{desc}</p>
    </div>
  );
}
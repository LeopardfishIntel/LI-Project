 "use client";

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useFormStatus } from "react-dom";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn, formatCurrency } from '@/lib/utils';
import { 
  Loader2, LineChart, Globe, Briefcase, MapPin, Lock, Coins, TrendingUp 
} from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';

const noSpinners = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

// 💱 TACTICAL CURRENCY ENGINE
const CONVERSION_RATES: Record<string, number> = {
  USD: 1, GBP: 0.78, EUR: 0.92, AED: 3.67, SGD: 1.34, HKD: 7.82, JPY: 150
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="w-full bg-[#f97316] text-white font-black h-14 tracking-[0.2em] uppercase hover:bg-[#ea580c] transition-all active:scale-95 mt-6 shadow-lg">
      {pending ? <Loader2 className="animate-spin mx-auto" /> : "EXECUTE ANALYSIS"}
    </button>
  );
}

function ContractDecoderContent() {
  const [mounted, setMounted] = useState(false);
  const firestore = useFirestore();

  // 🛰️ DATABASE UPLINK
  const schoolsQuery = useMemoFirebase(() => (mounted && firestore ? collection(firestore, 'schools') : null), [firestore, mounted]);
  const { data: allSchools, isLoading } = useCollection<any>(schoolsQuery);
  
  const reqsQuery = useMemoFirebase(() => (mounted && firestore ? collection(firestore, 'teacher_requirements') : null), [firestore, mounted]);
  const { data: requirements } = useCollection<any>(reqsQuery);

  // OPERATIONAL STATE
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [familyStatus, setFamilyStatus] = useState<string>('single');
  const [offeredSalary, setOfferedSalary] = useState('');
  const [liabilities, setLiabilities] = useState('');

  useEffect(() => { setMounted(true); }, []);

  // 🌍 DERIVE UNIQUE COUNTRIES
  const availableCountries = useMemo(() => {
    if (!allSchools) return [];
    const countries = allSchools.map((s: any) => s.country).filter(Boolean);
    return Array.from(new Set(countries)).sort() as string[];
  }, [allSchools]);

  // 🏫 FILTER SCHOOLS BY SELECTED COUNTRY
  const filteredSchools = useMemo(() => {
    if (!selectedCountry || !allSchools) return [];
    return allSchools.filter((s: any) => s.country === selectedCountry);
  }, [selectedCountry, allSchools]);

  const selectedSchool = useMemo(() => {
    return allSchools?.find((s: any) => s.id === selectedSchoolId) || null;
  }, [selectedSchoolId, allSchools]);

  // 📊 CALCULATION ENGINE
  const savingsPotential = useMemo(() => {
    if (!selectedSchool) return 0;
    const salary = offeredSalary ? parseFloat(offeredSalary) : parseFloat(selectedSchool.salaryRange?.replace(/[$,]/g, '')) || 0;
    const debt = parseFloat(liabilities) || 0;
    
    // Simple burn rate estimation for UI demo
    const estBurn = familyStatus === 'single' ? 1500 : 2500;
    return salary - estBurn - debt;
  }, [selectedSchool, offeredSalary, liabilities, familyStatus]);

  if (!mounted) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start max-w-6xl mx-auto">
      
      {/* LEFT COLUMN: CONTROL PANEL */}
      <div className="lg:col-span-4 space-y-6">
        <Card className="glass border-[#f97316]/20 bg-[#020617]/60 shadow-2xl">
          <CardHeader className="border-b border-white/5 pb-4">
            <CardTitle className="text-[10px] font-black text-[#f97316] uppercase tracking-[0.2em]">Operational Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            
            {/* COUNTRY SELECTOR */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">1. Target Country</Label>
              <Select value={selectedCountry || ''} onValueChange={(val) => { setSelectedCountry(val); setSelectedSchoolId(null); }}>
                <SelectTrigger className="bg-[#020617]/50 border-white/10 rounded-sm text-white font-bold h-12">
                  <SelectValue placeholder={isLoading ? "Syncing..." : "Select Country"} />
                </SelectTrigger>
                <SelectContent className="glass bg-[#020617] border-white/10 text-white">
                  {availableCountries.map(c => <SelectItem key={c} value={c} className="font-bold">{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* SCHOOL SELECTOR */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">2. Select Asset</Label>
              <Select value={selectedSchoolId || ''} onValueChange={setSelectedSchoolId} disabled={!selectedCountry}>
                <SelectTrigger className="bg-[#020617]/50 border-white/10 rounded-sm text-white font-bold h-12">
                  <SelectValue placeholder={!selectedCountry ? "Awaiting Country..." : "Choose School"} />
                </SelectTrigger>
                <SelectContent className="glass bg-[#020617] border-white/10 text-white">
                  {filteredSchools.map((s: any) => (
                    <SelectItem key={s.id} value={s.id} className="font-bold border-b border-white/5 last:border-0">
                      {s.schoolname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* FINANCIAL INPUTS */}
            <div className="pt-4 border-t border-white/5 space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Monthly Net Salary (USD)</Label>
                <Input 
                  className={cn("bg-[#020617]/50 border-white/10 h-12 text-xl font-black", noSpinners)} 
                  type="number" 
                  value={offeredSalary}
                  onChange={(e) => setOfferedSalary(e.target.value)}
                  placeholder={selectedSchool?.salaryRange || "0"} 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Monthly Liabilities</Label>
                <Input 
                  className="bg-[#020617]/30 border-white/5 h-10 text-xs font-bold" 
                  type="number" 
                  value={liabilities}
                  onChange={(e) => setLiabilities(e.target.value)}
                  placeholder="Loans, commitments, etc." 
                />
              </div>
            </div>

            <SubmitButton />
          </CardContent>
        </Card>
      </div>

      {/* RIGHT COLUMN: ANALYSIS DOSSIER */}
      <div className="lg:col-span-8">
        {!selectedSchool ? (
          <div className="h-[600px] flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-sm bg-card/10 text-center p-10">
            <TrendingUp className="w-16 h-16 mb-4 opacity-5 text-[#f97316]" />
            <p className="text-sm text-white/20 font-black uppercase tracking-[0.4em]">Initialize Analysis Protocol</p>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-1000 slide-in-from-bottom-4">
            <Card className="glass border-white/10 bg-[#020617]/40 p-12 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-[#f97316] transition-all group-hover:w-3"></div>
              <div className="flex justify-between items-end">
                <div>
                  <h4 className="text-[11px] font-black text-[#f97316] uppercase tracking-[0.3em] mb-2">Savings Potential</h4>
                  <div className={cn("text-8xl font-black tracking-tighter leading-none", savingsPotential > 0 ? "text-green-400" : "text-red-500")}>
                    ${Math.round(savingsPotential).toLocaleString()}
                  </div>
                  <p className="text-xs font-bold text-slate-500 uppercase mt-4 tracking-widest">Estimated Monthly Surplus</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Target Asset</p>
                  <p className="text-2xl font-black text-white uppercase leading-tight">{selectedSchool.schoolname}</p>
                  <p className="text-xs font-bold text-[#007FFF] uppercase mt-1">{selectedSchool.city}, {selectedSchool.country}</p>
                </div>
              </div>
            </Card>

            <div className="grid md:grid-cols-2 gap-8">
              <Card className="bg-white/5 border-white/10 p-8">
                <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">Financial Specs</h5>
                <div className="space-y-4">
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-xs font-bold text-slate-400 uppercase">Housing</span>
                    <span className="text-sm font-black text-white uppercase">{selectedSchool.housingprovision}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-xs font-bold text-slate-400 uppercase">Healthcare</span>
                    <span className="text-sm font-black text-white uppercase">{selectedSchool.healthcoverage}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase">Non-Contact</span>
                    <span className="text-sm font-black text-white">{selectedSchool.noncontacttime}</span>
                  </div>
                </div>
              </Card>

              <Card className="bg-[#007FFF]/5 border-[#007FFF]/20 p-8 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-6">
                  <Lock className="size-3 text-[#007FFF]" />
                  <h5 className="text-[10px] font-black text-[#007FFF] uppercase tracking-widest">Work/Life Score</h5>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-7xl font-black text-white">{selectedSchool.worklifescore}</span>
                  <span className="text-xl font-black text-slate-600">/ 10</span>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function EvaluatePage() {
  return (
    <div className="container mx-auto px-4 py-20 bg-[#020617] min-h-screen">
      <div className="mb-20 text-center">
        <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-white uppercase leading-none">2. Contract <span className="text-[#f97316]">Decoder</span></h1>
        <p className="text-muted-foreground font-black text-[10px] tracking-[0.4em] uppercase opacity-60 mt-6 border-y border-white/5 py-3 inline-block px-10">Field-grade financial intelligence</p>
      </div>
      <Suspense fallback={<div className="h-96 flex items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-[#f97316]" /></div>}>
        <ContractDecoderContent />
      </Suspense>
    </div>
  );
}
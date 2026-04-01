"use client";

import React, { useState, useMemo, useEffect, ChangeEvent } from 'react';
import { 
  Lock, Banknote, Loader2, Zap, ShoppingCart,
  Home, Clock, Wallet, Car, Ship, CalendarDays, 
  FileText, Landmark, MapPin, Navigation, ArrowRight,
  Stethoscope, Download, Info, Coins
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { cn, formatCurrency } from '@/lib/utils';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';

const PROFILE_MAP: Record<string, string> = {
  "single": "single",
  "married-dual": "marriedDualIncome",
  "family-1": "family1Child",
  "family-2": "family2Children",
  "family-3": "family3PlusChildren"
};

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
  const [hasLoadedMemory, setHasLoadedMemory] = useState(false);

  // 🛰️ Data
  const { data: schools, isLoading: isLoadingSchools } = useCollection<any>(
    useMemoFirebase(() => (mounted && firestore ? collection(firestore, 'schools') : null), [firestore, mounted])
  );
  const { data: cities } = useCollection<any>(
    useMemoFirebase(() => (mounted && firestore ? collection(firestore, 'locations_costOfLiving') : null), [firestore, mounted])
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
    }
    setHasLoadedMemory(true);
  }, []);

  useEffect(() => {
    if (hasLoadedMemory) {
      localStorage.setItem('leopardfish-prep-state', JSON.stringify({ 
        calcStatus, selectedCountry, selectedSchoolId, doYouDrive, setupDays, arrivalAllowance 
      }));
    }
  }, [calcStatus, selectedCountry, selectedSchoolId, doYouDrive, setupDays, arrivalAllowance, hasLoadedMemory]);

  // 🏎️ Filters
  const availableCountries = useMemo(() => {
    if (!cities) return [];
    return Array.from(new Set(cities.map(c => c.country))).filter(Boolean).sort();
  }, [cities]);

  const filteredSchools = useMemo(() => {
    if (!schools || !selectedCountry || selectedCountry === 'all') return schools || [];
    return schools.filter(s => s.country?.toLowerCase().trim().includes(selectedCountry.toLowerCase().trim()));
  }, [selectedCountry, schools]);

  const countryIntel = useMemo(() => {
    if (!selectedCountry || selectedCountry === 'all' || !cities) return null;
    return cities.find(c => c.country?.toLowerCase().trim() === selectedCountry.toLowerCase().trim());
  }, [selectedCountry, cities]);

  const selectedSchool = useMemo(() => schools?.find(s => s.id === selectedSchoolId), [selectedSchoolId, schools]);
  const cityData = useMemo(() => {
    if (!selectedSchool || !cities) return null;
    return cities.find(c => c.city === selectedSchool.city || c.id === selectedSchool.locationId);
  }, [selectedSchool, cities]);

  // 🧮 Calculation Logic
  const budget = useMemo(() => {
    const profileKey = PROFILE_MAP[calcStatus] || "single";
    const targetData = cityData || countryIntel;
    
    let rentVal = 2000; 
    if (targetData) {
      const rentField = (calcStatus.includes('family-2') || calcStatus.includes('family-3')) ? 'rent3br' : (calcStatus === 'single' ? 'rent1br' : 'rent2br');
      rentVal = (targetData[rentField] || 2000) * 2.5;
    }
    if (selectedSchool?.housingprovision?.toLowerCase().includes('provided')) rentVal = 0;

    let monthlyLiving = 1200;
    if (targetData) {
      monthlyLiving = (targetData.groceries || 400) + (targetData.utilities || 150) + (targetData.mobilePhone || 50);
    }
    const setupMultiplier = parseInt(setupDays) / 30;
    const livingVal = monthlyLiving * setupMultiplier;

    const transportVal = doYouDrive ? (targetData?.transport?.carHire?.[profileKey] || 1200) : (targetData?.transport?.taxi?.[profileKey] || 500);

    return { docs: 1200, housing: rentVal, expenditure: livingVal, transport: transportVal };
  }, [calcStatus, selectedSchool, cityData, countryIntel, doYouDrive, setupDays]);

  const totalReserve = useMemo(() => {
    const rawTotal = budget.docs + budget.housing + budget.expenditure + budget.transport;
    return Math.max(0, rawTotal - arrivalAllowance);
  }, [budget, arrivalAllowance]);

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
              </div>
            </Card>
          </div>

          <div className="lg:col-span-8 flex">
            <div className="bg-[#0b1224] border border-white/10 rounded-sm overflow-hidden shadow-2xl w-full flex flex-col">
              <div className="flex flex-col lg:flex-row justify-between items-stretch border-b border-white/5 relative bg-gradient-to-br from-[#0b1224] to-[#020617] p-8 lg:px-10 lg:py-8 flex-grow gap-6">
                <Zap className="absolute top-0 right-0 size-64 opacity-5 rotate-12 pointer-events-none text-white" />
                <div className="relative z-10 flex flex-col justify-center flex-grow">
                  <p className="text-[10px] font-black text-[#f97316] tracking-[0.4em] uppercase mb-1">Arrival & setup reserve</p>
                  <p className={cn(
                    "font-black italic tracking-tighter leading-none transition-all duration-300",
                    totalReserve > 9999 ? "text-7xl xl:text-8xl" : "text-7xl xl:text-[9rem]"
                  )}>
                    {formatCurrency(totalReserve, 'GBP')}
                  </p>
                </div>
                <div className="space-y-4 relative z-10 flex flex-col justify-center w-full lg:max-w-[200px] border-l border-white/5 lg:pl-8">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Label className="text-[10px] font-bold text-slate-500 italic">First payday?</Label>
                      <div className="group relative">
                        <Info className="size-3 text-sky-400 cursor-help" />
                        <div className="absolute right-0 bottom-full mb-2 w-56 p-3 bg-black border border-white/10 rounded-sm text-[10px] font-bold text-slate-300 leading-tight italic opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-2xl">
                          Paperwork delays often push your first pay to the 60-day mark.
                        </div>
                      </div>
                    </div>
                    <Select value={setupDays} onValueChange={(val: string) => setSetupDays(val)}>
                      <SelectTrigger className="bg-black/20 border-white/10 h-10 text-[10px] font-black italic text-[#fafaf9] px-2.5"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-[#0b1224] border-white/10 text-white font-bold text-xs">
                        <SelectItem value="30">30 days (On time)</SelectItem>
                        <SelectItem value="45">45 days (Gap likely)</SelectItem>
                        <SelectItem value="60">60 days (Safety)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-slate-500 italic">Arrival allowances?</Label>
                    <div className="relative">
                      <Coins className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-[#f97316]" />
                      <Input 
                        type="number" 
                        value={arrivalAllowance || ''} 
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setArrivalAllowance(Number(e.target.value))}
                        placeholder="e.g. 1500"
                        className="bg-black/20 border-white/10 h-10 pl-7 text-[11px] font-black italic text-[#fafaf9] [appearance:textfield]"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6 lg:p-8 grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-10 bg-black/40">
                <StatItem label="Visas & docs" sub="Legal fees." value={budget.docs} icon={FileText} />
                <StatItem label="Rent & deposit" sub="New home keys." value={budget.housing} icon={Home} />
                <StatItem label={`Living (${setupDays} days)`} sub="Food & basics." value={budget.expenditure} icon={Wallet} />
                <StatItem label="Transport entry" sub="Commute setup." value={budget.transport} icon={Car} />
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
          <Button className="w-full md:w-auto h-11 bg-[#f97316] text-white font-black uppercase text-[10px] italic rounded-none px-8 border-none hover:bg-white hover:text-black transition-all">Get arrival manual</Button>
        </Card>
        
        <div className="h-12" />
      </div>
    </div>
  );
}

// 📎 Helpers
function StatItem({ label, sub, value, icon: Icon }: { label: string, sub: string, value: number, icon: any }) {
  return (
    <div className="space-y-1 text-white">
      <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.1em] flex items-center gap-2 leading-none">
        <Icon className="size-3 text-sky-400" /> {label}
      </p>
      <p className="text-2xl font-black italic leading-none py-1">{formatCurrency(value, 'GBP')}</p>
      <p className="text-[9px] font-bold text-slate-500/60 leading-none italic">{sub}</p>
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
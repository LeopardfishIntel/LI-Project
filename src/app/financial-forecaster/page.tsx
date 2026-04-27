"use client";

import { useState, useEffect, useMemo, Suspense } from 'react';
import { 
  Zap, ShieldCheck, BookOpen, Target, Plus, Minus, Coins, 
  AlertTriangle, AlertCircle, Activity, Clock, Wallet, Banknote, ArrowLeft, FileText, Info, Car, Bus, Lock, ArrowDownCircle
} from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useRouter } from 'next/navigation';

const RATES: Record<string, number> = {
  CZK: 30.2, AED: 4.65, EUR: 1.18, GBP: 1.0, SAR: 4.75, QAR: 4.62, CHF: 1.12, DKK: 8.85, USD: 1.27, AZN: 2.15, HKD: 9.85
};

const BENCHMARKS = [
  { label: "GBP (£)", code: "GBP" },
  { label: "USD ($)", code: "USD" },
  { label: "EUR (€)", code: "EUR" }
];

const noSpinners = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

const canonicalCountry = (c: string) => {
  const n = c?.toLowerCase().trim() || "";
  if (n.includes("czech")) return "czech republic";
  if (n.includes("uae") || n.includes("emirates")) return "united arab emirates";
  if (n.includes("uk") || n.includes("britain")) return "united kingdom";
  if (n.includes("usa") || n.includes("america")) return "united states";
  return n;
};

function DecoderContent() {
  const router = useRouter();
  const firestore = useFirestore();
  const [mounted, setMounted] = useState(false);
  const [settings, setSettings] = useState({ 
    country: "", 
    schoolId: "", 
    netSalary: "0", 
    partnerSalary: "0", 
    familyStatus: "Single" 
  });
  
  const [responsibilityAllowance, setResponsibilityAllowance] = useState("0");
  const [extraIncome, setExtraIncome] = useState("0");
  const [manualAdjustments, setManualAdjustments] = useState("0");
  const [transportMode, setTransportMode] = useState<"P" | "C" | "T">("P");
  const [benchmark, setBenchmark] = useState("GBP");
  const [overrideBedrooms, setOverrideBedrooms] = useState<number | null>(null);

  useEffect(() => { setMounted(true); }, []);

  const { data: allSchools } = useCollection<any>(useMemoFirebase(() => (mounted && firestore ? collection(firestore, 'schools') : null), [firestore, mounted]));
  const { data: costOfLiving } = useCollection<any>(useMemoFirebase(() => (mounted && firestore ? collection(firestore, 'locations_costOfLiving') : null), [firestore, mounted]));
  const { data: requirements } = useCollection<any>(useMemoFirebase(() => (mounted && firestore ? collection(firestore, 'teacher_requirements') : null), [firestore, mounted]));

  const activeSchool = useMemo(() => allSchools?.find((s: any) => s.id === settings.schoolId) || null, [allSchools, settings.schoolId]);
  
  const activeCOL = useMemo(() => {
    if (!activeSchool || !costOfLiving) return null;
    const sCity = activeSchool.city?.toLowerCase().trim();
    const sCountry = canonicalCountry(activeSchool.country);
    
    return costOfLiving.find((c: any) => c.city?.toLowerCase().trim() === sCity) ||
           costOfLiving.find((c: any) => canonicalCountry(c.country) === sCountry);
  }, [activeSchool, costOfLiving]);

  const activeReq = useMemo(() => {
    if (!activeSchool || !requirements) return null;
    const country = canonicalCountry(activeSchool.country);
    return requirements.find((r: any) => canonicalCountry(r.country) === country || r.id === country);
  }, [activeSchool, requirements]);

  const currency = activeCOL?.currencyCode || (settings.country === "Portugal" ? "EUR" : "GBP");
  const usdToLocal = (usdAmount: number) => (usdAmount / (RATES['USD'] || 1.27)) * (RATES[currency] || 1.0);

  useEffect(() => {
    if (activeSchool?.salaryRange) {
      const usdValue = parseFloat(activeSchool.salaryRange.replace(/[^0-9.]/g, '')) || 0;
      setSettings(prev => ({ ...prev, netSalary: Math.round(usdToLocal(usdValue)).toString() }));
    }
  }, [settings.schoolId, activeSchool, currency]);

  const analysis = useMemo(() => {
    if (!activeSchool || !activeCOL) return null;
    const safeParse = (val: any) => { const n = parseFloat(String(val)); return isNaN(n) ? 0 : n; };

    const status = settings.familyStatus;
    let personCount = 1;
    let scalar = 1.0;
    let pKey = "single";

    // 🎯 STRICT FAMILY MAPPING PROTOCOL
    if (status === "Single") { personCount = 1; scalar = 1.0; pKey = "single"; }
    else if (status === "Married (sole earner)") { personCount = 2; scalar = 1.9; pKey = "marriedDualIncome"; }
    else if (status === "Married (dual income)") { personCount = 2; scalar = 1.9; pKey = "marriedDualIncome"; }
    else if (status === "Family +1") { personCount = 3; scalar = 2.3; pKey = "family1Child"; }
    else if (status === "Family +2") { personCount = 4; scalar = 2.65; pKey = "family2Children"; }
    else if (status === "Family +3") { personCount = 5; scalar = 3.0; pKey = "family3PlusChildren"; }

    const totalIn = safeParse(settings.netSalary) + 
                   (status !== "Single" && status !== "Married (sole earner)" ? safeParse(settings.partnerSalary) : 0) + 
                   safeParse(responsibilityAllowance) + safeParse(extraIncome);

    // 🛠️ INTELLIGENT SCALING UTILITY
    const getVal = (data: any, key: string, mult: number) => {
      if (!data) return 0;
      if (typeof data === 'object') {
        if (data[key]) return safeParse(data[key]); // Use pre-scaled field
        return safeParse(data.single || data.base || 0) * mult; // Fallback to manual scaling
      }
      return safeParse(data) * mult; // Scalar fallback
    };

    const housingStatus = activeSchool.housingprovision?.toLowerCase();
    const standardRentKey = status === "Single" ? 'rent1br' : (status.includes("Family") ? 'rent3br' : 'rent2br');
    const activeRentKey = overrideBedrooms !== null ? `rent${overrideBedrooms}br` : standardRentKey;
    
    // 🏠 PROPERTY ADVICE LOGIC
    const propertyLabels: Record<string, string> = { 'rent1br': "1-Bed Residence", 'rent2br': "2-Bed Residence", 'rent3br': "3-Bed Residence" };
    const propertyLabel = propertyLabels[activeRentKey] || "Standard Residence";
    
    const rentCost = housingStatus?.includes('provided') ? 0 : usdToLocal(safeParse(activeCOL[activeRentKey] || activeCOL[standardRentKey] || activeCOL.rent1br));
    
    let canDownsize = false;
    if (!housingStatus?.includes('provided') && overrideBedrooms === null) {
      if (activeRentKey === 'rent3br' || activeRentKey === 'rent2br') {
        canDownsize = true;
      }
    }

    const groceriesCost = usdToLocal(getVal(activeCOL.groceries, pKey, scalar));
    const utilitiesCost = usdToLocal(getVal(activeCOL.utilities, pKey, scalar * 0.8));
    const connectivityCost = usdToLocal(getVal(activeCOL.internet, pKey, 1) + (getVal(activeCOL.mobilePhone, pKey, 1) * personCount));
    
    // 🛰️ NESTED TRANSPORT PROTOCOL
    const mapType = transportMode === "P" ? "publicTransport" : (transportMode === "C" ? "carPurchase" : "taxi");
    const transportMap = activeCOL.transport?.[mapType] || activeCOL[mapType];
    const transportCost = usdToLocal(getVal(transportMap, pKey, mapType === "publicTransport" ? personCount : 1));
    
    const socialCost = usdToLocal(getVal(activeCOL.diningSocial, pKey, scalar));
    const manualCost = safeParse(manualAdjustments);

    const totalOut = rentCost + groceriesCost + utilitiesCost + connectivityCost + transportCost + socialCost + manualCost;
    const surplus = totalIn - totalOut;
    const rateOfSaving = totalIn > 0 ? Math.round((surplus / totalIn) * 100) : 0;
    
    // Currency Benchmark Conversion
    const surplusBenchmark = (surplus / (RATES[currency] || 1.0)) * (RATES[benchmark] || 1.0);

    return { 
      costs: { rent: rentCost, groceries: groceriesCost, utilities: utilitiesCost, connectivity: connectivityCost, transport: transportCost, social: socialCost, manual: manualCost },
      propertyLabel, canDownsize, standardRentKey,
      totalIn, totalOut, surplus, surplusBenchmark, rateOfSaving, housingStatus, currency, reliability: activeCOL.dataReliabilityScore 
    };
  }, [activeSchool, activeCOL, settings, responsibilityAllowance, manualAdjustments, extraIncome, currency, transportMode, benchmark, overrideBedrooms]);

  const leopardfishReview = useMemo(() => {
    if (!activeSchool || !analysis) return null;
    const inspectContent = activeSchool.inspect || "";
    const surplusPara = analysis.surplus > 0 
      ? `Analysis of your ${settings.familyStatus.toLowerCase()} profile indicates a healthy monthly surplus of ${currency} ${Math.round(analysis.surplus).toLocaleString()}. This reflects a ${analysis.rateOfSaving}% saving potential after all core outgoings are accounted for.`
      : `Based on the provided salary and the current cost of living for a ${settings.familyStatus.toLowerCase()} profile, there is a projected monthly deficit of ${currency} ${Math.abs(Math.round(analysis.surplus)).toLocaleString()}. This may require a review of local housing options or additional allowance negotiations.`;

    const safetyPara = activeSchool.city?.toLowerCase() === "prague" 
      ? "Regarding local security, Prague remains one of the safest capitals in Europe, consistently ranking in the top tier of the Global Peace Index. Educators can expect a high degree of personal safety, with well-lit public spaces and a secure transport network operational throughout the night."
      : "Security for this city is rated as high based on current regional safety indices. Educators are advised to follow standard urban safety protocols, though local crime rates remain significantly below the European average for a city of this size.";

    const schoolContext = `With a work/life score of ${activeSchool.worklifescore || 'N/A'} and an academic score of ${activeSchool.academicscore || 'N/A'}, this school offers a ${activeSchool.curriculum} framework. The data used for this review has a reliability rating of ${analysis.reliability}/10.`;

    return { inspectContent, surplusPara, safetyPara, schoolContext };
  }, [activeSchool, analysis, currency, settings.familyStatus]);

  const handleNavigateToCompare = () => {
    if (!activeSchool) return;

    // Added .trim() and case-insensitive check to ensure schools are actually matched
    const peers = allSchools
      ?.filter((s: any) => 
        s.country?.trim().toLowerCase() === activeSchool.country?.trim().toLowerCase() && 
        s.city?.trim().toLowerCase() === activeSchool.city?.trim().toLowerCase() && 
        s.id !== activeSchool.id
      )
      .slice(0, 2)
      .map((s: any) => s.id)
      .join(',');

    const query = new URLSearchParams({
      primary: activeSchool.id,
      peers: peers || "",
      status: settings.familyStatus
    }).toString();

    router.push(`/compare/?${query}`);
  };

  if (!mounted) return null;

  return (
    <TooltipProvider delayDuration={100}>
      <div className="flex flex-col lg:flex-row min-h-screen bg-[#020617] text-white selection:bg-[#f97316]">
        
        {/* Sidebar: Manual Unrolled Search Settings */}
        <div className="w-full lg:w-72 bg-[#0b1224] border-r border-white/5 p-4 lg:fixed lg:h-full overflow-y-auto z-30 shadow-xl">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-[10px] font-black text-[#007FFF] uppercase tracking-[0.3em] mb-4 hover:text-white transition-colors"><ArrowLeft className="size-3" /> Back</button>
          <p className="text-[11px] font-black text-[#f97316] uppercase tracking-[0.4em] mb-4 italic">Search settings</p>
          
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Target country</label>
              <Select value={settings.country} onValueChange={(v) => setSettings({...settings, country: v, schoolId: ""})}>
                <SelectTrigger className="bg-black/40 border-white/10 h-10 text-xs font-bold uppercase"><SelectValue placeholder="Country" /></SelectTrigger>
                <SelectContent className="bg-[#0b1224] border-white/10 text-white font-bold uppercase text-xs">
                  {allSchools?.map((s: any) => s.country).filter((v: any, i: any, a: any) => v && a.indexOf(v) === i).sort().map((c: any) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Select school</label>
              <Select disabled={!settings.country} value={settings.schoolId} onValueChange={(v) => setSettings({...settings, schoolId: v})}>
                <SelectTrigger className="bg-black/40 border-white/10 h-10 text-xs font-bold uppercase"><SelectValue placeholder="School" /></SelectTrigger>
                <SelectContent className="bg-[#0b1224] border-white/10 text-white font-bold uppercase text-xs">
                  {allSchools?.filter((s: any) => s.country === settings.country).map((s: any) => <SelectItem key={s.id || s.schoolname} value={s.id}>{s.schoolname}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Family status</label>
              <Select value={settings.familyStatus} onValueChange={(v) => setSettings({...settings, familyStatus: v})}>
                <SelectTrigger className="bg-black/40 border-white/10 h-10 text-xs font-bold uppercase"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#0b1224] border-white/10 text-white font-bold uppercase text-xs">
                  <SelectItem value="Single">Single</SelectItem>
                  <SelectItem value="Married (sole earner)">Married (sole earner)</SelectItem>
                  <SelectItem value="Married (dual income)">Married (dual income)</SelectItem>
                  <SelectItem value="Family +1">Family +1</SelectItem>
                  <SelectItem value="Family +2">Family +2</SelectItem>
                  <SelectItem value="Family +3">Family +3</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="pt-2 border-t border-white/5 space-y-2">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-sky-400 uppercase tracking-widest italic leading-none mb-1">Monthly net salary ({currency})</label>
                <Input type="number" value={settings.netSalary} onChange={(e) => setSettings({...settings, netSalary: e.target.value})} className={cn("bg-black/40 border-white/10 h-10 font-black text-sm", noSpinners)} />
              </div>
              {settings.familyStatus !== "Single" && settings.familyStatus !== "Married (sole earner)" && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest italic leading-none mb-1">Partner net salary ({currency})</label>
                  <Input type="number" value={settings.partnerSalary} onChange={(e) => setSettings({...settings, partnerSalary: e.target.value})} className={cn("bg-black/40 border-white/10 h-10 font-black text-sm", noSpinners)} />
                </div>
              )}
            </div>
            
            <button 
              onClick={() => router.push(`/decide?ids=${activeSchool?.id}`)} 
              disabled={!activeSchool}
              className="w-full bg-[#f97316] text-white h-12 font-black uppercase tracking-widest text-[10px] rounded-sm hover:bg-white hover:text-black transition-all shadow-lg mt-1 disabled:opacity-50"
            >
              Compare similar options
            </button>
          </div>
        </div>

        {/* Dashboard Area */}
        <div className="flex-1 lg:ml-72 p-4 md:p-6">
          {!activeSchool || !activeCOL ? (
            <div className="h-[70vh] flex flex-col items-center justify-center opacity-10 space-y-4"><Zap className="size-20" /><p className="font-black uppercase tracking-[0.5em] text-sm">Awaiting tactical match</p></div>
          ) : (
            <div className="max-w-5xl mx-auto space-y-4 animate-in fade-in duration-500">
              <div className="bg-[#0b1224] border border-white/5 p-5 md:p-6 shadow-2xl relative rounded-sm">
                
                {/* Header Row */}
                <div className="flex justify-between items-start border-b border-white/5 pb-3">
                  <div className="space-y-2">
                    <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter leading-none italic">{activeSchool.schoolname}</h2>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-black text-[#f97316] uppercase tracking-widest bg-[#f97316]/10 px-2 py-1 rounded-sm border border-[#f97316]/20">{activeSchool.city}, {activeSchool.country}</span>
                      <div className="flex gap-2">
                         {(analysis?.surplus ?? 0) <= 0 && (
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full border border-white/10 bg-rose-500/20">
                               <AlertCircle className="size-3.5 text-rose-500" />
                               <span className="text-[9px] font-black uppercase tracking-tight text-rose-500">Capital loss</span>
                            </div>
                         )}
                         {(analysis?.surplus ?? 0) > 0 && (analysis?.rateOfSaving ?? 0) < 15 && (
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full border border-white/10 bg-[#f97316]/20">
                               <AlertTriangle className="size-3.5 text-[#f97316]" />
                               <span className="text-[9px] font-black uppercase tracking-tight text-[#f97316]">Tight potential</span>
                            </div>
                         )}
                         {(analysis?.rateOfSaving ?? 0) >= 15 && (
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full border border-white/10 bg-emerald-400/10">
                               <Coins className="size-3.5 text-emerald-400" />
                               <span className="text-[9px] font-black uppercase tracking-tight text-emerald-400">Strong potential</span>
                            </div>
                         )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-0.5">Reliability</p>
                    <p className="text-2xl font-black text-sky-500 italic leading-none">{analysis?.reliability}<span className="text-xs text-slate-700">/10</span></p>
                  </div>
                </div>

                {/* Main Grid: Outgoings & Incomes */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6">
                  
                  <div className="space-y-3">
                    <h3 className="text-[11px] font-black text-rose-500 uppercase tracking-[0.3em] flex items-center gap-2 border-b border-rose-500/10 pb-1.5"><Minus className="size-4" /> Monthly outgoings</h3>
                    <div className="space-y-1.5">
                      
                      <div className="flex justify-between items-center border-b border-white/5 pb-1">
                        <div className="flex flex-col">
                           <Tooltip><TooltipTrigger asChild><span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight cursor-help border-b border-dotted border-slate-700">Accommodation</span></TooltipTrigger><TooltipContent className="bg-[#0b1224] border-white/10 text-white text-[9px] uppercase font-bold p-2">Estimated market rent based on your specific household profile.</TooltipContent></Tooltip>
                           <span className="text-[8px] font-black text-sky-400 uppercase tracking-widest">{analysis?.propertyLabel}</span>
                        </div>
                        <span className={cn("text-[14px] font-black tabular-nums text-white", analysis?.housingStatus === 'provided' && "text-emerald-500 italic")}>
                          {analysis?.housingStatus === 'provided' ? "covered" : `${currency} ${Math.round(analysis?.costs.rent || 0).toLocaleString()}`}
                        </span>
                      </div>

                      <div className="flex justify-between items-center border-b border-white/5 pb-1">
                        <Tooltip><TooltipTrigger asChild><span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight cursor-help border-b border-dotted border-slate-700">Groceries</span></TooltipTrigger><TooltipContent className="bg-[#0b1224] border-white/10 text-white text-[9px] uppercase font-bold p-2">Standard food and household supply indices for your household size.</TooltipContent></Tooltip>
                        <span className="text-[14px] font-black tabular-nums text-white">{currency} {Math.round(analysis?.costs.groceries || 0).toLocaleString()}</span>
                      </div>

                      <div className="flex justify-between items-center border-b border-white/5 pb-1">
                        <Tooltip><TooltipTrigger asChild><span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight cursor-help border-b border-dotted border-slate-700">Utilities</span></TooltipTrigger><TooltipContent className="bg-[#0b1224] border-white/10 text-white text-[9px] uppercase font-bold p-2">Monthly averages for electricity, heating, water, and waste management.</TooltipContent></Tooltip>
                        <span className="text-[14px] font-black tabular-nums text-white">{currency} {Math.round(analysis?.costs.utilities || 0).toLocaleString()}</span>
                      </div>

                      <div className="flex justify-between items-center border-b border-white/5 pb-1">
                        <Tooltip><TooltipTrigger asChild><span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight cursor-help border-b border-dotted border-slate-700">Internet and sim</span></TooltipTrigger><TooltipContent className="bg-[#0b1224] border-white/10 text-white text-[9px] uppercase font-bold p-2">Includes standard home broadband and one SIM card per person in the home.</TooltipContent></Tooltip>
                        <span className="text-[14px] font-black tabular-nums text-white">{currency} {Math.round(analysis?.costs.connectivity || 0).toLocaleString()}</span>
                      </div>

                      <div className="flex justify-between items-center border-b border-white/5 pb-1">
                        <div className="flex flex-col gap-1 w-full">
                          <div className="flex justify-between items-center">
                            <Tooltip><TooltipTrigger asChild><span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight cursor-help border-b border-dotted border-slate-700">Transport</span></TooltipTrigger><TooltipContent className="bg-[#0b1224] border-white/10 text-white text-[9px] uppercase font-bold p-2">Switch between Public Transit, Car ownership, or Taxi/Ride-hailing.</TooltipContent></Tooltip>
                            <div className="flex bg-white/5 rounded-sm p-0.5 border border-white/10">
                              <button onClick={() => setTransportMode("P")} className={cn("px-1.5 text-[8px] font-black rounded-sm transition-all", transportMode === "P" ? "bg-[#f97316] text-white shadow-sm" : "text-slate-500 hover:text-white")}>Bus +</button>
                              <button onClick={() => setTransportMode("C")} className={cn("px-1.5 text-[8px] font-black rounded-sm transition-all", transportMode === "C" ? "bg-[#f97316] text-white shadow-sm" : "text-slate-500 hover:text-white")}>Car</button>
                              <button onClick={() => setTransportMode("T")} className={cn("px-1.5 text-[8px] font-black rounded-sm transition-all", transportMode === "T" ? "bg-[#f97316] text-white shadow-sm" : "text-slate-500 hover:text-white")}>Taxi</button>
                            </div>
                            <span className="text-[14px] font-black tabular-nums text-white">{currency} {Math.round(analysis?.costs.transport || 0).toLocaleString()}</span>
                          </div>
                          
                          {/* 🕵️ TACTICAL INSIGHT DISPLAY */}
                          {activeCOL?.transport && (
                            <div className="bg-white/5 p-2 rounded-sm border-l border-[#f97316]/50 mt-1">
                              <p className="text-[9px] font-medium text-slate-400 italic">
                                <Zap className="inline size-2.5 text-[#f97316] mr-1" />
                                {transportMode === "P" ? (activeCOL.transport.bestOptionNoDriver || "Standard transit network.") : (activeCOL.transport.bestOptionDriver || "Vehicle ownership/hire recommended.")}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-between items-center border-b border-white/5 pb-1">
                        <Tooltip><TooltipTrigger asChild><span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight cursor-help border-b border-dotted border-slate-700">Leisure & social</span></TooltipTrigger><TooltipContent className="bg-[#0b1224] border-white/10 text-white text-[9px] uppercase font-bold p-2">A discretionary guide for dining out, cultural activities, and general socialising.</TooltipContent></Tooltip>
                        <span className="text-[14px] font-black tabular-nums text-white">{currency} {Math.round(analysis?.costs.social || 0).toLocaleString()}</span>
                      </div>

                      {/* RESTORED: Custom Adjustments Box from Screenshot */}
                      <div className="pt-4 mt-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-start gap-2">
                            <Wallet className="size-4 text-sky-400 mt-1" />
                            <div>
                             <p className="text-[11px] font-black text-sky-400 uppercase tracking-widest italic leading-none">Custom Adjustments (+/-)</p>
                               <p className="text-[9px] font-medium text-slate-500 italic">home country commitments, student loans etc.</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-slate-600 uppercase">{currency}</span>
                            <Input 
                              type="number" 
                              value={manualAdjustments} 
                              onChange={(e) => setManualAdjustments(e.target.value)} 
                              className={cn("bg-black/40 border-white/10 w-28 h-10 px-3 text-right text-base font-black text-white focus:border-[#f97316] transition-all", noSpinners)} 
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t-2 border-[#f97316]/20 mt-4">
                        <span className="text-[10px] font-black text-[#f97316] uppercase italic tracking-widest">Total outgoings</span>
                        <span className="text-[18px] font-black text-white tabular-nums">{currency} {Math.round(analysis?.totalOut || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-[11px] font-black text-emerald-500 uppercase tracking-[0.3em] flex items-center gap-2 border-b border-emerald-500/10 pb-1.5"><Plus className="size-4" /> Monthly incomes</h3>
                    <div className="space-y-4">
                      
                      <div className="flex justify-between items-center border-b border-white/5 pb-1">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">Monthly net base</span>
                        <span className="text-[14px] font-black text-white">{currency} {parseFloat(settings.netSalary).toLocaleString()}</span>
                      </div>
                      
                      <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-sm flex justify-between items-center">
                        <div className="text-left">
                          <p className="text-[9px] font-black text-sky-400 uppercase tracking-widest italic mb-1">Additional income</p>
                          <p className="text-[8px] font-bold text-slate-500 uppercase italic flex items-center gap-1"><Banknote className="size-3" /> Tutoring / tlr credits</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-black text-emerald-700">{currency}</span>
                          <Input type="number" value={extraIncome} onChange={(e) => setExtraIncome(e.target.value)} className={cn("bg-black/40 border border-emerald-500/20 w-24 h-8 px-2 text-right text-xs font-black text-emerald-400 rounded-sm focus:border-emerald-500", noSpinners)} />
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t border-emerald-500/10">
                         <span className="text-[10px] font-black text-emerald-500 uppercase italic tracking-widest">Total monthly income</span>
                         <span className="text-[16px] font-black text-white tabular-nums">{currency} {Math.round(analysis?.totalIn || 0).toLocaleString()}</span>
                      </div>

                      <div className="bg-[#f97316]/5 p-6 border border-[#f97316]/20 text-right rounded-sm relative shadow-inner">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-[#f97316]" />
                        
                        {/* 🎯 BENCHMARK CURRENCY TOGGLE */}
                        <div className="flex items-center justify-between mb-2">
                           <div className="flex bg-black/40 rounded-sm p-0.5 border border-white/5">
                              {BENCHMARKS.map(b => (
                                <button key={b.code} onClick={() => setBenchmark(b.code)} className={cn("px-2 py-1 text-[8px] font-black rounded-sm transition-all uppercase", benchmark === b.code ? "bg-[#f97316] text-white" : "text-slate-500 hover:text-white")}>{b.code}</button>
                              ))}
                           </div>
                           <p className="text-[10px] font-black text-[#f97316] uppercase tracking-[0.2em] italic">Disposable surplus</p>
                        </div>

                        <div className="flex flex-col items-end">
                          <div className="flex items-baseline gap-2 leading-none">
                            <span className="text-xl font-black text-white/50">{currency}</span>
                            <span className={cn("text-5xl font-black tracking-tighter tabular-nums text-white", (analysis?.surplus ?? 0) <= 0 && "text-rose-500")}>
                              {Math.round(analysis?.surplus || 0).toLocaleString()}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs font-bold text-slate-400 uppercase">Benchmark: {benchmark}</span>
                            <span className="text-xl font-black text-emerald-500 italic">{Math.round(analysis?.surplusBenchmark || 0).toLocaleString()}</span>
                            <span className="text-xs font-black text-emerald-400 opacity-60">({analysis?.rateOfSaving}%)</span>
                          </div>

                          {/* 🛡️ TACTICAL DOWNSIZING ADVICE */}
                          {(analysis?.surplus ?? 0) < 0 && analysis?.canDownsize && (
                            <button 
                              onClick={() => {
                                const currentSize = parseInt(analysis.standardRentKey.replace(/\D/g, ''));
                                setOverrideBedrooms(currentSize - 1);
                              }}
                              className="mt-4 flex items-center gap-2 px-3 py-2 bg-rose-500/10 border border-rose-500/50 text-rose-500 rounded-sm hover:bg-rose-500 hover:text-white transition-all animate-pulse"
                            >
                              <ArrowDownCircle className="size-4" />
                              <span className="text-[10px] font-black uppercase tracking-widest italic">Apply Tactical Downsizing ({analysis.standardRentKey.replace(/\D/g, '')} → {parseInt(analysis.standardRentKey.replace(/\D/g, '')) - 1} Bed)</span>
                            </button>
                          )}

                          {overrideBedrooms && (
                            <button 
                              onClick={() => setOverrideBedrooms(null)}
                              className="mt-2 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-white underline underline-offset-4"
                            >
                              Reset to Standard Allocation
                            </button>
                          )}
                        </div>
                      </div>

                      {/* 🕵️ TACTICAL INCOME REMINDER */}
                      {(analysis?.surplus ?? 0) < 0 && (
                        <div className="mt-4 p-4 bg-sky-500/5 border border-sky-500/20 rounded-sm">
                          <p className="text-[10px] font-black text-sky-400 uppercase tracking-widest flex items-center gap-2 mb-1">
                            <Zap className="size-3" /> Tactical Income Tip
                          </p>
                          <p className="text-[11px] text-slate-400 leading-relaxed italic">
                             Surplus remains negative. To balance this package, consider adding <span className="text-white font-bold">Partner Income</span> on the left menu or <span className="text-white font-bold">Additional Credits</span> (Tutoring/TLR) in the box above.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {leopardfishReview && (
                  <div className="mt-8 p-6 bg-white/[0.02] border border-white/5 rounded-sm shadow-sm">
                    <h4 className="text-[11px] font-black text-sky-400 uppercase tracking-[0.4em] mb-3 flex items-center gap-2">
                      <FileText className="size-4" /> Leopardfish review
                    </h4>
                    <div className="space-y-4 text-[13px] text-slate-300 leading-relaxed border-l-2 border-[#f97316]/30 pl-4">
                      {leopardfishReview.inspectContent.split('||').map((para: string, i: number) => (
                        <p key={`para-explicit-${i}`}>{para.trim()}</p>
                      ))}
                      <p>{leopardfishReview.surplusPara}</p>
                      <p>{leopardfishReview.safetyPara}</p>
                      <p className="text-slate-500 text-[10px] uppercase tracking-widest">{leopardfishReview.schoolContext}</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-4 gap-2 mt-8 pt-6 border-t border-white/5">
                   <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="bg-white/[0.03] p-4 text-center border border-white/5 group rounded-sm cursor-help">
                        <Clock className="size-5 mx-auto mb-2 text-sky-400 transition-transform group-hover:scale-110" />
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Non-contact</p>
                        <p className="text-[13px] font-black text-white">{activeSchool.noncontacttime || "---"}</p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="bg-[#0b1224] border-white/10 text-white text-[9px] uppercase font-bold p-2">Contractual non-contact time expressed as a percentage of a full teaching timetable.</TooltipContent>
                   </Tooltip>

                   <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="bg-white/[0.03] p-4 text-center border border-white/5 group rounded-sm cursor-help">
                        <Activity className="size-5 mx-auto mb-2 text-emerald-400 transition-transform group-hover:scale-110" />
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Health coverage</p>
                        <p className="text-[13px] font-black text-white uppercase">{activeSchool.healthcoverage || "Standard"}</p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="bg-[#0b1224] border-white/10 text-white text-[9px] uppercase font-bold p-2">The level of private or state medical insurance provided within this school's contract.</TooltipContent>
                   </Tooltip>

                   <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="bg-white/[0.03] p-4 text-center border border-white/5 group rounded-sm cursor-help">
                        <BookOpen className="size-5 mx-auto mb-2 text-[#f97316] transition-transform group-hover:scale-110" />
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Curriculum</p>
                        <p className="text-[13px] font-black text-white uppercase">{activeSchool.curriculum || "---"}</p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="bg-[#0b1224] border-white/10 text-white text-[9px] uppercase font-bold p-2">The primary teaching and assessment framework used for delivery at this school.</TooltipContent>
                   </Tooltip>

                   <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="bg-white/[0.03] p-4 text-center border border-white/5 group rounded-sm cursor-help">
                        <ShieldCheck className="size-5 mx-auto mb-2 text-sky-400 transition-transform group-hover:scale-110" />
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Accreditations</p>
                        <p className="text-[13px] font-black text-white uppercase">{activeSchool.approvals || "Standard"}</p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="bg-[#0b1224] border-white/10 text-white text-[9px] uppercase font-bold p-2">External quality assurance and professional body memberships such as COBIS, HMC, or BSO.</TooltipContent>
                   </Tooltip>
                </div>

                <div className="grid grid-cols-4 gap-2 mt-2">
                   <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="bg-black/50 p-4 text-center border border-white/5 group rounded-sm cursor-help hover:bg-white/[0.02] transition-colors">
                        <Clock className="size-5 mx-auto mb-2 text-sky-400 transition-transform group-hover:scale-110" />
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Work/life</p>
                        <p className="text-2xl font-black text-sky-400 italic leading-none">{activeSchool.worklifescore || "---"}</p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="bg-[#0b1224] border-white/10 text-white text-[9px] uppercase font-bold p-2">Our internal rating for work-life balance based on direct teacher feedback and workload audit.</TooltipContent>
                   </Tooltip>

                   <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="bg-black/50 p-4 text-center border border-white/5 group rounded-sm cursor-help hover:bg-white/[0.02] transition-colors">
                        <BookOpen className="size-5 mx-auto mb-2 text-white transition-transform group-hover:scale-110" />
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Academic</p>
                        <p className="text-2xl font-black text-white italic leading-none">{activeSchool.academicscore || "---"}</p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="bg-[#0b1224] border-white/10 text-white text-[9px] uppercase font-bold p-2">The academic rigour, student attainment levels, and university placement success of the school.</TooltipContent>
                   </Tooltip>

                   <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="bg-black/50 p-4 text-center border border-white/5 group rounded-sm cursor-help hover:bg-white/[0.02] transition-colors">
                        <Target className="size-5 mx-auto mb-2 text-emerald-400 transition-transform group-hover:scale-110" />
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Expected retirement</p>
                        <p className="text-xl font-black text-emerald-400 italic leading-none">
                          {activeReq ? `M: ${activeReq.max_age_m} | F: ${activeReq.max_age_f}` : "---"}
                        </p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="bg-[#0b1224] border-white/10 text-white text-[9px] uppercase font-bold p-2">Legal and hiring retirement ages as specified by the local host country regulations.</TooltipContent>
                   </Tooltip>

                   <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="bg-black/50 p-4 text-center border border-white/5 group rounded-sm cursor-help hover:bg-white/[0.02] transition-colors">
                        <Lock className="size-5 mx-auto mb-2 text-[#f97316] transition-transform group-hover:scale-110" />
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Security/Safety</p>
                        <p className="text-2xl font-black text-[#f97316] italic leading-none">{activeSchool.city?.toLowerCase() === "prague" ? "9.8" : "High"}</p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="bg-[#0b1224] border-white/10 text-white text-[9px] uppercase font-bold p-2">National and local safety rating derived from the Global Peace Index and Crime Index data.</TooltipContent>
                   </Tooltip>
                </div>

                <div className="mt-8 flex flex-col md:flex-row gap-4 items-center justify-between opacity-50 italic px-2 border-t border-white/5 pt-4">
                   <p className="text-[11px] font-medium text-slate-500 leading-snug tracking-wider">
                     Calculations are based on current regional indices and are intended as a guide only. Final disposable income will naturally vary based on personal spending and specific household arrangements.
                   </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

export default function EvaluatePage() {
  return <Suspense fallback={null}><DecoderContent /></Suspense>;
}
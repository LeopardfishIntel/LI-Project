 "use client";

import { useState, useEffect, useMemo, Suspense } from 'react';
import { 
  Loader2, Zap, TrendingUp, ShieldCheck, Users, BookOpen, 
  Globe, Target, Plus, Minus, Coins, LineChart, Compass, 
  Scale, AlertTriangle, AlertCircle, Info, Activity, Clock, Wallet, Banknote, Gift, ArrowLeft
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

const BONUS_REGISTRY: Record<string, { label: string, mult: number }> = {
  "Austria": { label: "13th & 14th Month", mult: 0.166 }, 
  "Greece": { label: "13th & 14th Month", mult: 0.166 },
  "Portugal": { label: "13th & 14th Month", mult: 0.166 },
  "Spain": { label: "13th & 14th Month", mult: 0.166 },
  "Italy": { label: "13th Month baseline", mult: 0.083 },
  "Germany": { label: "13th Month", mult: 0.083 },
  "Netherlands": { label: "13th Month / Holiday pay", mult: 0.083 },
  "Belgium": { label: "13th & 92% of 14th", mult: 0.16 },
  "Argentina": { label: "13th Month (s.a.c.)", mult: 0.083 },
  "Brazil": { label: "13th Month", mult: 0.083 },
  "Mexico": { label: "13th Month (aguinaldo)", mult: 0.083 },
  "Peru": { label: "13th & 14th Month", mult: 0.166 },
  "Ecuador": { label: "13th & 14th Month", mult: 0.166 },
  "Bolivia": { label: "13th Month", mult: 0.083 },
  "Philippines": { label: "13th Month pay", mult: 0.083 },
  "Indonesia": { label: "13th Month (thr)", mult: 0.083 },
  "Japan": { label: "Bi-annual bonus", mult: 0.166 },
  "China": { label: "13th Month / cny bonus", mult: 0.083 },
  "Angola": { label: "13th Month", mult: 0.083 },
  "South Africa": { label: "13th Month", mult: 0.083 }
};

const noSpinners = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

function DecoderContent() {
  const router = useRouter();
  const firestore = useFirestore();
  const [mounted, setMounted] = useState(false);
  const [settings, setSettings] = useState({ country: "", schoolId: "", netSalary: "0", partnerSalary: "0", familyStatus: "Single" });
  const [responsibilityAllowance, setResponsibilityAllowance] = useState("0");
  const [extraIncome, setExtraIncome] = useState("0");
  const [manualAdjustments, setManualAdjustments] = useState("0");

  useEffect(() => { setMounted(true); }, []);

  const { data: allSchools } = useCollection<any>(useMemoFirebase(() => (mounted && firestore ? collection(firestore, 'schools') : null), [firestore, mounted]));
  const { data: costOfLiving } = useCollection<any>(useMemoFirebase(() => (mounted && firestore ? collection(firestore, 'locations_costOfLiving') : null), [firestore, mounted]));

  const activeSchool = useMemo(() => allSchools?.find((s: any) => s.id === settings.schoolId) || null, [allSchools, settings.schoolId]);
  const activeCOL = useMemo(() => {
    if (!activeSchool || !costOfLiving) return null;
    return costOfLiving.find((c: any) => c.city?.toLowerCase().trim() === activeSchool.city?.toLowerCase().trim()) ||
           costOfLiving.find((c: any) => c.country?.toLowerCase().trim() === activeSchool.country?.toLowerCase().trim());
  }, [activeSchool, costOfLiving]);

  const currency = activeCOL?.currencyCode || (settings.country === "Portugal" ? "EUR" : "GBP");
  const usdToLocal = (usdAmount: number) => (usdAmount / (RATES['USD'] || 1.27)) * (RATES[currency] || 1.0);

  const bonusInfo = BONUS_REGISTRY[settings.country] || null;
  const amortisedBonus = useMemo(() => {
    const base = parseFloat(settings.netSalary) || 0;
    return bonusInfo ? Math.round(base * bonusInfo.mult) : 0;
  }, [settings.netSalary, bonusInfo]);

  useEffect(() => {
    if (activeSchool?.salaryRange) {
      const usdValue = parseFloat(activeSchool.salaryRange.replace(/[^0-9.]/g, '')) || 0;
      setSettings(prev => ({ ...prev, netSalary: Math.round(usdToLocal(usdValue)).toString() }));
    }
  }, [settings.schoolId, activeSchool, currency]);

  const handleDecideRedirect = () => {
    if (!activeSchool || !allSchools) return;
    const peers = allSchools.filter((s: any) => s.id !== activeSchool.id && (s.city === activeSchool.city || s.country === activeSchool.country)).slice(0, 2);
    const ids = [activeSchool.id, ...peers.map((s: any) => s.id)].join(',');
    router.push(`/compare?ids=${ids}`);
  };

  const analysis = useMemo(() => {
    if (!activeSchool || !activeCOL) return null;

    const totalIn = (parseFloat(settings.netSalary) || 0) + 
                   (settings.familyStatus !== "Single" ? (parseFloat(settings.partnerSalary) || 0) : 0) + 
                   (parseFloat(responsibilityAllowance) || 0) +
                   (parseFloat(extraIncome) || 0) +
                   amortisedBonus;

    const housingStatus = activeSchool.housingprovision?.toLowerCase();
    
    // 🎯 REPLACED Logic: No longer halving for 'subsidised'. It's full price unless provided.
    const baseRent = housingStatus?.includes('provided') ? 0 : usdToLocal(Number(activeCOL.rent1br || 0));
    
    const otherCosts = usdToLocal(Number(activeCOL.groceries || 0)) + usdToLocal(Number(activeCOL.utilities || 0)) + usdToLocal(Number(activeCOL.internet || 0) + Number(activeCOL.mobilePhone || 0)) + usdToLocal(Number(activeCOL.transport || 0)) + usdToLocal(Number(activeCOL.diningSocial || 0)) + (parseFloat(manualAdjustments) || 0);

    const baselineSurplus = totalIn - (baseRent + otherCosts);
    
    // 🚨 Emergency Fiscal Logic: Single + Negative Savings = 60% Flat share model
    const isEmergency = settings.familyStatus === "Single" && baselineSurplus < 0 && baseRent > 0;
    const finalRent = isEmergency ? baseRent * 0.6 : baseRent;
    
    const costs = { rent: finalRent, groceries: usdToLocal(Number(activeCOL.groceries || 0)), utilities: usdToLocal(Number(activeCOL.utilities || 0)), connectivity: usdToLocal(Number(activeCOL.internet || 0) + Number(activeCOL.mobilePhone || 0)), transport: usdToLocal(Number(activeCOL.transport || 0)), social: usdToLocal(Number(activeCOL.diningSocial || 0)), manual: parseFloat(manualAdjustments) || 0 };

    const totalOut = Object.values(costs).reduce((a, b) => a + b, 0);
    const surplus = totalIn - totalOut;
    const rateOfSaving = totalIn > 0 ? Math.round((surplus / totalIn) * 100) : 0;

    const tags = [];
    if (surplus <= 0) tags.push({ label: 'capital loss', icon: AlertCircle, color: 'text-rose-500', bg: 'bg-rose-500/20' });
    else if (rateOfSaving < 15) tags.push({ label: 'tight', icon: AlertTriangle, color: 'text-[#f97316]', bg: 'bg-[#f97316]/20' });
    else if (rateOfSaving >= 35) tags.push({ label: 'elite', icon: Target, color: 'text-emerald-500', bg: 'bg-emerald-500/30' });
    else tags.push({ label: 'strong', icon: Coins, color: 'text-emerald-400', bg: 'bg-emerald-400/10' });

    return { costs, totalIn, totalOut, surplus, rateOfSaving, tags, housingStatus, currency, reliability: activeCOL.dataReliabilityScore, isEmergency };
  }, [activeSchool, activeCOL, settings, responsibilityAllowance, manualAdjustments, extraIncome, amortisedBonus, currency]);

  if (!mounted) return null;

  return (
    <TooltipProvider delayDuration={100}>
      <div className="flex flex-col lg:flex-row min-h-screen bg-[#020617] text-white selection:bg-[#f97316]">
        
        {/* SIDEBAR */}
        <div className="w-full lg:w-72 bg-[#0b1224] border-r border-white/5 p-6 lg:fixed lg:h-full overflow-y-auto z-30">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-[10px] font-black text-[#007FFF] uppercase tracking-[0.3em] mb-10 hover:text-white transition-colors"><ArrowLeft className="size-3" /> Back</button>
          <p className="text-[11px] font-black text-[#f97316] uppercase tracking-[0.4em] mb-8 italic">Operational settings</p>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Target country</label>
              <Select onValueChange={(v) => setSettings({...settings, country: v, schoolId: ""})}>
                <SelectTrigger className="bg-black/40 border-white/10 h-10 text-xs font-bold uppercase"><SelectValue placeholder="Country" /></SelectTrigger>
                <SelectContent className="bg-[#0b1224] border-white/10 text-white font-bold uppercase text-xs">
                  {Array.from(new Set(allSchools?.map((s: any) => s.country))).filter(Boolean).sort().map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Select asset</label>
              <Select disabled={!settings.country} value={settings.schoolId} onValueChange={(v) => setSettings({...settings, schoolId: v})}>
                <SelectTrigger className="bg-black/40 border-white/10 h-10 text-xs font-bold uppercase"><SelectValue placeholder="School" /></SelectTrigger>
                <SelectContent className="bg-[#0b1224] border-white/10 text-white font-bold uppercase text-xs">
                  {allSchools?.filter((s: any) => s.country === settings.country).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.schoolname}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Operative profile</label>
              <Select value={settings.familyStatus} onValueChange={(v) => setSettings({...settings, familyStatus: v})}>
                <SelectTrigger className="bg-black/40 border-white/10 h-10 text-xs font-bold uppercase"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#0b1224] border-white/10 text-white font-bold uppercase text-xs">
                  {["Single", "Married (Sole)", "Married (Dual)", "Family"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="pt-4 border-t border-white/5 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-sky-400 uppercase tracking-widest italic">Monthly net salary ({currency})</label>
                <Input type="number" value={settings.netSalary} onChange={(e) => setSettings({...settings, netSalary: e.target.value})} className={cn("bg-black/40 border-white/10 h-10 font-black text-sm", noSpinners)} />
              </div>
            </div>
            <button onClick={handleDecideRedirect} disabled={!settings.schoolId} className="w-full bg-[#f97316] text-white h-12 font-black uppercase tracking-widest text-[10px] rounded-sm hover:bg-white hover:text-black transition-all shadow-lg active:scale-95 disabled:opacity-30">Compare with similar options</button>
          </div>
        </div>

        {/* MAIN DASHBOARD */}
        <div className="flex-1 lg:ml-72 p-4 md:p-12">
          {!activeSchool || !activeCOL ? (
            <div className="h-[70vh] flex flex-col items-center justify-center opacity-10 space-y-4"><Zap className="size-20" /><p className="font-black uppercase tracking-[0.5em] text-sm">Awaiting tactical match</p></div>
          ) : (
            <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
              <div className="bg-[#0b1224] border border-white/5 p-8 md:p-12 shadow-2xl relative">
                <div className="flex justify-between items-start border-b border-white/5 pb-8">
                  <div className="space-y-3">
                    <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter leading-none">{activeSchool.schoolname}</h2>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-[11px] font-black text-[#f97316] uppercase tracking-widest bg-[#f97316]/10 px-3 py-1.5 rounded-sm border border-[#f97316]/20">{activeSchool.city}, {activeSchool.country}</span>
                      <div className="flex gap-2">
                        {analysis?.tags.map((tag, idx) => (
                          <div key={idx} className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10", tag.bg)}>
                            <tag.icon className={cn("size-4", tag.color)} />
                            <span className={cn("text-[10px] font-black uppercase tracking-tight", tag.color)}>{tag.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">Reliability</p>
                    <p className="text-3xl font-black text-sky-500 italic leading-none">{analysis?.reliability}<span className="text-sm text-slate-700">/10</span></p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 pt-10">
                  <div className="space-y-6">
                    <h3 className="text-sm font-black text-rose-500 uppercase tracking-[0.3em] flex items-center gap-2 border-b border-rose-500/10 pb-3"><Minus className="size-4" /> Monthly outgoings</h3>
                    <div className="space-y-3">
                      {[
                        { 
                          label: settings.familyStatus === "Single" 
                            ? (analysis?.isEmergency ? "Accommodation - flat share" : "Accommodation - 1 bed")
                            : "Accommodation - 2+ bed", 
                          val: analysis?.costs.rent, 
                          status: analysis?.housingStatus,
                          highlight: analysis?.isEmergency 
                        },
                        { label: "Groceries", val: analysis?.costs.groceries },
                        { label: "Utilities", val: analysis?.costs.utilities },
                        { label: "Internet and SIM", val: analysis?.costs.connectivity },
                        { label: "Transport", val: analysis?.costs.transport },
                        { label: "Leisure & social", val: analysis?.costs.social },
                      ].map((cost, idx) => (
                        <div key={idx} className={cn(
                          "flex justify-between items-center border-b border-white/5 pb-3 transition-all duration-500",
                          cost.highlight && "bg-[#f97316]/10 px-3 -mx-3 border-[#f97316]/30 shadow-[0_0_15px_rgba(249,115,22,0.2)] animate-pulse"
                        )}>
                          <span className={cn("text-[12px] font-bold uppercase tracking-tight", cost.highlight ? "text-[#f97316]" : "text-slate-500")}>{cost.label}</span>
                          <span className={cn("text-[13px] font-black tabular-nums", cost.status === 'provided' && cost.label.includes("Accommodation") ? "text-emerald-500 italic" : "text-white")}>
                            {cost.status === 'provided' && cost.label.includes("Accommodation") ? "covered" : `${currency} ${Math.round(cost.val || 0).toLocaleString()}`}
                          </span>
                        </div>
                      ))}
                      <div className="flex justify-between items-start pt-2 group">
                        <div className="flex flex-col">
                           <span className="text-[12px] font-black text-sky-400 uppercase italic flex items-center gap-2"><Wallet className="size-3" /> Custom adjustments</span>
                           <p className="text-[9px] text-slate-500 mt-0.5 ml-5 italic">home country commitments, student loans etc.</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-slate-600">{currency}</span>
                          <Input type="number" value={manualAdjustments} onChange={(e) => setManualAdjustments(e.target.value)} className={cn("bg-white/5 border-b border-white/20 w-24 h-8 text-right text-xs font-black text-white outline-none focus:border-[#f97316]", noSpinners)} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-sm font-black text-emerald-500 uppercase tracking-[0.3em] flex items-center gap-2 border-b border-emerald-500/10 pb-3"><Plus className="size-4" /> Monthly incomes</h3>
                    <div className="space-y-6">
                      <div className="flex justify-between items-center border-b border-white/5 pb-3">
                        <span className="text-[12px] font-bold text-slate-500 uppercase tracking-tight">Monthly net base</span>
                        <span className="text-[13px] font-black text-white">{currency} {parseFloat(settings.netSalary).toLocaleString()}</span>
                      </div>
                      <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-sm flex justify-between items-center">
                        <div className="text-left">
                          <p className="text-[10px] font-black text-sky-400 uppercase leading-none mb-1">Additional income</p>
                          <p className="text-[9px] font-bold text-slate-500 uppercase leading-none italic flex items-center gap-1"><Banknote className="size-3" /> Tutoring / TLR / Bonus</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-emerald-700">{currency}</span>
                          <Input type="number" value={extraIncome} onChange={(e) => setExtraIncome(e.target.value)} className={cn("bg-black/40 border border-emerald-500/20 w-24 h-9 px-2 text-right text-xs font-black text-emerald-400 outline-none rounded-sm focus:border-emerald-500", noSpinners)} />
                        </div>
                      </div>
                      <div className="bg-[#f97316]/5 p-8 border border-[#f97316]/20 text-right rounded-sm relative overflow-hidden shadow-inner">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-[#f97316]" />
                        <p className="text-[11px] font-black text-[#f97316] uppercase tracking-[0.3em] mb-4 italic text-right">Disposable surplus</p>
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-baseline gap-3">
                            <span className="text-lg md:text-xl font-black text-white/50">{currency}</span>
                            <span className={cn("text-3xl md:text-4xl font-black tracking-tighter transition-colors", (analysis?.surplus ?? 0) > 0 ? "text-white" : "text-rose-500")}>{Math.round(analysis?.surplus || 0).toLocaleString()}</span>
                          </div>
                          <span className="text-base font-black text-emerald-500 italic">({analysis?.rateOfSaving}%)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12 pt-8 border-t border-white/5">
                   {[
                     { icon: Clock, label: "Non-contact", val: activeSchool.noncontacttime, color: "text-sky-400" },
                     { icon: Activity, label: "Health coverage", val: activeSchool.healthcoverage, color: "text-emerald-400" },
                     { icon: BookOpen, label: "Curriculum", val: activeSchool.curriculum, color: "text-[#f97316]" },
                     { icon: ShieldCheck, label: "Qualifications", val: activeSchool.approvals, color: "text-sky-400" }
                   ].map((item, i) => (
                    <div key={i} className="bg-white/[0.03] p-5 text-center border border-white/5 hover:bg-white/[0.05] transition-colors group">
                      <item.icon className={cn("size-5 mx-auto mb-2 transition-transform group-hover:scale-110", item.color)} />
                      <p className="text-[10px] font-black text-slate-500 uppercase mb-1 tracking-widest">{item.label}</p>
                      <p className="text-[12px] font-bold text-white uppercase truncate px-1">{item.val || "Verified"}</p>
                    </div>
                   ))}
                </div>

                <div className="mt-12 pt-8 border-t border-white/5 flex flex-col md:flex-row gap-6 items-center">
                   <div className="flex gap-3">
                    <div className="text-center px-8 py-3 border border-white/5 bg-black/40 min-w-[120px]">
                        <p className="text-[10px] font-black text-slate-600 uppercase mb-1 tracking-widest">Work/life</p>
                        <p className="text-xl font-black text-sky-400 italic leading-none">{activeSchool.worklifescore}</p>
                    </div>
                    <div className="text-center px-8 py-3 border border-white/5 bg-black/40 min-w-[120px]">
                        <p className="text-[10px] font-black text-slate-600 uppercase mb-1 tracking-widest">Academic</p>
                        <p className="text-xl font-black text-white italic leading-none">{activeSchool.academicscore}</p>
                    </div>
                   </div>
                   <p className="text-[13px] font-medium text-slate-400 leading-relaxed pl-0 md:pl-8 border-l-0 md:border-l border-white/10 text-center md:text-left italic">
                     This forecast is provided as a baseline verified via current city indices. Please keep in mind that negotiated school packages and individual lifestyle choices will naturally lead to variations in actual figures.
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
 "use client";

import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { 
  MapPin, Users, PiggyBank, Loader2, Coins, TrendingUp, 
  BookOpen, Scale, AlertTriangle, AlertCircle, Info, Building2, Wallet, Gift
} from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { doc, increment, setDoc } from 'firebase/firestore';

const RATES: Record<string, number> = {
  CZK: 30.2, AED: 4.65, EUR: 1.18, GBP: 1.0, SAR: 4.75, QAR: 4.62, CHF: 1.12, DKK: 8.85, USD: 1.27, AZN: 2.15, HKD: 9.85
};

const BONUS_REGISTRY: Record<string, number> = {
  "Austria": 0.166, "Spain": 0.166, "Portugal": 0.166, "Greece": 0.166, 
  "Japan": 0.166, "Peru": 0.166, "Italy": 0.083, "Germany": 0.083, "China": 0.083
};

const STATUS_MULTIPLIERS: Record<string, number> = {
  "single": 1.0,
  "married-sole": 1.5,
  "married-dual": 1.6, 
  "family-1": 1.9,
  "family-2": 2.3,
  "family-3": 3.0
};

const noSpinners = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

const MetricRow = ({ label, value, result, icon }: {
    label: string;
    value: any;
    result: 'best' | 'worst' | 'neutral';
    icon: React.ReactNode;
}) => {
    const resultColor = result === 'best' ? 'text-emerald-400' : result === 'worst' ? 'text-rose-400' : 'text-white';
    return (
        <div className="flex justify-between items-center py-2.5 border-b border-white/5 last:border-0">
            <div className="flex items-center gap-2">
                {icon}
                <span className="text-[9px] font-black uppercase text-sky-400 tracking-widest">{label}</span>
            </div>
            <div className={cn("text-[11px] font-black tracking-tighter text-right tabular-nums", resultColor)}>
                {value?.toString() ?? '—'}
            </div>
        </div>
    );
};

export default function ComparePage() {
    const firestore = useFirestore();
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    const { data: schools, isLoading: isLoadingSchools } = useCollection<any>(
        useMemoFirebase(() => (mounted && firestore ? 'schools' : null), [firestore, mounted])
    );
    const { data: costOfLiving } = useCollection<any>(
        useMemoFirebase(() => (mounted && firestore ? 'locations_costOfLiving' : null), [firestore, mounted])
    );
    
    const [selectedSchoolIds, setSelectedSchoolIds] = useState<string[]>([]);
    const [netSalaries, setNetSalaries] = useState<string[]>(['', '', '']);
    const [extraIncomes, setExtraIncomes] = useState<string[]>(['0', '0', '0']);
    const [familyStatuses, setFamilyStatuses] = useState<string[]>(['single', 'single', 'single']);
    
    useEffect(() => {
        if (mounted && firestore) {
            const trackView = async () => {
                try {
                    const counterRef = doc(firestore, 'app_metrics', 'page_views');
                    await setDoc(counterRef, { comparisons_made: increment(1) }, { merge: true });
                } catch (e) { console.warn("Metrics heart-beat delayed."); }
            };
            trackView();
        }
    }, [firestore, mounted]);
    
    useEffect(() => {
        if (schools && schools.length > 0 && selectedSchoolIds.length === 0) {
            setSelectedSchoolIds(schools.slice(0, 3).map((s: any) => s.id));
        }
    }, [schools, selectedSchoolIds.length]);

    const activeData = useMemo(() => {
        return selectedSchoolIds.map((id, index) => {
            const school = schools?.find((s: any) => s.id === id);
            if (!school) return null;

            // FIXED: Removed the self-referencing 'col' typo
            const col = costOfLiving?.find((c: any) => c.city?.toLowerCase().trim() === school.city?.toLowerCase().trim()) ||
                        costOfLiving?.find((c: any) => c.country?.toLowerCase().trim() === school.country?.toLowerCase().trim());
            
            const currency = col?.currencyCode || 'USD';
            const rate = RATES[currency] || 1.0;
            const usdToLocal = (usd: number) => (usd / (RATES['USD'] || 1.27)) * rate;

            const statusKey = familyStatuses[index];
            const multiplier = STATUS_MULTIPLIERS[statusKey] || 1.0;

            const rawSalary = school.salaryRange || "0";
            const usdSalary = parseFloat(rawSalary.toString().replace(/[^0-9.]/g, '')) || 0;
            const autoLocalSalary = Math.round(usdToLocal(usdSalary));
            const bonusMult = BONUS_REGISTRY[school.country] || 0;
            const amortisedBonus = autoLocalSalary * bonusMult;

            const housingProvided = school.housingprovision?.toLowerCase().includes('provided');
            const rent = housingProvided ? 0 : usdToLocal(col?.rent1br || 0) * (statusKey === 'single' ? 1 : 1.5);
            
            const totalOut = (
                usdToLocal(col?.groceries || 0) * multiplier + 
                usdToLocal(col?.utilities || 0) * (multiplier * 0.7) + 
                usdToLocal(col?.internet || 0) + 
                usdToLocal(col?.transport || 0) * (multiplier * 0.6) + 
                usdToLocal(col?.diningSocial || 0) * multiplier
            ) + rent;

            const baseInput = parseFloat(netSalaries[index]) || autoLocalSalary;
            const currentSalary = baseInput + (parseFloat(extraIncomes[index]) || 0) + amortisedBonus;
            const surplus = currentSalary - totalOut;
            const rateOfSaving = currentSalary > 0 ? Math.round((surplus / currentSalary) * 100) : 0;

            const tags = [];
            if (surplus <= 0) tags.push({ label: 'LOSS', icon: AlertCircle, color: 'text-rose-500', bg: 'bg-rose-500/20' });
            else if (rateOfSaving >= 35) tags.push({ label: 'ELITE', icon: Coins, color: 'text-emerald-500', bg: 'bg-emerald-500/10' });

            return { school, surplus, rateOfSaving, currency, tags, currentSalary };
        });
    }, [selectedSchoolIds, schools, costOfLiving, netSalaries, extraIncomes, familyStatuses]);

    if (!mounted || isLoadingSchools || !schools) {
        return <div className="h-screen flex items-center justify-center bg-[#020617]"><Loader2 className="animate-spin text-[#f97316] size-10" /></div>;
    }

    return (
        <div className="container mx-auto px-4 py-12 bg-[#020617] min-h-screen font-sans selection:bg-[#f97316]">
            <div className="mb-12 text-center space-y-2">
                <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-white uppercase italic leading-none">Triple <span className="text-[#f97316]">Shootout</span></h1>
                <p className="text-[#94a3b8] font-black uppercase text-[10px] tracking-[0.4em] opacity-60">Side-by-side selection contrast.</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {activeData.map((data, index) => (
                     <div key={index} className="flex flex-col gap-3">
                        <div className="space-y-4 bg-[#0b1224] p-6 border border-white/5 rounded-sm shadow-xl">
                             <Select value={data?.school?.id} onValueChange={(val) => {
                                 const next = [...selectedSchoolIds];
                                 next[index] = val;
                                 setSelectedSchoolIds(next);
                             }}>
                                <SelectTrigger className="bg-black/40 border-white/10 h-10 rounded-sm text-white font-black uppercase text-[10px] tracking-widest">
                                    <SelectValue placeholder="Target Asset" />
                                </SelectTrigger>
                                <SelectContent className="bg-[#1f2937] border-white/10">
                                    {schools.map((s: any) => <SelectItem key={s.id} value={s.id} className="font-bold text-xs uppercase text-white">{s.schoolname || s.name}</SelectItem>)}
                                </SelectContent>
                             </Select>

                             <div className="space-y-4">
                                <div className="space-y-1">
                                    <Label className="text-[9px] font-black uppercase text-sky-400 tracking-widest italic leading-none">Monthly Net ({data?.currency})</Label>
                                    <Input type="number" value={netSalaries[index]} placeholder={data?.currentSalary?.toString()} onChange={(e) => {
                                            const next = [...netSalaries];
                                            next[index] = e.target.value;
                                            setNetSalaries(next);
                                        }} className={cn("bg-black/40 border-white/10 rounded-sm h-10 text-right font-black text-white text-xs", noSpinners)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[9px] font-black uppercase text-emerald-400 tracking-widest italic leading-none">Additional Income</Label>
                                    <Input type="number" value={extraIncomes[index]} onChange={(e) => {
                                            const next = [...extraIncomes];
                                            next[index] = e.target.value;
                                            setExtraIncomes(next);
                                        }} className={cn("bg-black/40 border-white/10 rounded-sm h-10 text-right font-black text-emerald-400 text-xs", noSpinners)}
                                    />
                                </div>
                                
                                <div className="space-y-1">
                                    <Label className="text-[9px] font-black uppercase text-slate-500 tracking-widest italic leading-none">Operative Profile</Label>
                                    <Select value={familyStatuses[index]} onValueChange={(val) => {
                                        const next = [...familyStatuses];
                                        next[index] = val;
                                        setFamilyStatuses(next);
                                    }}>
                                        <SelectTrigger className="bg-black/40 border-white/10 h-10 rounded-sm text-white font-black uppercase text-[10px]">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-[#1f2937] border-white/10 text-white font-bold uppercase text-[10px]">
                                            <SelectItem value="single">single</SelectItem>
                                            <SelectItem value="married-sole">married (sole earner)</SelectItem>
                                            <SelectItem value="married-dual">married (dual income)</SelectItem>
                                            <SelectItem value="family-1">family (1 child)</SelectItem>
                                            <SelectItem value="family-2">family (2 children)</SelectItem>
                                            <SelectItem value="family-3">family (3 or more)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                             </div>
                        </div>

                        {data && (
                        <Card className="bg-[#0b1224] border-white/5 overflow-hidden group shadow-2xl relative">
                            <CardHeader className="pt-6 border-b border-white/5">
                                <CardTitle className="text-xl text-white font-black tracking-tighter uppercase leading-none truncate">{data.school.schoolname || data.school.name}</CardTitle>
                                <div className="flex items-center text-[#94a3b8] text-[10px] font-black uppercase pt-1">
                                    <MapPin className="w-3 h-3 mr-1 text-[#f97316]" />
                                    <span>{data.school.city}, {data.school.country}</span>
                                </div>
                            </CardHeader>

                            <CardContent className="p-4 space-y-1">
                                <MetricRow label="Disposable Surplus" value={`${data.currency} ${Math.round(data.surplus).toLocaleString()}`} result={data.surplus > 0 ? 'best' : 'worst'} icon={<PiggyBank className="w-4 h-4 text-emerald-400" />} />
                                <MetricRow label="Rate of Saving" value={`${data.rateOfSaving}%`} result="neutral" icon={<TrendingUp className="w-4 h-4 text-sky-400" />} />
                                <MetricRow label="Work/Life Score" value={`${data.school.worklifescore || 0} / 10`} result="neutral" icon={<Scale className="w-4 h-4 text-purple-400" />} />
                                <MetricRow label="Curriculum" value={data.school.curriculum || "N/A"} icon={<BookOpen className="w-4 h-4 text-blue-400" />} result="neutral" />
                                
                                <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-white/5">
                                    {data.tags.map((tag, i) => (
                                        <div key={i} className={cn("flex items-center gap-1 px-2 py-1 border border-white/10 rounded-sm", tag.bg)}>
                                            <tag.icon className={cn("size-3", tag.color)} />
                                            <span className={cn("text-[8px] font-black uppercase", tag.color)}>{tag.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
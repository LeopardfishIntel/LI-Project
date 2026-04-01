"use client";
"use client";

import { useEffect, useState, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  MapPin, Loader2, ArrowLeft, TrendingUp, ShieldAlert, Target, Zap, 
  BookOpen, Activity, Wallet, Receipt, Globe2, Users, AlertTriangle, 
  ExternalLink, Clock, Home, GraduationCap, BarChart3, Info, Scale, PlusCircle
} from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// --- USD BASE ENGINE (March 2026) ---
const RATES: Record<string, number> = {
  USD: 1.0, CZK: 23.45, AED: 3.67, EUR: 0.92, GBP: 0.79, SAR: 3.75, QAR: 3.64, CHF: 0.88, DKK: 6.85, AZN: 1.70, HKD: 7.82, JPY: 150.2
};

const HOUSEHOLD_OPTIONS = ["Single", "Married (sole earner)", "Married (dual income)", "Family (1 child)", "Family (2 children)", "Family (3 or more)"];
const ESSENTIALS_MAP: Record<string, number> = { "Single": 650, "Married (sole earner)": 1100, "Married (dual income)": 1100, "Family (1 child)": 1450, "Family (2 children)": 1800, "Family (3 or more)": 2200 };
const BONUS_REGISTRY: Record<string, number> = { "austria": 0.166, "germany": 0.083, "china": 0.083, "spain": 0.166, "japan": 0.166 };
const noSpinners = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";
const normalize = (str: string) => (str || "").toLowerCase().replace(/[^a-z0-9]/g, '').trim();

// --- UI COMPONENTS ---

const Tooltip = ({ text, children }: { text: string, children: React.ReactNode }) => (
    <div className="group relative inline-block">
        {children}
        <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 hidden group-hover:block z-[100] w-64 p-3 bg-slate-900 border border-white/20 text-[11px] text-slate-100 rounded-md shadow-2xl pointer-events-none leading-relaxed">
            {text}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900" />
        </div>
    </div>
);

const ScoreBadge = ({ label, score, color = "#007FFF" }: { label: string, score: string | number, color?: string }) => (
    <div className="flex flex-col border-l border-white/10 pl-3">
        <span className="font-bold text-slate-500 leading-none mb-1 text-[9px]">{label}</span>
        <span className="font-black italic tracking-tighter leading-none text-lg" style={{ color }}>{score}</span>
    </div>
);

// --- STAFFROOM REALITY ENGINE ---

const getStaffroomBrief = (country: string) => {
    const c = country.toLowerCase();
    // Regional Unrest Logic
    const isAlert = c.includes("jordan") || c.includes("lebanon") || c.includes("israel") || c.includes("palestine") || c.includes("ukraine") || c.includes("qatar") || c.includes("uae") || c.includes("saudi arabia");
    
    if (c.includes("qatar") || c.includes("uae") || c.includes("saudi arabia")) return {
        isAlert,
        text: "The Gulf remains safe for staff, but you'll feel the regional tension as a definite 'background hum' at the moment. Daily life is seamless, but it's a bubble—you'll find the social dynamics strictly managed and the local political landscape is something you keep an eye on, even if it rarely affects your front door."
    };
    if (c.includes("jordan")) return {
        isAlert,
        text: "You'll feel the regional tension here more than most. It's safe enough, but protests are regular and the social atmosphere is quite closed-off compared to Europe. Don't expect things to work like they do back home—a massive amount of patience with the local systems is a requirement here."
    };
    if (c.includes("hong kong")) return {
        isAlert,
        text: "Schools are elite, but you're trading space and quiet for an intense, transactional urban life. You will notice the political shifts in the city vibe, and it is becoming increasingly expensive. It's a high-pressure bubble that doesn't slow down for anyone."
    };
    if (c.includes("greece")) return {
        isAlert: false,
        text: "Athens is fantastic for the culture, but the bureaucracy is a daily grind. You'll have to deal with occasional strikes or economic hiccups that make simple banking or transport a headache. It's a move you make for the human pace of life, not for logistical efficiency."
    };

    return {
        isAlert: false,
        text: "Safe enough for a secure routine, provided you keep your wits about you in the busy areas. Most staff find the transition is a bit of a grind logistically at first, but it settles into a predictable day-to-day work environment once the initial paperwork is sorted."
    };
};

const getLifestyleVibe = (city: string, workload: number) => {
    if (workload > 52) return `Intensity alert: This is a high-performance campus. Expect to be very busy during term.`;
    if (workload < 44) return `Lifestyle focus: A more human pace here; plenty of energy left for ${city} on weekends.`;
    return `Balanced vibe: A typical international setup where work is heavy but manageable.`;
};

const calculateWorkload = (school: any) => {
    let hours = 42;
    const prestige = parseFloat(school.academicscore || "7.0");
    const contact = parseInt(school.noncontacttime || "20");
    if (prestige > 9.0) hours += 8;
    if ((school.curriculum || "").toLowerCase().includes('ib')) hours += 5;
    if (contact < 18) hours += 5;
    return hours;
};

const generateDetailedConclusion = (ranked: any[]) => {
    if (ranked.length < 3) return ["Strategic comparison requires three active targets to generate a final analytical briefing."];
    
    const finPick = [...ranked].sort((a, b) => b.surplusUSD - a.surplusUSD)[0];
    const lifePick = [...ranked].sort((a, b) => a.workload - b.workload)[0];
    const stratPick = [...ranked].sort((a, b) => parseFloat(b.school.academicscore) - parseFloat(a.school.academicscore))[0];

    return [
        `Right then, looking at the choices on your desk, there’s a clear story forming. If your main goal is to get some serious money behind you, ${finPick.school.schoolname} is the obvious pick. Over a standard three-year term, you'll be able to put away about ${finPick.currency} ${Math.round(finPick.surplusLocal * 36).toLocaleString()}, which is a proper nest egg that really gives you options later on.`,
        `If you're more concerned about your sanity and actually having a life outside the classroom, ${lifePick.school.schoolname} is much more sensible. With the workload sitting around ${lifePick.workload} hours, it's the most human-paced option in the set. It gives you the breathing room to actually enjoy living in ${lifePick.school.city} rather than just seeing it through a taxi window.`,
        `Then there’s the question of your next move. ${stratPick.school.schoolname} is the name that really carries weight. Even though the work is undeniably harder, the capital you build here is your exit strategy. It’s the kind of school that gets your CV noticed when you're eventually ready to head to Singapore, London, or another top-tier hub.`,
        `In places like Jordan or the Middle East right now, you're weighing up that background awareness of regional unrest against the high-end comfort these schools provide. In Hong Kong, it's about whether you're ready for the pace and the shifting legal landscape. Athens, meanwhile, is for those who want soul and culture over pure efficiency.`,
        `Essentially, you’re deciding whether to put your head down and build a big bank balance at the cost of a high-pressure schedule, or picking a path that lets you breathe a bit more freely with a slightly smaller surplus. There's no wrong answer, as long as you're being honest with yourself about what you want from the next three years.`
    ];
};

function DecideContent() {
    const router = useRouter();
    const firestore = useFirestore();
    const searchParams = useSearchParams();

    const [mounted, setMounted] = useState(false);
    
    const { data: schools, isLoading: sLoading } = useCollection<any>(useMemoFirebase(() => (mounted && firestore ? collection(firestore, 'schools') : null), [firestore, mounted]));
    const { data: colData } = useCollection<any>(useMemoFirebase(() => (mounted && firestore ? collection(firestore, 'locations_costOfLiving') : null), [firestore, mounted]));
    
    const [selectedIds, setSelectedIds] = useState<string[]>(['', '', '']);
    const [selectedCountries, setSelectedCountries] = useState<string[]>(['', '', '']);
    const [familyStatus, setFamilyStatus] = useState("Single");
    const [netSalaries, setNetSalaries] = useState<string[]>(['', '', '']);
    const [adjustments, setAdjustments] = useState(Array(3).fill({ second: '0', other: '0', home: '0' }));

    useEffect(() => { setMounted(true); }, []);

    const availableCountries = useMemo(() => (!schools ? [] : Array.from(new Set(schools.map((s: any) => s.country))).filter(Boolean).sort()), [schools]);

    // --- WORKSPACE LOGIC (Memory + Dubai Shift) ---
    useEffect(() => {
        if (mounted && (schools?.length ?? 0) > 0 && colData) {
            const urlIds = searchParams.get('ids')?.split(',').filter(Boolean) || [];
            const savedIds = JSON.parse(localStorage.getItem('lf_ids_v15') || '["", "", ""]');
            
            let finalIds = [...savedIds];
            if (urlIds.length > 0) {
                const uniqueNew = urlIds.filter(id => !savedIds.includes(id));
                finalIds = [...uniqueNew, ...savedIds].slice(0, 3);
            }

            setSelectedIds(finalIds);
            setSelectedCountries(finalIds.map(id => schools.find((s: any) => s.id === id)?.country || ''));

            const sNet = localStorage.getItem('lf_net_v15');
            const sAdj = localStorage.getItem('lf_adj_v15');
            const sFam = localStorage.getItem('lf_fam_v15');
            
            if (sFam) setFamilyStatus(sFam);
            if (sAdj) setAdjustments(JSON.parse(sAdj));

            const newSalaries = JSON.parse(sNet || '["", "", ""]');
            finalIds.forEach((id, idx) => {
                if (id && (!newSalaries[idx] || newSalaries[idx] === '0')) {
                    const s = schools.find((item: any) => item.id === id);
                    const col = colData.find((c: any) => normalize(c.city || c.city_name) === normalize(s.city) || normalize(c.country || c.country_name) === normalize(s.country));
                    const rate = RATES[col?.currencyCode || 'USD'] || 1.0;
                    const usdMed = parseFloat(s.salaryRange?.replace(/[^0-9.]/g, '') || '4500');
                    newSalaries[idx] = Math.round(usdMed * rate).toString();
                }
            });
            setNetSalaries(newSalaries);
        }
    }, [mounted, schools, colData, searchParams]);

    useEffect(() => {
        if (mounted && selectedIds.some(id => id !== '')) {
            localStorage.setItem('lf_net_v15', JSON.stringify(netSalaries));
            localStorage.setItem('lf_adj_v15', JSON.stringify(adjustments));
            localStorage.setItem('lf_fam_v15', familyStatus);
            localStorage.setItem('lf_ids_v15', JSON.stringify(selectedIds));
        }
    }, [netSalaries, adjustments, familyStatus, selectedIds, mounted]);

    const handleSchoolSelect = (val: string, index: number) => {
        const nextIds = [...selectedIds]; nextIds[index] = val; setSelectedIds(nextIds);
        const school = schools?.find((s: any) => s.id === val);
        if (school) {
            const col = colData?.find((c: any) => normalize(c.city || c.city_name) === normalize(school.city) || normalize(c.country || c.country_name) === normalize(school.country));
            const rate = RATES[col?.currencyCode || 'USD'] || 1.0;
            const usdMed = parseFloat(school.salaryRange?.replace(/[^0-9.]/g, '') || '4500');
            const nextSalaries = [...netSalaries]; nextSalaries[index] = Math.round(usdMed * rate).toString(); setNetSalaries(nextSalaries);
            const nextCountries = [...selectedCountries]; nextCountries[index] = school.country; setSelectedCountries(nextCountries);
        }
    };

    const shootoutMatrix = useMemo(() => {
        if (!schools || !colData) return [];
        return selectedIds.map((id, index) => {
            const school = schools.find((s: any) => s?.id === id);
            if (!school) return null;
            const col = colData.find((c: any) => normalize(c.city || c.city_name) === normalize(school.city) || normalize(c.country || c.country_name) === normalize(school.country));
            const currency = col?.currencyCode ?? 'USD';
            const rate = RATES[currency] ?? 1.0;
            const salaryIn = parseFloat(netSalaries[index]) || 0;
            const totalLocalIn = salaryIn + (salaryIn * (BONUS_REGISTRY[school.country?.toLowerCase()] ?? 0)) + (parseFloat(adjustments[index].second) || 0) + (parseFloat(adjustments[index].other) || 0);
            
            const rawRent = parseFloat(col?.rent1br ?? "1450");
            const provision = (school.housingprovision || "").toLowerCase();
            let finalRentUSD = rawRent;
            let housingNote = "Housing is not included in this package"; 
            if (provision.includes("provided")) { finalRentUSD = 0; housingNote = "Financial model relies on school-provided housing"; }
            else if (provision.includes("subsidised")) { finalRentUSD = rawRent * 0.5; housingNote = "Subsidised housing model applied"; }

            const totalLocalCost = (finalRentUSD + (ESSENTIALS_MAP[familyStatus] || 650)) * rate + (parseFloat(adjustments[index].home) || 0);
            const surplusLocal = totalLocalIn - totalLocalCost;
            const workload = calculateWorkload(school);
            const rawSafety = parseFloat(school.citySafety || "7.2") * 10;
            
            const finW = (surplusLocal/rate / 2500 * 100 + 35) * 0.4;
            const careerW = parseFloat(school.academicscore || "7.5") * 10 * 0.3;
            const lifestyleW = (rawSafety * 0.2) - (workload > 50 ? (workload-50)*2 : 0);
            const workW = (100 - workload) * 0.1;
            
            const matchScore = Math.round(Math.max(15, Math.min(99, finW + careerW + lifestyleW + workW)));

            return { 
                school, surplusLocal, totalLocalIn, totalLocalCost, currency, rate, matchPercentage: matchScore, workload, housingNote, provision,
                countryScore: parseFloat(school.citySafety || "7.2").toFixed(1), schoolScore: parseFloat(school.academicscore || "7.5").toFixed(1),
                surplusUSD: surplusLocal / rate, savingsRate: totalLocalIn > 0 ? Math.round((surplusLocal/totalLocalIn)*100) : 0
            };
        });
    }, [selectedIds, schools, colData, netSalaries, adjustments, familyStatus]);

    const ranked = useMemo(() => shootoutMatrix.filter((item): item is NonNullable<typeof item> => item !== null).sort((a, b) => b.matchPercentage - a.matchPercentage), [shootoutMatrix]);
    const topPickId = ranked[0]?.school.id;
    const detailedConclusion = useMemo(() => generateDetailedConclusion(ranked), [ranked]);

    if (!mounted || sLoading) return <div className="h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-[#f97316] size-10" /></div>;

    return (
        <div className="min-h-screen bg-[#020617] text-slate-200 font-sans p-6 md:p-8 selection:bg-[#f97316]">
            <div className="max-w-7xl mx-auto space-y-4">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-white/5 pb-4 gap-6">
                    <div className="space-y-1">
                        <button onClick={() => router.back()} className="flex items-center gap-2 text-[11px] font-black text-[#007FFF] uppercase tracking-widest hover:text-white mb-2 transition-colors"><ArrowLeft className="size-3" /> Back</button>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-[#f97316] italic leading-none uppercase">Compare and Decide</h1>
                        <p className="text-[12px] font-bold text-slate-500 italic mt-2 flex items-center gap-2 tracking-tight">
                            <AlertTriangle className="size-3 text-[#f97316]" /> This analysis is only as good as the data you input! Ensure net salaries and household status are accurate.
                        </p>
                    </div>
                    <div className="w-full md:w-72 p-3 bg-[#f97316]/10 border border-[#f97316]/30 rounded-sm shadow-xl">
                        <Label className="text-[11px] font-black uppercase text-[#f97316] tracking-[0.05em] mb-1.5 block">Household configuration</Label>
                        <Select value={familyStatus} onValueChange={setFamilyStatus}>
                            <SelectTrigger className="bg-black/50 border-white/10 h-10 text-white font-bold text-[11px] focus:ring-[#f97316]"><SelectValue placeholder="Select status" /></SelectTrigger>
                            <SelectContent className="bg-[#1f2937] border-white/10 text-white font-bold text-[11px]">{HOUSEHOLD_OPTIONS.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {[0, 1, 2].map((i) => (
                        <div key={i} className="space-y-2 bg-[#0b1224] p-5 border border-white/5 rounded-sm shadow-xl flex flex-col">
                             <div className="grid grid-cols-2 gap-3 h-14">
                                <div className="space-y-1"><Label className="text-[10px] font-bold text-slate-500 flex items-center gap-1.5"><Globe2 className="size-3 text-[#007FFF]"/> Country</Label>
                                    <Select value={selectedCountries[i]} onValueChange={(val) => { const nC = [...selectedCountries]; nC[i] = val; setSelectedCountries(nC); }}>
                                        <SelectTrigger className="bg-black/40 border-white/10 h-8 text-[#007FFF] font-bold text-[10px]"><SelectValue placeholder="Location" /></SelectTrigger>
                                        <SelectContent className="bg-[#1f2937] border-white/10 text-white font-bold text-[10px]">{availableCountries.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1"><Label className="text-[10px] font-bold text-slate-500 flex items-center gap-1.5"><Target className="size-3 text-[#f97316]"/> Target</Label>
                                    <Select disabled={!selectedCountries[i]} value={selectedIds[i]} onValueChange={(val) => handleSchoolSelect(val, i)}>
                                        <SelectTrigger className="bg-black/40 border-white/10 h-8 text-white font-bold text-[10px]"><SelectValue placeholder="Institution" /></SelectTrigger>
                                        <SelectContent className="bg-[#1f2937] border-white/10 text-white font-bold text-[10px]">{(schools || []).filter((s: any) => s.country === selectedCountries[i]).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.schoolname}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                             </div>
                             <div className="grid grid-cols-2 gap-3 pt-1 border-t border-white/5 items-center h-14">
                                <div className="space-y-1">
                                    <Label className="text-[9px] font-bold text-[#007FFF] italic whitespace-nowrap flex items-center gap-1">Monthly income ({shootoutMatrix[i]?.currency || 'Local'}) <button onClick={() => window.open('/tools/tax-calculator', 'Tax', 'width=600,height=800')}><ExternalLink className="size-3" /></button></Label>
                                    <Input type="number" value={netSalaries[i]} placeholder="0" onChange={(e) => { const next = [...netSalaries]; next[i] = e.target.value; setNetSalaries(next); }} className={cn("bg-black/40 border-white/5 h-7 text-right font-black text-white text-[12px]", noSpinners)} />
                                </div>
                                <div className="space-y-1">
                                    <Tooltip text="Including spouse salary, child benefit, or recurring family income."><Label className="text-[9px] font-bold text-slate-500 italic">2nd income</Label></Tooltip>
                                    <Input type="number" value={adjustments[i].second} onChange={(e) => { const next = [...adjustments]; next[i] = { ...next[i], second: e.target.value }; setAdjustments(next); }} className={cn("bg-black/40 border-white/5 h-7 text-right font-black text-white text-[12px]", noSpinners)} />
                                </div>
                             </div>
                             <div className="grid grid-cols-2 gap-3 items-center h-14">
                                <div className="space-y-1">
                                    <Tooltip text="Including tutoring, investments, or allowances."><Label className="text-[9px] font-bold text-slate-500 italic">Other income</Label></Tooltip>
                                    <Input type="number" value={adjustments[i].other} onChange={(e) => { const next = [...adjustments]; next[i] = { ...next[i], other: e.target.value }; setAdjustments(next); }} className={cn("bg-black/40 border-white/5 h-7 text-right font-black text-white text-[12px]", noSpinners)} />
                                </div>
                                <div className="space-y-1">
                                    <Tooltip text="Mortgages back home, student loans, or credit commitments."><Label className="text-[9px] font-bold text-slate-500 italic">Home commitment</Label></Tooltip>
                                    <Input type="number" value={adjustments[i].home} onChange={(e) => { const next = [...adjustments]; next[i] = { ...next[i], home: e.target.value }; setAdjustments(next); }} className={cn("bg-black/40 border-white/5 h-7 text-right font-black text-white text-[12px]", noSpinners)} />
                                </div>
                             </div>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                    {shootoutMatrix.map((data, idx) => (
                        <div key={`card-${idx}`} className={cn(
                            "bg-[#0b1224]/50 border transition-all duration-500 p-6 space-y-3 flex flex-col justify-between relative",
                            "border-[#f97316]/40", 
                            data?.school.id === topPickId && "border-2 border-[#f97316] ring-1 ring-[#f97316] ring-offset-4 ring-offset-[#020617] shadow-[0_0_40px_rgba(249,115,22,0.1)]"
                        )}>
                            {data ? (
                                <>
                                    <div className="flex justify-between items-start gap-4 h-28">
                                        <div className="space-y-1 flex-1">
                                            <h2 className="text-lg md:text-2xl font-black text-[#f97316] italic tracking-tighter leading-none">{data.school.schoolname}</h2>
                                            <div className="mt-2 space-y-1.5">
                                                <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400">
                                                    <span className="flex items-center gap-1"><Clock className="size-3"/> ~{data.workload} hrs/wk</span>
                                                    <span className="flex items-center gap-1"><Home className="size-3"/> {data.school.housingprovision}</span>
                                                </div>
                                                <p className="text-[10px] font-medium text-emerald-400/80 italic leading-tight">{getLifestyleVibe(data.school.city, data.workload)}</p>
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 mt-3"><MapPin className="size-3 text-[#007FFF]" /> {data.school.city}, {data.school.country}</div>
                                        </div>
                                        <Tooltip text={`Optimal savings could be as much as ${Math.round(data.surplusLocal).toLocaleString()} ${data.currency}`}>
                                            <div className="flex flex-col items-center justify-center p-3 bg-white/5 border border-white/10 rounded-full size-15 shrink-0 shadow-lg hover:scale-105 transition-transform cursor-help">
                                                <span className="text-[8px] font-bold text-slate-500 leading-none mb-1">Bankable</span>
                                                <span className={cn("text-xl font-black italic tracking-tighter leading-none", data.savingsRate >= 25 ? "text-emerald-400" : "text-[#007FFF]")}>{data.savingsRate}%</span>
                                            </div>
                                        </Tooltip>
                                    </div>

                                    <div className="space-y-0 border-y border-white/5">
                                        <div className="grid grid-cols-3 gap-2 py-3 h-14">
                                            <ScoreBadge label="Match" score={`${data.matchPercentage}%`} color="#f97316" />
                                            <ScoreBadge label="Country" score={data.countryScore} />
                                            <ScoreBadge label="School" score={data.schoolScore} />
                                        </div>
                                        <div className="pb-3 px-2 h-14 flex items-center">
                                            <Tooltip text="Match reflects your priorities: Financial (40%), Career Potential (30%), Lifestyle (20%), Workload (10%).">
                                                <p className="text-[11px] font-bold text-slate-300 tracking-tight leading-tight italic">
                                                    <span className="text-[#007FFF] mr-1.5 not-italic text-[10px]">Match insights:</span> 
                                                    {data.matchPercentage > 85 ? 'A natural transition supported by current financial surplus.' : 'A strategic move requiring careful workload management.'}
                                                </p>
                                            </Tooltip>
                                        </div>
                                    </div>

                                    <div className="space-y-3 pt-1">
                                        <div className="grid grid-cols-2 gap-2 border-b border-white/5 pb-2 h-20 flex items-center">
                                            <div className="space-y-0.5"><p className="text-[10px] font-bold text-slate-500 flex items-center gap-1"><Wallet className="size-2.5"/> Monthly income</p><p className="text-[13px] font-black text-white leading-none">{data.currency} {Math.round(data.totalLocalIn).toLocaleString()}</p></div>
                                            <div className="space-y-0.5 text-right"><p className="text-[10px] font-bold text-slate-500 flex items-center gap-1 justify-end"><Receipt className="size-2.5"/> Monthly cost</p><p className="text-[13px] font-black text-rose-400 leading-none">{data.currency} {Math.round(data.totalLocalCost).toLocaleString()}</p></div>
                                        </div>
                                        <div className="space-y-1.5 h-16 flex flex-col justify-center">
                                            <div className="flex justify-between items-center px-1">
                                                <div className="space-y-0.5">
                                                    <span className="text-[11px] font-bold text-[#007FFF] italic">Net monthly surplus</span>
                                                    <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-400/80"><BarChart3 className="size-3"/> 3yr savings: {data.currency} {Math.round(data.surplusLocal * 36).toLocaleString()}</div>
                                                </div>
                                                <div className="text-right leading-none">
                                                    <div className={cn("text-base font-black italic leading-none", data.surplusLocal > 0 ? "text-emerald-400" : "text-rose-400")}>{data.currency} {Math.round(data.surplusLocal).toLocaleString()}</div>
                                                    <div className="text-[10px] font-bold text-slate-400 mt-1">USD {Math.round(data.surplusUSD).toLocaleString()} /mo</div>
                                                </div>
                                            </div>
                                            <p className="text-[9px] text-[#f97316] font-bold italic text-center border-t border-white/5 pt-1">{data.housingNote}</p>
                                        </div>
                                        
                                        <div className={cn(
                                            "mt-3 p-4 min-h-[190px] flex flex-col justify-center border-l-2",
                                            getStaffroomBrief(data.school.country).isAlert ? "bg-rose-500/10 border-rose-500" : "bg-white/5 border-[#007FFF]"
                                        )}>
                                            <div className="flex items-center gap-2 mb-2">
                                                {getStaffroomBrief(data.school.country).isAlert ? <AlertTriangle className="size-4 text-rose-500" /> : <ShieldAlert className="size-3.5 text-[#007FFF]" />}
                                                <span className={cn("text-[11px] font-bold italic leading-none", getStaffroomBrief(data.school.country).isAlert ? "text-rose-500" : "text-[#007FFF]")}>
                                                    {getStaffroomBrief(data.school.country).isAlert ? "Situational context advisory" : "Security brief"}
                                                </span>
                                            </div>
                                            <p className="text-[12px] font-medium text-slate-400 italic leading-relaxed">
                                                {getStaffroomBrief(data.school.country).text}
                                            </p>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="h-full min-h-[500px] flex flex-col items-center justify-center p-12 text-center space-y-4">
                                    <div className="p-4 bg-white/5 rounded-full border border-dashed border-white/10">
                                        <PlusCircle className="size-8 text-slate-700" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[12px] font-black text-slate-400 uppercase tracking-widest">Target selection required</p>
                                        <p className="text-[10px] text-slate-500 italic leading-relaxed">Choose a location to begin your financial and lifestyle analysis.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {ranked.length >= 3 && (
                    <div className="lg:col-span-3 bg-[#f97316]/5 border border-[#f97316]/20 p-12 rounded-sm relative overflow-hidden flex flex-col items-center">
                        <div className="absolute inset-0 flex items-center justify-center opacity-[0.12] pointer-events-none select-none overflow-hidden z-0">
                            <span className="text-[60px] md:text-[80px] font-black tracking-[0.2em] rotate-[-20deg] whitespace-nowrap text-white text-center">leopardfish intel</span>
                        </div>
                        <div className="relative z-10 space-y-8 w-full max-w-5xl">
                            <h3 className="text-[12px] font-black text-[#f97316] uppercase tracking-[0.4em] flex items-center gap-2"><Zap className="size-4" /> Leopardfish intel conclusion</h3>
                            <div className="text-[16px] font-medium italic tracking-tight text-slate-300 leading-relaxed space-y-6">
                                {detailedConclusion.map((para, pIdx) => <p key={pIdx}>{para}</p>)}
                                <p className="not-italic font-bold text-slate-500 text-[11px] mt-6 tracking-widest uppercase pt-4 border-t border-white/5">Evaluation: March 2026</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function DecidePage() {
    return <Suspense fallback={null}><DecideContent /></Suspense>;
}
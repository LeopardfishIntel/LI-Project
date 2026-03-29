"use client";

import { useEffect, useState, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  MapPin, PiggyBank, Loader2, ShieldCheck, 
  ArrowLeft, TrendingUp, CheckCircle2, 
  ShieldAlert, Info, Target, Microscope, 
  GraduationCap, Zap, HelpCircle, BookOpen, Activity,
  Wallet, Receipt, Globe2
} from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const RATES: Record<string, number> = {
  CZK: 30.2, AED: 4.65, EUR: 1.18, GBP: 1.0, SAR: 4.75, QAR: 4.62, CHF: 1.12, DKK: 8.85, USD: 1.27, AZN: 2.15, HKD: 7.82, JPY: 151.0
};

const BONUS_REGISTRY: Record<string, number> = { "austria": 0.166, "germany": 0.083, "china": 0.083, "spain": 0.166, "japan": 0.166 };

const noSpinners = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

const normalize = (str: string) => (str || "").toLowerCase().replace(/[^a-z0-9]/g, '').trim();

// --- Narrative Flow Engine (Senior Colleague Perspective) ---

const generateIntelBrief = (ranked: any[]) => {
    if (ranked.length < 3) return ["Strategic comparison requires three active targets to generate a final analytical brief."];
    const [s1, s2, s3] = ranked;
    
    const s1Curr = normalize(s1.school.curriculum || "");
    const s2Curr = normalize(s2.school.curriculum || "");
    const sharesCurriculum = (s1Curr.includes('british') && s2Curr.includes('british')) || (s1Curr.includes('ib') && s2Curr.includes('ib'));

    const p1 = `Looking at the options, ${s1.school.schoolname} feels like the most natural choice for this move. With a match of ${s1.matchPercentage}%, it suggests you’d settle in quite quickly without any real professional friction. It clearly leads the pack, although ${s2.school.schoolname} is a very respectable second choice if you're open to a different campus culture.`;
    
    const p2 = `Financially, ${s1.school.schoolname} is the standout. Being able to put away ${s1.currency} ${Math.round(s1.surplusLocal).toLocaleString()} each month gives you a proper bit of breathing room. It’s a solid setup that lets you actually enjoy life in ${s1.school.city} whilst building a decent nest egg.`;
    
    const p3 = `${s2.school.schoolname} is certainly a credible alternative. ${sharesCurriculum ? 'It actually shares the same curriculum framework as our top pick' : 'It offers a slightly different curriculum focus'}, making it a strong contender. You’d still be making a good career step here, even if the monthly surplus is a fraction tighter than the leader.`;
    
    const p4 = `As for ${s3.school.schoolname}, it’s a viable route but feels more like a strategic calculation. You’d be trading a bit of ${s3.savingsRate < 25 ? 'financial headroom' : 'alignment'} for the chance to work in this specific setting. It's a move that works well if you're focused on the long-term CV boost rather than maximum immediate savings.`;
    
    const p5 = `Ultimately, if you’re looking for the most "settled" transition, ${s1.school.schoolname} is the one. It manages to hit that sweet spot between a respected school name and the financial freedom to actually enjoy your time abroad.`;
    
    return [p1, p2, p3, p4, p5];
};

const CostBenchmarkBar = ({ rentUSD, surplusUSD }: { rentUSD: number, surplusUSD: number }) => {
    const totalScale = 5000; 
    const rentW = Math.min(40, (rentUSD / totalScale) * 100);
    const surplusW = Math.max(10, Math.min(45, (surplusUSD / totalScale) * 100));
    const essentialsW = 100 - rentW - surplusW;
    const segments = [
        { label: 'essentials', color: 'bg-slate-700', w: essentialsW },
        { label: 'Rent', color: 'bg-[#f97316]', w: rentW },
        { label: 'Surp', color: 'bg-[#007FFF]', w: surplusW } 
    ];
    return (
        <div className="mt-4 px-0 w-full"> 
            <div className="flex h-6 w-full rounded-sm overflow-hidden bg-white/5 border border-white/10 relative">
                {segments.map((s, i) => (
                    <div key={i} className={cn(s.color, "h-full flex items-center justify-center transition-all duration-500")} style={{ width: `${s.w}%` }}>
                        {s.w > 12 && <span className="text-[7px] font-black text-white/70 uppercase tracking-tighter truncate px-1">{s.label}</span>}
                    </div>
                ))}
            </div>
        </div>
    );
};

const ScoreBadge = ({ label, score, color = "#007FFF" }: { label: string, score: string | number, color?: string }) => (
    <div className="flex flex-col border-l border-white/10 pl-3">
        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">{label}*</span>
        <span className="text-lg font-black italic tracking-tighter leading-none" style={{ color }}>{score}</span>
    </div>
);

function DecideContent() {
    const router = useRouter();
    const firestore = useFirestore();
    const searchParams = useSearchParams();
    const [mounted, setMounted] = useState(false);
    const { data: schools, loading: sLoading } = useCollection<any>(useMemoFirebase(() => (mounted && firestore ? collection(firestore, 'schools') : null), [firestore, mounted]));
    const { data: colData } = useCollection<any>(useMemoFirebase(() => (mounted && firestore ? collection(firestore, 'locations_costOfLiving') : null), [firestore, mounted]));
    const [selectedIds, setSelectedIds] = useState<string[]>(['', '', '']);
    const [selectedCountries, setSelectedCountries] = useState<string[]>(['', '', '']);
    const [netSalaries, setNetSalaries] = useState<string[]>(['', '', '']);
    const [adjustments, setAdjustments] = useState(Array(3).fill({ second: '', other: '', home: '' }));

    useEffect(() => { setMounted(true); }, []);
    useEffect(() => {
        if (mounted && (schools?.length ?? 0) > 0) {
            const ids = searchParams.get('ids')?.split(',').slice(0, 3) || (schools || []).slice(0, 3).map((s: any) => s?.id || '');
            setSelectedIds(ids);
            const countries = ids.map(id => schools?.find((item: any) => item.id === id)?.country || '');
            setSelectedCountries(countries);
        }
    }, [mounted, schools, searchParams]);

    const availableCountries = useMemo(() => (!schools ? [] : Array.from(new Set(schools.map((s: any) => s.country))).filter(Boolean).sort()), [schools]);

    const shootoutMatrix = useMemo(() => {
        if (!schools || !colData) return [];
        const countryCounters: Record<string, number> = {};

        return selectedIds.map((id, index) => {
            const school = schools.find((s: any) => s?.id === id);
            if (!school) return null;
            const col = colData.find((c: any) => normalize(c.city || c.city_name) === normalize(school.city) || normalize(c.country || c.country_name) === normalize(school.country));
            const currency = col?.currencyCode ?? 'USD';
            const rate = RATES[currency] ?? 1.0;
            const currentLocalIn = parseFloat(netSalaries[index]) || Math.round((parseFloat(school.salaryRange?.toString().split('-').pop()?.replace(/[^0-9.]/g, '') ?? '4800') * 0.85) * rate);
            const totalLocalIn = currentLocalIn + (currentLocalIn * (BONUS_REGISTRY[school.country?.toLowerCase()] ?? 0)) + (parseFloat(adjustments[index].second) || 0) + (parseFloat(adjustments[index].other) || 0);
            const rentUSD = parseFloat(col?.rent1br ?? "1450");
            const totalLocalCost = (rentUSD + 650) * rate + (parseFloat(adjustments[index].home) || 0);
            const surplusLocal = totalLocalIn - totalLocalCost;
            const surplusUSD = surplusLocal / rate;
            const savingsRate = (surplusLocal / totalLocalIn) * 100;

            let rawSafety = 72.0; 
            const cKey = normalize(school.country);
            if (col && (col.safetyIndex || col.safety_index)) rawSafety = parseFloat(col.safetyIndex ?? col.safety_index);
            else {
                if (cKey.includes("japan")) rawSafety = 81.5;
                else if (cKey.includes("germany")) rawSafety = 77.4;
                else if (cKey.includes("greece")) rawSafety = 71.4;
            }

            const acad = parseFloat(school.academicscore || "7.5");
            const wl = parseFloat(school.worklifescore || "8.0");

            const posOptions = [
                `Held in high regard for its excellent academic standing and ${acad.toFixed(1)} rating.`,
                `Widely seen as a pinnacle for professional development with a ${acad.toFixed(1)} reputation.`,
                `Notable for its outstanding standing and ${acad.toFixed(1)} standard in the region.`
            ];
            const benefitOptions = [
                `Significant financial benefit with a helpful ${Math.round(savingsRate)}% monthly surplus.`,
                `Well placed for building a nest egg with a robust ${Math.round(savingsRate)}% savings rate.`,
                `Provides a strong financial position with a clear ${Math.round(savingsRate)}% banking potential.`
            ];
            let posStrap = posOptions[index % 3];
            if (savingsRate >= 28) posStrap = benefitOptions[index % 3];
            else if (acad >= 9.0) posStrap = posOptions[index % 3];

            let negStrap = `Standard regional factors and living costs are part of this calculation.`;
            if (savingsRate < 0) negStrap = `Significant financial risk; monthly overheads are likely to outpace the local salary.`;
            else if (savingsRate < 10) negStrap = `Moderate financial risk; the remaining monthly surplus feels quite narrow here.`;
            else if (rawSafety < 72) negStrap = `A more careful approach to urban life is advised given the current security index.`;
            else if (wl < 7.2) negStrap = `The role involves a busy professional schedule and quite a demanding pastoral load.`;

            countryCounters[cKey] = (countryCounters[cKey] || 0) + 1;
            const currentLens = countryCounters[cKey];
            let safetyBrief = "";
            if (currentLens === 1) { 
                safetyBrief = `Life in ${school.city} offers a safe and generally welcoming urban atmosphere. You'll find the street vibe to be relaxed, with very low rates of violent crime compared to major Western cities. Most find that simple situational awareness in busier hubs is all that’s needed to enjoy a secure routine.`;
            } else if (currentLens === 2) { 
                safetyBrief = `The systems in ${school.country} provide a stable foundation for international personnel. Public transport is reliable for the daily commute, and private healthcare networks are maintained to a high standard. Established protocols ensure the school’s physical infrastructure remains secure.`;
            } else { 
                safetyBrief = `Socially, the environment is characteristically harmonious, with very little friction between expats and the local community. While you should remain mindful of standard administrative procedures, the general conduct of society is law-abiding. Most staff find the transition to be very straightforward.`;
            }

            const baseFinScore = (surplusUSD / 2500) * 100 + 35;
            const generousFinScore = savingsRate > 20 ? baseFinScore + 10 : baseFinScore;
            const finScoreFixed = Math.max(0, Math.min(100, generousFinScore));
            const composite = (finScoreFixed * 0.5) + (acad * 10 * 0.3) + (rawSafety * 0.2);
            const finalMatch = Math.round(Math.max(15, Math.min(99, composite)));

            const pillars = [
                { score: finScoreFixed, label: 'monthly savings potential' },
                { score: acad * 10, label: 'school’s academic rating' },
                { score: rawSafety, label: 'local security index' }
            ];
            const sorted = [...pillars].sort((a, b) => a.score - b.score);
            const worst = sorted[0];
            const best = sorted[pillars.length - 1];

            const matchVariations = [
                `A natural transition, largely supported by the ${best.label}.`,
                `A very settled move where the ${best.label} is the key driver.`,
                `The professional fit here is primarily underpinned by the ${best.label}.`
            ];
            const limitVariations = [
                `The overall match is mainly influenced by the ${worst.label}.`,
                `A strategic move, though the ${worst.label} introduces a bit of friction.`,
                `The professional alignment is mostly held back by the ${worst.label}.`
            ];

            let intelText = (finalMatch >= 75 || savingsRate >= 25) ? matchVariations[index % 3] : limitVariations[index % 3];

            return { 
                school, surplusLocal, totalLocalIn, totalLocalCost, currency, rate, rentUSD, surplusUSD, savingsRate, posStrap, negStrap, currentLens,
                matchPercentage: finalMatch,
                countryScore: (rawSafety / 10).toFixed(1),
                schoolScore: acad.toFixed(1),
                matchIntelligence: intelText,
                safetyNarrative: safetyBrief
            };
        });
    }, [selectedIds, schools, colData, netSalaries, adjustments]);

    const ranked = useMemo(() => shootoutMatrix.filter((item): item is NonNullable<typeof item> => item !== null).sort((a, b) => b.matchPercentage - a.matchPercentage), [shootoutMatrix]);
    const topPickId = ranked[0]?.school.id;
    const intelBrief = useMemo(() => generateIntelBrief(ranked), [ranked]);

    if (!mounted || sLoading) return <div className="h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-[#f97316] size-10" /></div>;

    return (
        <div className="min-h-screen bg-[#020617] text-slate-200 font-sans p-6 md:p-8 selection:bg-[#f97316]">
            <div className="max-w-7xl mx-auto space-y-6">
                
                <header className="flex justify-between items-end border-b border-white/5 pb-4">
                    <div className="space-y-1">
                        <button onClick={() => router.back()} className="flex items-center gap-2 text-[10px] font-black text-[#007FFF] uppercase tracking-widest hover:text-white transition-colors">
                            <ArrowLeft className="size-3" /> Back
                        </button>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-[#f97316] italic leading-none uppercase">Compare and Decide</h1>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                    {selectedCountries.map((country, index) => (
                        <div key={`input-${index}`} className="space-y-4 bg-[#0b1224] p-5 border border-white/5 rounded-sm shadow-xl flex flex-col relative group">
                             <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1"><Label className="text-[9px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-1.5"><Globe2 className="size-2 text-[#007FFF]"/> Country</Label>
                                    <Select value={country} onValueChange={(val) => { const nC = [...selectedCountries]; nC[index] = val; setSelectedCountries(nC); const nI = [...selectedIds]; nI[index] = ''; setSelectedIds(nI); }}>
                                        <SelectTrigger className="bg-black/40 border-white/10 h-10 text-[#007FFF] font-black uppercase text-[10px]"><SelectValue placeholder="Location" /></SelectTrigger>
                                        <SelectContent className="bg-[#1f2937] border-white/10 text-white font-bold uppercase text-[10px]">{availableCountries.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1"><Label className="text-[9px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-1.5"><Target className="size-2 text-[#f97316]"/> Target</Label>
                                    <Select disabled={!country} value={selectedIds[index]} onValueChange={(val) => { const next = [...selectedIds]; next[index] = val; setSelectedIds(next); }}>
                                        <SelectTrigger className="bg-black/40 border-white/10 h-10 text-white font-black uppercase text-[10px]"><SelectValue placeholder="Institution" /></SelectTrigger>
                                        <SelectContent className="bg-[#1f2937] border-white/10 text-white font-bold uppercase text-[10px]">{(schools || []).filter((s: any) => s.country === country).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.schoolname}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                             </div>
                             <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
                                <div className="space-y-1"><Label className="text-[8px] font-black uppercase text-[#007FFF] italic whitespace-nowrap">Net Salary ({shootoutMatrix[index]?.currency || 'Local'})</Label>
                                    <Input type="number" value={netSalaries[index]} placeholder="0" onChange={(e) => { const next = [...netSalaries]; next[index] = e.target.value; setNetSalaries(next); }} className={cn("bg-black/40 border-white/5 h-8 text-right font-black text-white text-[11px]", noSpinners)} />
                                </div>
                                <div className="space-y-1"><Label className="text-[8px] font-black uppercase text-slate-500 italic whitespace-nowrap">2nd Income</Label>
                                    <Input type="number" value={adjustments[index].second} onChange={(e) => { const next = [...adjustments]; next[index] = { ...next[index], second: e.target.value }; setAdjustments(next); }} className={cn("bg-black/40 border-white/5 h-8 text-right font-black text-white text-[11px]", noSpinners)} />
                                </div>
                             </div>
                             <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1"><Label className="text-[8px] font-black uppercase text-slate-500 italic whitespace-nowrap">Other Income</Label>
                                    <Input type="number" value={adjustments[index].other} onChange={(e) => { const next = [...adjustments]; next[index] = { ...next[index], other: e.target.value }; setAdjustments(next); }} className={cn("bg-black/40 border-white/5 h-8 text-right font-black text-white text-[11px]", noSpinners)} />
                                </div>
                                <div className="space-y-1"><Label className="text-[8px] font-black uppercase text-slate-500 italic whitespace-nowrap">Home Commitment</Label>
                                    <Input type="number" value={adjustments[index].home} onChange={(e) => { const next = [...adjustments]; next[index] = { ...next[index], home: e.target.value }; setAdjustments(next); }} className={cn("bg-black/40 border-white/5 h-8 text-right font-black text-white text-[11px]", noSpinners)} />
                                </div>
                             </div>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                    {shootoutMatrix.map((data, idx) => (
                        <div key={`main-card-${idx}`} className={cn(
                            "bg-[#0b1224]/50 border transition-all duration-500 p-6 space-y-4 flex flex-col justify-between relative",
                            "border-[#f97316]/40", 
                            data?.school.id === topPickId && "border-2 border-[#f97316] ring-1 ring-[#f97316] ring-offset-4 ring-offset-[#020617] shadow-[0_0_40px_rgba(249,115,22,0.1)]"
                        )}>
                            <div>
                                <h2 className="text-2xl font-black text-[#f97316] italic tracking-tighter uppercase leading-none">{data?.school.schoolname ?? "Select School"}</h2>
                                <div className="mt-1.5 space-y-0.5">
                                    <p className="text-[8px] font-bold text-emerald-400 uppercase tracking-widest italic leading-tight">{data?.posStrap}</p>
                                    <p className="text-[8px] font-bold text-rose-400 uppercase tracking-widest italic leading-tight">{data?.negStrap}</p>
                                </div>
                                <div className="flex items-center gap-2 text-[9px] font-bold text-slate-500 uppercase mt-4"><MapPin className="size-3 text-[#007FFF]" /> {data?.school.city}, {data?.school.country}</div>
                            </div>

                            <div className="space-y-0 border-y border-white/5">
                                <div className="grid grid-cols-3 gap-2 py-4">
                                    <ScoreBadge label="Match" score={data ? `${data.matchPercentage}%` : "0%"} color="#f97316" />
                                    <ScoreBadge label="Country" score={data?.countryScore ?? "0.0"} />
                                    <ScoreBadge label="School" score={data?.schoolScore ?? "0.0"} />
                                </div>
                                <div className="pb-3 px-3">
                                    <p className="text-[10px] font-bold text-slate-300 tracking-tight leading-tight italic text-left">
                                        <span className="text-[#007FFF] mr-1.5 not-italic uppercase text-[9px] tracking-widest">Match intelligence:</span> 
                                        {data?.matchIntelligence}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4 pt-2">
                                <div className="grid grid-cols-2 gap-2 border-b border-white/5 pb-2">
                                    <div className="space-y-0.5"><p className="text-[8px] font-black text-slate-500 uppercase flex items-center gap-1"><Wallet className="size-2"/> Monthly In</p><p className="text-[11px] font-black text-white leading-none">{data?.currency} {Math.round(data?.totalLocalIn ?? 0).toLocaleString()}</p></div>
                                    <div className="space-y-0.5 text-right"><p className="text-[8px] font-black text-slate-500 uppercase flex items-center gap-1 justify-end"><Receipt className="size-2"/> Monthly Cost</p><p className="text-[11px] font-black text-rose-400 leading-none">{data?.currency} {Math.round(data?.totalLocalCost ?? 0).toLocaleString()}</p></div>
                                </div>
                                <div className="flex justify-between items-center px-1">
                                    <span className="text-[10px] font-black text-[#007FFF] uppercase italic tracking-widest">Net Surplus*</span>
                                    <div className="text-right leading-none">
                                        <div className={cn("text-base font-black italic leading-none", (data?.surplusLocal ?? 0) > 0 ? "text-emerald-400" : "text-rose-400")}>{data?.currency} {Math.round(data?.surplusLocal ?? 0).toLocaleString()}</div>
                                        <div className="text-[10px] font-black text-slate-400 uppercase mt-1">USD {Math.round(data?.surplusUSD ?? 0).toLocaleString()} /mo <span className="text-[#f97316]">({Math.round(data?.savingsRate ?? 0)}%)</span></div>
                                    </div>
                                </div>
                                
                                <CostBenchmarkBar rentUSD={data?.rentUSD ?? 1450} surplusUSD={data?.surplusUSD ?? 0} />
                                
                                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                                    <div className="space-y-1"><p className="text-[8px] font-black text-slate-500 uppercase flex items-center gap-1"><Activity className="size-2"/> Work/Life</p><p className="text-base font-black text-white italic leading-none">{data?.school.worklifescore ?? 0}/10</p></div>
                                    <div className="space-y-1 text-right"><p className="text-[8px] font-black text-slate-500 uppercase flex items-center gap-1 justify-end"><BookOpen className="size-2"/> Curriculum</p><p className="text-[10px] font-bold text-white leading-none uppercase truncate">{data?.school.curriculum ?? 'Standard'}</p></div>
                                </div>

                                <div className="mt-4 p-4 bg-white/5 border-l-2 border-[#007FFF] min-h-[110px]">
                                    <div className="flex items-center gap-2 mb-2">
                                        <ShieldAlert className="size-3 text-[#007FFF]" />
                                        <span className="text-[9px] font-black text-[#007FFF] uppercase tracking-widest italic leading-none">Security Lens {data?.currentLens}: {data?.school.country}</span>
                                    </div>
                                    <p className="text-[10px] font-medium text-slate-400 italic leading-snug">{data?.safetyNarrative}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="lg:col-span-3 bg-[#f97316]/5 border border-[#f97316]/20 p-8 rounded-sm relative overflow-hidden">
                    <div className="relative z-10 space-y-6">
                        <h3 className="text-[10px] font-black text-[#f97316] uppercase tracking-[0.4em] flex items-center gap-2"><Zap className="size-4" /> Leopardfish Intel Conclusion</h3>
                        <div className="text-[14px] font-medium italic tracking-tight text-slate-300 leading-relaxed max-w-5xl space-y-5">
                            {intelBrief.map((para, pIdx) => <p key={pIdx}>{para}</p>)}
                            <p className="not-italic font-black text-slate-500 uppercase text-[9px] mt-6 pt-4 border-t border-white/5 tracking-widest">Evaluation: March 2026</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function DecidePage() {
    return <Suspense fallback={null}><DecideContent /></Suspense>;
}

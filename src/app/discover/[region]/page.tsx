 "use client";

import { Suspense, useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  ShieldCheck, Loader2, ArrowLeft, TrendingUp, ChevronRight, 
  Lock, Zap, GraduationCap, Target, AlertTriangle, Star, Landmark, Info, Scale, BookOpen, Compass, Heart, Banknote
} from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { cn } from '@/lib/utils';

// 🛡️ Nuanced Security Reflection (British English)
const getExpandedSafetyBriefing = (country: string) => {
  const briefings: Record<string, string> = {
    "switzerland": "Security Protocol: Switzerland remains exceptionally stable and is widely considered one of the safest environments globally for international teachers and their families. Crime rates are remarkably low, and public infrastructure is reliable and well-maintained. While the social atmosphere is welcoming, it is important to note that local communities value quiet and order; adhering to local 'house rules' regarding noise and recycling is essential for a smooth transition. Emergency services are highly efficient, providing a significant sense of personal security in both urban and rural areas.",
    "austria": "Security Protocol: Austria offers a very high standard of personal safety and political stability. For teachers relocating here, the environment is predictable and secure, with excellent healthcare and emergency response systems. Most urban areas are safe to navigate at any hour. Relocating staff should manage residency paperwork meticulously to avoid unnecessary stress.",
    "bahrain": "Security Protocol: Bahrain is a hospitable and secure island nation with a tradition of welcoming international educators. Streets are safe and violent crime is rare. While liberal compared to regional neighbours, teachers should remain respectful of local traditions. Help is always close at hand.",
    "china": "Security Protocol: China provides a uniquely secure environment where street-level crime is almost non-existent. The security framework is technology-led. Teachers should simply ensure they comply with local regulations regarding registration and internet usage to enjoy a trouble-free deployment.",
  };
  return briefings[country.toLowerCase()] || "Security Protocol: This region is assessed as stable for international relocation. Standard personal safety precautions are advised. Emergency services are functional and accessible.";
};

// 🛰️ Tooltip Component
const IntelTooltip = ({ text, align = "center" }: { text: string, align?: "left" | "center" | "right" }) => (
  <div className={cn(
    "absolute bottom-full mb-3 w-64 p-3 bg-[#0f172a] border border-sky-400 text-[11px] text-sky-100 font-bold leading-relaxed rounded-sm opacity-0 group-hover/intel:opacity-100 transition-all duration-200 pointer-events-none z-[100] shadow-[0_0_20px_rgba(56,189,248,0.3)]",
    align === "center" && "left-1/2 -translate-x-1/2",
    align === "left" && "left-0",
    align === "right" && "right-0"
  )}>
    {text}
    <div className={cn(
      "absolute top-full border-8 border-transparent border-t-sky-400",
      align === "center" && "left-1/2 -translate-x-1/2",
      align === "left" && "left-4",
      align === "right" && "right-4"
    )} />
  </div>
);

function DossierContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const firestore = useFirestore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const params = useMemo(() => {
    if (!mounted) return null;
    const regions = (searchParams.get('regions') || "").toLowerCase().split(',').filter(Boolean);
    const age = parseInt((searchParams.get('age') || "35").replace(/[^0-9]/g, '')) || 35;
    const salary = searchParams.get('salary') || "USD 60000";
    const status = (searchParams.get('status') || "single").toLowerCase();
    return { regions, age, salary, status };
  }, [searchParams, mounted]);

  const { data: finData, isLoading: l1 } = useCollection<any>(useMemoFirebase(() => (mounted && firestore ? collection(firestore, 'locations_costOfLiving') : null), [firestore, mounted]));
  const { data: reqsData, isLoading: l2 } = useCollection<any>(useMemoFirebase(() => (mounted && firestore ? collection(firestore, 'teacher_requirements') : null), [firestore, mounted]));
  const { data: schoolData, isLoading: l3 } = useCollection<any>(useMemoFirebase(() => (mounted && firestore ? collection(firestore, 'schools') : null), [firestore, mounted]));

  const recommendations = useMemo(() => {
    if (!params || !reqsData || !finData || !schoolData || l1 || l2 || l3) return [];
    const salaryNum = parseInt(params.salary.replace(/[^0-9]/g, '')) || 60000;

    return reqsData.filter(country => {
      const dbRegion = (country.region || "").toLowerCase().trim();
      const maxAge = Math.min(Number(country.max_age_f) || 99, Number(country.max_age_m) || 99);
      return params.regions.some(r => dbRegion.includes(r)) && params.age <= maxAge;
    }).map(country => {
      const finances = finData.find(f => f.country?.toLowerCase() === country.country?.toLowerCase());
      const schools = schoolData.filter(s => s.country?.toLowerCase() === country.country?.toLowerCase());
      
      const multiplier = params.status.includes('dual') ? 1.85 : 1;
      const netUSD = Math.round((salaryNum * multiplier * 0.8) / 12);
      const exRate = Number(finances?.exchangeRateToUSD) || 1;
      const outgoings = ((Number(finances?.rent1br) || 1200) + 600) * (params.status.includes('family') ? 1.55 : 1);
      const surplus = Math.max(-500, netUSD - outgoings);
      const ratio = (surplus * 12) / (salaryNum * multiplier);

      const suitability = {
        adventure: (country.country === "China" || country.region?.includes("Asia")) ? 9 : 6,
        savings: ratio > 0.30 ? 9 : ratio > 0.15 ? 7 : 4,
        balance: country.region?.includes("Europe") ? 9 : 6,
        career: Number(country.academicscore) || 7
      };

      const fitScore = Math.round(((suitability.adventure + suitability.savings + suitability.balance + suitability.career) / 40) * 100);

      const summary = `Deployment Verdict: ${country.country} represents a high-fidelity match for your specified profile. Given your target for ${
        suitability.savings >= 8 ? 'capital accumulation' : 'lifestyle balance'
      }, this location provides the necessary infrastructure to succeed. The institutional quality here (rated ${country.academicscore}/10) offers a significant career progression hedge, ensuring professional 'brand value'.`;

      return {
        ...country,
        schools: schools.sort((a,b) => b.totalscore - a.totalscore),
        localNet: Math.round(netUSD * exRate),
        localSurplus: Math.round(surplus * exRate),
        localCurrency: finances?.currencyCode || "LC",
        grade: ratio > 0.35 ? "ELITE" : ratio > 0.20 ? "STRONG" : ratio > 0.10 ? "MODERATE" : "TIGHT",
        gradeColor: ratio > 0.35 ? "text-emerald-500" : ratio > 0.20 ? "text-emerald-400" : ratio > 0.10 ? "text-sky-400" : "text-orange-500",
        percent: Math.round(ratio * 100),
        safety: getExpandedSafetyBriefing(country.country || ""),
        suitability,
        fitScore,
        summary,
        countryRating: ((schools.reduce((acc, s) => acc + Number(s.totalscore), 0) / (schools.length || 1)) * 0.7 + Number(country.academicscore || 7) * 0.3).toFixed(1)
      };
    }).sort((a, b) => Number(b.countryRating) - Number(a.countryRating)).slice(0, 5);
  }, [params, reqsData, finData, schoolData, l1, l2, l3]);

  if (!mounted || l1 || l2 || l3) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="size-12 animate-spin text-sky-400" /></div>;

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 md:p-12 font-sans selection:bg-[#f97316]">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="space-y-4">
          <button onClick={() => router.push('/discover')} className="flex items-center gap-2 text-[12px] font-bold text-sky-400 uppercase tracking-widest hover:text-white transition-colors">
            <ArrowLeft className="size-4" /> Back to intake
          </button>
          <h1 className="text-4xl md:text-7xl font-black tracking-tighter uppercase border-l-8 border-[#f97316] pl-6 italic">
            What you could achieve<span className="text-[#f97316]">.</span>
          </h1>
        </div>

        <div className="grid grid-cols-1 gap-12">
          {recommendations.map((country, idx) => (
            <div key={idx} className="grid grid-cols-1 lg:grid-cols-12 border border-white/10 bg-black/40 overflow-visible group hover:border-[#f97316]/50 transition-all shadow-2xl">
              
              {/* Column 1: Identity */}
              <div className="lg:col-span-4 p-8 border-r border-white/10 bg-black/60 space-y-6">
                <div className="relative group/intel cursor-help">
                  <p className="text-sky-400 text-[12px] font-bold uppercase tracking-[0.2em] mb-1">{country.region}</p>
                  <h2 className="text-5xl font-black tracking-tighter uppercase leading-none mb-2 text-sky-400">{country.country}</h2>
                  <p className="text-[#f97316] text-[12px] font-black uppercase tracking-widest flex items-center gap-2 italic">
                    <Star className="size-3 fill-[#f97316]" /> Rating: {country.countryRating}/10 <Info className="size-3 opacity-30" />
                  </p>
                  <IntelTooltip align="left" text="Weighted average: 70% school quality and 30% regional academic difficulty." />
                </div>
                <div className="space-y-4 pt-4 border-t border-white/5">
                  <div className="space-y-1 relative group/intel">
                    <p className="text-sky-400 text-[12px] font-bold uppercase tracking-widest flex items-center gap-2"><Lock className="size-3" /> Visa Protocol <Info className="size-3 opacity-20" /></p>
                    <p className="text-2xl font-black italic">{country.max_age_m} years old</p>
                    {params && params.age >= 65 && (
                      <div className="mt-2 flex items-center gap-2 text-red-500 animate-pulse">
                        <AlertTriangle className="size-3" />
                        <p className="text-[11px] font-black uppercase tracking-tighter leading-none italic underline">Expected retirement age reached</p>
                      </div>
                    )}
                    <IntelTooltip text="The legal age limit for new work permit issuance." align="left" />
                  </div>
                  <div className="space-y-1 relative group/intel">
                    <p className="text-sky-400 text-[12px] font-bold uppercase tracking-widest flex items-center gap-2"><GraduationCap className="size-3" /> Credentials <Info className="size-3 opacity-30" /></p>
                    <p className="text-[12px] font-bold text-slate-300 uppercase leading-relaxed line-clamp-3">{country.academic_Degree_req}</p>
                    <IntelTooltip align="left" text="Non-negotiable legal minimums set by the Ministry of Education." />
                  </div>
                </div>
              </div>

              {/* Column 2: Economics & Final Decision Summary (NOW PROMINENT) */}
              <div className="lg:col-span-5 p-8 border-r border-white/10 flex flex-col gap-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1 relative group/intel">
                    <p className="text-sky-400 text-[11px] font-bold uppercase tracking-widest flex items-center gap-2"><TrendingUp className="size-3" /> Monthly Net</p>
                    <p className="text-4xl font-black tracking-tighter text-sky-400">{country.localCurrency} {country.localNet.toLocaleString()}</p>
                  </div>
                  <div className="space-y-1 relative group/intel">
                    <p className="text-white text-[11px] font-bold uppercase tracking-widest flex items-center gap-2"><Target className="size-3" /> Est. Savings</p>
                    <p className="text-4xl font-black tracking-tighter text-white">{country.localCurrency} {country.localSurplus.toLocaleString()}</p>
                    <p className={cn("text-[10px] font-black uppercase flex items-center gap-1", country.gradeColor)}>
                      <Zap className="size-3" /> {country.grade} ({country.percent}%)
                    </p>
                  </div>
                </div>

                <div className="py-3 border-y border-white/5 grid grid-cols-4 gap-2">
                  {[
                    { label: 'Adventure', val: country.suitability.adventure, icon: Compass },
                    { label: 'Savings', val: country.suitability.savings, icon: Banknote },
                    { label: 'Balance', val: country.suitability.balance, icon: Heart },
                    { label: 'Career', val: country.suitability.career, icon: Zap },
                  ].map((p) => (
                    <div key={p.label} className="text-center">
                      <p className="text-[8px] font-black uppercase text-slate-500 mb-1">{p.label}</p>
                      <p className={cn("font-black italic text-[11px]", p.val > 7 ? "text-sky-400" : "text-slate-500")}>{p.val}</p>
                    </div>
                  ))}
                </div>

                {/* RELOCATED & PROMINENT: Final Decision Section */}
                <div className="p-4 bg-[#f97316]/10 border-l-2 border-[#f97316] relative group/intel">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-[#f97316] text-[11px] font-black uppercase tracking-widest">Decision Summary</p>
                    <div className="flex items-center gap-1 text-[#f97316] font-black text-xs italic bg-[#f97316]/20 px-2 py-0.5 rounded-full">
                      Match: {country.fitScore}%
                    </div>
                  </div>
                  <p className="text-[12px] text-slate-300 italic leading-relaxed font-medium">{country.summary}</p>
                  <IntelTooltip text="Proprietary match score based on your personal deployment priorities." />
                </div>
              </div>

              {/* Column 3: Targets & Security Reflection (NOW LOGISTICAL FINAL STEP) */}
              <div className="lg:col-span-3 p-8 flex flex-col justify-between bg-white/[0.01]">
                <div className="space-y-6">
                  <div>
                    <p className="text-sky-400 text-[12px] font-bold uppercase tracking-widest flex items-center justify-between mb-3">Top Targets <Zap className="size-3 text-[#f97316]" /></p>
                    <div className="space-y-2">
                      {country.schools?.slice(0, 3).map((s: any, i: number) => (
                        <div key={i} className="p-3 bg-white/5 border border-white/10 space-y-1 relative group/intel cursor-help">
                          <div className="flex justify-between items-center italic text-[11px]">
                            <span className="font-bold text-slate-200 uppercase truncate pr-2">{s.schoolname}</span>
                            <span className="font-black text-sky-400">{s.totalscore}</span>
                          </div>
                          <IntelTooltip align="right" text="Institution score: averages results, retention and facilities." />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 bg-sky-950/30 border-l-2 border-sky-400 relative group/intel">
                    <p className="text-sky-400 text-[11px] font-bold uppercase tracking-widest flex items-center gap-2 mb-2"><ShieldCheck className="size-3" /> Security Reflection</p>
                    <p className="text-[11px] text-slate-400 italic leading-relaxed line-clamp-4 hover:line-clamp-none transition-all">"{country.safety}"</p>
                    <IntelTooltip align="right" text="Standard 2026 tactical security and infrastructure briefing." />
                  </div>
                </div>

                <div className="mt-6">
                  <button onClick={() => router.push(`/compare?country=${country.country}`)} className="w-full bg-[#f97316] text-black py-5 font-black uppercase tracking-widest text-xs hover:bg-white transition-all flex items-center justify-between px-6 group">
                    Compare country <Scale className="size-4 group-hover:rotate-12 transition-transform" />
                  </button>
                </div>
              </div>

            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DossierPage() {
  return <Suspense fallback={null}><DossierContent /></Suspense>;
}
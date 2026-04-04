"use client";

import { Suspense, useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  ShieldCheck, Loader2, ArrowLeft, TrendingUp, 
  Lock, Zap, GraduationCap, Target, Star, Info, Scale, Compass, Heart, Banknote, ChevronDown, ChevronUp, AlertTriangle
} from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { cn } from '@/lib/utils';

// 🛡️ Bespoke Teacher Security (Direct British English / Globalised)
const getBespokeTeacherSecurity = (country: string) => {
  const intel: Record<string, string> = {
    "switzerland": "For a teacher settling into Swiss life, the most reassuring factor is the sheer predictability of the legal landscape. Your contract is essentially a protected document; the local labour laws ensure your conditions are met with typical Swiss precision. On a personal level, the safety in residential areas of Zurich or Geneva is quite remarkable. You will find that you can go about your day-to-day life with a genuine sense of ease. The only real adjustment is getting used to the quiet efficiency of your neighbours—following the local 'Gemeinde' etiquette on things like noise and recycling is simply the best way to ensure a peaceful and long-term stay.",
    "austria": "Austria offers a wonderfully stable environment for a professional move. You will likely find that the security here comes from the country’s deep-seated respect for a balanced lifestyle; your rights as an educator are well-defined and respected. Street safety in cities like Vienna is amongst the best in the world, allowing you to enjoy the cultural life of the city without a second thought. For families, the parks and public spaces are safe and impeccably maintained. Provided the school assists with your initial residency registration, you can expect a very smooth and secure transition into local society.",
    "bahrain": "Bahrain is famously hospitable and offers a very secure footing for international staff. The island has a very community-focused atmosphere, and you will quickly feel at home in the expat-friendly districts. Personal safety is high, and the daily commute is generally stress-free. Your professional security is usually rooted in the strength of the school's community; being part of a well-regarded international institution provides a natural support network. While the administrative systems may differ from your home country, they are straightforward, and private healthcare for teachers is consistently excellent.",
    "china": "In terms of day-to-day peace of mind, China is exceptionally safe for international staff; you can explore the major cities with a level of freedom that is often surprising. The environment is highly structured and very predictable. Your security here is largely about understanding and navigating the local digital norms and ensuring your work permit remains in good standing. As long as you maintain that basic level of administrative diligence, your stay will be very stable. The medical care in the major hubs is comparable to high-end private clinics, ensuring you are well looked after throughout your posting."
  };
  return intel[country.toLowerCase()] || "This region is considered a stable and safe choice for a professional move. Your security is well-supported by your legal work permit and the high safety standards found in established international communities. Emergency services are reliable and healthcare is easy to access. We suggest the same sensible approach to personal safety as you would use in any major city.";
};

function DossierContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const firestore = useFirestore();
  const [mounted, setMounted] = useState(false);
  const [expandedSafety, setExpandedSafety] = useState<number | null>(null);

  useEffect(() => { setMounted(true); }, []);

  const params = useMemo(() => {
    if (!mounted) return null;
    const regions = (searchParams.get('regions') || "").toLowerCase().split(',').filter(Boolean);
    const age = parseInt((searchParams.get('age') || "35").replace(/[^0-9]/g, '')) || 35;
    const salary = searchParams.get('salary') || "USD 60000";
    const status = (searchParams.get('status') || "single").toLowerCase();
    const goals = (searchParams.get('goals') || "").toLowerCase().split(',').filter(Boolean);
    return { regions, age, salary, status, goals };
  }, [searchParams, mounted]);

  const { data: finData } = useCollection<any>(useMemoFirebase(() => (mounted && firestore ? collection(firestore, 'locations_costOfLiving') : null), [firestore, mounted]));
  const { data: reqsData } = useCollection<any>(useMemoFirebase(() => (mounted && firestore ? collection(firestore, 'teacher_requirements') : null), [firestore, mounted]));
  const { data: schoolData } = useCollection<any>(useMemoFirebase(() => (mounted && firestore ? collection(firestore, 'schools') : null), [firestore, mounted]));

  const { topPicks, alternates, remainingCount } = useMemo(() => {
    if (!params || !reqsData || !finData || !schoolData) return { topPicks: [], alternates: [], remainingCount: 0 };
    const salaryNum = parseInt(params.salary.replace(/[^0-9]/g, '')) || 60000;

    const allResults = reqsData.filter(country => {
      const dbRegion = (country.region || "").toLowerCase().trim();
      return params.regions.some(r => dbRegion.includes(r));
    }).map(country => {
      const finances = finData.find(f => f.country?.toLowerCase() === country.country?.toLowerCase());
      const schools = schoolData.filter(s => s.country?.toLowerCase() === country.country?.toLowerCase());
      const hasSchools = schools.length > 0;
      
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

      let fitScore = Math.round(((suitability.adventure + suitability.savings + suitability.balance + suitability.career) / 40) * 100);
      if (!hasSchools) fitScore = Math.min(fitScore, 60);

      const verdictMap: Record<string, string> = {
        "switzerland": `Choosing Switzerland for your next move is a sensible decision if you value long-term stability. As you are ${params.status}, the salary structure here ensures that your overheads are well-managed, leaving room for meaningful savings. This placement is particularly strong for your professional reputation, as the schools here are held in high regard globally.`,
        "austria": `A move to Austria aligns with your focus on a balanced lifestyle. The schools we have identified offer a professional environment that respects your personal time, which is ideal given your current status. Financially, while the cost of living is notable, the net result for a teacher with your experience remains very positive.`,
        "bahrain": `Bahrain represents an excellent stint for anyone looking to combine a welcoming social life with a strong financial return. For ${params.status} educators, the housing and utility benefits often found here make it one of the most cost-effective choices in the region. It is a stable, well-trodden path for international staff.`,
        "china": `This posting in China is arguably your strongest option for rapid capital accumulation. The data suggests that your monthly surplus here will be significantly higher than in other regions. Professionally, the schools in our database for this region are expanding rapidly, offering you a clear path for career progression.`
      };

      const verdict = verdictMap[country.country?.toLowerCase()] || `This destination is a high-fidelity match for your specified profile. Based on your focus on ${params.goals.join(' and ')}, this move provides the financial headroom and professional quality you require. It is a stable environment that will add genuine value to your career history.`;

      return {
        ...country,
        schools: schools.sort((a,b) => b.totalscore - a.totalscore),
        localNet: Math.round(netUSD * exRate),
        localSurplus: Math.round(surplus * exRate),
        // Portugal and most European peers pull EUR from finances, confirmed logic.
        localCurrency: finances?.currencyCode || (country.country === "Portugal" ? "EUR" : "LC"),
        safety: getBespokeTeacherSecurity(country.country || ""),
        suitability,
        fitScore,
        verdict,
        rawSurplus: surplus,
        countryRating: ((schools.reduce((acc, s) => acc + Number(s.totalscore), 0) / (schools.length || 1)) * 0.7 + Number(country.academicscore || 7) * 0.3).toFixed(1)
      };
    });

    const sorted = allResults.sort((a, b) => b.fitScore - a.fitScore || b.rawSurplus - a.rawSurplus);
    const top5 = sorted.filter(c => c.fitScore > 60).slice(0, 5);
    const pool = sorted.filter(c => c.fitScore >= 75 && !top5.some(t => t.country === c.country));

    return { topPicks: top5, alternates: pool.slice(0, 6), remainingCount: Math.max(0, pool.length - 6) };
  }, [params, reqsData, finData, schoolData]);

  if (!mounted || !params) return <div className="min-h-screen bg-[#020617]" />;

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 md:p-12 font-sans selection:bg-[#f97316]">
      <div className="max-w-7xl mx-auto space-y-12">
        <header className="space-y-4">
          <button onClick={() => router.push('/discover')} className="flex items-center gap-2 text-[12px] font-bold text-[#007FFF] uppercase tracking-widest hover:text-white transition-colors">
            <ArrowLeft className="size-4" /> Back
          </button>
          {/* Title: No full stop */}
          <h1 className="text-3xl md:text-5xl font-black tracking-tighter border-l-8 border-[#f97316] pl-6 italic text-[#f97316]">
            What you could achieve
          </h1>
        </header>

        <div className="grid grid-cols-1 gap-12">
          {topPicks.map((country, idx) => (
            <div key={idx} className="grid grid-cols-1 lg:grid-cols-12 border border-white/10 bg-black/40 hover:border-[#f97316]/50 transition-all shadow-2xl min-h-[650px]">
              
              {/* Column 1: Identity & Safety (7-Line Cut) */}
              <div className="lg:col-span-4 p-8 border-r border-white/10 bg-black/60 flex flex-col h-full">
                <div className="mb-6">
                  <p className="text-[#007FFF] text-[10px] font-bold uppercase tracking-[0.2em] mb-1">{country.region}</p>
                  <h2 className="text-3xl font-black tracking-tighter uppercase leading-none mb-2 text-[#f97316]">{country.country}</h2>
                  <p className="text-[#f97316] text-[12px] font-black uppercase tracking-widest flex items-center gap-2 italic">
                    <Star className="size-3 fill-[#f97316]" /> Rating: {country.countryRating}/10
                  </p>
                </div>

                <div className="space-y-6 pt-4 border-t border-white/5 flex-grow">
                  <div className="space-y-1 relative group">
                    <p className="text-[#007FFF] text-[11px] font-bold uppercase tracking-widest flex items-center gap-2"><Lock className="size-3" /> Visa - Age Restrictions</p>
                    <p className="text-2xl font-black italic text-white">{country.max_age_m} years old</p>
                    {params.age >= 60 && (
                      <div className="mt-2 flex items-center gap-2 text-[#007FFF] animate-pulse">
                        <AlertTriangle className="size-3" />
                        <p className="text-[10px] font-black uppercase tracking-tighter italic border-b border-[#007FFF]/30">Statutory Retirement Limit Approaching</p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-[#007FFF] text-[11px] font-bold uppercase tracking-widest flex items-center gap-2"><GraduationCap className="size-3" /> Qualifications</p>
                    <p className="text-[11px] font-bold text-slate-300 uppercase leading-relaxed">{country.academic_Degree_req}</p>
                  </div>
                  
                  {/* Truncated at 7 lines */}
                  <div className="p-6 bg-[#007FFF]/5 border border-[#007FFF]/40 cursor-pointer hover:bg-[#007FFF]/10 transition-all flex-grow" onClick={() => setExpandedSafety(expandedSafety === idx ? null : idx)}>
                    <div className="flex justify-between items-center mb-3">
                      <p className="text-[#007FFF] text-[13px] font-black uppercase tracking-widest flex items-center gap-2"><ShieldCheck className="size-4" /> Security Reflection</p>
                      {expandedSafety === idx ? <ChevronUp className="size-4 text-white" /> : <ChevronDown className="size-4 text-white" />}
                    </div>
                    <p className={cn("text-[16px] text-white leading-relaxed font-medium italic transition-all", expandedSafety === idx ? "line-clamp-none" : "line-clamp-[7]")}>
                      "{country.safety}"
                    </p>
                  </div>
                </div>
              </div>

              {/* Column 2: Economics & Leopardfish Verdict */}
              <div className="lg:col-span-5 p-8 border-r border-white/10 flex flex-col h-full bg-black/20">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="space-y-1">
                    <p className="text-[#007FFF] text-[10px] font-bold uppercase tracking-widest">Monthly Net</p>
                    <p className="text-3xl font-black tracking-tighter text-white uppercase">{country.localCurrency} {country.localNet.toLocaleString()}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[#f97316] text-[10px] font-black uppercase tracking-widest">Est. Savings</p>
                    <p className="text-3xl font-black tracking-tighter text-white uppercase">{country.localCurrency} {country.localSurplus.toLocaleString()}</p>
                  </div>
                </div>

                <div className="py-5 border-y border-white/5 grid grid-cols-4 gap-2 mb-6">
                  {[
                    { label: 'Adventure', val: country.suitability.adventure, icon: Compass },
                    { label: 'Savings', val: country.suitability.savings, icon: Banknote },
                    { label: 'Balance', val: country.suitability.balance, icon: Heart },
                    { label: 'Career', val: country.suitability.career, icon: Zap },
                  ].map((p) => (
                    <div key={p.label} className="text-center">
                      <p className="text-[10px] font-black uppercase text-slate-500 mb-1">{p.label}</p>
                      <p className={cn("font-black italic text-[13px]", p.val > 7 ? "text-[#007FFF]" : "text-slate-500")}>{p.val}</p>
                    </div>
                  ))}
                </div>

                <div className="p-10 bg-[#f97316]/5 border-l-4 border-[#f97316] flex-grow flex flex-col justify-center space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-[#f97316] text-[13px] font-black uppercase tracking-[0.3em]">Leopardfish Verdict</p>
                    {/* Reduced Match and % size by 2 points (text-[13px] -> text-[11px]) */}
                    <span className="text-[#f97316] font-black text-[11px] italic bg-[#f97316]/20 px-3 py-1 rounded-full border border-[#f97316]/30 tracking-tight">Match: {country.fitScore}%</span>
                  </div>
                  <p className="text-[16px] text-white leading-relaxed font-bold tracking-tight italic border-t border-[#f97316]/20 pt-6">
                    {country.verdict}
                  </p>
                </div>
              </div>

              {/* Column 3: Targets & Smaller Rounded Button */}
              <div className="lg:col-span-3 p-8 flex flex-col justify-between bg-white/[0.01]">
                <div className="space-y-4">
                  <p className="text-[#007FFF] text-[11px] font-bold uppercase tracking-widest">Primary Targets</p>
                  <div className="space-y-3">
                    {country.schools?.slice(0, 4).map((s: any, i: number) => (
                      <button key={i} className="w-full p-4 bg-white/5 border border-white/10 hover:border-[#f97316] text-left transition-all">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-black text-white text-[12px] uppercase truncate pr-2">{s.schoolname}</span>
                          <span className="font-black text-[#007FFF] text-[12px]">{s.totalscore}</span>
                        </div>
                        <span className="text-[9px] font-black uppercase text-[#f97316] bg-[#f97316]/10 px-2 py-1 border border-[#f97316]/20">{s.curriculum || "IB / British"}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-8 flex justify-center">
                  <button 
                    onClick={() => {
                      const ids = country.schools?.slice(0, 3).map((s: any) => s.id).join(',');
                      router.push(`/compare?ids=${ids}`);
                    }}
                    className="w-full max-w-[240px] bg-[#f97316] text-black py-4 font-black uppercase tracking-widest text-[11px] hover:bg-white transition-all flex items-center justify-between px-6 rounded-full group shadow-2xl"
                  >
                    Compare Targets <Scale className="size-4 group-hover:rotate-12 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* WORTH CONSIDERING SECTION (No brackets) */}
        {alternates.length > 0 && (
          <section className="pt-20 border-t border-white/10">
            <h3 className="text-2xl font-black text-[#007FFF] uppercase italic tracking-tighter mb-8">Other deployments worth considering</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {alternates.map((country, i) => (
                <button key={i} onClick={() => router.push(`/discover/${country.country.toLowerCase()}`)} className="p-4 bg-black/60 border border-white/10 hover:border-[#f97316] transition-all text-left group">
                  <p className="text-base font-black text-white uppercase group-hover:text-[#f97316] transition-colors truncate">{country.country}</p>
                  <p className="text-[10px] font-black text-[#007FFF] italic">{country.fitScore}% Match</p>
                </button>
              ))}
            </div>
            {/* Footer Sentences Removed as requested */}
            <div className="mt-12 p-12 border border-[#007FFF]/20 bg-[#007FFF]/5 text-center">
                <p className="text-slate-400 font-black uppercase tracking-widest text-sm italic">
                  {remainingCount > 0 ? `Your profile matches ${remainingCount} other destinations in this tier.` : "End of available high-fidelity results."}
                </p>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default function DossierPage() {
  return <Suspense fallback={null}><DossierContent /></Suspense>;
}
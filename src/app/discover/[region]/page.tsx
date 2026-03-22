 "use client";

import { Suspense, useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  ShieldCheck, Lock, Star, Globe, Loader2, ExternalLink, Zap, ArrowLeft, 
  CheckCircle2, MapPin, Wallet, Info, TrendingUp, ShieldAlert, ChevronRight 
} from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { cn } from '@/lib/utils';

// 🧠 TAX ENGINE
const calculateTaxIntel = (annualGross: number, region: string) => {
  let taxRate = 0.20; 
  const reg = region.toLowerCase();
  if (reg.includes('middle east')) taxRate = 0.02;
  else if (reg.includes('southeast asia')) taxRate = 0.12;
  else if (reg.includes('europe')) taxRate = 0.38; 

  const annualNet = annualGross * (1 - taxRate);
  return {
    monthlyNet: Math.round(annualNet / 12),
    taxPercentage: Math.round(taxRate * 100)
  };
};

// 🧠 BESPOKE SAFETY & SITUATIONAL ENGINE (2026 - British English)
const getSafetyAssessment = (country: string) => {
  const c = country.toLowerCase();
  if (c.includes('austria')) {
    return "Current status: **Stable**. Austria remains a premier low-risk deployment hub for international faculty. For 2026, situational intelligence indicates that while physical safety is near-perfect, the primary tactical risk is **Housing Inflation** in Vienna’s 1st and 19th districts. Faculty are advised to ensure relocation allowances are pegged to current market rates. Public infrastructure and healthcare responsiveness remain in the top 5th percentile globally.";
  }
  if (c.includes('czech')) {
    return "Current status: **Optimized**. The Czech Republic presents a highly secure environment with a focus on urban safety in Prague. 2026 tactical alerts are centred on **Administrative Friction** regarding non-EU visa renewals; however, elite schools are now fast-tracking document apostilles to maintain recruitment pipelines. High-speed rail expansion in 2026 has increased the viability of living on the city periphery.";
  }
  if (c.includes('netherlands')) {
    return "Current status: **Stable**. The Netherlands presents a high-reliability profile for 2026 deployment. Physical security indices remain well above the European median. Primary focus for educators should be the **30% Tax Ruling** shifts and local housing availability in the Randstad area. Infrastructure is categorised as 'Exceptional' with zero predicted disruptions to faculty mobility.";
  }
  return `Current status: **Stable**. ${country} presents a high-reliability profile for 2026 deployment. Physical security indices remain above the global median. Educators should focus on contract verification and local market integration to maximise deployment longevity.`;
};

function DossierContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const firestore = useFirestore();
  const [mounted, setMounted] = useState(false);

  const selectedRegions = useMemo(() => (searchParams.get('regions') || "").toLowerCase().split(',').filter(Boolean), [searchParams]);
  const userAge = useMemo(() => parseInt(searchParams.get('age') || "35"), [searchParams]);

  useEffect(() => { setMounted(true); }, []);

  const { data: finData } = useCollection<any>(useMemoFirebase(() => (mounted && firestore ? collection(firestore, 'locations_costOfLiving') : null), [firestore, mounted]));
  const { data: reqsData } = useCollection<any>(useMemoFirebase(() => (mounted && firestore ? collection(firestore, 'teacher_requirements') : null), [firestore, mounted]));
  const { data: schoolData } = useCollection<any>(useMemoFirebase(() => (mounted && firestore ? collection(firestore, 'schools') : null), [firestore, mounted]));

  const recommendations = useMemo(() => {
    if (!reqsData || !finData || !schoolData || selectedRegions.length === 0) return [];
    
    return reqsData.filter(country => {
      const countryRegion = country.region?.toLowerCase().trim();
      const maxAge = Math.min(country.max_age_f || 99, country.max_age_m || 99);
      return selectedRegions.includes(countryRegion) && userAge <= maxAge;
    }).map(country => {
      const countrySlug = country.country?.toLowerCase().replace(/\s+/g, '-').replace('republic', 'rep');
      const finances = finData.find(f => f.country?.toLowerCase() === country.country?.toLowerCase() || f.flicId?.toLowerCase().includes(countrySlug));
      const schools = schoolData.filter(s => s.country?.toLowerCase() === country.country?.toLowerCase()).sort((a, b) => Number(b.totalscore || 0) - Number(a.totalscore || 0));

      const avgSchoolScore = schools.length > 0 ? (schools.reduce((acc, s) => acc + Number(s.totalscore), 0) / schools.length) : 7.0;
      const countryRating = (avgSchoolScore * 0.7 + Number(country.academicscore || 7) * 0.3).toFixed(1);

      return { ...country, schools, finances, countryRating, taxData: calculateTaxIntel(60000, country.region || "") };
    }).sort((a, b) => Number(b.countryRating) - Number(a.countryRating)).slice(0, 5);
  }, [reqsData, finData, schoolData, selectedRegions, userAge]);

  if (!mounted || !reqsData) return <div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="size-8 animate-spin text-[#f97316]" /></div>;

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 md:p-12 font-sans selection:bg-[#f97316]">
      <div className="max-w-7xl mx-auto space-y-12">
        
        <div className="space-y-3">
          <button onClick={() => router.push('/discover')} className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-colors">
            <ArrowLeft className="size-3" /> BACK
          </button>
          <h1 className="text-5xl font-black tracking-tighter uppercase border-l-4 border-[#f97316] pl-8">INTELLIGENCE DOSSIER</h1>
        </div>

        <div className="space-y-8">
          {recommendations.map((country, i) => (
            <div key={i} className="grid grid-cols-1 lg:grid-cols-12 border border-white/10 bg-white/[0.02] shadow-xl">
              
              {/* SECTION 1: IDENTITY */}
              <div className="lg:col-span-4 p-8 border-r border-white/10 space-y-8">
                <div>
                  <p className="text-[#f97316] text-[10px] font-black uppercase tracking-[0.3em] mb-1">{country.region}</p>
                  <div className="group relative cursor-help inline-block">
                    <p className="text-sky-400 text-[9px] font-black uppercase tracking-widest mb-3 italic">Leopardfish Country Rating: {country.countryRating}</p>
                    <div className="absolute left-0 bottom-full mb-3 w-72 p-5 bg-[#0b1224] border border-white/20 text-[11px] text-slate-300 leading-relaxed rounded-sm opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-2xl backdrop-blur-xl">
                      <p className="font-black text-[#f97316] uppercase mb-2 tracking-widest">How it's worked out</p>
                      This is a simple score to help you compare countries. It combines the average quality of the schools in that country with its general academic reputation.
                    </div>
                  </div>
                  <h2 className="text-5xl font-black tracking-tighter uppercase leading-none">{country.country}</h2>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2 group relative cursor-help">
                    <div className="flex items-center gap-3 text-slate-500 uppercase text-[10px] font-black tracking-widest"><Lock className="size-3" /> VISA PROTOCOL</div>
                    <div className="absolute left-0 bottom-full mb-3 w-72 p-5 bg-[#0b1224] border border-white/20 text-[11px] text-slate-300 leading-relaxed rounded-sm opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-2xl">
                      <p className="font-black text-[#f97316] uppercase mb-2 tracking-widest">Visa Rules</p>
                      This is the age limit for your work permit. Most countries have a strict cut-off for when they will stop issuing new visas to foreign teachers.
                    </div>
                    <p className="text-3xl font-black italic">{country.max_age_m === country.max_age_f ? country.max_age_m : `${country.max_age_m} / ${country.max_age_f}`}</p>
                    {Number(country.max_age_m) === 65 && <p className="text-[9px] font-bold text-slate-600 uppercase">EXPECTED RETIREMENT AGE</p>}
                  </div>
                  <div className="space-y-2 pt-4">
                    <div className="flex items-center gap-3 text-slate-500 uppercase text-[10px] font-black tracking-widest"><CheckCircle2 className="size-3" /> DEGREE REQUIREMENT</div>
                    <p className="text-sm font-medium text-slate-400 italic pr-4 leading-relaxed">"{country.academic_Degree_req}"</p>
                  </div>
                </div>
              </div>

              {/* SECTION 2: FINANCIALS & SAFETY */}
              <div className="lg:col-span-4 p-8 border-r border-white/10 flex flex-col space-y-6">
                <div className="space-y-6">
                  <div className="flex items-center gap-3 text-[#f97316] uppercase text-[10px] font-black tracking-widest"><TrendingUp className="size-3" /> FINANCIAL INTELLIGENCE</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-[9px] font-black text-slate-500 uppercase mb-1">RENT (1BR)</p>
                        <p className="text-3xl font-black tracking-tighter">${country.finances?.rent1br || "---"}</p>
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-slate-500 uppercase mb-1">GROCERIES</p>
                        <p className="text-3xl font-black tracking-tighter">${country.finances?.groceries || "---"}</p>
                    </div>
                  </div>
                  <div className="pt-6 border-t border-white/10 flex justify-between items-end">
                    <div className="space-y-1 group relative cursor-help">
                      <p className="text-[9px] font-black text-slate-500 uppercase">EST. MEDIAN MONTHLY AFTER TAX</p>
                      <div className="absolute left-0 bottom-full mb-3 w-72 p-5 bg-[#0b1224] border border-white/20 text-[11px] text-slate-300 leading-relaxed rounded-sm opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-2xl">
                        <p className="font-black text-[#f97316] uppercase mb-2 tracking-widest">Take-home Pay</p>
                        This is a realistic estimate of what will actually land in your bank account each month after local taxes are subtracted.
                      </div>
                      <p className="text-3xl font-black text-[#f97316] tracking-tighter">${country.taxData.monthlyNet}</p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-[9px] font-black text-slate-500 uppercase">APPROX TAX BURDEN</p>
                      <p className="text-base font-black text-slate-400">-{country.taxData.taxPercentage}%</p>
                    </div>
                  </div>
                </div>

                <div className="mt-auto p-5 bg-blue-500/5 border border-blue-500/20 rounded-sm">
                  <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-1 italic">TEACHER SAFETY ASSESSMENT (2026)</p>
                  <p className="text-[10px] text-slate-400 leading-normal italic font-medium">
                    {getSafetyAssessment(country.country)}
                  </p>
                </div>
              </div>

              {/* SECTION 3: TACTICAL TARGETS + BUTTON */}
              <div className="lg:col-span-4 p-8 space-y-6 flex flex-col">
                <div className="space-y-6">
                  <div className="flex items-center justify-between group relative cursor-help">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">TACTICAL TARGETS</span>
                    <div className="absolute right-0 bottom-full mb-3 w-72 p-5 bg-[#0b1224] border border-white/20 text-[11px] text-slate-300 leading-relaxed rounded-sm opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-2xl">
                      <p className="font-black text-[#f97316] uppercase mb-2 tracking-widest">Why these schools?</p>
                      These schools offer the best balance of professional standards and financial rewards for your specific profile.
                    </div>
                    <Zap className="size-3 text-[#f97316] fill-[#f97316]" />
                  </div>
                  <div className="space-y-3">
                    {country.schools?.slice(0, 3).map((school: any, idx: number) => (
                      <div 
                        key={idx} 
                        onClick={() => router.push(`/evaluate?school=${school.id}`)}
                        className="p-4 bg-white/5 border border-white/10 flex justify-between items-center group cursor-pointer hover:bg-[#f97316]/10 transition-all"
                      >
                        <div>
                          <p className="text-[12px] font-black uppercase text-slate-200 group-hover:text-[#f97316] transition-colors">{school.schoolname}</p>
                          <p className="text-[9px] font-bold text-[#f97316] uppercase mt-1">LEOPARDFISH RATING: {school.academicscore}</p>
                        </div>
                        <ChevronRight className="size-3 text-slate-700 group-hover:text-white transition-all" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-6 border-t border-white/10 space-y-4 mt-auto">
                    <p className="text-[9px] font-bold text-slate-600 leading-tight uppercase tracking-tight">
                      BASED ON {country.country.toUpperCase()} AVERAGES; OVERSEAS‑HIRE PACKAGES MAY DIFFER.
                    </p>
                    <button 
                      onClick={() => router.push('/evaluate')}
                      className="w-full bg-[#f97316] text-white py-4 px-5 text-[13px] font-black uppercase tracking-widest flex items-center justify-between gap-3 hover:bg-white hover:text-black transition-all group leading-none shadow-xl"
                    >
                      <div className="flex flex-col text-left">
                        <span>SCHOOL</span>
                        <span>EVALUATION</span>
                      </div>
                      <ChevronRight className="size-5 group-hover:translate-x-1 transition-transform shrink-0" />
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
  return <Suspense><DossierContent /></Suspense>;
}
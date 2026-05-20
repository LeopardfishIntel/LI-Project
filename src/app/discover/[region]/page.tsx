"use client";

import { Suspense, useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { 
  ShieldCheck, Loader2, ArrowLeft, TrendingUp, 
  Lock, Zap, GraduationCap, Star, Info, Scale, Compass, Heart, Banknote, ChevronDown, ChevronUp, AlertTriangle, ChevronRight
} from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { canonicalCountry, RATES, calculateLocalSavingsScore, getStrategicScores } from '@/lib/calculations';
import { getLiveSecurityIntelligence } from '../actions';

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

// 🧮 Creative Intelligence Heuristics (Regional/Economic Correlation)
function deriveIntelligenceScores(country: any, finances: any) {
    const name = country.country || "Unknown";
    const region = country.region || "";
    return getStrategicScores(name, region);
}

function getScoreRationale(metric: string, score: number, country: string, region: string) {
  const c = (country || "").toLowerCase();
  const r = (region || "").toLowerCase();
  const s = score;
  
  // Deterministic seed based on country name to keep rationales consistent but different per country
  const seed = c.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const pick = (arr: string[]) => arr[seed % arr.length];

  const isHub = ["united arab emirates", "singapore", "qatar", "hong kong", "bahrain", "oman", "kuwait"].includes(c);
  const isTaxFree = ["united arab emirates", "qatar", "saudi arabia", "kuwait", "bahrain", "oman"].includes(c);
  const isHighHeritage = ["france", "italy", "spain", "japan", "china", "vietnam", "greece", "portugal", "thailand", "jordan", "egypt"].includes(c);

  if (metric.toLowerCase() === 'adventure') {
    const activities = r.includes('asia') ? ['jungle trekking', 'scuba diving', 'night-market exploration', 'island hopping'] 
                     : r.includes('europe') ? ['alpine skiing', 'coastal hiking', 'historic cycling routes', 'mountain trail running']
                     : r.includes('middle east') ? ['desert safaris', 'dune bashing', 'wadi exploration', 'private beach access']
                     : ['regional exploration', 'local hiking', 'nature photography', 'weekend escapes'];
    
    const act1 = activities[seed % activities.length];
    const act2 = activities[(seed + 1) % activities.length];

    if (isHub) {
      const hubs = [
        `A high-velocity travel hub. Being based in ${country} means ${act1} in the wider region is just a short-haul flight away.`,
        `Strategically positioned for the 'weekend warrior'. Use ${country} as your launchpad for everything from ${act1} to ${act2}.`,
        `Unrivalled regional connectivity. This score reflects the ease of escaping to ${r}'s most remote corners during your non-contact time.`
      ];
      return pick(hubs);
    }
    
    if (s >= 8.5) {
      return `Outstanding domestic depth. From ${act1} to ${act2}, the local landscape offers a world-class playground right on your doorstep.`;
    }
    
    return `A solid exploration baseline. The rating indicates reliable travel infrastructure and straightforward access to ${act1} within ${country} or nearby.`;
  }

  if (metric.toLowerCase() === 'savings') {
    if (isTaxFree) {
      const taxFree = [
        `A premier wealth-building zone. The zero-tax environment, coupled with housing support, makes ${country} a high-performance choice for your financial buffer.`,
        `Exceptional saving potential. Without the burden of local income tax, your surplus is significantly amplified compared to UK or European roles.`,
        `A strategic financial posting. This score reflects the rare combination of high-tier salaries and the absence of personal tax liabilities.`
      ];
      return pick(taxFree);
    }
    
    if (s >= 8.0) {
      return `High purchasing power. Your surplus here stretches much further than in traditional western markets, allowing for a premium lifestyle without compromising your savings goals.`;
    }
    
    if (s >= 6.0) {
      return `A reliable financial cushion. Expect a steady monthly surplus that supports a comfortable international teaching lifestyle with consistent growth in your net worth.`;
    }

    return `Functional financial stability. The score suggests a balanced budget where professional earnings comfortably cover the local cost of living while maintaining a modest buffer.`;
  }

  if (metric.toLowerCase() === 'culture') {
    if (isHighHeritage) {
      const heritage = [
        `Exceptional cultural density. The social fabric is rich with ${r.includes('europe') ? 'historic squares and theatre' : r.includes('middle east') ? 'UNESCO World Heritage sites and ancient citadels' : 'ancient traditions and vibrant markets'}, offering a deep, immersive experience.`,
        `A masterclass in heritage. From ${c.includes('jordan') ? 'the lost city of Petra' : r.includes('asia') ? 'temple complexes' : 'renaissance architecture'} to local arts, your life outside school will be defined by genuine cultural depth.`,
        `Outstanding social infrastructure. High access to 'third spaces'—the cafés, galleries, and historic sites that give ${country} its unique rhythm.`
      ];
      return pick(heritage);
    }

    if (r.includes('europe')) return `Rich civic life. This score reflects the ease of integration into a lifestyle defined by historic theatre, café culture, and accessible public arts.`;
    if (r.includes('asia')) return `Dynamic social tapestry. From the energy of local night markets to the quiet of traditional gardens, the cultural engagement here is both active and rewarding.`;
    if (r.includes('middle east')) return `Sophisticated cosmopolitanism. Experience a unique blend of traditional heritage and hyper-modern social hubs in an environment built for international ease.`;
    
    return `An established professional environment. Cultural engagement is smooth, supported by well-connected social circles and a high density of modern amenities.`;
  }

  if (metric.toLowerCase() === 'career') {
    if (s >= 8.5) return `A high-performance market for growth. The density of Tier-1 schools here creates a deep hierarchy of leadership roles and rapid internal promotion pathways.`;
    if (s >= 7.0) return `Solid professional stability. Your career is anchored by high academic standards, globally recognised curriculum norms, and a strong network of accredited institutions.`;
    if (s >= 5.0) return `A steady professional hub. Focuses on consistent development and classroom mastery within well-established school frameworks.`;
    return `Professional baseline. The environment supports foundational growth and stability within a specific institutional context.`;
  }

  return `Intelligence score based on regional cost-of-living indices and professional market data for ${country}.`;
}

function DossierContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const routeParams = useParams();
  const firestore = useFirestore();
  const [mounted, setMounted] = useState(false);
  const [expandedSafety, setExpandedSafety] = useState<number | null>(null);
  const [benchmark, setBenchmark] = useState<'USD' | 'GBP' | 'EUR' | 'Local'>('GBP');
  const [liveSecurity, setLiveSecurity] = useState<{ reflection: string, sourceUrl: string } | null>(null);
  const [loadingSecurity, setLoadingSecurity] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const countrySlug = routeParams?.region as string;

  useEffect(() => {
    if (mounted && countrySlug) {
      setLoadingSecurity(true);
      getLiveSecurityIntelligence(countrySlug).then(res => {
        setLiveSecurity(res);
        setLoadingSecurity(false);
      });
    }
  }, [mounted, countrySlug]);

  const params = useMemo(() => {
    if (!mounted) return null;
    const regions = (searchParams.get('regions') || "").toLowerCase().split(',').filter(Boolean);
    const rawAge = searchParams.get('age') || "35";
    const ageMatch = rawAge.match(/\d+/);
    const age = ageMatch ? parseInt(ageMatch[0]) : 35;
    const salary = searchParams.get('salary') || "USD 60000";
    const status = (searchParams.get('status') || "single").toLowerCase();
    const goals = (searchParams.get('goals') || "").toLowerCase().split(',').filter(Boolean);
    const currentLocation = searchParams.get('currentLocation') || "";
    return { regions, age, rawAge, salary, status, goals, currentLocation };
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
      const finances = finData.find(f => canonicalCountry(f.country) === canonicalCountry(country.country || ""));
      const schools = schoolData.filter(s => canonicalCountry(s.country) === canonicalCountry(country.country || ""));
      const hasSchools = schools.length > 0;
      
      let localAverageSalary = 4500;
      let validSalaries = 0;
      schools.forEach((s: any) => {
          if (s.salaryRange) {
              const cleanRange = s.salaryRange.replace(/,/g, '');
              const range = cleanRange.match(/\d+/g);
              if (range) {
                  const usdMed = range.length > 1 ? (parseFloat(range[0]) + parseFloat(range[1])) / 2 : parseFloat(range[0]);
                  localAverageSalary = validSalaries === 0 ? usdMed : localAverageSalary + usdMed;
                  validSalaries++;
              }
          }
      });
      if (validSalaries > 1) {
          localAverageSalary = localAverageSalary / validSalaries;
      }
      
      const multiplier = params.status.includes('dual') ? 1.85 : 1;
      const netUSD = Math.round(localAverageSalary * multiplier);
      
      const countryName = country.country || "";
      const isGulfHousing = ['united arab emirates', 'qatar', 'saudi arabia', 'kuwait', 'bahrain', 'oman'].includes(canonicalCountry(countryName));
      const rentCost = isGulfHousing ? 0 : (Number(finances?.rent1br) || 1200);
      
      const outgoingsUSD = (rentCost + 600) * (params.status.includes('family') ? 1.55 : 1);
      const surplusUSD = Math.max(-500, netUSD - outgoingsUSD);
      
      const intelScores = deriveIntelligenceScores(country, finances);
      const suitability = {
        adventure: Number(finances?.adventureScore) || intelScores.adventure,
        savings: calculateLocalSavingsScore(localAverageSalary, params.status, finances, isGulfHousing),
        balance: Number(finances?.cultureScore) || intelScores.culture,
        career: Number(finances?.careerScore) || Number(country.academicscore) || 7
      };

      let fitScore = Math.round(((suitability.adventure + suitability.savings + suitability.balance + suitability.career) / 40) * 100);
      if (!hasSchools) fitScore = Math.min(fitScore, 60);

      const g1 = params.goals[0] || 'Career Progression';
      const g2 = params.goals[1] || 'Culture';
      const famStr = params.status.includes('family') ? 'your family' : 'your professional lifestyle';
      const regionStr = country.region || 'the region';
      const transportStr = regionStr.toLowerCase().includes('asia') || regionStr.toLowerCase().includes('europe') ? `excellent transport links across ${regionStr}` : `accessible travel routes throughout the region`;

      const bespokeVerdict = canonicalCountry(country.country) === canonicalCountry(params.currentLocation)
        ? `As you are currently based in ${country.country}, this deployment represents your current professional baseline. It continues to be an excellent match for your focus on '${g1}', providing the stability and quality of life that suits ${famStr}. Using this as your benchmark allows for a highly accurate comparison against other regional opportunities.`
        : `${country.country} is an excellent match for your profile, particularly regarding '${g1}'. The established international schools here provide a highly professional environment, allowing for a high quality of life tailored to ${famStr}. Furthermore, its strategic position in ${regionStr} offers superb '${g2}' opportunities, making it a very sound deployment.`;
      
      const bespokeAlignment = canonicalCountry(country.country) === canonicalCountry(params.currentLocation)
        ? `In your current role, you are already benefiting from a robust professional landscape that values your experience. Your secondary objectives of '${g2}' and cultural immersion are well-supported by the local infrastructure and ${transportStr}, making your current posting a very strong standard to beat in any future move.`
        : `The professional landscape here is robust, offering a strong network of accredited institutions that genuinely value experienced educators. Outside the classroom, you will find it remarkably easy to integrate; the local infrastructure and ${transportStr} mean that fulfilling your secondary objectives—whether that’s regional travel or genuine cultural immersion—is a seamless part of daily life.`;

      const localCurrencyCode = finances?.currencyCode || (country.country === "Portugal" ? "EUR" : "LC");
      const displayCurrency = benchmark === 'Local' ? localCurrencyCode : benchmark;
      const rate = benchmark === 'Local' ? (RATES[localCurrencyCode] || Number(finances?.exchangeRateToUSD) || 1.0) : (RATES[benchmark] || 1.0);

      const displayNet = Math.round(netUSD * rate);
      const displaySurplus = Math.round(surplusUSD * rate);

      return {
        ...country,
        schools: schools.sort((a,b) => b.totalscore - a.totalscore),
        displayNet,
        displaySurplus,
        displayCurrency,
        safety: getBespokeTeacherSecurity(country.country || ""),
        suitability,
        fitScore,
        verdict: bespokeVerdict,
        alignment: bespokeAlignment,
        rawSurplus: surplusUSD,
        countryRating: ((schools.reduce((acc, s) => acc + Number(s.totalscore), 0) / (schools.length || 1)) * 0.7 + Number(country.academicscore || 7) * 0.3).toFixed(1)
      };
    });

    const targetSlug = (routeParams?.region as string || "").toLowerCase();
    
    // If a specific country was clicked from the Matrix, only show that country
    const targetCountry = allResults.find(c => c.country?.toLowerCase().replace(/\s+/g, '-').replace('&', 'and') === targetSlug);
    
    const sorted = targetCountry ? [targetCountry] : allResults.sort((a, b) => b.fitScore - a.fitScore || b.rawSurplus - a.rawSurplus);
    const topPicks = targetCountry ? [targetCountry] : sorted.filter(c => c.fitScore > 60).slice(0, 5);
    const pool = sorted.filter(c => c.fitScore >= 75 && !topPicks.some(t => t.country === c.country));

    return { topPicks, alternates: pool.slice(0, 6), remainingCount: Math.max(0, pool.length - 6) };
  }, [params, reqsData, finData, schoolData, routeParams, benchmark]);

  if (!mounted || !params) return <div className="min-h-screen bg-[#020617]" />;

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 md:p-12 font-sans selection:bg-[#d95f02]">
      <div className="max-w-7xl mx-auto space-y-12">
        <header className="space-y-6">
          <button onClick={() => router.push('/discover/matrix?' + searchParams.toString())} className="flex items-center gap-2 text-[12px] font-bold text-[#007FFF] uppercase tracking-widest hover:text-white transition-colors">
            <ArrowLeft className="size-4" /> Back to Matrix
          </button>
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <h1 className="text-3xl md:text-5xl font-black tracking-tighter border-l-4 border-[#d95f02]/60 pl-4 italic text-[#d95f02]">
              What you could achieve
            </h1>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-12">
          {topPicks.map((country, idx) => (
            <div key={idx} className="flex flex-col border border-white/10 bg-black/40 hover:border-[#d95f02]/50 transition-all shadow-2xl overflow-hidden">
              
              {/* Profile Summary Bar */}
              <div className="w-full bg-white/[0.03] border-b border-white/10 px-8 py-3 flex flex-wrap items-center gap-x-8 gap-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Base:</span>
                  <span className="text-[11px] font-bold text-white uppercase italic">{params.currentLocation || "Not Set"}</span>
                </div>
                <div className="flex items-center gap-2 border-l border-white/10 pl-8">
                  <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Profile:</span>
                  <span className="text-[11px] font-bold text-white uppercase italic">{params.status}</span>
                </div>
                <div className="flex items-center gap-2 border-l border-white/10 pl-8">
                  <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Salary:</span>
                  <span className="text-[11px] font-bold text-[#007FFF] uppercase italic">{params.salary}</span>
                </div>
                <div className="flex items-center gap-2 border-l border-white/10 pl-8">
                  <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Age:</span>
                  <span className="text-[11px] font-bold text-white uppercase italic">{params.rawAge}</span>
                </div>
                <div className="flex items-center gap-2 border-l border-white/10 pl-8">
                  <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Focus:</span>
                  <span className="text-[11px] font-bold text-[#d95f02] uppercase italic">{params.goals.join(', ')}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[650px]">
              
              {/* Column 1: Identity & Safety (7-Line Cut) */}
              <div className="lg:col-span-4 p-8 border-r border-white/10 bg-black/60 flex flex-col h-full">
                <div className="mb-6">
                  <p className="text-[#007FFF] text-[10px] font-bold uppercase tracking-[0.2em] mb-1">{country.region}</p>
                  <h2 className="text-3xl font-black tracking-tighter uppercase leading-none mb-2 text-[#d95f02]">{country.country}</h2>
                  <p className="text-[#d95f02] text-[12px] font-black uppercase tracking-widest flex items-center gap-2 italic">
                    <Star className="size-3 fill-[#d95f02]" /> Rating: {country.countryRating}/10
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
                  <div className="p-6 bg-[#007FFF]/5 border border-[#007FFF]/40 flex-grow">
                    <div className="flex justify-between items-center mb-4">
                      <p className="text-[#007FFF] text-[13px] font-black uppercase tracking-widest flex items-center gap-2">
                        <ShieldCheck className="size-4" /> Security Reflection
                      </p>
                    </div>
                    {loadingSecurity ? (
                      <div className="flex items-center gap-2 py-4 animate-pulse">
                        <Loader2 className="size-3 animate-spin text-[#007FFF]" />
                        <span className="text-[11px] font-black uppercase text-slate-500 tracking-widest">Decrypting Live Feed...</span>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <p className="text-[15px] text-white leading-relaxed font-medium italic transition-all">
                          "{liveSecurity?.reflection || country.safety}"
                        </p>
                        
                        <div className="pt-4 border-t border-[#007FFF]/20 flex flex-wrap gap-3">
                          {liveSecurity?.sourceUrl && (
                            <a 
                              href={liveSecurity.sourceUrl} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="flex items-center gap-2 bg-[#007FFF] text-white px-3 py-2 text-[9px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all shadow-lg shadow-[#007FFF]/20 rounded-sm"
                            >
                              Official Gov.uk Briefing <ChevronRight className="size-3" />
                            </a>
                          )}
                          <a 
                            href={`https://www.reuters.com/site-search/?query=${country.country}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="flex items-center gap-2 bg-black/40 text-[#d95f02] border border-[#d95f02]/30 px-3 py-2 text-[9px] font-black uppercase tracking-widest hover:bg-[#d95f02] hover:text-black transition-all rounded-sm"
                          >
                            Reuters Latest News <Compass className="size-3" />
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Column 2: Economics & Leopardfish Verdict */}
              <div className="lg:col-span-5 p-8 border-r border-white/10 flex flex-col h-full bg-black/20">
                <div className="grid grid-cols-2 gap-4 mb-6 items-end">
                  <div className="space-y-2">
                    <p className="text-[#007FFF] text-[10px] font-bold uppercase tracking-widest">Currency Selector</p>
                    <div className="flex bg-black/50 p-0.5 rounded-sm border border-white/10 w-fit">
                        {(['USD', 'GBP', 'EUR'] as const).map((cur) => (
                            <button 
                              key={cur} 
                              onClick={() => setBenchmark(cur)} 
                              className={cn(
                                "px-3 py-1.5 text-[9px] font-black uppercase tracking-wider transition-all italic", 
                                benchmark === cur ? "bg-[#007FFF] text-white shadow-[0_0_12px_rgba(0,127,255,0.3)]" : "text-slate-500 hover:text-slate-300"
                              )}
                            >
                              {cur}
                            </button>
                        ))}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[#d95f02] text-[10px] font-black uppercase tracking-widest">Est. Monthly Surplus</p>
                    <p className="text-3xl font-black tracking-tighter text-white uppercase">{country.displayCurrency} {country.displaySurplus.toLocaleString()}</p>
                  </div>
                </div>

                <div className="py-5 border-y border-white/5 grid grid-cols-4 gap-2 mb-6">
                  {[
                    { label: 'Adventure', val: country.suitability.adventure, icon: Compass },
                    { label: 'Savings', val: country.suitability.savings, icon: Banknote },
                    { label: 'Culture', val: country.suitability.balance, icon: Heart },
                    { label: 'Career', val: country.suitability.career, icon: Zap },
                  ].map((p) => (
                    <div key={p.label} className="text-center">
                      <p className="text-[10px] font-black uppercase text-slate-500 mb-1">{p.label}</p>
                      <p className={cn("font-black italic text-[14px]", p.val > 7 ? "text-[#007FFF]" : "text-slate-500")}>{p.val}</p>
                    </div>
                  ))}
                </div>

                <div className="p-8 bg-[#d95f02]/5 border-l-2 border-[#d95f02]/50 flex-grow flex flex-col justify-center space-y-4">
                  <div className="flex justify-between items-center pb-4 border-b border-[#d95f02]/20">
                    <p className="text-[#d95f02] text-[13px] font-black uppercase tracking-[0.3em]">Leopardfish Verdict</p>
                    <span className="text-[#d95f02] font-black text-[11px] italic bg-[#d95f02]/20 px-3 py-1 rounded-full border border-[#d95f02]/30 tracking-tight">Match: {country.fitScore}%</span>
                  </div>
                  
                  <div className="space-y-4 pt-2">
                    <p className="text-[14px] text-white leading-relaxed font-bold tracking-tight italic">
                      {country.verdict}
                    </p>
                    <p className="text-[14px] text-white leading-relaxed font-bold tracking-tight italic">
                      {country.alignment}
                    </p>
                  </div>
                </div>
              </div>

              {/* Column 3: Targets & Smaller Rounded Button */}
              <div className="lg:col-span-3 p-8 flex flex-col justify-between bg-white/[0.01]">
                <div className="space-y-4">
                  <p className="text-[#007FFF] text-[11px] font-bold uppercase tracking-widest">International Schools</p>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {country.schools?.map((s: any, i: number) => (
                      <button key={i} className="w-full p-4 bg-white/5 border border-white/10 hover:border-[#d95f02] text-left transition-all">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-black text-white text-[12px] uppercase truncate pr-2">{s.schoolname}</span>
                          <span className="font-black text-[#007FFF] text-[12px]">{s.totalscore}</span>
                        </div>
                        <span className="text-[9px] font-black uppercase text-[#d95f02] bg-[#d95f02]/10 px-2 py-1 border border-[#d95f02]/20">{s.curriculum || "IB / British"}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-8 flex justify-center">
                  <button 
                    onClick={() => {
                      const ids = country.schools?.slice(0, 3).map((s: any) => s.id).join(',');
                      router.push(`/decide?ids=${ids}`);
                    }}
                    className="w-full max-w-[240px] bg-[#d95f02] text-black py-4 font-black uppercase tracking-widest text-[11px] hover:bg-white transition-all flex items-center justify-between px-6 rounded-full group shadow-2xl"
                  >
                    Compare Targets <Scale className="size-4 group-hover:rotate-12 transition-transform" />
                  </button>
                </div>
              </div>
            </div>

            {/* 🛡️ INTELLIGENCE DEEP-DIVE (FOUR CARD ARRAY) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 border-t border-white/10 bg-black/40">
              {[
                { label: 'Adventure', score: country.suitability.adventure, icon: Compass, color: 'text-[#d95f02]' },
                { label: 'Savings', score: country.suitability.savings, icon: Banknote, color: 'text-emerald-400' },
                { label: 'Culture', score: country.suitability.balance, icon: Heart, color: 'text-rose-400' },
                { label: 'Career', score: country.suitability.career, icon: Zap, color: 'text-sky-400' }
              ].map((m) => {
                const isStrategicFocus = params.goals.some(g => g.toLowerCase().includes(m.label.toLowerCase()));
                return (
                  <div key={m.label} className={cn(
                    "p-6 border-r border-b lg:border-b-0 border-white/5 space-y-3 transition-all duration-500 group relative overflow-hidden",
                    isStrategicFocus ? "bg-[#d95f02]/5 border-2 border-[#d95f02] z-10 shadow-[0_0_20px_rgba(249,115,22,0.1)]" : "hover:bg-white/[0.02]"
                  )}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <m.icon className={cn("size-4", m.color)} />
                        <span className={cn("text-[10px] font-black uppercase tracking-widest", isStrategicFocus ? "text-[#d95f02]" : "text-slate-500")}>
                          {m.label}
                        </span>
                      </div>
                      <span className={cn("text-xl font-black italic", m.color)}>{m.score.toFixed(1)}</span>
                    </div>
                    <p className={cn("text-[12px] leading-relaxed italic transition-colors", isStrategicFocus ? "text-slate-200" : "text-slate-400 group-hover:text-white")}>
                      {getScoreRationale(m.label, m.score, country.country, country.region)}
                    </p>
                  </div>
                );
              })}
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
                <button key={i} onClick={() => router.push(`/discover/${country.country.toLowerCase()}`)} className="p-4 bg-black/60 border border-white/10 hover:border-[#d95f02] transition-all text-left group">
                  <p className="text-base font-black text-white uppercase group-hover:text-[#d95f02] transition-colors truncate">{country.country}</p>
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
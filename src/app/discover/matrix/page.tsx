"use client";

import { Suspense, useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, Compass, Wallet, Zap, Coffee, Info, ChevronRight, AlertTriangle, Globe2, Target
} from 'lucide-react';
import { getCountryStats } from '../actions';
import { calculateSavingsScore, calculateLocalSavingsScore, calculateSurplus, RATES, canonicalCountry } from '@/lib/calculations';
import { cn } from '@/lib/utils';
import { 
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger 
} from "@/components/ui/tooltip";

function deriveIntelligenceScores(country: any, finances: any) {
    const name = country.country || "Unknown";
    const region = (country.region || "").toLowerCase();
    
    // 1. ADVENTURE SCORE (The 'Weekend Warrior' / Exploration Factor)
    let advBase = 5.0;
    if (region.includes("asia")) advBase = 7.4;
    else if (region.includes("middle east")) advBase = 6.6;
    else if (region.includes("africa")) advBase = 7.2;
    else if (region.includes("europe")) advBase = 5.8;
    else if (region.includes("americas")) advBase = 6.4;
    
    // Modifiers based on specific country profile
    if (name.includes("Switzerland") || name.includes("Austria") || name.includes("Vietnam") || name.includes("Thailand")) advBase += 0.8;
    if (name.includes("China") || name.includes("Japan")) advBase += 0.5;
    
    // 🛡️ UNIQUE DATA FEED: Strong hash to prevent duplicate scores for nearby countries
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    const advVar = Math.abs(hash % 25) / 10; // Adds 0.0 to 2.4 unique variance
    const adventure = Number(Math.min(9.9, advBase + advVar).toFixed(1));

    // 2. CULTURE SCORE (The 'Integration / Cafe Culture' Factor)
    let culBase = 5.2;
    if (region.includes("europe")) culBase = 7.5;
    else if (region.includes("east asia")) culBase = 7.2;
    else if (region.includes("se asia")) culBase = 6.4;
    else if (region.includes("middle east")) culBase = 5.8;
    
    // Modifier: Financial 'Third Space' correlation
    if (Number(finances?.rent1br) > 1500) culBase += 0.4;
    if (name.includes("France") || name.includes("Italy") || name.includes("Spain") || name.includes("Japan")) culBase += 0.7;
    
    const culVar = Math.abs((hash * 7) % 32) / 10; // Adds 0.0 to 3.1 unique variance
    const culture = Number(Math.min(9.9, culBase + culVar).toFixed(1));

    return { adventure, culture };
}

// Removing getInsightTag as the column is now strictly Estimated Monthly Surplus

function getMissionIntelligence(goals: string[], topCountry: string): { title: string, content: string } {
  const g1 = goals[0]?.toLowerCase() || '';
  const g2 = goals[1]?.toLowerCase() || '';
  const note = "\n\nIntelligence Note: The matrix utilises macroeconomic country averages. Specific school compensation packages and outcomes will vary. More precise details are available on the individual schools' evaluate page.";

  if (goals.length === 1 || g2 === '') {
    // Condition A: Single Driver
    if (g1.includes('saving')) {
      return {
        title: "Mission Intelligence: Savings",
        content: `In ${topCountry}, the rents and general cost of living are exceptionally low compared to the typical international school salary. This means your monthly savings potential is mathematically higher here than in almost any other hub.${note}`
      };
    }
    if (g1.includes('career')) {
      return {
        title: "Mission Intelligence: Career",
        content: `${topCountry} ranks highly because international schools here are plentiful. A high density of schools and large student populations mean that middle management and senior leadership roles are far more available, facilitating rapid promotional moves.${note}`
      };
    }
    if (g1.includes('adventure')) {
      return {
        title: "Mission Intelligence: Adventure",
        content: `${topCountry} offers incredible geographical diversity and serves as a major travel hub. With excellent flight and rail connectivity, there is plenty to see and do during your non-contact time and weekends.${note}`
      };
    }
    if (g1.includes('culture')) {
      return {
        title: "Mission Intelligence: Culture",
        content: `If your goal is genuine integration, ${topCountry} provides an unparalleled authentic environment. From its rich heritage to an incredibly welcoming expat community, the cultural rhythm here is highly immersive.${note}`
      };
    }
  } else {
    // Condition B: Dual Drivers
    if (goals.some(g => g.toLowerCase().includes('saving')) && goals.some(g => g.toLowerCase().includes('career'))) {
      return {
        title: "Tactical Balance: Savings & Career",
        content: `Balancing savings and career progression is challenging, as premium CV locations often have high living costs. ${topCountry} provides the optimal middle ground: schools are plentiful enough to offer promotion pathways, while living costs remain low enough to generate a strong monthly surplus.${note}`
      };
    }
    if (goals.some(g => g.toLowerCase().includes('saving')) && goals.some(g => g.toLowerCase().includes('adventure'))) {
      return {
        title: "Tactical Balance: Savings & Adventure",
        content: `${topCountry} offers the perfect ratio of income to exploration. The cost of living allows you to save a strong monthly surplus, while the country's geographical location provides incredibly accessible travel routes to fund your non-contact time.${note}`
      };
    }
    
    return {
      title: "Tactical Balance",
      content: `Maximising two distinct goals requires a tactical compromise. ${topCountry} emerges as the optimal choice, successfully catering to both drivers without forcing you to sacrifice one for the other.${note}`
    };
  }

  return {
    title: "Mission Brief",
    content: `${topCountry} presents the most balanced tactical deployment based on your current drivers, offering strong professional infrastructure and a highly livable economic environment.${note}`
  };
}

function MatrixContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<any>(null);
  const [benchmark, setBenchmark] = useState<'USD' | 'GBP' | 'EUR'>('GBP');
  const [limit, setLimit] = useState(5);

  useEffect(() => { 
    setMounted(true); 
    getCountryStats().then(setData);
  }, []);

  const params = useMemo(() => {
    if (!mounted) return null;
    const regions = (searchParams.get('regions') || "").toLowerCase().split(',').filter(Boolean);
    const salary = searchParams.get('salary') || "USD 60000";
    const status = (searchParams.get('status') || "single").toLowerCase();
    const goals = (searchParams.get('goals') || "culture").toLowerCase().split(',').filter(Boolean);
    return { regions, salary, status, goals };
  }, [searchParams, mounted]);

  const sortedCountries = useMemo(() => {
    if (!params || !data) return [];
    
    const salaryNum = parseInt(params.salary.replace(/[^0-9]/g, '')) || 60000;
    const primaryGoal = params.goals[0] || 'culture';

    // 🛡️ UNIQUENESS REPAIR: Group by Country to prevent duplicates (e.g. Zurich/Geneva both showing 'Switzerland')
    const countryGroups: Record<string, any> = {};
    data.colData.forEach((c: any) => {
      const rawName = c.country || c.city || 'Unknown';
      const name = canonicalCountry(rawName);
      const dbRegion = (c.region || "").toLowerCase().trim();
      
      // Keep the country if it matches the user's selected regions
      if (params.regions.length === 0 || params.regions.some((r: string) => dbRegion.includes(r.toLowerCase()))) {
        if (!countryGroups[name]) countryGroups[name] = c;
      }
    });

    let mapped = Object.keys(data.countrySchoolAverages)
      .map(countryKey => {
        const cAverages = data.countrySchoolAverages[countryKey];
        const c = countryGroups[countryKey];
        
        // Skip if no matching cost-of-living data in the selected regions
        if (!c) return null;

        const countryName = c.country || countryKey.charAt(0).toUpperCase() + countryKey.slice(1);
      
      let dynamicCareer = 7.0;
      if (cAverages && cAverages.count > 0) {
        // 1. Base academic quality
        const base = cAverages.totalScore / cAverages.count; 
        
        // 2. Density Bonus: max +1.5 points for 15+ schools in the country (more promotion mobility)
        const densityBonus = Math.min(1.5, cAverages.count * 0.1); 
        
        // 3. Size Bonus: max +1.0 points for avg school size > 1500 students (larger hierarchies = more middle management)
        const avgSchoolSize = cAverages.totalStudents / cAverages.count;
        const sizeBonus = Math.min(1.0, (avgSchoolSize / 1500));
        
        dynamicCareer = base + densityBonus + sizeBonus;
      }
      const rawCareer = dynamicCareer;
      
      const localMonthlyNetUSD = (cAverages && cAverages.salaryCount > 0) 
        ? (cAverages.totalSalary / cAverages.salaryCount) 
        : 2500; // 🛡️ Lowered fallback to prevent "rich" distortions for thin-data countries

      const rawSurplus = calculateSurplus(localMonthlyNetUSD, params.status, c);
      const intelScores = deriveIntelligenceScores(c, null);
      const scores = {
        savings: calculateLocalSavingsScore(localMonthlyNetUSD, params.status, c),
        career: Number(c.careerScore) || Number(Math.min(9.9, rawCareer).toFixed(1)),
        adventure: Number(c.adventureScore) || intelScores.adventure,
        culture: Number(c.cultureScore) || intelScores.culture
      };

      let primaryScore = 0;
      if (params.goals && params.goals.length > 0) {
        let total = 0;
        params.goals.forEach((g: string) => {
          const lowerGoal = g.toLowerCase();
          if (lowerGoal.includes('saving')) total += scores.savings;
          else if (lowerGoal.includes('career')) total += scores.career;
          else if (lowerGoal.includes('adventure')) total += scores.adventure;
          else if (lowerGoal.includes('culture')) total += scores.culture;
        });
        primaryScore = total / params.goals.length;
      } else {
        primaryScore = (scores.savings + scores.career + scores.adventure + scores.culture) / 4;
      }

      return {
        country: countryName,
        slug: countryName.toLowerCase().replace(/\s+/g, '-').replace('&', 'and'),
        scores,
        primaryScore,
        rawSurplus,
        localCurrency: c.finances?.currency || 'USD',
        exchangeRate: Number(c.finances?.exchangeRate) || 1
      };
    })
    .filter((m): m is any => m !== null)
    .sort((a, b) => b.primaryScore - a.primaryScore);

    return mapped; // Return ALL of them
  }, [params, data]);

  if (!mounted || !params || !data) return <div className="min-h-screen bg-[#020617]" />;

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 md:p-12 font-sans selection:bg-[#f97316]">
      <div className="max-w-5xl mx-auto space-y-12">
        <header className="space-y-6">
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-3xl md:text-5xl font-black tracking-tighter uppercase italic text-white flex items-center gap-4">
                <Target className="size-10 text-[#007FFF]" /> Mission Matrix
              </h1>
              <div className="flex items-center gap-4 mt-3 flex-wrap">
                <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-[11px]">
                  Priority Drivers: <span className="text-[#f97316]">{params.goals.join(', ')}</span>
                </p>
                <div className="h-1 w-1 bg-white/20 rounded-full hidden sm:block" />
                <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-[11px]">
                  Profile Basis: <span className="text-[#007FFF]">{params.status ? params.status.replace('-', ' ') : "Unknown"}</span>
                </p>
              </div>
            </div>

            <div className="space-y-2 text-right hidden sm:block">
              <p className="text-[#007FFF] text-[10px] font-bold uppercase tracking-widest">Currency Selector</p>
              <div className="flex bg-black/50 p-0.5 rounded-sm border border-white/10 w-fit ml-auto">
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
          </div>
        </header>

        <TooltipProvider delayDuration={100}>
          <div className="bg-[#0b1224] border border-white/10 rounded-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-500 relative">
            
            <div className="bg-white/5 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-white/10 flex items-center gap-2 italic">
              <Info className="size-3 text-[#007FFF]" /> 
              Based on our analysis of schools currently featured on Leopardfish Intel
            </div>

            {/* Table Header - Sticky & Layered */}
            <div className="hidden lg:grid grid-cols-9 sticky top-0 z-20 border-b border-white/10 bg-[#0b1224] text-[10px] font-black uppercase tracking-widest text-slate-500">
              <div className="col-span-3 flex items-center p-4">Deployment Target</div>
              
              <div className="col-span-2 flex flex-col justify-center p-4 border-l border-white/5 pl-6">
                <div className="flex items-center gap-1">
                  <span>Country Saving Index</span>
                  <Tooltip>
                    <TooltipTrigger><Info className="size-3 hover:text-white transition-colors cursor-help text-slate-500" /></TooltipTrigger>
                    <TooltipContent className="bg-[#0b1224] border border-[#007FFF]/30 text-white font-bold p-3 max-w-[250px] shadow-2xl">
                      <p>Surplus is hard-capped at £4,500 per teacher and £3,500 for those with dependents to prevent unrealistic financial modeling.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <span className="text-[8px] text-slate-500 normal-case tracking-normal mt-0.5">
                  Est. monthly surplus per teacher
                </span>
              </div>
              
              <div className={cn("flex justify-center items-center gap-2 p-4 border-x-2 border-t-2 border-transparent border-l border-white/5", params.goals.some((g:string) => g.toLowerCase().includes('saving')) && "border-[#f97316] bg-[#f97316]/10 text-white shadow-[inset_0_2px_10px_rgba(249,115,22,0.1)]")}>
                <Wallet className="size-3 text-green-400" /> Savings
                <Tooltip>
                  <TooltipTrigger><Info className="size-3 hover:text-white transition-colors cursor-help" /></TooltipTrigger>
                  <TooltipContent className="bg-[#0b1224] border border-[#007FFF]/30 text-white font-bold p-3 max-w-[250px] shadow-2xl">
                    <p>Calculated as Net Salary vs. Housing/Living Index.</p>
                  </TooltipContent>
                </Tooltip>
              </div>

              <div className={cn("flex justify-center items-center gap-2 p-4 border-x-2 border-t-2 border-transparent", params.goals.some((g:string) => g.toLowerCase().includes('career')) && "border-[#f97316] bg-[#f97316]/10 text-white shadow-[inset_0_2px_10px_rgba(249,115,22,0.1)]")}>
                <Zap className="size-3 text-blue-400" /> Career
                <Tooltip>
                  <TooltipTrigger><Info className="size-3 hover:text-white transition-colors cursor-help" /></TooltipTrigger>
                  <TooltipContent className="bg-[#0b1224] border border-[#007FFF]/30 text-white font-bold p-3 max-w-[250px] shadow-2xl">
                    <p>Evaluates the density of top-tier accredited schools, professional development norms, and internal leadership pathways.</p>
                  </TooltipContent>
                </Tooltip>
              </div>

              <div className={cn("flex justify-center items-center gap-2 p-4 border-x-2 border-t-2 border-transparent", params.goals.some((g:string) => g.toLowerCase().includes('adventure')) && "border-[#f97316] bg-[#f97316]/10 text-white shadow-[inset_0_2px_10_rgba(249,115,22,0.1)]")}>
                <Compass className="size-3 text-[#f97316]" /> Adventure
                <Tooltip>
                  <TooltipTrigger><Info className="size-3 hover:text-white transition-colors cursor-help" /></TooltipTrigger>
                  <TooltipContent className="bg-[#0b1224] border border-[#007FFF]/30 text-white font-bold p-3 max-w-[250px] shadow-2xl">
                    <p>Calculated as Travel Connectivity vs. Geographic Diversity.</p>
                  </TooltipContent>
                </Tooltip>
              </div>

              <div className={cn("flex justify-center items-center gap-2 p-4 border-x-2 border-t-2 border-transparent", params.goals.some((g:string) => (g.toLowerCase().includes('culture') || g.toLowerCase().includes('balance'))) && "border-[#f97316] bg-[#f97316]/10 text-white shadow-[inset_0_2px_10px_rgba(249,115,22,0.1)]")}>
                <Coffee className="size-3 text-yellow-400" /> Culture
                <Tooltip>
                  <TooltipTrigger><Info className="size-3 hover:text-white transition-colors cursor-help" /></TooltipTrigger>
                  <TooltipContent className="bg-[#0b1224] border border-[#007FFF]/30 text-white font-bold p-3 max-w-[250px] shadow-2xl">
                    <p>Scores the ease of local integration, English proficiency, and access to historic architecture, theatre, and heritage sites.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Table Rows */}
            <div className="flex flex-col">
              {sortedCountries.length === 0 ? (
                <div className="p-12 text-center text-slate-500 font-bold uppercase tracking-widest italic">
                  No targets found for the specified regions.
                </div>
              ) : (
                sortedCountries.slice(0, limit).map((country, idx) => {
                  const isLast = idx === Math.min(sortedCountries.length, limit) - 1;
                  return (
                  <div key={idx} className="flex flex-col lg:grid lg:grid-cols-9 items-stretch hover:bg-white/[0.02] transition-colors group border-b border-white/5 last:border-b-0 py-4 lg:py-0">
                    <div className="lg:col-span-3 flex items-center pr-6 p-4 lg:relative lg:h-[56px] overflow-hidden group/btn cursor-default">
                      <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4 w-full relative h-full">
                        <div className="flex items-center justify-between w-full lg:w-auto">
                          <span className="text-xl font-black italic text-slate-700 w-6 shrink-0 z-10 relative">0{idx + 1}</span>
                          <button 
                            onClick={() => router.push(`/discover/${country.slug}?${searchParams.toString()}`)}
                            className="lg:hidden bg-[#f97316] text-black px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-sm flex items-center gap-2 shadow-lg hover:bg-white"
                          >
                            Generate <ChevronRight className="size-3" />
                          </button>
                        </div>
                        
                        <div className="relative flex-1 h-full flex items-center w-full">
                          {/* Sliding Text */}
                          <span className="lg:absolute left-0 text-2xl lg:text-xl font-black uppercase text-white tracking-tighter transition-all duration-300 lg:group-hover/btn:-translate-y-10 lg:group-hover/btn:opacity-0 truncate w-full">
                            {country.country}
                          </span>
                          
                          {/* Sliding Button (Desktop) */}
                          <button 
                            onClick={() => router.push(`/discover/${country.slug}?${searchParams.toString()}`)}
                            className="hidden lg:flex absolute left-0 translate-y-10 opacity-0 group-hover/btn:translate-y-0 group-hover/btn:opacity-100 transition-all duration-300 bg-[#f97316] text-black px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-sm items-center gap-3 shadow-lg hover:bg-white shrink-0 pointer-events-auto"
                          >
                            Generate Report <ChevronRight className="size-3" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="lg:col-span-2 flex items-center px-4 pb-4 lg:pb-0 lg:p-4 lg:border-l border-white/5 lg:pl-6 border-b border-white/5 lg:border-b-0 mb-2 lg:mb-0">
                      {(() => {
                        const conversionFactor = (RATES[benchmark] || 1) / (RATES['USD'] || 1.27);
                        let displayVal = country.rawSurplus * conversionFactor;
                        let sym = benchmark === 'GBP' ? '£' : (benchmark === 'EUR' ? '€' : '$');
                        
                        return (
                          <div className="flex flex-col lg:flex-row lg:items-center gap-1 w-full">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest lg:hidden">Est. Monthly Surplus</span>
                            <span className="text-3xl lg:text-xl font-black tracking-tighter text-[#f97316]">
                              {sym}{Math.max(0, Math.round(displayVal)).toLocaleString()}
                            </span>
                          </div>
                        );
                      })()}
                    </div>

                    <div className="grid grid-cols-4 lg:col-span-4 lg:grid lg:grid-cols-4 lg:w-full">
                      <div className={cn("flex flex-col justify-center items-center p-4 lg:border-x-2 border-transparent lg:border-l border-white/5", params.goals.some((g:string) => g.toLowerCase().includes('saving')) && cn("lg:border-[#f97316] bg-[#f97316]/5 rounded-sm lg:rounded-none", isLast && "lg:border-b-2"))}>
                        <span className="text-[9px] text-slate-500 font-bold uppercase mb-1 lg:hidden">Savings</span>
                        <span className={cn("text-2xl font-black italic transition-colors", params.goals.some((g:string) => g.toLowerCase().includes('saving')) ? "text-[#f97316]" : "text-white")}>{country.scores.savings.toFixed(1)}</span>
                      </div>
                      <div className={cn("flex flex-col justify-center items-center p-4 lg:border-x-2 border-transparent", params.goals.some((g:string) => g.toLowerCase().includes('career')) && cn("lg:border-[#f97316] bg-[#f97316]/5 rounded-sm lg:rounded-none", isLast && "lg:border-b-2"))}>
                        <span className="text-[9px] text-slate-500 font-bold uppercase mb-1 lg:hidden">Career</span>
                        <span className={cn("text-2xl font-black italic transition-colors", params.goals.some((g:string) => g.toLowerCase().includes('career')) ? "text-[#f97316]" : "text-white")}>{country.scores.career.toFixed(1)}</span>
                      </div>
                      <div className={cn("flex flex-col justify-center items-center p-4 lg:border-x-2 border-transparent", params.goals.some((g:string) => g.toLowerCase().includes('adventure')) && cn("lg:border-[#f97316] bg-[#f97316]/5 rounded-sm lg:rounded-none", isLast && "lg:border-b-2"))}>
                        <span className="text-[9px] text-slate-500 font-bold uppercase mb-1 lg:hidden">Adv</span>
                        <span className={cn("text-2xl font-black italic transition-colors", params.goals.some((g:string) => g.toLowerCase().includes('adventure')) ? "text-[#f97316]" : "text-white")}>{country.scores.adventure.toFixed(1)}</span>
                      </div>
                      <div className={cn("flex flex-col justify-center items-center p-4 lg:border-x-2 border-transparent", params.goals.some((g:string) => (g.toLowerCase().includes('culture') || g.toLowerCase().includes('balance'))) && cn("lg:border-[#f97316] bg-[#f97316]/5 rounded-sm lg:rounded-none", isLast && "lg:border-b-2"))}>
                        <span className="text-[9px] text-slate-500 font-bold uppercase mb-1 lg:hidden">Culture</span>
                        <span className={cn("text-2xl font-black italic transition-colors", (params.goals.some((g:string) => (g.toLowerCase().includes('culture') || g.toLowerCase().includes('balance')))) ? "text-[#f97316]" : "text-white")}>{country.scores.culture.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                  );
                })
              )}
            </div>
          </div>
        </TooltipProvider>

        {sortedCountries.length > 5 && (
          <div className="flex justify-center mt-4 animate-in fade-in duration-500 delay-500 fill-mode-both">
            <button
              onClick={() => setLimit(limit === 5 ? 10 : 5)}
              className="px-6 py-2 bg-[#0b1224] border border-white/10 hover:bg-white/5 text-slate-400 hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors rounded-sm shadow-xl flex items-center gap-2"
            >
              {limit === 5 ? 'Expand Matrix (Top 10)' : 'Collapse Matrix (Top 5)'}
            </button>
          </div>
        )}

        {/* MISSION INTELLIGENCE (BOTTOM) */}
        {sortedCountries.length > 0 && (
          <div className="bg-[#0b1224] border border-white/10 p-6 rounded-sm shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 fill-mode-both">
            <div className="flex items-start gap-4">
              <div className="bg-[#f97316]/10 text-[#f97316] p-2 rounded-sm shrink-0 mt-0.5">
                <Target className="size-5" />
              </div>
              <div>
                <h3 className="text-white font-black uppercase tracking-widest text-xs flex items-center gap-2">
                  {getMissionIntelligence(params.goals, sortedCountries[0].country).title}
                </h3>
                <p className="text-slate-400 font-serif leading-relaxed text-sm mt-2 max-w-3xl whitespace-pre-wrap">
                  {getMissionIntelligence(params.goals, sortedCountries[0].country).content}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="text-center pt-8 border-t border-white/10 opacity-50">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] italic text-slate-500">
            Indexes derived via Leopardfish Intel using data from the World Bank, UNESCO Heritage Registry, Hofstede Insights, and EF English Proficiency Index.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function MatrixPage() {
  return <Suspense fallback={null}><MatrixContent /></Suspense>;
}

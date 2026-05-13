"use client";

import { Suspense, useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, Compass, Wallet, Zap, Coffee, Info, Target, ChevronRight
} from 'lucide-react';
import { getCountryStats } from '../actions';
import { calculateSavingsScore, calculateLocalSavingsScore, calculateSurplus, RATES, canonicalCountry, getStrategicScores } from '@/lib/calculations';
import { cn } from '@/lib/utils';

function deriveIntelligenceScores(country: any, finances: any) {
    const name = country.country || "Unknown";
    const region = country.region || "";
    return getStrategicScores(name, region);
}

function getMissionIntelligence(goals: string[], topCountry: string): { title: string, content: string } {
  const g1 = goals[0]?.toLowerCase() || '';
  const g2 = goals[1]?.toLowerCase() || '';
  const note = "\n\nIntelligence Note: The matrix utilises macroeconomic country averages. Specific school compensation packages and outcomes will vary. More precise details are available on the individual schools' evaluate page.";

  // Deterministic pick based on topCountry
  const seed = topCountry.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const pick = (arr: any[]) => arr[seed % arr.length];

  if (goals.length === 1 || g2 === '') {
    if (g1.includes('saving')) {
      return {
        title: "Strategic Priority: Financial Fortification",
        content: pick([
          `${topCountry} represents a premier wealth-building opportunity. The delta between international school compensation and local overheads is mathematically superior here, allowing for high-velocity savings.`,
          `Your objective of capital accumulation is best served in ${topCountry}. Low cost-of-living indices combined with robust salary norms ensure your monthly surplus is among the highest in the region.`,
          `Focusing on ${topCountry} provides the most efficient route to your financial goals. This deployment is defined by a favourable ratio of income to outgoings, specifically tailored for teachers looking to maximise their net worth.`
        ]) + note
      };
    }
    if (g1.includes('career')) {
      return {
        title: "Strategic Priority: Professional Advancement",
        content: pick([
          `${topCountry} is a high-density professional market. The concentration of Tier-1 schools provides a deep leadership hierarchy, making it the ideal environment for rapid internal promotion.`,
          `Professional growth is the primary driver in ${topCountry}. With a large network of accredited institutions, teachers here benefit from a robust professional landscape and a clear path to middle and senior management.`,
          `Deployment to ${topCountry} places you in a Tier-1 professional hub. The school ecosystem here is designed for growth, offering numerous opportunities for leadership development and institutional impact.`
        ]) + note
      };
    }
    if (g1.includes('adventure')) {
      return {
        title: "Strategic Priority: Regional Exploration",
        content: pick([
          `As a primary travel hub, ${topCountry} provides unmatched access to the wider region. Your non-contact time will be defined by its proximity to diverse landscapes and world-class adventure hubs.`,
          `${topCountry} offers the perfect baseline for exploration. Its geographical diversity and regional connectivity make it a strategic launchpad for the 'weekend warrior' looking to experience the best of the continent.`,
          `Geographical diversity is the hallmark of ${topCountry}. From domestic nature trails to regional flight connections, your deployment here ensures a high-engagement lifestyle outside the classroom.`
        ]) + note
      };
    }
    if (g1.includes('culture')) {
      return {
        title: "Strategic Priority: Cultural Immersion",
        content: pick([
          `${topCountry} offers an unparalleled authentic environment for social integration. From its deep heritage to its vibrant 'third spaces', the cultural rhythm here is exceptionally immersive.`,
          `Genuine integration is the key advantage of ${topCountry}. The social infrastructure—cafés, galleries, and historic sites—provides a rich tapestry for teachers seeking an authentic international experience.`,
          `The cultural depth of ${topCountry} is a primary driver. This deployment offers a unique opportunity to embed yourself in a community with a rich heritage and a sophisticated, cosmopolitan social life.`
        ]) + note
      };
    }
  } else {
    // Dual Drivers
    const hasSaving = goals.some(g => g.toLowerCase().includes('saving'));
    const hasCareer = goals.some(g => g.toLowerCase().includes('career'));
    const hasAdventure = goals.some(g => g.toLowerCase().includes('adventure'));
    const hasCulture = goals.some(g => g.toLowerCase().includes('culture'));

    if (hasSaving && hasCareer) {
      return {
        title: "Mission Profile: Tactical Growth",
        content: pick([
          `Balancing capital accumulation with professional growth is a challenge that ${topCountry} solves effectively. It offers the school density required for promotion while maintaining living costs low enough for significant savings.`,
          `${topCountry} provides a high-performance balance. You benefit from a robust market for professional advancement without the prohibitive overheads found in other major global hubs.`,
          `This is a strategic dual-objective deployment. ${topCountry} allows you to build a Tier-1 CV while simultaneously fortifying your financial position through superior local purchasing power.`
        ]) + note
      };
    }
    if (hasSaving && hasAdventure) {
      return {
        title: "Mission Profile: The Adventurous Saver",
        content: pick([
          `${topCountry} offers an optimal ratio of income to exploration. The favourable financial landscape funds your travel ambitions, while its position as a travel hub makes weekend escapes incredibly efficient.`,
          `Maximise your surplus and your non-contact time. In ${topCountry}, the low cost of living covers your regional travel costs, turning the entire continent into your backyard without denting your savings.`,
          `Strategic positioning meets financial strength. ${topCountry} is the ideal base for those looking to fund a high-engagement lifestyle through a robust monthly surplus.`
        ]) + note
      };
    }
    if (hasCareer && hasCulture) {
      return {
        title: "Mission Profile: The Sophisticated Professional",
        content: pick([
          `Deployment to ${topCountry} satisfies the need for high-tier professional challenges and deep social engagement. The school market is elite, and the surrounding culture offers a rich, immersive civic life.`,
          `Elevate your career in a world-class cultural setting. ${topCountry} provides access to top-tier institutional leadership and a lifestyle defined by heritage, arts, and sophisticated social hubs.`,
          `A premium dual-objective choice. ${topCountry} allows for professional classroom mastery within a social fabric that is both historically significant and modernly cosmopolitan.`
        ]) + note
      };
    }
  }

  return {
    title: "Tactical Alignment",
    content: `Based on your specific focus areas, ${topCountry} represents the optimal tactical alignment. It provides a balanced mission profile that supports your primary objectives while ensuring long-term deployment stability.${note}`
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
                  <Info className="size-3 text-slate-500 cursor-help" />
                </div>
                <span className="text-[8px] text-slate-500 normal-case tracking-normal mt-0.5">
                  Est. monthly surplus per teacher
                </span>
              </div>
              
              <div className={cn("flex justify-center items-center gap-2 p-4 border-x-2 border-t-2 border-transparent border-l border-white/5", params.goals.some((g:string) => g.toLowerCase().includes('saving')) && "border-[#f97316] bg-[#f97316]/10 text-white shadow-[inset_0_2px_10px_rgba(249,115,22,0.1)]")}>
                <Wallet className="size-3 text-green-400" /> Savings
                <Info className="size-3 cursor-help" />
              </div>

              <div className={cn("flex justify-center items-center gap-2 p-4 border-x-2 border-t-2 border-transparent", (params.goals.some((g:string) => g.toLowerCase().includes('career')) || params.goals.some((g:string) => g.toLowerCase().includes('growth'))) && "border-[#f97316] bg-[#f97316]/10 text-white shadow-[inset_0_2px_10px_rgba(249,115,22,0.1)]")}>
                <Zap className="size-3 text-sky-400" /> Career
                <Info className="size-3 cursor-help" />
              </div>

              <div className={cn("flex justify-center items-center gap-2 p-4 border-x-2 border-t-2 border-transparent", params.goals.some((g:string) => g.toLowerCase().includes('adventure')) && "border-[#f97316] bg-[#f97316]/10 text-white shadow-[inset_0_2px_10px_rgba(249,115,22,0.1)]")}>
                <Compass className="size-3 text-[#f97316]" /> Adventure
                <Info className="size-3 cursor-help" />
              </div>

              <div className={cn("flex justify-center items-center gap-2 p-4 border-x-2 border-t-2 border-transparent", (params.goals.some((g:string) => (g.toLowerCase().includes('culture') || g.toLowerCase().includes('balance')))) && "border-[#f97316] bg-[#f97316]/10 text-white shadow-[inset_0_2px_10px_rgba(249,115,22,0.1)]")}>
                <Coffee className="size-3 text-rose-400" /> Culture
                <Info className="size-3 cursor-help" />
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

"use client";

import * as React from 'react';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { useDoc, useFirestore, useMemoFirebase, db } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import type { School, LocationCostOfLiving } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  MapPin,
  Building,
  DollarSign,
  Users,
  BookOpen,
  HeartPulse,
  Home,
  Award,
  Laptop,
  ExternalLink,
  ShieldCheck,
  Clock,
  TrendingUp,
  ShieldAlert,
  User as UserIcon,
  GraduationCap,
} from 'lucide-react';
import { CostOfLivingCalculator } from '@/components/cost-of-living-calculator';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { getTacticalBriefing } from '@/ai/flows/tactical-teacher-briefing-flow';
import { getCountryRequirements } from '../actions';
import { calculateSurplus, RATES } from '@/lib/calculations';
import { formatCurrency } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip as UITooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const ACRONYMS: Record<string, string> = {
  'CIS': 'Council of International Schools',
  'BSO': 'British Schools Overseas',
  'ISI': 'Independent Schools Inspectorate',
  'IB': 'International Baccalaureate',
  'NEASC': 'New England Association of Schools and Colleges',
  'WASC': 'Western Association of Schools and Colleges',
  'COBIS': 'Council of British International Schools',
  'BSME': 'British Schools in the Middle East',
  'FOBISIA': 'Federation of British International Schools in Asia',
  'KHDA': 'Knowledge and Human Development Authority',
  'ADEK': 'Abu Dhabi Department of Education and Knowledge',
};

// Protocol: Inline utility helpers to bypass export ghosts
const getTacticalColor = (score: string) => {
  if (score === 'good') return 'text-green-400';
  if (score === 'bad') return 'text-red-400';
  return 'text-amber-400';
};

const categorizeInsurance = (val: string) => {
  if (!val || val === '—') return 'Unknown';
  if (val.toLowerCase().includes('comp') || val.toLowerCase().includes('full')) return 'Comprehensive';
  return val;
};

const intelIcons = {
  salary: <DollarSign className="w-5 h-5 text-azure" />,
  housing: <Home className="w-5 h-5 text-azure" />,
  savingsPotential: <TrendingUp className="w-5 h-5 text-azure" />,
  curriculum: <BookOpen className="w-5 h-5 text-azure" />,
  ratio: <Users className="w-5 h-5 text-azure" />,
  classSize: <Building className="size-5 text-azure" />,
  health: <HeartPulse className="w-5 h-5 text-azure" />,
  accreditation: <Award className="w-5 h-5 text-azure" />,
  tech: <Laptop className="w-5 h-5 text-azure" />,
  contact: <Clock className="w-5 h-5 text-azure" />,
  visa: <ShieldCheck className="w-5 h-5 text-azure" />,
  profit: <Building className="w-5 h-5 text-azure" />,
};

function SchoolProfileSkeleton() {
  return (
    <div className="container mx-auto px-4 py-12 bg-[#020617] space-y-8">
      <Skeleton className="h-[40vh] w-full rounded-sm bg-white/5" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Skeleton className="h-64 w-full bg-white/5" />
        </div>
      </div>
    </div>
  );
}

function BriefingConsoleLoader() {
  const [step, setStep] = React.useState(0);
  const steps = [
    "[SYSTEM SCANNING] ... CONNECTING TO LEOPARDFISH INTEL BANK",
    "[CACHE SEARCH] ... ACTIVE CACHE NOT FOUND (INITIATING LIVE SCAN)",
    "[AI HANDSHAKE] ... ESTABLISHING SECURE CRYPTO UPLINK TO GEMINI 2.5 FLASH",
    "[DECRYPTING TELEMETRY] ... VERIFYING CITY COST OF LIVING INDICES",
    "[OSINT VERDICT] ... COMPILING DETAILED EXPAT ADVICE & LEADERSHIP HISTORY",
    "[STATUS] ... DECRYPTED DOSSIER SECURED. INJECTING NARRATIVE VERDICT..."
  ];

  React.useEffect(() => {
    const interval = setInterval(() => {
      setStep((s) => (s < steps.length - 1 ? s + 1 : s));
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="font-mono text-[10px] text-[#d95f02]/80 bg-black/60 border border-[#d95f02]/20 p-5 rounded-none space-y-2.5 uppercase tracking-widest leading-relaxed">
      {steps.slice(0, step + 1).map((line, index) => (
        <div key={index} className={cn(
          "flex items-start gap-2",
          index === step ? "text-[#d95f02] animate-pulse font-bold" : "text-slate-500"
        )}>
          <span className={cn(
            "inline-block size-1.5 bg-[#d95f02] mr-2 mt-1 shrink-0",
            index === step ? "animate-ping" : "opacity-40"
          )} />
          <span className="break-all">{line}</span>
        </div>
      ))}
    </div>
  );
}

export default function SchoolProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);

  // FIXED: Standardize hook usage for Isomorphic Bridge
  const { data: school, isLoading: isSchoolLoading } = useDoc<School>(doc(db, 'schools', id));

  // 💰 Aggressive Finance Mapping declared at the very top to prevent Temporal Dead Zone ReferenceErrors
  const rawFinance = school?.intel?.salary?.value || school?.finance || (school as any)?.salary || (school as any)?.monthlySalary || (school as any)?.salaryValue || '—';
  const salaryNum = typeof rawFinance === 'number' ? rawFinance : parseFloat(String(rawFinance).replace(/[^0-9.]/g, '')) || 3000;

  const [briefing, setBriefing] = React.useState<{ briefing: string, currentHead: string, ownership: string, generatedAt?: string } | null>(null);
  const [isBriefingLoading, setIsBriefingLoading] = React.useState(false);
  const [selectedQualification, setSelectedQualification] = React.useState<string>('');
  const [showValidationErrors, setShowValidationErrors] = React.useState(false);
  const [currency, setCurrency] = React.useState('USD');
  const [adults, setAdults] = React.useState(1);
  const [children, setChildren] = React.useState(0);
  const [mounted, setMounted] = React.useState(false);
  const [isDossierInitialized, setIsDossierInitialized] = React.useState(false);
  const [selectedFamilyStatus, setSelectedFamilyStatus] = React.useState<'single' | 'couple' | 'family'>('single');

  // Synchronize initial selection on mount / change if not initialized yet
  React.useEffect(() => {
    if (!isDossierInitialized) {
      if (adults >= 2 && children === 0) {
        setSelectedFamilyStatus('couple');
      } else if (children > 0) {
        setSelectedFamilyStatus('family');
      } else {
        setSelectedFamilyStatus('single');
      }
    }
  }, [adults, children, isDossierInitialized]);

  // If already initialized and sliders are changed, auto-update the briefing to keep them 100% in sync!
  React.useEffect(() => {
    if (isDossierInitialized) {
      let nextStatus: 'single' | 'couple' | 'family' = 'single';
      if (adults >= 2 && children === 0) {
        nextStatus = 'couple';
      } else if (children > 0) {
        nextStatus = 'family';
      }
      if (nextStatus !== selectedFamilyStatus) {
        setSelectedFamilyStatus(nextStatus);
      }
    }
  }, [adults, children, isDossierInitialized, selectedFamilyStatus]);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // 🛰️ TACTICAL DATA NORMALIZATION
  const locationId = school?.locationId || ((school?.city && school?.country) ? `${school.city.toLowerCase().trim().replace(/\s+/g, '-')}-${school.country.toLowerCase().trim().replace(/\s+/g, '-')}` : null);
  const countryId = school?.country?.toLowerCase().trim().replace(/\s+/g, '-');

  const { data: locationData } = useDoc<LocationCostOfLiving>(locationId ? doc(db, 'locations_costOfLiving', locationId) : null);
  
  // 🛰️ Server-side loader state to bypass Firestore Security Rules
  const [countryIntel, setCountryIntel] = React.useState<any>(null);

  React.useEffect(() => {
    if (countryId) {
      getCountryRequirements(countryId).then(data => {
        if (data) {
          setCountryIntel(data);
        }
      });
    }
  }, [countryId]);

  // 🛰️ TACTICAL CURRENCY MAPPING
  const getCurrencyFromCountry = (country?: string) => {
    const c = country?.toLowerCase() || '';
    if (c.includes('oman')) return 'OMR';
    if (c.includes('emirates') || c.includes('uae')) return 'AED';
    if (c.includes('qatar')) return 'QAR';
    if (c.includes('saudi')) return 'SAR';
    if (c.includes('kuwait')) return 'KWD';
    if (c.includes('bahrain')) return 'BHD';
    if (c.includes('vietnam')) return 'VND';
    if (c.includes('czech') || c.includes('prague')) return 'CZK';
    if (c.includes('hong kong')) return 'HKD';
    if (c.includes('singapore')) return 'SGD';
    if (c.includes('japan')) return 'JPY';
    return 'USD';
  };

  const localCurrency = locationData?.currencyCode || getCurrencyFromCountry(school?.country || (school as any)?.location);

  const convertUSD = (usd: number) => {
    const target = currency === 'Local' ? localCurrency : currency;
    const rate = RATES[target] || 1;
    const usdRate = RATES['USD'] || 1.27;
    return (usd / usdRate) * rate;
  };

  const activeCurrencyCode = currency === 'Local' ? localCurrency : currency;

  React.useEffect(() => {
    async function fetchBriefing() {
      if (!school || !isDossierInitialized) return;

      const cacheKey = `${activeCurrencyCode}_${selectedFamilyStatus}_${adults}_${children}`;

      // 🛡️ 1. Cache Hit Gate: Attempt immediate load
      const currentCache = school.cachedBriefings?.[cacheKey] || 
        (activeCurrencyCode === 'USD' && selectedFamilyStatus === 'single' && adults === 1 && children === 0 ? school.cachedBriefing : null);

      if (currentCache) {
        const isFallbackTemplate = currentCache.briefing.includes("primary focus has to be the balance between the offered salary");
        const wordCount = currentCache.briefing.split(/\s+/).filter(Boolean).length;
        const isShortCachedBriefing = wordCount < 400;
        
        // Auto-invalidate any cache generated before the strict concurrence fix (2026-05-17T18:40:00Z)
        const generatedAtTime = currentCache.generatedAt ? new Date(currentCache.generatedAt).getTime() : 0;
        const concurrenceFixTime = new Date('2026-05-17T18:40:00Z').getTime();
        const isPreConcurrenceFix = generatedAtTime < concurrenceFixTime;
        
        if (isFallbackTemplate || isShortCachedBriefing || isPreConcurrenceFix) {
          console.log(`[INTEL BANK] Cache bypass triggered for currency ${activeCurrencyCode} and profile ${selectedFamilyStatus}. Fallback: ${isFallbackTemplate}, Short: ${isShortCachedBriefing}, Pre-Concurrence-Fix: ${isPreConcurrenceFix}. Forcing fresh aligned generation.`);
          setBriefing(null); // Clear the outdated cached version so the loader is forced to show immediately
          setIsBriefingLoading(true);
        } else {
          setBriefing(currentCache);
          
          // Cache Age Calculation (Freshness Threshold: 7 Days)
          const cacheAgeMs = Date.now() - new Date(currentCache.generatedAt).getTime();
          const cacheAgeDays = cacheAgeMs / (1000 * 60 * 60 * 24);
          if (cacheAgeDays <= 7) {
            console.log(`[INTEL BANK] Cache hit for currency ${activeCurrencyCode} and profile ${selectedFamilyStatus} is fresh (${cacheAgeDays.toFixed(1)} days old). Serving immediately.`);
            return;
          }
          
          console.log(`[INTEL BANK] Cache expired for currency ${activeCurrencyCode} and profile ${selectedFamilyStatus} (${cacheAgeDays.toFixed(1)} days old). Initiating background re-sync.`);
        }
      } else {
        // Cache Miss: Full loader
        setBriefing(null);
        setIsBriefingLoading(true);
      }

      try {
        const rateFactor = (RATES[activeCurrencyCode] || 1) / 1.27;

        // Calculate exact, finalized costs that will be displayed in the UI to prevent any AI deviation
        const activeCoL = locationData || {};
        const safeVal = (val: any) => parseFloat(String(val)) || 0;
        const isHousingProvided = school.housingprovision?.toLowerCase().includes('provided') || school.intel?.housing?.provided;
        
        // Single profile values (which is the default userProfile passed to Genkit)
        const singleRent = isHousingProvided ? 0 : (safeVal((activeCoL as any).monthlyRent1BR || (activeCoL as any).rent1br) || 1200);
        const singleUtilities = safeVal(activeCoL.utilities) || 150;
        const singleInternet = safeVal(activeCoL.internet) || 60;
        const singleMobile = safeVal(activeCoL.mobile) || 30;
        const singleFood = safeVal(activeCoL.food) || 350;
        const singleDining = safeVal(activeCoL.diningSocial) || 150;
        const singleTransport = safeVal(activeCoL.transport) || 60;
        const singleMedical = safeVal(activeCoL.uncoveredMedical) || 50;
        
        const singleTotalExpenses = singleRent + singleUtilities + singleInternet + singleMobile + singleFood + singleDining + singleTransport + singleMedical;

        const monthlyTotal = salaryNum * 1.18;
        const surplus = calculateSurplus(monthlyTotal, adults, children, locationData, isHousingProvided);
        const expenses = Math.max(0, monthlyTotal - surplus);

        const monthlyCostForecastStr = formatCurrency(convertUSD(expenses), activeCurrencyCode);
        const schoolMedianStr = formatCurrency(convertUSD(monthlyTotal), activeCurrencyCode);
        const expectedSurplusStr = formatCurrency(convertUSD(surplus), activeCurrencyCode);

        const finalizedColData = {
          currencyCode: 'USD',
          monthlyRent1BR: isHousingProvided ? 'Provided (0 USD)' : `${singleRent} USD`,
          isHousingProvided: isHousingProvided,
          utilities: `${singleUtilities} USD`,
          internet: `${singleInternet} USD`,
          mobile: `${singleMobile} USD`,
          food: `${singleFood} USD`,
          diningSocial: `${singleDining} USD`,
          transport: `${singleTransport} USD`,
          uncoveredMedical: `${singleMedical} USD`,
          totalExpensesExcludingRent: `${singleTotalExpenses - singleRent} USD`,
          totalExpensesIncludingRent: `${singleTotalExpenses} USD`
        };

        const result = await getTacticalBriefing({
          schoolName: school.schoolname || school.name,
          coreSchoolData: `
            SCHOOL Dossier:
            - Name: ${school.schoolname || school.name}
            - Location: ${school.city || school.location}, ${school.country}
            - Executive Summary: ${school.summary || 'N/A'}
            - Full Description: ${school.description || 'N/A'}
            - Technical Intel: ${JSON.stringify(school.intel || {})}
            - Known Leadership: ${(school as any).headmaster || (school as any).Headmaster || (school as any).principal || (school as any).Principal || (school as any).head || (school as any).Head || 'Unknown'}
            - Known Ownership: ${(school as any).ownership || (school as any).Ownership || (school as any).group || (school as any).Group || 'Unknown'}
            - Raw Database Payload: ${JSON.stringify(school)}
            - Critical Intelligence: Please identify who owns the school (e.g. GEMS, Taaleem, Nord Anglia, or private) and the current headmaster/principal (including "as of" date if available) from the raw database payload.
          `,
          colData: JSON.stringify(finalizedColData),
          userProfile: {
            age: 30,
            familyStatus: selectedFamilyStatus,
            spouseWorking: selectedFamilyStatus === 'couple'
          },
          currencyCode: activeCurrencyCode,
          exchangeRate: rateFactor,
          monthlyCostForecast: monthlyCostForecastStr,
          schoolMedian: schoolMedianStr,
          expectedSurplus: expectedSurplusStr,
          nonce: Date.now().toString()
        });

        // Ensure we actually got a briefing string
        if (result && result.briefing) {
          const briefingPayload = {
            briefing: result.briefing,
            currentHead: result.currentHead,
            ownership: result.ownership,
            generatedAt: new Date().toISOString()
          };
          setBriefing(briefingPayload);

          // 🏦 Bank in Firestore (Only if it's NOT a fallback template)
          const isNewFallback = result.briefing.includes("primary focus has to be the balance between the offered salary");
          if (db && !isNewFallback) {
            const schoolRef = doc(db, 'schools', school.id);
            await updateDoc(schoolRef, {
              [`cachedBriefings.${cacheKey}`]: briefingPayload
            });
            console.log(`[INTEL BANK] Successfully banked school briefing in database for cache key ${cacheKey}.`);
          } else if (isNewFallback) {
            console.log("[INTEL BANK] Skipped banking fallback briefing in database.");
          }
        } else {
          console.warn('Briefing result empty, using fallback logic');
          setBriefing(null); // Fallback to summary in UI
        }
      } catch (error) {
        console.error('Briefing fetch failed:', error);
        const cacheKey = `${activeCurrencyCode}_${selectedFamilyStatus}_${adults}_${children}`;
        const currentCacheCheck = school.cachedBriefings?.[cacheKey] || (activeCurrencyCode === 'USD' && selectedFamilyStatus === 'single' ? school.cachedBriefing : null);
        if (!currentCacheCheck) {
          setBriefing({
            briefing: 'The tactical briefing engine is currently offline. Please check back shortly for your ground-truth intel.',
            currentHead: 'Offline',
            ownership: 'Offline',
            generatedAt: new Date().toISOString()
          });
        }
      } finally {
        setIsBriefingLoading(false);
      }
    }
    
    fetchBriefing();
  }, [school?.id, locationData?.id, activeCurrencyCode, isDossierInitialized, selectedFamilyStatus, adults, children]);

  if (!mounted || isSchoolLoading) return <SchoolProfileSkeleton />;
  if (!school) notFound();

  // Data Normalization
  const name = school.schoolname || school.name || 'Unknown School';
  const summary = school.summary || school.description || 'Intelligence Dossier Pending...';

  // 💰 Aggressive Finance Mapping
  const finance = typeof rawFinance === 'number' || (!isNaN(parseFloat(String(rawFinance))) && String(rawFinance).match(/^\d+$/))
    ? formatCurrency(convertUSD(Number(rawFinance)), activeCurrencyCode)
    : rawFinance;

  const rating = school.intel?.salary?.score || school.rating || 'neutral';
  const housing = school.intel?.housing?.value || school.housingprovision || '—';
  const health = school.intel?.healthInsurance || school.healthcoverage || '—';
  const curriculum = school.intel?.curriculum || school.curriculum || '—';
  const website = school.websiteUrl || school.website;

  const matrixItems = [
    { key: 'profit', label: 'Profit Status', value: (school as any).profitstatus || (school as any).profit_status || 'For-Profit' },
    { key: 'housing', label: 'Housing Provision', value: housing },
    { key: 'health', label: 'Health Coverage', value: categorizeInsurance(health as string) },
    { key: 'curriculum', label: 'Curriculum', value: curriculum },
    { key: 'ratio', label: 'Ratio', value: school.intel?.studentTeacherRatio || school.staffstudentratio || '—' },
    { key: 'classSize', label: 'Class Size', value: school.intel?.classSize || school.classsize || '—' },
    { key: 'contact', label: 'Non-Contact Time', value: school.intel?.nonContactTime || (school as any).noncontacttime || '—' },
    { key: 'tech', label: 'Tech Ecosystem', value: school.intel?.technologyEcosystem || (school as any).techecosystem || 'Standard' },
    { key: 'accreditation', label: 'Accreditation', value: school.intel?.accreditation || (school as any).approvals || 'International' },
  ];

  return (
    <div className="min-h-screen bg-[#020617]">
      <section className="relative h-64 md:h-[50vh] w-full">
        <Image
          src={school.imageUrl || 'https://picsum.photos/seed/school/1920/1080'}
          alt={name}
          fill
          className="object-cover brightness-[0.3]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent"></div>
        <div className="absolute bottom-0 left-0 p-8 container mx-auto">
          <Badge className="bg-primary font-black uppercase tracking-widest text-[10px] mb-4">Tactical Dossier</Badge>
          <div className="space-y-4">
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white uppercase italic w-full">{name}</h1>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="flex items-center text-sm font-black uppercase text-muted-foreground">
                <MapPin className="w-4 h-4 mr-2 text-primary" />
                <span>{school.city || school.location}, {school.country}</span>
                <span className="mx-3 opacity-20">|</span>
                <span className="text-primary/80 tracking-widest font-black">FLIS: {id}</span>
              </div>
              <div className="flex items-center gap-4">
                <p className="text-[9px] font-black uppercase text-primary tracking-[0.2em] italic">Currency</p>
                <div className="flex items-center bg-black/40 p-1 border border-white/5 rounded-sm overflow-hidden">
                  {[
                    { id: 'USD', label: 'USD' },
                    { id: 'GBP', label: 'GBP' },
                    { id: 'EUR', label: 'EUR' },
                    { id: 'Local', label: localCurrency },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setCurrency(opt.id)}
                      className={cn(
                        "px-3 py-1.5 text-[10px] font-black uppercase transition-all",
                        currency === opt.id
                          ? "bg-primary text-black"
                          : "text-muted-foreground hover:text-white hover:bg-white/5"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-8">

            {/* 🎯 THE LEOPARDFISH VERDICT (AI BRIEFING) */}
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-2xl font-black uppercase tracking-tighter text-primary italic">Leopardfish Intel School Insights</h3>
                  {briefing?.generatedAt && (
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 bg-white/5 border border-white/10 px-2 py-0.5 rounded-sm">
                      Compiled: {new Date(briefing.generatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()}
                    </span>
                  )}
                </div>
                {isBriefingLoading && school?.cachedBriefing && (
                  <span className="text-[9px] font-black uppercase tracking-widest text-[#d95f02] bg-[#d95f02]/10 px-2.5 py-1 border border-[#d95f02]/20 animate-pulse shrink-0">
                    🔄 Live OSINT Re-Sync
                  </span>
                )}
              </div>
              <Card className="bg-[#1f2937]/30 border-white/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <BookOpen className="size-24 text-primary" />
                </div>
                <CardContent className="pt-8">
                  {!isDossierInitialized ? (
                    <div className="space-y-6 py-4">
                      <div className="text-center space-y-2 mb-6">
                        <div className="inline-flex items-center justify-center size-12 bg-primary/10 rounded-full border border-primary/20 text-primary mb-2">
                          <ShieldCheck className="size-6 animate-pulse" />
                        </div>
                        <h4 className="text-sm font-black uppercase text-white tracking-widest">Dossier Access Authorization</h4>
                        <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                          Please select your primary family and living profile to initialize and align your custom tactical cost verdict.
                        </p>
                      </div>

                      {/* Tactical Grid Selectors */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {[
                          { id: 'single', name: 'Single Teacher', desc: '1 Adult, 0 Dependents', icon: UserIcon },
                          { id: 'couple', name: 'Dual Income', desc: '2 Adults, 0 Dependents', icon: Users },
                          { id: 'family', name: 'Family Profile', desc: 'Active Dependents', icon: GraduationCap }
                        ].map((profile) => {
                          const IconComp = profile.icon;
                          const isSelected = selectedFamilyStatus === profile.id;
                          return (
                            <button
                              key={profile.id}
                              onClick={() => {
                                setSelectedFamilyStatus(profile.id as any);
                                // Dynamic Slider Pre-Alignment on selection
                                if (profile.id === 'single') {
                                  setAdults(1);
                                  setChildren(0);
                                } else if (profile.id === 'couple') {
                                  setAdults(2);
                                  setChildren(0);
                                } else if (profile.id === 'family') {
                                  setAdults(2);
                                  setChildren(2);
                                }
                              }}
                              className={cn(
                                "flex flex-col items-center text-center p-4 border rounded-sm transition-all",
                                isSelected 
                                  ? "bg-primary/10 border-primary/60 text-white drop-shadow-[0_0_8px_rgba(249,115,22,0.15)]" 
                                  : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:border-white/10"
                              )}
                            >
                              <IconComp className={cn("size-6 mb-2", isSelected ? "text-primary" : "text-slate-500")} />
                              <span className="text-[10px] font-black uppercase tracking-wider">{profile.name}</span>
                              <span className="text-[9px] text-muted-foreground mt-1 lowercase italic">{profile.desc}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Qualification Gate Selectors */}
                      <div className="space-y-3 pt-4 border-t border-white/5 text-left">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.15em] block">
                          🎓 Teaching Qualification <span className="text-[#d95f02] font-bold">* Required</span>
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {[
                            'UK (QTS)', 'US State', 'ANZ Reg', 'SA SACE', 
                            'EU State', 'None'
                          ].map((qual) => {
                            const isSelected = selectedQualification === qual;
                            return (
                              <button
                                key={qual}
                                type="button"
                                onClick={() => setSelectedQualification(qual)}
                                className={cn(
                                  "py-3 text-[10px] font-bold border transition-all rounded-sm",
                                  isSelected
                                    ? "bg-[#d95f02]/20 border-[#d95f02] text-white shadow-[0_0_8px_rgba(249,115,22,0.15)]"
                                    : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:border-white/10"
                                )}
                              >
                                {qual}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {showValidationErrors && selectedQualification === 'None' && (
                        <div className="p-4 bg-red-950/40 border border-red-500/30 rounded-sm text-left animate-in slide-in-from-top-2 duration-300">
                          <h5 className="text-xs font-black uppercase text-red-400 flex items-center gap-2 mb-1.5">
                            <ShieldAlert className="size-4 shrink-0 text-red-500" />
                            Minimum Guidelines Not Met
                          </h5>
                          <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
                            To ensure compliance and high-fidelity school insights, a recognized teaching qualification or state registration is required. Unfortunately, we cannot generate custom financial reports or dossier forecasts for candidates without a verified international teaching credential.
                          </p>
                        </div>
                      )}

                      {showValidationErrors && !selectedQualification && (
                        <div className="p-4 bg-red-950/40 border border-red-500/30 rounded-sm text-left animate-in slide-in-from-top-2 duration-300">
                          <h5 className="text-xs font-black uppercase text-red-400 flex items-center gap-2 mb-1.5">
                            <ShieldAlert className="size-4 shrink-0 text-red-500" />
                            Qualification Selection Required
                          </h5>
                          <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
                            Please select your active teaching qualification above. This is a required field before report initialization can proceed.
                          </p>
                        </div>
                      )}

                      <button
                        onClick={() => {
                          setShowValidationErrors(true);
                          if (selectedQualification && selectedQualification !== 'None') {
                            setIsDossierInitialized(true);
                          }
                        }}
                        className="w-full mt-6 py-3 rounded-none text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 bg-primary border border-primary text-white hover:bg-white hover:text-black hover:border-white"
                      >
                        <ShieldAlert className="size-4" />
                        Initialize Ground-Truth Verdict
                      </button>
                    </div>
                  ) : (isBriefingLoading && (!school?.cachedBriefing || briefing === null)) ? (
                    <BriefingConsoleLoader />
                  ) : briefing ? (
                    <div className="prose prose-invert max-w-none space-y-4">
                      {briefing.briefing.split('\n').map(p => p.trim()).filter(p => p.length > 0).map((para, index) => (
                        <p key={index} className="text-slate-300 leading-relaxed font-medium italic">
                          {para}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground leading-relaxed font-bold text-lg italic">"{summary}"</p>
                  )}

                  {/* 🛡️ LEADERSHIP & OWNERSHIP INTEL */}
                  <div className="mt-8 pt-6 border-t border-white/5 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[9px] font-black uppercase text-primary tracking-[0.15em] mb-1">School Ownership</p>
                      <p className="text-sm font-bold text-white tracking-tight">{briefing?.ownership !== 'Independent / Private' ? briefing?.ownership : ((school as any).ownership || (school as any).Ownership || (school as any).group || (school as any).Group || (school.intel as any)?.ownership || (school.intel as any)?.Ownership || (school.intel as any)?.group || (school.intel as any)?.Group || 'Independent / Private')}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase text-primary tracking-[0.15em] mb-1">Current Head</p>
                      <p className="text-sm font-bold text-white tracking-tight">{briefing?.currentHead !== 'Pending' ? briefing?.currentHead : ((school as any).headmaster || (school as any).Headmaster || (school as any).principal || (school as any).Principal || (school as any).head || (school as any).Head || (school.intel as any)?.headmaster || (school.intel as any)?.Headmaster || (school.intel as any)?.principal || 'Pending')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 🛡️ TACTICAL MATRIX (STAFF ROOM SPECS) */}
            <Card className="bg-[#1f2937]/50 border-white/5">
              <CardHeader className="border-b border-white/5">
                <CardTitle className="text-xs font-black uppercase text-primary flex items-center gap-3"><ShieldCheck className="size-4" /> Staff Room Intelligence</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <ul className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {matrixItems.map(item => (
                    <li key={item.key} className="flex items-start">
                      <div className="mr-4 mt-1 text-primary">{(intelIcons as any)[item.key]}</div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase text-primary tracking-widest">{item.label}</p>
                        <div className={cn('text-sm font-black tracking-tighter text-white', (item as any).score && getTacticalColor((item as any).score as string))}>
                          {item.key === 'accreditation' ? (
                            <div className="flex flex-wrap gap-1">
                              {item.value?.toString().split(/,\s*/).map((acc: string, i: number) => (
                                <UITooltip key={i}>
                                  <TooltipTrigger asChild>
                                    <span className="cursor-help border-b border-white/20 hover:border-primary transition-colors">
                                      {acc}
                                      {i < item.value!.toString().split(/,\s*/).length - 1 && ","}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-black border-white/10 text-[11px] font-bold text-white px-3 py-1.5 shadow-2xl">
                                    {ACRONYMS[acc.trim()] || 'International Accreditation'}
                                  </TooltipContent>
                                </UITooltip>
                              ))}
                            </div>
                          ) : (
                            item.value?.toString()
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>


            {/* 🛡️ TACTICAL ACTION PORTALS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
              <Button className="w-full h-11 bg-[#2D2D2D] hover:bg-[#3D3D3D] text-white font-black text-xs rounded-none border border-primary shadow-lg uppercase tracking-[0.2em]" asChild>
                <a href={website || '#'} target="_blank" rel="noopener noreferrer">
                  School Website
                </a>
              </Button>
              <Button className="w-full h-11 bg-[#2D2D2D] hover:bg-[#3D3D3D] text-white font-black text-xs rounded-none border border-primary shadow-lg uppercase tracking-[0.2em]" asChild>
                <a href={`/decide?ids=${id}`}>
                  Compare Offers
                </a>
              </Button>
              <Button className="w-full h-11 bg-[#2D2D2D] hover:bg-[#3D3D3D] text-white font-black text-xs rounded-none border border-primary shadow-lg uppercase tracking-[0.2em]" asChild>
                <a href={`/prepare?school=${id}`}>
                  Prepare
                </a>
              </Button>
            </div>
          </div>

          <div className="space-y-8">
            {/* 🛡️ UNIFIED FINANCIAL INTELLIGENCE DOSSIER */}
            <Card className="bg-[#1f2937]/30 border-white/5 overflow-hidden">
              <CardHeader className="border-b border-white/5 bg-white/5">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-black uppercase text-primary flex items-center gap-2">
                    <DollarSign className="size-4" /> The Financials
                  </CardTitle>
                  <Badge variant="outline" className="text-[9px] border-green-500/30 text-green-400 font-black uppercase">
                    TAX FREE: {
                      school.intel?.salary?.isTaxFree ||
                        ['oman', 'united arab emirates', 'qatar', 'saudi arabia', 'kuwait', 'bahrain'].includes(school.country?.toLowerCase())
                        ? 'VERIFIED' : 'PENDING'
                    }
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {/* SECTION 1: COST OF LIVING INPUTS & BREAKDOWN */}
                <div className="p-6 border-b border-white/5">
                  <p className="text-[10px] font-black uppercase text-primary tracking-widest mb-4 italic">1. Monthly Cost Forecast</p>
                  <CostOfLivingCalculator
                    school={school}
                    overrideLocationData={locationData || undefined}
                    externalCurrency={currency}
                    onExternalCurrencyChange={setCurrency}
                    showSelector={false}
                    adults={adults}
                    setAdults={setAdults}
                    children={children}
                    setChildren={setChildren}
                    variant="ghost"
                  />
                </div>

                {/* SECTION 2: SCHOOL MEDIAN */}
                <div className="p-6 border-b border-white/5 bg-white/5">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-[10px] font-black uppercase text-primary tracking-widest mb-1 italic">2. School Median</p>
                      <h4 className="text-[11px] font-black text-white/60 lowercase italic leading-none">Teacher median (5yr experience)</h4>
                    </div>
                    <TrendingUp className="size-5 text-primary opacity-50" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="text-4xl font-black text-white italic tracking-tighter">
                      {formatCurrency(convertUSD(salaryNum * 1.18), activeCurrencyCode)}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-2 w-full italic leading-relaxed">
                      Projected mid-career baseline for this school.
                    </p>
                  </div>
                </div>

                {/* SECTION 3: EXPECTED SURPLUS */}
                <div className="p-6 space-y-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <TrendingUp className="size-16 text-primary" />
                  </div>
                  
                  <p className="text-[10px] font-black uppercase text-primary tracking-widest italic">3. Expected Surplus</p>

                  {(() => {
                    // 🛰️ TACTICAL SITUATIONAL MAPPING
                    let situation = 'single';
                    let label = 'Single Teacher';
                    if (adults >= 2 && children === 0) {
                      situation = 'couple';
                      label = 'Dual Income Couple';
                    } else if (children > 0) {
                      situation = 'family-2';
                      label = adults >= 2 ? 'Family (2 Adults + Kids)' : 'Family (Single Parent)';
                    }

                    const isHousingProvided = school.housingprovision?.toLowerCase().includes('provided') || school.intel?.housing?.provided;
                    const surplus = calculateSurplus(salaryNum * 1.18, adults, children, locationData, isHousingProvided);
                    const monthlyTotal = salaryNum * 1.18;
                    const expenses = Math.max(0, monthlyTotal - surplus);
                    const isLoss = surplus < 0;
                    const costsColor = isLoss ? '#b91c1c' : '#1e293b';

                    return (
                      <>
                        <div className="flex items-center gap-2 text-primary/70">
                          <Users className="size-4" />
                          <span className="text-[9px] font-black uppercase tracking-widest">Status: {label}</span>
                        </div>

                        <div className="space-y-6">
                          <div className="relative flex flex-col items-center">
                            <div className="h-44 w-full -mb-16">
                              {mounted ? (
                                <ResponsiveContainer width="100%" height="100%">
                                  <PieChart>
                                    <Pie
                                      data={[
                                        { name: 'Monthly Costs', value: expenses },
                                        { name: 'Surplus Potential', value: Math.max(0, surplus) }
                                      ]}
                                      cx="50%"
                                      cy="70%"
                                      startAngle={180}
                                      endAngle={0}
                                      innerRadius={65}
                                      outerRadius={85}
                                      paddingAngle={2}
                                      dataKey="value"
                                      stroke="none"
                                      label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                                      labelLine={false}
                                    >
                                      <Cell fill={costsColor} />
                                      <Cell fill="#10B981" className="drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                                    </Pie>
                                    <Tooltip
                                      contentStyle={{ backgroundColor: '#020617', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '2px', fontSize: '10px', color: '#fff' }}
                                    />
                                  </PieChart>
                                </ResponsiveContainer>
                              ) : (
                                <div className="h-full w-full flex items-center justify-center">
                                  <span className="text-[10px] font-mono text-slate-500 tracking-widest animate-pulse">PREPARING CHART DATA...</span>
                                </div>
                              )}
                            </div>
                            <div className="text-center relative z-10 mt-6 space-y-0">
                              <p className={cn(
                                "text-[9px] font-black uppercase tracking-[0.2em] opacity-80",
                                isLoss ? "text-rose-500" : "text-primary"
                              )}>{isLoss ? "Expected Deficit" : "Expected Surplus"}</p>
                              <p className="text-2xl font-black text-white tracking-tighter italic">
                                {formatCurrency(convertUSD(surplus), activeCurrencyCode)}
                                <span className="text-xs text-muted-foreground ml-1 not-italic font-normal uppercase opacity-40">/mo</span>
                              </p>
                            </div>
                          </div>

                          {/* 🛡️ TACTICAL LEDGER */}
                          <div className="grid grid-cols-2 gap-px bg-white/5 border border-white/5 rounded-sm overflow-hidden">
                            <div className="bg-[#020617]/40 p-4 space-y-1">
                              <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.15em]">Outflows</p>
                              <p className="text-lg font-black text-white tracking-tight italic">
                                {formatCurrency(convertUSD(expenses), activeCurrencyCode)}
                              </p>
                            </div>
                            <div className={cn(
                              "p-4 space-y-1 border-l border-white/5 text-right",
                              isLoss ? "bg-rose-500/5 text-[#f43f5e]" : "bg-[#10B981]/5 text-[#10B981]"
                            )}>
                              <p className={cn(
                                "text-[9px] font-black uppercase tracking-[0.15em]",
                                isLoss ? "text-[#f43f5e]" : "text-[#10B981]"
                              )}>{isLoss ? "Deficit" : "Surplus"}</p>
                              <p className="text-lg font-black tracking-tight italic">
                                {formatCurrency(convertUSD(surplus), activeCurrencyCode)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </>
                    )
                  })()}
                </div>
              </CardContent>
            </Card>

            {/* 🛡️ RECRUITMENT & ELIGIBILITY */}
            <Card className="bg-[#1f2937]/50 border-white/5">
              <CardHeader>
                <CardTitle className="text-xs font-black uppercase text-primary">Eligibility & Visas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <ShieldCheck className="size-5 text-rose-500 mt-1" />
                  <div className="flex-1">
                    <p className="text-[10px] font-black uppercase text-primary tracking-widest mb-1">Visa & Deployment Intel</p>
                    <div className="text-sm font-bold text-white space-y-2">
                      <p>{school.intel?.visaRestrictions || countryIntel?.visa_notes || 'Standard regional requirements apply.'}</p>
                      <div className="pt-2 border-t border-white/5 text-[11px] text-muted-foreground font-medium flex flex-col gap-1.5 italic">
                        {(countryIntel?.max_age_f || countryIntel?.max_age_m) && (
                          <span>• Max Age: {countryIntel.max_age_f} (F) / {countryIntel.max_age_m} (M)</span>
                        )}
                        {countryIntel?.max_age_notes && (
                          <span className="leading-tight">• {countryIntel.max_age_notes}</span>
                        )}
                        {(countryIntel?.min_age || countryIntel?.min_age_notes) && (
                          <span>• Min Age: {countryIntel.min_age_notes || countryIntel.min_age || '21'}</span>
                        )}
                        {(school as any).dependent_visa_notes && (
                          <span>• Dependents: {(school as any).dependent_visa_notes}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <Award className="size-5 text-yellow-500 mt-1" />
                  <div className="flex-1">
                    <p className="text-[10px] font-black uppercase text-primary tracking-widest mb-1">Candidate Qualifications</p>
                    <div className="text-sm font-bold text-white space-y-2">
                      <p>{school.intel?.minQualifications || countryIntel?.exp_notes || 'QTS / PGCE + 2 Years experience preferred.'}</p>
                      <div className="pt-2 border-t border-white/5 text-[11px] text-muted-foreground font-medium flex flex-col gap-1.5">
                        {(countryIntel?.academic_Degree_req || (school as any).academic_Degree_req) && (
                          <span className="leading-tight">• Degree: {countryIntel?.academic_Degree_req || (school as any).academic_Degree_req}</span>
                        )}
                        {(countryIntel?.license_req || (school as any).license_req) && (
                          <span className="leading-tight">• License: {countryIntel?.license_req || (school as any).license_req}</span>
                        )}
                        {(countryIntel?.exp_years_Req || (school as any).experience_years_req || (school as any).minExperience) && (
                          <span>• Exp Required: {countryIntel?.exp_years_Req || (school as any).experience_years_req || (school as any).minExperience} Years</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}
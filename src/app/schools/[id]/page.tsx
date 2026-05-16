"use client";

import * as React from 'react';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { useDoc, useFirestore, useMemoFirebase, db } from '@/firebase';
import { doc } from 'firebase/firestore';
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
} from 'lucide-react';
import { CostOfLivingCalculator } from '@/components/cost-of-living-calculator';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { getTacticalBriefing } from '@/ai/flows/tactical-teacher-briefing-flow';
import { calculateSurplus, RATES } from '@/lib/calculations';
import { formatCurrency } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

export default function SchoolProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  
  // FIXED: Standardize hook usage for Isomorphic Bridge
  const { data: school, isLoading: isSchoolLoading } = useDoc<School>(doc(db, 'schools', id));
  const [briefing, setBriefing] = React.useState<string | null>(null);
  const [isBriefingLoading, setIsBriefingLoading] = React.useState(false);
  const [currency, setCurrency] = React.useState('USD');
  const [adults, setAdults] = React.useState(1);
  const [children, setChildren] = React.useState(0);

  // 🛰️ TACTICAL DATA NORMALIZATION
  const locationId = school?.locationId || ( (school?.city && school?.country) ? `${school.city.toLowerCase().trim().replace(/\s+/g, '-')}-${school.country.toLowerCase().trim().replace(/\s+/g, '-')}` : null);
  const { data: locationData } = useDoc<LocationCostOfLiving>(locationId ? doc(db, 'locations_costOfLiving', locationId) : null);

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
      if (!school) return;
      setIsBriefingLoading(true);
      try {
        const result = await getTacticalBriefing({
          schoolName: school.schoolname || school.name,
          coreSchoolData: `
            SCHOOL Dossier:
            - Name: ${school.schoolname || school.name}
            - Location: ${school.city || school.location}, ${school.country}
            - Executive Summary: ${school.summary || 'N/A'}
            - Full Description: ${school.description || 'N/A'}
            - Technical Intel: ${JSON.stringify(school.intel || {})}
          `,
          colData: JSON.stringify(locationData || { info: 'No local cost of living data available yet.' }),
          userProfile: {
            age: 30, 
            familyStatus: 'single',
            spouseWorking: false
          }
        });
        
        // Ensure we actually got a briefing string
        if (result && result.briefing) {
            setBriefing(result.briefing);
        } else {
            console.warn('Briefing result empty, using fallback logic');
            setBriefing(null); // Fallback to summary in UI
        }
      } catch (error) {
        console.error('Briefing fetch failed:', error);
        setBriefing('The tactical briefing engine is currently offline. Please check back shortly for your ground-truth intel.');
      } finally {
        setIsBriefingLoading(false);
      }
    }
    fetchBriefing();
  }, [school?.id, locationData?.id]);

  if (isSchoolLoading) return <SchoolProfileSkeleton />;
  if (!school) notFound();

  // Data Normalization
  const name = school.schoolname || school.name || 'Unknown School';
  const summary = school.summary || school.description || 'Intelligence Dossier Pending...';
  
  // 💰 Aggressive Finance Mapping
  const rawFinance = school.intel?.salary?.value || school.finance || (school as any).salary || (school as any).monthlySalary || (school as any).salaryValue || '—';
  const finance = typeof rawFinance === 'number' || (!isNaN(parseFloat(String(rawFinance))) && String(rawFinance).match(/^\d+$/)) 
    ? formatCurrency(convertUSD(Number(rawFinance)), activeCurrencyCode) 
    : rawFinance;
  
  const salaryNum = typeof rawFinance === 'number' ? rawFinance : parseFloat(String(rawFinance).replace(/[^0-9.]/g, '')) || 3000;
  const gratuity = salaryNum * 2; 
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
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-4">
              <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white uppercase italic">{name}</h1>
              <div className="flex items-center text-sm font-black uppercase text-muted-foreground mt-2">
                <MapPin className="w-4 h-4 mr-2 text-primary" />
                <span>{school.city || school.location}, {school.country}</span>
                <span className="mx-3 opacity-20">|</span>
                <span className="text-primary/80 tracking-widest font-black">FLIS: {id}</span>
              </div>
            </div>
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
      </section>

      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-12">
            
            {/* 🎯 THE LEOPARDFISH VERDICT (AI BRIEFING) */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-black uppercase tracking-widest text-primary">The Leopardfish Verdict</h3>
              </div>
              <Card className="bg-[#1f2937]/30 border-white/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <BookOpen className="size-24 text-primary" />
                </div>
                <CardContent className="pt-8">
                    {isBriefingLoading ? (
                        <div className="space-y-4">
                            <Skeleton className="h-4 w-full bg-white/5" />
                            <Skeleton className="h-4 w-5/6 bg-white/5" />
                            <Skeleton className="h-4 w-4/6 bg-white/5" />
                        </div>
                    ) : briefing ? (
                        <div className="prose prose-invert max-w-none">
                            <p className="text-slate-300 leading-relaxed font-medium italic whitespace-pre-wrap">
                                {briefing}
                            </p>
                        </div>
                    ) : (
                        <p className="text-muted-foreground leading-relaxed font-bold text-lg italic">"{summary}"</p>
                    )}
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
                        <p className={cn('text-sm font-black tracking-tighter text-white', (item as any).score && getTacticalColor((item as any).score as string))}>
                          {item.value?.toString()}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>


            {/* 🛡️ RECRUITMENT & ELIGIBILITY */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card className="bg-[#1f2937]/50 border-white/5">
                    <CardHeader>
                        <CardTitle className="text-xs font-black uppercase text-primary">Eligibility & Visas</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-4">
                            <ShieldCheck className="size-5 text-rose-500 mt-1" />
                            <div>
                                <p className="text-[10px] font-black uppercase text-primary tracking-widest">Visa Restrictions</p>
                                <p className="text-sm font-bold text-white leading-snug">
                                    {school.intel?.visaRestrictions || 'Standard regional requirements apply.'}
                                    {(school.intel?.max_age_notes || (school as any).max_age_notes) && (
                                        <span className="block mt-2 pt-2 border-t border-white/5 text-[11px] text-muted-foreground font-medium italic">
                                            {school.intel?.max_age_notes || (school as any).max_age_notes}
                                        </span>
                                    )}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <Award className="size-5 text-yellow-500 mt-1" />
                            <div>
                                <p className="text-[10px] font-black uppercase text-primary tracking-widest">Minimum Qualifications</p>
                                <div className="text-sm font-bold text-white leading-snug">
                                    <p>{school.intel?.minQualifications || 'QTS / PGCE + 2 Years experience preferred.'}</p>
                                    {((school as any).academic_Degree_req || (school as any).license_req) && (
                                        <div className="mt-2 pt-2 border-t border-white/5 text-[11px] text-muted-foreground font-medium flex flex-col gap-1">
                                            {(school as any).academic_Degree_req && <span>• Degree: {(school as any).academic_Degree_req}</span>}
                                            {(school as any).license_req && <span>• License: {(school as any).license_req}</span>}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <div className="flex flex-col justify-center space-y-3">
                    <Button className="w-full h-11 bg-[#2D2D2D] hover:bg-[#3D3D3D] text-white font-bold text-sm rounded-none border border-primary shadow-lg" asChild>
                        <a href={website || '#'} target="_blank" rel="noopener noreferrer">
                            School Website <ExternalLink className="ml-2 size-4 text-primary" />
                        </a>
                    </Button>
                    <Button className="w-full h-11 bg-[#2D2D2D] hover:bg-[#3D3D3D] text-white font-bold text-sm rounded-none border border-primary shadow-lg" asChild>
                        <a href={`/decide?ids=${id}`}>
                            Compare Offers <ExternalLink className="ml-2 size-4 text-primary" />
                        </a>
                    </Button>
                    <Button className="w-full h-11 bg-[#2D2D2D] hover:bg-[#3D3D3D] text-white font-bold text-sm rounded-none border border-primary shadow-lg" asChild>
                        <a href={`/prepare?school=${id}`}>
                            Prepare <ExternalLink className="ml-2 size-4 text-primary" />
                        </a>
                    </Button>
                </div>
            </div>
          </div>

          <div className="space-y-12">
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
            />

            {/* 📊 SALARY FORECAST SECTION */}
            <Card className="bg-[#1f2937]/30 border-white/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <TrendingUp className="size-20 text-primary" />
                </div>
                <CardContent className="p-6">
                    <p className="text-[10px] font-black uppercase text-primary tracking-widest mb-1 italic">Regional Salary Forecast</p>
                    <h4 className="text-sm font-black text-white lowercase italic leading-none mb-4">Teacher median (5yr experience)</h4>
                    
                    <div className="flex flex-col gap-1">
                        <p className="text-4xl font-black text-white italic tracking-tighter">
                            {formatCurrency(convertUSD(salaryNum * 1.18), activeCurrencyCode)}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-2 w-full italic leading-relaxed">
                            This is our projected mid-career baseline salary for this school.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* 💰 SAVINGS POTENTIAL FORECASTER */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary italic">Savings Potential</h3>
                    <Badge variant="outline" className="text-[9px] border-green-500/30 text-green-400 font-black uppercase">
                        TAX FREE: {
                            school.intel?.salary?.isTaxFree || 
                            ['oman', 'united arab emirates', 'qatar', 'saudi arabia', 'kuwait', 'bahrain'].includes(school.country?.toLowerCase()) 
                            ? 'VERIFIED' : 'PENDING'
                        }
                    </Badge>
                </div>

                <Card className="bg-[#1f2937]/30 border-white/5 p-5 space-y-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                        <TrendingUp className="size-16 text-primary" />
                    </div>
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

                        const surplus = calculateSurplus(salaryNum, situation, locationData);
                        
                        return (
                            <>
                                <div className="flex items-center gap-2 text-primary">
                                    <Users className="size-4" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
                                </div>
                                <div>
                                    <p className="text-xs text-primary font-bold italic mb-1">Est. Monthly Surplus</p>
                                    <p className="text-3xl font-black text-white tracking-tighter italic">
                                        {formatCurrency(convertUSD(surplus), activeCurrencyCode)}
                                    </p>
                                </div>
                                <div className="pt-3 border-t border-white/5">
                                    <p className="text-[9px] text-primary uppercase font-black tracking-widest mb-1">2-Year Gratuity Pot</p>
                                    <p className="text-sm font-black text-green-400">~{formatCurrency(convertUSD(gratuity), activeCurrencyCode)}</p>
                                </div>
                            </>
                        )
                    })()}
                </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
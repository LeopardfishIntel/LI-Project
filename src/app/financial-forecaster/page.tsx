
"use client";

import { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { cn, formatCurrency } from '@/lib/utils';
import { 
  Calculator, 
  Award, 
  Pencil, 
  Users, 
  Loader2, 
  ShieldAlert, 
  LineChart, 
  Globe, 
  GraduationCap, 
  ExternalLink, 
  Home, 
  Utensils, 
  TramFront, 
  Zap, 
  Smartphone, 
  Wifi, 
  Medal, 
  Plus, 
  Banknote, 
  Info,
  Milestone,
  Sparkles,
  ServerCrash,
  TrendingUp,
  TrendingDown,
  Compass,
  AlertTriangle
} from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { School } from '@/lib/types';
import { Separator } from '@/components/ui/separator';
import { getOfferTacticalVerdict } from './actions';
import type { EvaluateOfferOutput } from '@/ai/flows/evaluate-offer-flow';

const noSpinners = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

const CONVERSION_RATES: Record<string, number> = {
  USD: 1,
  GBP: 0.78,
  EUR: 0.92,
  AED: 3.67,
  SGD: 1.34,
  AUD: 1.52,
};

const COUNTRY_TO_CURRENCY: Record<string, string> = {
  'Japan': 'JPY',
  'UAE': 'AED',
  'Switzerland': 'CHF',
  'Singapore': 'SGD',
  'South Korea': 'KRW',
  'United Kingdom': 'GBP',
  'Netherlands': 'EUR',
  'USA': 'USD',
};

const DecodedItem = ({ icon, label, value, currency, isFree }: { icon?: React.ReactNode, label: string, value: number, currency: string, isFree?: boolean }) => (
    <div className="flex justify-between items-center text-sm py-1.5 border-b border-white/5 last:border-0">
      <div className="flex items-center gap-3">
        {icon}
        <span className="text-muted-foreground font-medium">{label}</span>
      </div>
      <span className={cn("font-bold", isFree ? "text-green-400" : "text-white")}>
        {isFree ? "COVERED" : formatCurrency(value, currency)}
      </span>
    </div>
);

function ContractDecoderContent() {
  const firestore = useFirestore();
  const schoolsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'schools') : null),
    [firestore]
  );
  const { data: schools, isLoading: isLoadingSchools } = useCollection<School>(schoolsQuery);

  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [familyStatus, setFamilyStatus] = useState<string>('single');
  const [currency, setCurrency] = useState('USD');
  const [offeredSalary, setOfferedSalary] = useState('');
  const [responsibilityAllowance, setResponsibilityAllowance] = useState('');
  const [partnerSalary, setPartnerSalary] = useState('');
  const [homeCountryCommitment, setHomeCountryCommitment] = useState('');
  const [studentLoan, setStudentLoan] = useState('');
  const [contingency, setContingency] = useState('200');

  const [verdict, setVerdict] = useState<EvaluateOfferOutput | null>(null);
  const [isVerdictLoading, setIsVerdictLoading] = useState(false);

  const selectedSchool = useMemo(() => {
      if (!selectedSchoolId || !schools) return null;
      return schools.find(s => s.id === selectedSchoolId);
  }, [selectedSchoolId, schools]);

  const rate = CONVERSION_RATES[currency] || 1;

  const decodedCosts = useMemo(() => {
    if (!selectedSchool) return null;
    const col = selectedSchool.costOfLiving || {};
    const { intel } = selectedSchool;
    const multiplier = familyStatus === 'single' ? 1 : 1.6;
    const rentVal = Number(col.monthlyRent1BR || (col as any).apartment || 0);
    const food = (Number(col.food) || 0) * multiplier * rate;
    const transport = (Number(col.transport) || 0) * multiplier * rate;
    const utilities = (Number(col.utilities) || 0) * multiplier * rate;
    const internet = (Number(col.internet) || 0) * rate;
    const mobile = (Number(col.mobile) || 0) * multiplier * rate;
    const manualHome = (parseFloat(homeCountryCommitment) || 0) * rate;
    const contingencyVal = (parseFloat(contingency) || 0) * rate;
    
    const totalCosts = (intel.housing.provided ? 0 : rentVal * rate) + food + transport + utilities + internet + mobile + manualHome + contingencyVal;
    return { rent: rentVal * rate, food, transport, utilities, internet, mobile, totalCosts, manualHome, contingencyVal };
  }, [selectedSchool, familyStatus, contingency, homeCountryCommitment, rate]);

  const totalIncome = (parseFloat(offeredSalary) || 0) + (parseFloat(responsibilityAllowance) || 0) + (parseFloat(partnerSalary) || 0);
  const savingsPotential = totalIncome - (decodedCosts?.totalCosts || 0);

  // Autonomous SWOT Intelligence
  useEffect(() => {
    const triggerSWOT = async () => {
      if (!selectedSchool || totalIncome <= 0) return;
      setIsVerdictLoading(true);
      const result = await getOfferTacticalVerdict({
          schoolName: selectedSchool.name,
          location: selectedSchool.location,
          country: selectedSchool.country,
          monthlySavings: Math.round(savingsPotential),
          currency: currency,
          familyStatus: familyStatus
      });
      if (result.data) setVerdict(result.data);
      setIsVerdictLoading(false);
    };

    const timeout = setTimeout(triggerSWOT, 1500); // Slight delay to ensure user finished typing
    return () => clearTimeout(timeout);
  }, [selectedSchoolId, offeredSalary, familyStatus, responsibilityAllowance, partnerSalary]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Settings Column */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="glass border-primary/20 bg-background/40">
            <CardHeader><CardTitle className="text-xs font-black stamped-dossier text-primary/70">Operational settings</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Select school dossier</Label>
                <Select value={selectedSchoolId ?? ''} onValueChange={setSelectedSchoolId}>
                  <SelectTrigger className="bg-background/50 border-white/10 rounded-sm text-white font-bold h-11"><SelectValue placeholder="Search schools..." /></SelectTrigger>
                  <SelectContent className="glass">{schools?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Family scaling</Label>
                <Select value={familyStatus} onValueChange={setFamilyStatus}>
                  <SelectTrigger className="bg-background/50 border-white/10 rounded-sm text-white font-bold h-11"><SelectValue /></SelectTrigger>
                  <SelectContent className="glass">
                    <SelectItem value="single">Single</SelectItem>
                    <SelectItem value="couple">Couple</SelectItem>
                    <SelectItem value="family">Family (2+1)</SelectItem>
                    <SelectItem value="family2">Family (2+2)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-sm">
                <div className="text-[10px] text-primary-foreground/90 leading-relaxed font-medium">
                  <span className="font-bold text-destructive uppercase tracking-tighter flex items-center gap-1 mb-1.5"><ShieldAlert className="size-3" /> Due diligence</span>
                  Important! Enter net not gross pay. Check if the deduction total accounts for Social Security, pension, and all health, dental, and optical costs. If not add some extra to the contingency cost section below.
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Net monthly salary offer</Label>
                  <span className="text-[9px] font-black text-accent uppercase tracking-tighter">Suggested benchmark</span>
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Pencil className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input 
                      className={cn("pl-10 bg-background/50 border-white/10 rounded-sm h-11 text-right font-bold text-white", noSpinners)} 
                      type="number" 
                      placeholder="0" 
                      value={offeredSalary} 
                      onChange={(e) => setOfferedSalary(e.target.value)} 
                    />
                  </div>
                  <div className="w-24 px-3 flex items-center justify-center bg-background/50 border border-white/10 rounded-sm font-bold text-xs">{currency}</div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Responsibilities allowance (monthly)</Label>
                <div className="relative">
                  <Medal className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input 
                    className={cn("pl-10 bg-background/50 border-white/10 h-11 rounded-sm text-right font-bold text-white", noSpinners)} 
                    type="number" 
                    placeholder="0" 
                    value={responsibilityAllowance} 
                    onChange={(e) => setResponsibilityAllowance(e.target.value)} 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Partner monthly salary</Label>
                <div className="relative">
                  <Plus className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input 
                    className={cn("pl-10 bg-background/50 border-white/10 h-11 rounded-sm text-right font-bold text-white", noSpinners)} 
                    type="number" 
                    placeholder="0" 
                    value={partnerSalary} 
                    onChange={(e) => setPartnerSalary(e.target.value)} 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Student loan repayment (monthly)</Label>
                  <div className="flex gap-2 text-[9px] font-bold text-accent">
                    <span className="hover:underline cursor-pointer">UK</span>
                    <span className="hover:underline cursor-pointer">US</span>
                    <span className="text-primary hover:underline cursor-pointer flex items-center gap-1">Calculator <Calculator className="size-2" /></span>
                  </div>
                </div>
                <div className="relative">
                  <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input 
                    className={cn("pl-10 bg-background/50 border-white/10 h-11 rounded-sm text-right font-bold text-white", noSpinners)} 
                    type="number" 
                    placeholder="0" 
                    value={studentLoan} 
                    onChange={(e) => setStudentLoan(e.target.value)} 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Contingency buffer (monthly)</Label>
                <div className="relative">
                  <Milestone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input 
                    className={cn("pl-10 bg-background/50 border-white/10 h-11 rounded-sm text-right font-bold text-white", noSpinners)} 
                    type="number" 
                    placeholder="200" 
                    value={contingency} 
                    onChange={(e) => setContingency(e.target.value)} 
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Dashboard Area */}
        <div className="lg:col-span-8 space-y-8">
          {!selectedSchool ? (
            <div className="h-[600px] flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-sm text-muted-foreground bg-card/20">
              <LineChart className="w-16 h-16 mb-4 opacity-10" />
              <p className="stamped-dossier text-sm text-white/30 tracking-[0.2em]">Initialise school dossier to begin decoding</p>
            </div>
          ) : (
            <>
              <div className="grid md:grid-cols-2 gap-8">
                {/* Income Card */}
                <Card className="glass border-white/5 bg-background/40">
                  <CardHeader className="pb-4"><CardTitle className="text-[10px] font-black stamped-dossier text-primary flex items-center gap-2"><Award className="size-4" /> Income & Benefits</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b border-white/5">
                      <div className="flex items-center gap-3">
                        <Banknote className="size-4 text-green-400" />
                        <span className="text-sm text-muted-foreground font-medium">Monthly net salary</span>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg text-white">{formatCurrency(parseFloat(offeredSalary) || 0, currency)}</p>
                        {!offeredSalary && <p className="text-[8px] font-bold text-accent uppercase tracking-tighter">Benchmark applied</p>}
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-white/5">
                      <div className="flex items-center gap-3">
                        <Medal className="size-4 text-amber-400" />
                        <span className="text-sm text-muted-foreground font-medium">Responsibility allowance</span>
                      </div>
                      <span className="font-bold text-white">{formatCurrency(parseFloat(responsibilityAllowance) || 0, currency)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-white/5">
                      <div className="flex items-center gap-3">
                        <Plus className="size-4 text-sky-400" />
                        <span className="text-sm text-muted-foreground font-medium">Partner monthly salary</span>
                      </div>
                      <span className="font-bold text-white">{formatCurrency(parseFloat(partnerSalary) || 0, currency)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <div className="flex items-center gap-3">
                        <Home className="size-4 text-sky-400" />
                        <span className="text-sm text-muted-foreground font-medium">Housing arrangement</span>
                      </div>
                      <span className="font-bold text-white">{selectedSchool.intel.housing.provided ? "School provided" : "Teacher pays"}</span>
                    </div>
                    <Button variant="outline" className="w-full mt-4 h-10 border-accent/20 bg-accent/5 text-accent text-[10px] font-black uppercase tracking-widest rounded-sm flex items-center justify-between px-4">
                      <div className="flex items-center gap-2"><Calculator className="size-3.5" /> Global tax engine</div>
                      <Info className="size-3" />
                    </Button>
                  </CardContent>
                </Card>

                {/* Costs Card */}
                <Card className="glass border-white/5 bg-background/40">
                  <CardHeader className="pb-4"><CardTitle className="text-[10px] font-black stamped-dossier text-primary flex items-center gap-2"><Users className="size-4" /> Estimated costs</CardTitle></CardHeader>
                  <CardContent className="space-y-1">
                    <DecodedItem icon={<Home className="size-3.5 text-sky-400" />} label="Monthly rent (1BR)" value={decodedCosts?.rent || 0} currency={currency} isFree={selectedSchool.intel.housing.provided} />
                    <DecodedItem icon={<Utensils className="size-3.5 text-amber-400" />} label="Groceries (Scaled)" value={decodedCosts?.food || 0} currency={currency} />
                    <DecodedItem icon={<TramFront className="size-3.5 text-rose-400" />} label="Transport (Scaled)" value={decodedCosts?.transport || 0} currency={currency} />
                    <DecodedItem icon={<Zap className="size-3.5 text-yellow-400" />} label="Utilities (Scaled)" value={decodedCosts?.utilities || 0} currency={currency} />
                    <DecodedItem icon={<Smartphone className="size-3.5 text-pink-400" />} label="Mobile phone" value={decodedCosts?.mobile || 0} currency={currency} />
                    <DecodedItem icon={<Wifi className="size-3.5 text-indigo-400" />} label="Home internet (Fixed)" value={decodedCosts?.internet || 0} currency={currency} />
                    <InteractiveCostItem icon={<Globe className="size-3.5 text-blue-400" />} label="Home country commitment" value={homeCountryCommitment} currency={currency} onChange={setHomeCountryCommitment} />
                    <InteractiveCostItem icon={<Milestone className="size-3.5 text-purple-400" />} label="Contingency buffer" value={contingency} currency={currency} onChange={setContingency} />
                    
                    <div className="flex justify-between items-center pt-6 mt-4 border-t border-white/10">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Burn rate</span>
                      <span className="text-2xl font-black text-primary">{formatCurrency(decodedCosts?.totalCosts || 0, currency)}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* True Net Savings & SWOT Area */}
              <Card className={cn("glass border-2 rounded-sm p-8 shadow-2xl relative overflow-hidden transition-all duration-500", savingsPotential > 0 ? "border-green-500/30" : "border-destructive/30")}>
                <div className="space-y-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="space-y-1 text-center md:text-left">
                            <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">True net savings</h4>
                            <div className="flex items-baseline gap-1">
                                <span className={cn("text-6xl font-black tracking-tighter transition-all duration-500", savingsPotential > 0 ? "text-green-400" : "text-destructive")}>
                                  {formatCurrency(savingsPotential, currency)}
                                </span>
                                <span className="text-xl font-bold text-muted-foreground/50">/mo</span>
                            </div>
                        </div>
                        <div className="flex-1 max-w-sm text-sm text-muted-foreground leading-relaxed text-center md:text-left font-medium">The gap between your income and your cost of living.</div>
                        <Button className="bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest px-10 py-8 h-auto rounded-sm transition-all shadow-[0_0_30px_rgba(249,115,22,0.2)] hover:scale-105 active:scale-95" asChild><Link href="/compare">Compare offers</Link></Button>
                    </div>

                    {/* Secondary Conversions */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-8 border-t border-white/5">
                        {['GBP', 'USD', 'EUR', 'AUD'].map(ccy => {
                            const conv = (savingsPotential / rate) * (CONVERSION_RATES[ccy] || 1);
                            return (
                                <div key={ccy} className="space-y-1">
                                    <p className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-widest">{ccy}</p>
                                    <p className="text-lg font-bold text-white/90">{formatCurrency(conv, ccy)}</p>
                                </div>
                            )
                        })}
                    </div>

                    {/* Integrated SWOT Intelligence (Automatic) */}
                    <div className="pt-8 border-t border-white/5 space-y-6">
                        <div className="flex items-center gap-3">
                            <h3 className="text-sm stamped-dossier text-primary flex items-center gap-2">
                                <Sparkles className="size-4" /> Tactical SWOT verdict
                            </h3>
                            {isVerdictLoading && <Loader2 className="size-3 animate-spin text-primary" />}
                        </div>

                        {verdict ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                                <SWOTCard type="Strengths" content={verdict.strengths} icon={<TrendingUp className="size-3" />} color="green" />
                                <SWOTCard type="Weaknesses" content={verdict.weaknesses} icon={<TrendingDown className="size-3" />} color="amber" />
                                <SWOTCard type="Opportunities" content={verdict.opportunities} icon={<Compass className="size-3" />} color="accent" />
                                <SWOTCard type="Threats" content={verdict.threats} icon={<AlertTriangle className="size-3" />} color="destructive" />
                            </div>
                        ) : (
                            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3 opacity-30">
                                <Loader2 className="size-8 animate-spin text-primary" />
                                <p className="text-[10px] font-black uppercase tracking-widest">Uplinking to tactical engine...</p>
                            </div>
                        )}
                    </div>
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
  );
}

const InteractiveCostItem = ({ icon, label, value, currency, onChange }: { icon: React.ReactNode, label: string, value: string, currency: string, onChange: (val: string) => void }) => (
    <div className="flex justify-between items-center text-sm py-1.5 border-b border-white/5 last:border-0">
      <div className="flex items-center gap-3">
        {icon}
        <span className="text-muted-foreground font-medium">{label}</span>
      </div>
      <div className="relative w-28">
        <Input 
          className={cn("h-8 text-right bg-background/30 border-white/10 pr-10 text-xs focus:ring-1 focus:ring-primary/50 text-white font-bold rounded-sm", noSpinners)} 
          type="number"
          value={value}
          placeholder="0"
          onChange={(e) => onChange(e.target.value)}
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-black text-muted-foreground/50 uppercase">{currency}</span>
      </div>
    </div>
);

const SWOTCard = ({ type, content, icon, color }: { type: string, content: string, icon: React.ReactNode, color: string }) => {
    const colorMap: Record<string, string> = {
        green: "border-l-green-500/50 text-green-400",
        amber: "border-l-amber-500/50 text-amber-400",
        accent: "border-l-accent/50 text-accent",
        destructive: "border-l-destructive/50 text-destructive"
    };
    return (
        <div className={cn("glass p-5 rounded-sm border-l-4 space-y-3 bg-white/2 hover:bg-white/5 transition-colors", colorMap[color])}>
            <h4 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                {icon} {type}
            </h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">{content}</p>
        </div>
    );
};

export default function EvaluatePage() {
  return (
    <div className="container mx-auto px-4 md:px-6 py-12">
      <div className="mb-16 text-center">
        <h1 className="text-3xl md:text-5xl font-black tracking-tighter mb-4 text-white">2. Contract decoder</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto font-medium text-sm leading-relaxed uppercase tracking-widest opacity-60">Field-grade financial intelligence for your next move.</p>
      </div>
      <Suspense fallback={<div className="flex justify-center items-center py-24"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}><ContractDecoderContent /></Suspense>
    </div>
  );
}

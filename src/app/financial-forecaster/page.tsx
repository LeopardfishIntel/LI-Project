
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
  AlertTriangle,
  Target
} from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { School } from '@/lib/types';
import { Separator } from '@/components/ui/separator';
import { getOfferTacticalVerdict } from './actions';
import type { EvaluateOfferOutput } from '@/ai/flows/evaluate-offer-flow';
import { 
  Dialog, 
  DialogContent, 
  DialogTrigger, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';

const noSpinners = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

const CONVERSION_RATES: Record<string, number> = {
  USD: 1,
  GBP: 0.78,
  EUR: 0.92,
  AED: 3.67,
  QAR: 3.64,
  SAR: 3.75,
  SGD: 1.34,
  CHF: 0.88,
  JPY: 150,
  THB: 35,
  CNY: 7.2,
  KRW: 1350,
  HKD: 7.8,
  MYR: 4.7,
  VND: 25000,
  CZK: 23.5,
  AUD: 1.52,
  CAD: 1.36,
  ZAR: 18.4,
  NZD: 1.66,
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
  'Czech Republic': 'CZK',
  'Thailand': 'THB',
  'Vietnam': 'VND',
  'China': 'CNY',
  'Qatar': 'QAR',
  'Saudi Arabia': 'SAR',
  'Hong Kong': 'HKD',
  'Malaysia': 'MYR',
  'Spain': 'EUR',
  'Italy': 'EUR',
  'Germany': 'EUR',
  'France': 'EUR',
  'Australia': 'AUD',
  'Canada': 'CAD',
  'South Africa': 'ZAR',
  'New Zealand': 'NZD',
};

const ORDERED_CURRENCIES = [
  'USD', 'GBP', 'EUR',
  ...Object.keys(CONVERSION_RATES)
    .filter(c => !['USD', 'GBP', 'EUR'].includes(c))
    .sort()
];

const getAverageAnnualSalary = (salaryRange?: string): number => {
    if (!salaryRange) return 0;
    const cleanedRange = salaryRange.replace(/[\$,]/gi, '').trim();
    const numbers = cleanedRange.match(/\d+/g)?.map(Number);
    if (!numbers) return 0;
    const scale = cleanedRange.includes('k') ? 1000 : 1;
    if (numbers.length >= 2) return ((numbers[0] + numbers[1]) / 2) * scale;
    if (numbers.length === 1) return numbers[0] * scale;
    return 0;
};

const DecodedItem = ({ icon, label, value, currency, isFree }: { icon?: React.ReactNode, label: string, value: number, currency: string, isFree?: boolean }) => (
    <div className="flex justify-between items-center text-base py-2 border-b border-white/5 last:border-0">
      <div className="flex items-center gap-3">
        {icon}
        <span className="text-muted-foreground font-medium">{label}</span>
      </div>
      <span className={cn("font-bold", isFree ? "text-green-400" : "text-white")}>
        {isFree ? "Covered" : formatCurrency(value, currency)}
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
  const [verdictError, setVerdictError] = useState<string | null>(null);
  const [dateStamp, setDateStamp] = useState('');

  const selectedSchool = useMemo(() => {
      if (!selectedSchoolId || !schools) return null;
      return schools.find(s => s.id === selectedSchoolId);
  }, [selectedSchoolId, schools]);

  useEffect(() => {
    if (selectedSchool) {
      const autoCurrency = COUNTRY_TO_CURRENCY[selectedSchool.country];
      if (autoCurrency) setCurrency(autoCurrency);
      setVerdict(null); 
      setVerdictError(null);
    }
  }, [selectedSchool]);

  useEffect(() => {
    setDateStamp(new Date().toLocaleDateString('en-GB').replace(/\//g, '.'));
  }, []);

  const rate = CONVERSION_RATES[currency] || 1;

  const suggestedMonthlyLocal = useMemo(() => {
    if (!selectedSchool) return 0;
    const avgAnnualUSD = getAverageAnnualSalary(selectedSchool.intel.salary.value);
    const estNetMonthlyUSD = (avgAnnualUSD * 0.8) / 12;
    return estNetMonthlyUSD * rate;
  }, [selectedSchool, rate]);

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
    const manualLoan = (parseFloat(studentLoan) || 0) * rate;
    const contingencyVal = (parseFloat(contingency) || 0) * rate;
    
    const totalCosts = (intel.housing.provided ? 0 : rentVal * rate) + food + transport + utilities + internet + mobile + manualHome + manualLoan + contingencyVal;
    return { rent: rentVal * rate, food, transport, utilities, internet, mobile, totalCosts, manualHome, manualLoan, contingencyVal };
  }, [selectedSchool, familyStatus, contingency, homeCountryCommitment, studentLoan, rate]);

  const monthlySalaryToUse = offeredSalary ? parseFloat(offeredSalary) : suggestedMonthlyLocal;
  const responsibilityAllowanceNum = parseFloat(responsibilityAllowance) || 0;
  const partnerSalaryNum = parseFloat(partnerSalary) || 0;
  const totalIncome = (monthlySalaryToUse || 0) + responsibilityAllowanceNum + partnerSalaryNum;
  const savingsPotential = totalIncome - (decodedCosts?.totalCosts || 0);

  const handleGenerateVerdict = async () => {
    if (!selectedSchool || totalIncome <= 0) return;
    setIsVerdictLoading(true);
    setVerdictError(null);
    setVerdict(null);

    try {
      const result = await getOfferTacticalVerdict({
          schoolName: selectedSchool.name,
          location: selectedSchool.location,
          country: selectedSchool.country,
          monthlySavings: Math.round(savingsPotential),
          currency: currency,
          familyStatus: familyStatus
      });
      
      if (result.error) {
        setVerdictError(result.error);
      } else if (result.data) {
        setVerdict(result.data);
      }
    } catch (e: any) {
      setVerdictError(e.message || "Engine timeout. Please re-run protocol.");
    } finally {
      setIsVerdictLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-4 space-y-6">
          <Card className="glass border-primary/20 bg-background/40">
            <CardHeader><CardTitle className="text-sm font-bold text-primary/70">My evaluation</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="text-sm font-bold text-muted-foreground">Select school</Label>
                <Select value={selectedSchoolId ?? ''} onValueChange={setSelectedSchoolId}>
                  <SelectTrigger className="bg-background/50 border-white/10 rounded-sm text-white font-bold h-11"><SelectValue placeholder="Search schools..." /></SelectTrigger>
                  <SelectContent className="glass">{schools?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold text-muted-foreground">Family scaling</Label>
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
                <div className="text-sm text-primary-foreground/90 leading-relaxed font-medium">
                  <span className="font-bold text-destructive flex items-center gap-1 mb-1.5 text-xs"><ShieldAlert className="size-3.5" /> Due diligence</span>
                  Important! Enter net not gross pay. Check if the deduction total accounts for social security, pension, and all health, dental, and optical costs. If not add some extra to the contingency cost section below.
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <Label className="text-sm font-bold text-muted-foreground">Net monthly salary offer ({currency})</Label>
                  {suggestedMonthlyLocal > 0 && !offeredSalary && <span className="text-[11px] font-bold text-accent animate-pulse">Suggested benchmark</span>}
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Pencil className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input 
                      className={cn("pl-10 bg-background/50 border-white/10 rounded-sm h-11 text-right font-bold text-white", noSpinners)} 
                      type="number" 
                      placeholder={suggestedMonthlyLocal > 0 ? `${Math.round(suggestedMonthlyLocal)}` : "0"} 
                      value={offeredSalary} 
                      onChange={(e) => setOfferedSalary(e.target.value)} 
                    />
                  </div>
                  <div className="w-24 px-3 flex items-center justify-center bg-background/50 border border-white/10 rounded-sm font-bold text-sm">{currency}</div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold text-muted-foreground">Responsibilities allowance ({currency})</Label>
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
                <Label className="text-sm font-bold text-muted-foreground">Other income ({currency})</Label>
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
                  <Label className="text-sm font-bold text-muted-foreground">Student loan repayment ({currency})</Label>
                  <div className="flex gap-3 text-[11px] font-bold text-accent">
                    <button className="hover:text-white transition-colors">UK Calculator</button>
                    <button className="hover:text-white transition-colors">US Calculator</button>
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
                <Label className="text-sm font-bold text-muted-foreground">Contingency buffer ({currency})</Label>
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

        <div className="lg:col-span-8 space-y-8">
          {!selectedSchool ? (
            <div className="h-[600px] flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-sm text-muted-foreground bg-card/20">
              <LineChart className="w-16 h-16 mb-4 opacity-10" />
              <p className="text-base text-white/30 font-medium">Initialise school dossier to begin decoding</p>
            </div>
          ) : (
            <>
              <div className="grid md:grid-cols-2 gap-8">
                <Card className="glass border-white/5 bg-background/40">
                  <CardHeader className="pb-4"><CardTitle className="text-xs font-bold text-primary flex items-center gap-2"><Award className="size-4" /> Income & benefits</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b border-white/5">
                      <div className="flex items-center gap-3">
                        <Banknote className="size-4 text-green-400" />
                        <span className="text-base text-muted-foreground font-medium">Monthly net salary</span>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-xl text-white">{formatCurrency(monthlySalaryToUse, currency)}</p>
                        {!offeredSalary && <p className="text-[10px] font-bold text-accent">Benchmark applied</p>}
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-white/5">
                      <div className="flex items-center gap-3">
                        <Medal className="size-4 text-amber-400" />
                        <span className="text-base text-muted-foreground font-medium">Responsibility allowance</span>
                      </div>
                      <span className="font-bold text-white text-base">{formatCurrency(responsibilityAllowanceNum, currency)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-white/5">
                      <div className="flex items-center gap-3">
                        <Plus className="size-4 text-sky-400" />
                        <span className="text-base text-muted-foreground font-medium">Other income</span>
                      </div>
                      <span className="font-bold text-white text-base">{formatCurrency(partnerSalaryNum, currency)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <div className="flex items-center gap-3">
                        <Home className="size-4 text-sky-400" />
                        <span className="text-base text-muted-foreground font-medium">Housing arrangement</span>
                      </div>
                      <span className="font-bold text-white text-base">{selectedSchool.intel.housing.provided ? "School provided" : "Teacher pays"}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass border-white/5 bg-background/40">
                  <CardHeader className="pb-4"><CardTitle className="text-xs font-bold text-primary flex items-center gap-2"><Users className="size-4" /> Estimated costs</CardTitle></CardHeader>
                  <CardContent className="space-y-1">
                    <DecodedItem icon={<Home className="size-4 text-sky-400" />} label="Monthly rent (1BR)" value={decodedCosts?.rent || 0} currency={currency} isFree={selectedSchool.intel.housing.provided} />
                    <DecodedItem icon={<Utensils className="size-4 text-amber-400" />} label="Groceries (Scaled)" value={decodedCosts?.food || 0} currency={currency} />
                    <DecodedItem icon={<TramFront className="size-4 text-rose-400" />} label="Transport (Scaled)" value={decodedCosts?.transport || 0} currency={currency} />
                    <DecodedItem icon={<Zap className="size-4 text-yellow-400" />} label="Utilities (Scaled)" value={decodedCosts?.utilities || 0} currency={currency} />
                    <DecodedItem icon={<Smartphone className="size-4 text-pink-400" />} label="Mobile phone" value={decodedCosts?.mobile || 0} currency={currency} />
                    <DecodedItem icon={<Wifi className="size-4 text-indigo-400" />} label="Home internet (Fixed)" value={decodedCosts?.internet || 0} currency={currency} />
                    <DecodedItem icon={<Globe className="size-4 text-blue-400" />} label="Home commitments" value={decodedCosts?.manualHome || 0} currency={currency} />
                    <DecodedItem icon={<GraduationCap className="size-4 text-emerald-400" />} label="Student loans" value={decodedCosts?.manualLoan || 0} currency={currency} />
                    
                    <div className="flex justify-between items-center pt-6 mt-4 border-t border-white/10">
                      <span className="text-[11px] font-bold text-white">Burn rate</span>
                      <span className="text-3xl font-bold text-primary">{formatCurrency(decodedCosts?.totalCosts || 0, currency)}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className={cn("glass border-2 rounded-sm p-8 shadow-2xl relative overflow-hidden transition-all duration-500", savingsPotential > 0 ? "border-green-500/30" : "border-destructive/30")}>
                <div className="space-y-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="space-y-1 text-center md:text-left">
                            <h4 className="text-sm font-bold text-muted-foreground">True net savings</h4>
                            <div className="flex items-baseline gap-1">
                                <span className={cn("text-6xl font-bold tracking-tighter transition-all duration-500", savingsPotential > 0 ? "text-green-400" : "text-destructive")}>
                                  {formatCurrency(savingsPotential, currency)}
                                </span>
                                <span className="text-2xl font-bold text-muted-foreground/50">/mo</span>
                            </div>
                        </div>
                        <div className="flex-1 max-sm text-base text-muted-foreground leading-relaxed text-center md:text-left font-medium">The gap between your income and your cost of living.</div>
                        <Button className="bg-primary hover:bg-primary/90 text-white font-bold px-10 py-8 h-auto rounded-sm transition-all shadow-[0_0_30px_rgba(249,115,22,0.2)] hover:scale-105 active:scale-95 text-sm" asChild><Link href="/compare">Compare offers</Link></Button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-8 border-t border-white/5">
                        {['GBP', 'USD', 'EUR', 'AUD'].map(ccy => {
                            const conv = (savingsPotential / rate) * (CONVERSION_RATES[ccy] || 1);
                            return (
                                <div key={ccy} className="space-y-1">
                                    <p className="text-[11px] font-bold text-muted-foreground/60 uppercase">{ccy}</p>
                                    <p className="text-xl font-bold text-white/90">{formatCurrency(conv, ccy)}</p>
                                </div>
                            )
                        })}
                    </div>

                    <div className="pt-8 border-t border-white/5 space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                            <h3 className="text-base text-primary flex items-center gap-2 font-bold">
                                <Sparkles className="size-4" /> Leopardfish Intel evaluation
                            </h3>
                            {dateStamp && (
                                <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest border border-white/5 px-2 py-0.5 rounded-sm w-fit">
                                    Date stamp: {dateStamp}
                                </span>
                            )}
                            {!verdict && !isVerdictLoading && (
                                <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={handleGenerateVerdict}
                                    className="h-8 text-[10px] font-black uppercase tracking-widest border-primary/30 text-primary hover:bg-primary/10"
                                >
                                    <Sparkles className="size-3 mr-2" />
                                    Run SWOT protocol
                                </Button>
                            )}
                            {isVerdictLoading && <Loader2 className="size-3 animate-spin text-primary" />}
                        </div>

                        {verdictError && (
                            <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-sm flex items-start gap-3">
                                <ServerCrash className="size-4 text-destructive shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                    <p className="text-xs font-bold text-destructive">Uplink failure</p>
                                    <p className="text-xs text-muted-foreground">{verdictError}</p>
                                </div>
                            </div>
                        )}

                        {verdict ? (
                            <div className="space-y-6 pt-2 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                                <div className="flex items-center justify-between glass p-6 rounded-sm border-primary/20 bg-primary/5">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-primary/10 rounded-full">
                                            <Target className="size-6 text-primary" />
                                        </div>
                                        <div>
                                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Tactical Offer Score</h4>
                                            <p className="text-sm font-bold text-white">Based on universal international teacher expectations</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-5xl font-black text-primary tracking-tighter">{verdict.overallScore.toFixed(1)}</span>
                                        <span className="text-xl font-bold text-muted-foreground/40">/10</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <SWOTCard type="Strengths" content={verdict.strengths} icon={<TrendingUp className="size-3.5" />} color="green" />
                                    <SWOTCard type="Weaknesses" content={verdict.weaknesses} icon={<TrendingDown className="size-3.5" />} color="amber" />
                                    <SWOTCard type="Opportunities" content={verdict.opportunities} icon={<Compass className="size-3.5" />} color="accent" />
                                    <SWOTCard type="Threats" content={verdict.threats} icon={<AlertTriangle className="size-3.5" />} color="destructive" />
                                </div>
                            </div>
                        ) : isVerdictLoading ? (
                            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3 opacity-30">
                                <Loader2 className="size-8 animate-spin text-primary" />
                                <p className="text-sm font-bold">Uplinking to tactical engine...</p>
                            </div>
                        ) : null}
                    </div>
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
  );
}

const SWOTCard = ({ type, content, icon, color }: { type: string, content: string, icon: React.ReactNode, color: string }) => {
    const colorMap: Record<string, string> = {
        green: "border-l-green-500/50 text-green-400",
        amber: "border-l-amber-500/50 text-amber-400",
        accent: "border-l-accent/50 text-accent",
        destructive: "border-l-destructive/50 text-destructive"
    };
    return (
        <div className={cn("glass p-6 rounded-sm border-l-4 space-y-3 bg-white/2 hover:bg-white/5 transition-colors", colorMap[color])}>
            <h4 className="text-sm font-bold flex items-center gap-2">
                {icon} {type}
            </h4>
            <p className="text-[13px] text-muted-foreground leading-relaxed font-medium">{content}</p>
        </div>
    );
};

export default function EvaluatePage() {
  return (
    <div className="container mx-auto px-4 md:px-6 py-12">
      <div className="mb-16 text-center">
        <h1 className="text-3xl md:text-5xl font-bold tracking-tighter mb-4 text-white">2. Contract decoder</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto font-medium text-base leading-relaxed tracking-widest opacity-60">Field-grade financial intelligence for your next move.</p>
      </div>
      <Suspense fallback={<div className="flex justify-center items-center py-24"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}><ContractDecoderContent /></Suspense>
    </div>
  );
}

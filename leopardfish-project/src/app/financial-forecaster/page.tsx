
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
import { getRentForFamily, getFamilyScalingMultiplier, type FamilyStatus } from '@/lib/rent-calculator';
import type { School } from '@/lib/types';
import { Separator } from '@/components/ui/separator';
import { 
  Dialog, 
  DialogContent, 
  DialogTrigger, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { getOfferTacticalVerdict } from './actions';
import type { EvaluateOfferOutput } from '@/ai/flows/evaluate-offer-flow';

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
};

const ORDERED_CURRENCIES = [
  'USD', 'GBP', 'EUR',
  ...Object.keys(CONVERSION_RATES)
    .filter(c => !['USD', 'GBP', 'EUR'].includes(c))
    .sort()
];

const DecodedItem = ({ icon, label, value, currency, isFree }: { icon?: React.ReactNode, label: string, value: number, currency: string, isFree?: boolean }) => (
    <div className="flex justify-between items-center text-sm py-0.5">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-muted-foreground font-medium">{label}</span>
      </div>
      <span className={cn("font-bold", isFree ? "text-green-400" : "text-white")}>
        {isFree ? "COVERED" : formatCurrency(value, currency)}
      </span>
    </div>
);

const InteractiveCostItem = ({ icon, label, value, currency, onChange }: { 
    icon: React.ReactNode, 
    label: string, 
    value: string, 
    currency: string, 
    onChange: (val: string) => void 
}) => (
    <div className="flex justify-between items-center text-sm py-1">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-muted-foreground font-medium">{label}</span>
      </div>
      <div className="relative w-32">
        <Input 
          className={cn("h-7 text-right bg-background/30 border-white/5 pr-10 text-xs focus:ring-1 focus:ring-primary/50 text-white font-bold", noSpinners)} 
          type="number"
          value={value}
          placeholder="0"
          onChange={(e) => onChange(e.target.value)}
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-muted-foreground uppercase">{currency}</span>
      </div>
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
  const [familyStatus, setFamilyStatus] = useState<FamilyStatus>('single');
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

  const selectedSchool = useMemo(() => {
      if (!selectedSchoolId || !schools) return null;
      return schools.find(s => s.id === selectedSchoolId);
  }, [selectedSchoolId, schools]);

  useEffect(() => {
    if (selectedSchool) {
      const autoCurrency = COUNTRY_TO_CURRENCY[selectedSchool.country];
      if (autoCurrency) setCurrency(autoCurrency);
      setVerdict(null); 
    }
  }, [selectedSchool]);

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
    const multiplier = getFamilyScalingMultiplier(familyStatus);
    const { rent, label: rentLabel } = getRentForFamily(col, familyStatus);
    const food = (Number(col.food) || 0) * multiplier * rate;
    const transport = (Number(col.transport) || 0) * multiplier * rate;
    const utilities = (Number(col.utilities) || 0) * multiplier * rate;
    const internet = (Number(col.internet) || 0) * rate; 
    const mobile = (Number(col.mobile) || 0) * multiplier * rate; 
    const dining = (Number(col.diningSocial) || 0) * multiplier * rate;
    const rentFinal = rent * rate;
    const manualHomeCommitment = (parseFloat(homeCountryCommitment) || 0) * rate;
    const manualStudentLoan = (parseFloat(studentLoan) || 0) * rate;
    const contingencyVal = (parseFloat(contingency) || 0) * rate;
    const totalCosts = (intel.housing.provided ? 0 : rentFinal) + food + transport + utilities + dining + internet + mobile + manualHomeCommitment + manualStudentLoan + contingencyVal;
    return { rent: rentFinal, rentLabel, food, transport, utilities, dining, internet, mobile, totalCosts, manualHomeCommitment, manualStudentLoan, contingencyVal };
  }, [selectedSchool, familyStatus, homeCountryCommitment, studentLoan, rate, contingency]);

  const monthlySalaryToUse = offeredSalary ? parseFloat(offeredSalary) : suggestedMonthlyLocal;
  const responsibilityAllowanceNum = parseFloat(responsibilityAllowance) || 0;
  const partnerSalaryNum = parseFloat(partnerSalary) || 0;
  const totalIncome = (monthlySalaryToUse || 0) + responsibilityAllowanceNum + partnerSalaryNum;
  const savingsPotential = totalIncome - (decodedCosts?.totalCosts || 0);

  const handleGenerateVerdict = async () => {
    if (!selectedSchool) return;
    setIsVerdictLoading(true);
    setVerdictError(null);
    const result = await getOfferTacticalVerdict({
        schoolName: selectedSchool.name,
        location: selectedSchool.location,
        country: selectedSchool.country,
        monthlySavings: Math.round(savingsPotential),
        currency: currency,
        familyStatus: familyStatus
    });
    if (result.error) setVerdictError(result.error);
    if (result.data) setVerdict(result.data);
    setIsVerdictLoading(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <Card className="glass border-primary/20">
            <CardHeader><CardTitle className="text-sm stamped-dossier text-white text-center">My Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-primary/70 uppercase">Select School Dossier</Label>
                <Select value={selectedSchoolId ?? ''} onValueChange={setSelectedSchoolId}>
                  <SelectTrigger className="bg-background/50 border-white/10 rounded-sm text-white font-bold"><SelectValue placeholder="Search schools..." /></SelectTrigger>
                  <SelectContent className="glass">{schools?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-primary/70 uppercase">Family Scaling</Label>
                <Select value={familyStatus} onValueChange={(v) => setFamilyStatus(v as FamilyStatus)}>
                  <SelectTrigger className="bg-background/50 border-white/10 rounded-sm text-white font-bold"><SelectValue /></SelectTrigger>
                  <SelectContent className="glass"><SelectItem value="single">Single</SelectItem><SelectItem value="couple">Couple</SelectItem><SelectItem value="family">Family 2+1</SelectItem><SelectItem value="family2">Family 2+2</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-sm mt-4">
                <div className="text-[10px] text-primary-foreground/90 leading-relaxed font-medium"><span className="font-bold text-destructive uppercase tracking-tighter flex items-center gap-1 mb-1.5"><ShieldAlert className="size-3" /> Due Diligence</span>Important! Enter net not gross pay. Check if the deduction total accounts for Social Security, pension, and all health, dental, and optical costs. If not add some extra to the contingency cost section below.</div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-end"><Label className="text-[10px] font-bold text-primary/70 uppercase">Net Monthly Salary Offer</Label>{suggestedMonthlyLocal > 0 && !offeredSalary && (<span className="text-[9px] font-black text-accent uppercase animate-pulse">Suggested Benchmark</span>)}</div>
                <div className="grid grid-cols-4 gap-2">
                  <div className="col-span-3 relative"><Pencil className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input className={cn("pl-10 bg-background/50 border-white/10 rounded-sm h-10 text-right font-bold text-white", noSpinners)} type="number" placeholder={suggestedMonthlyLocal > 0 ? `${Math.round(suggestedMonthlyLocal)}` : "0"} value={offeredSalary} onChange={(e) => setOfferedSalary(e.target.value)} /></div>
                  <Select value={currency} disabled><SelectTrigger className="bg-background/50 border-white/10 h-10 rounded-sm opacity-100 text-white font-bold"><SelectValue /></SelectTrigger><SelectContent className="glass">{ORDERED_CURRENCIES.map(c => (<SelectItem key={c} value={c}>{c}</SelectItem>))}</SelectContent></Select>
                </div>
              </div>
              <div className="space-y-2"><Label className="text-[10px] font-bold text-primary/70 uppercase">Responsibilities Allowance (Monthly)</Label><div className="relative"><Medal className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" /><Input className={cn("pl-10 bg-background/50 border-white/10 h-10 rounded-sm text-right font-bold text-white", noSpinners)} type="number" placeholder="0" value={responsibilityAllowance} onChange={(e) => setResponsibilityAllowance(e.target.value)} /></div></div>
              <div className="space-y-2"><Label className="text-[10px] font-bold text-primary/70 uppercase">Partner Monthly Salary</Label><div className="relative"><Plus className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" /><Input className={cn("pl-10 bg-background/50 border-white/10 h-10 rounded-sm text-right font-bold text-white", noSpinners)} type="number" placeholder="0" value={partnerSalary} onChange={(e) => setPartnerSalary(e.target.value)} /></div></div>
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <Label className="text-[10px] font-bold text-primary/70 uppercase">Student Loan Repayment (Monthly)</Label>
                  <div className="flex gap-2 items-center">
                    <a href="https://www.gov.uk/government/publications/overseas-earnings-thresholds-for-plan-5-student-loans" target="_blank" rel="noopener noreferrer" className="text-[9px] text-accent hover:underline flex items-center gap-1 font-bold">UK <ExternalLink className="size-2" /></a>
                    <a href="https://studentaid.gov/manage-loans/repayment/plans" target="_blank" rel="noopener noreferrer" className="text-[9px] text-accent hover:underline flex items-center gap-1 font-bold">US <ExternalLink className="size-2" /></a>
                  </div>
                </div>
                <div className="relative"><GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" /><Input className={cn("pl-10 bg-background/50 border-white/10 h-10 rounded-sm text-right font-bold text-white", noSpinners)} type="number" placeholder="0" value={studentLoan} onChange={(e) => setStudentLoan(e.target.value)} /></div>
              </div>
              <div className="space-y-2"><Label className="text-[10px] font-bold text-primary/70 uppercase">Contingency Buffer (Monthly)</Label><div className="relative"><Milestone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" /><Input className={cn("pl-10 bg-background/50 border-white/10 h-10 rounded-sm text-right font-bold text-white", noSpinners)} type="number" placeholder="200" value={contingency} onChange={(e) => setContingency(e.target.value)} /></div></div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {!selectedSchool ? (
            <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-sm py-24 text-muted-foreground bg-card/20"><LineChart className="w-12 h-12 mb-4 opacity-20" /><p className="stamped-dossier text-sm text-white/50">Select a school dossier to initialise the decoder.</p></div>
          ) : (
            <>
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="glass rounded-sm border-white/10 shadow-lg shadow-black/20">
                  <CardHeader><CardTitle className="text-sm flex items-center gap-3 stamped-dossier text-white"><Award className="text-primary size-5" /> Income & Benefits</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b border-white/5"><div className="flex items-center gap-2"><Banknote className="size-3 text-green-400" /><span className="text-sm text-muted-foreground font-medium">Monthly Net Salary</span></div><div className="text-right"><span className={cn("font-bold text-lg", offeredSalary ? "text-green-400" : "text-green-400/50")}>{formatCurrency(monthlySalaryToUse, currency)}</span>{!offeredSalary && <p className="text-[9px] font-bold text-primary/50 uppercase">Benchmark Applied</p>}</div></div>
                    <div className="flex justify-between items-center py-2 border-b border-white/5"><div className="flex items-center gap-2"><Medal className="size-3 text-amber-400" /><span className="text-sm text-muted-foreground font-medium">Responsibility Allowance</span></div><span className="font-bold text-white">{formatCurrency(responsibilityAllowanceNum, currency)}</span></div>
                    <div className="flex justify-between items-center py-2 border-b border-white/5"><div className="flex items-center gap-2"><Plus className="size-3 text-sky-400" /><span className="text-sm text-muted-foreground font-medium">Partner Monthly Salary</span></div><span className="font-bold text-white">{formatCurrency(partnerSalaryNum, currency)}</span></div>
                    <div className="flex justify-between items-center py-2 border-b border-white/5"><div className="flex items-center gap-2"><Home className="size-3 text-sky-400" /><span className="text-sm text-muted-foreground font-medium">Housing Arrangement</span></div><span className="text-sm font-bold text-white">{selectedSchool.intel.housing.provided ? "School Provided" : "Teacher Pays"}</span></div>
                  </CardContent>
                </Card>
                <Card className="glass rounded-sm border-white/10 shadow-lg shadow-black/20">
                  <CardHeader><CardTitle className="text-sm flex items-center gap-3 stamped-dossier text-white"><Users className="text-destructive size-5" /> Estimated Costs</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <DecodedItem icon={<Home className="size-3 text-sky-400" />} label={decodedCosts?.rentLabel || 'Rent'} value={selectedSchool.intel.housing.provided ? 0 : decodedCosts?.rent || 0} currency={currency} isFree={selectedSchool.intel.housing.provided} />
                    <DecodedItem icon={<Utensils className="size-3 text-amber-400" />} label="Groceries (Scaled)" value={decodedCosts?.food || 0} currency={currency} />
                    <DecodedItem icon={<TramFront className="size-3 text-rose-400" />} label="Transport (Scaled)" value={decodedCosts?.transport || 0} currency={currency} />
                    <DecodedItem icon={<Zap className="size-3 text-yellow-400" />} label="Utilities (Scaled)" value={decodedCosts?.utilities || 0} currency={currency} />
                    <DecodedItem icon={<Smartphone className="size-3 text-pink-400" />} label="Mobile phone" value={decodedCosts?.mobile || 0} currency={currency} />
                    <DecodedItem icon={<Wifi className="size-3 text-indigo-400" />} label="Home internet (Fixed)" value={decodedCosts?.internet || 0} currency={currency} />
                    <InteractiveCostItem icon={<Globe className="size-3 text-blue-400" />} label="Home Country Commitment" value={homeCountryCommitment} currency={currency} onChange={setHomeCountryCommitment} />
                    {decodedCosts?.manualStudentLoan ? (<DecodedItem icon={<GraduationCap className="size-3 text-emerald-400" />} label="Student loan" value={decodedCosts.manualStudentLoan} currency={currency} />) : null}
                    <InteractiveCostItem icon={<Milestone className="size-3 text-purple-400" />} label="Contingency Buffer" value={contingency} currency={currency} onChange={setContingency} />
                    <div className="pt-6 mt-4 border-t border-white/10 flex justify-between items-center"><span className="text-[10px] font-black uppercase tracking-widest text-white">Burn Rate</span><span className="text-xl font-bold text-primary">{formatCurrency(decodedCosts?.totalCosts || 0, currency)}</span></div>
                  </CardContent>
                </Card>
              </div>
              
              <Card className={cn("glass border-2 rounded-sm p-8 shadow-2xl shadow-black/40", savingsPotential > 0 ? "border-green-500/30" : "border-destructive/30")}>
                <div className="space-y-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="space-y-1 text-center md:text-left">
                            <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">True Net Savings</h4>
                            <div className="flex items-baseline gap-1">
                                <span className={cn("text-5xl font-black tracking-tighter", savingsPotential > 0 ? "text-green-400" : "text-destructive")}>{formatCurrency(savingsPotential, currency)}</span>
                                <span className="text-lg font-bold text-muted-foreground/50">/mo</span>
                            </div>
                        </div>
                        <div className="flex-1 max-w-sm text-sm text-muted-foreground leading-relaxed text-center md:text-left font-medium">The gap between your total household income and your estimated cost of living.</div>
                        <Button className="bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest px-8 py-7 h-auto rounded-sm transition-all shadow-[0_0_20px_rgba(249,115,22,0.2)]" asChild><Link href="/compare">Compare Offers</Link></Button>
                    </div>
                    
                    {savingsPotential !== 0 && (
                        <div className="pt-6 border-t border-white/5">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                                {['GBP', 'USD', 'EUR', 'AUD'].map((targetCcy) => {
                                    const convertedVal = (savingsPotential / rate) * (CONVERSION_RATES[targetCcy] || 1);
                                    return (<div key={targetCcy} className="space-y-1"><p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tighter">{targetCcy}</p><p className="text-base font-bold text-white">{formatCurrency(convertedVal, targetCcy)}</p></div>)
                                })}
                            </div>
                        </div>
                    )}

                    <Separator className="bg-white/5" />

                    {/* Tactical SWOT Verdict Module */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm stamped-dossier text-primary flex items-center gap-2">
                                <Sparkles className="size-4" /> Tactical SWOT Verdict
                            </h3>
                            {!verdict && (
                                <Button 
                                    size="sm" 
                                    variant="outline" 
                                    disabled={isVerdictLoading}
                                    onClick={handleGenerateVerdict}
                                    className="h-8 text-[10px] font-black uppercase tracking-widest border-primary/30 text-primary hover:bg-primary/10"
                                >
                                    {isVerdictLoading ? <Loader2 className="size-3 animate-spin mr-2" /> : <Sparkles className="size-3 mr-2" />}
                                    Run SWOT Protocol
                                </Button>
                            )}
                        </div>

                        {verdictError && (
                            <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-sm flex items-start gap-3">
                                <ServerCrash className="size-4 text-destructive shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-destructive uppercase">Uplink Failure</p>
                                    <p className="text-xs text-muted-foreground">{verdictError}</p>
                                </div>
                            </div>
                        )}

                        {verdict && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                                <div className="glass p-4 rounded-sm border-l-4 border-l-green-500/50 space-y-2">
                                    <h4 className="text-[10px] font-black text-green-400 uppercase tracking-widest flex items-center gap-2">
                                        <TrendingUp className="size-3" /> Strengths
                                    </h4>
                                    <p className="text-xs text-muted-foreground leading-relaxed font-medium">{verdict.strengths}</p>
                                </div>
                                <div className="glass p-4 rounded-sm border-l-4 border-l-amber-500/50 space-y-2">
                                    <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-2">
                                        <TrendingDown className="size-3" /> Weaknesses
                                    </h4>
                                    <p className="text-xs text-muted-foreground leading-relaxed font-medium">{verdict.weaknesses}</p>
                                </div>
                                <div className="glass p-4 rounded-sm border-l-4 border-l-accent/50 space-y-2">
                                    <h4 className="text-[10px] font-black text-accent uppercase tracking-widest flex items-center gap-2">
                                        <Compass className="size-3" /> Opportunities
                                    </h4>
                                    <p className="text-xs text-muted-foreground leading-relaxed font-medium">{verdict.opportunities}</p>
                                </div>
                                <div className="glass p-4 rounded-sm border-l-4 border-l-destructive/50 space-y-2">
                                    <h4 className="text-[10px] font-black text-destructive uppercase tracking-widest flex items-center gap-2">
                                        <AlertTriangle className="size-3" /> Threats
                                    </h4>
                                    <p className="text-xs text-muted-foreground leading-relaxed font-medium">{verdict.threats}</p>
                                </div>
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

export default function EvaluatePage() {
  return (
    <div className="container mx-auto px-4 md:px-6 py-12">
      <div className="mb-16 text-center print:hidden">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-white normal-case">2. Contract Decoder</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto font-medium text-sm leading-relaxed">LeopardfishIntel analysis of your potential contract.<br />We strip away recruitment facade to reveal the true financial reality of your move.</p>
      </div>
      <Suspense fallback={<div className="flex justify-center items-center py-24"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}><ContractDecoderContent /></Suspense>
    </div>
  );
}

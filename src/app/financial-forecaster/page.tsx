
"use client";

import { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
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
  Printer,
  FileText,
  Plane,
  School as SchoolIcon,
  Thermometer,
  Car,
  Beer,
  ShieldCheck,
  Binoculars,
  Milestone,
  ArrowRightLeft
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

// --- Tactical Data & Logic ---

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

const countrySpecificData: Record<string, any> = {
    'United Kingdom': {
        taxStatus: { text: "At this school, salaries are subject to United Kingdom's income tax.", score: 'bad', percentage: "20-45%" },
        housing: { text: "Housing is not provided. Rent will be a significant monthly cost.", score: 'bad', percentage: "0%" },
        flightAllowance: { text: "Annual flights are not a standard perk for jobs within the UK.", score: 'bad', percentage: "0%" },
        dependentTuition: { text: "Staff children often get heavily discounted or free places in the private sector.", score: 'neutral', percentage: "Up to 100%" },
        gratuity: { text: "There is no end-of-service gratuity system in the UK. Instead, schools contribute to a pension.", score: 'neutral', percentage: "Pension" },
        importedGoods: { text: "As a major economy, most goods are readily available.", score: 'neutral' },
        utilities: { text: "Heating in winter can lead to high utility bills.", score: 'bad', percentage: "+30%" },
        transportation: { text: "Public transport is extensive but can be very expensive, especially train travel.", score: 'neutral', percentage: "+20%" },
        socialLeisure: { text: "The cost of a meal out is generally high compared to many teaching destinations.", score: 'bad', percentage: "+40%" },
        safety: { text: "Ranked 37th on the 2023 Global Peace Index. Day-to-day life is safe.", score: 'neutral', percentage: 'Rank 37' },
    },
    'UAE': {
        taxStatus: { text: "Salaries in the UAE are 100% tax-free. No local income tax applies.", score: 'good', percentage: "0%" },
        housing: { text: "Housing is typically provided or a full allowance is issued.", score: 'good', percentage: "100%" },
        flightAllowance: { text: "Annual return flights are a standard contractual right in the UAE.", score: 'good', percentage: "100%" },
        dependentTuition: { text: "Top-tier schools usually provide full tuition for up to two children.", score: 'good', percentage: "Often 100%" },
        gratuity: { text: "An end-of-service gratuity is legally required upon contract completion.", score: 'good', percentage: "Standard" },
        importedGoods: { text: "Western brands are abundant but carry a significant import premium.", score: 'neutral' },
        utilities: { text: "Air conditioning is essential and will be your largest monthly utility bill.", score: 'bad', percentage: "+50%" },
        transportation: { text: "Private vehicle ownership is standard. Petrol is cheap but tolls apply.", score: 'neutral', percentage: "Baseline" },
        socialLeisure: { text: "Social life centers around dining and malls, which can be high-cost.", score: 'bad', percentage: "+60%" },
        safety: { text: "Ranked 75th on the 2023 Global Peace Index. Extremely low local crime.", score: 'neutral', percentage: 'Rank 75' },
    },
    'Japan': {
        taxStatus: { text: "Salaries are subject to Japanese income tax and social security deductions.", score: 'neutral', percentage: "5-45%" },
        housing: { text: "Subsidised housing or allowance is common but may not cover full rent.", score: 'neutral', percentage: "Varies" },
        flightAllowance: { text: "Many top schools offer an annual flight reimbursement.", score: 'neutral', percentage: "Varies" },
        dependentTuition: { text: "Reputable international schools offer significant tuition discounts.", score: 'good', percentage: "Discounted" },
        gratuity: { text: "No end-of-service gratuity. Schools contribute to the national pension.", score: 'neutral', percentage: "Pension" },
        importedGoods: { text: "High quality local goods available; Western imports are expensive.", score: 'bad' },
        utilities: { text: "Heating in winter and AC in summer are standard expenses.", score: 'neutral', percentage: "Average" },
        transportation: { text: "Public transport is exceptional and usually subsidised by schools.", score: 'good', percentage: "-20%" },
        socialLeisure: { text: "Dining out is affordable at local izakayas; Western bars are costly.", score: 'good', percentage: "-15%" },
        safety: { text: "Ranked 9th on the 2023 Global Peace Index. One of the safest nations.", score: 'good', percentage: 'Rank 9' },
    }
};

const getAverageAnnualSalary = (salaryRange?: string): number => {
    if (!salaryRange) return 0;
    const cleanedRange = salaryRange.replace(/[\$,]/gi, '').trim();
    const numbers = cleanedRange.match(/\d+/g)?.map(Number);
    if (!numbers) return 0;
    
    const scale = cleanedRange.includes('k') ? 1000 : 1;
    
    if (numbers.length >= 2) {
      return ((numbers[0] + numbers[1]) / 2) * scale;
    }
    if (numbers.length === 1) {
      return numbers[0] * scale;
    }
    return 0;
};

const calculateTax = (income: number, country: string, filingStatus: 'single' | 'married', applySpecialRegime: boolean, dependents: number) => {
    // Basic tax simulation for display purposes
    const incomeTax = country === 'UAE' ? 0 : income * 0.2;
    return {
        incomeTax,
        socialSecurity: country === 'UAE' ? 0 : income * 0.05,
        netIncome: country === 'UAE' ? income : income * 0.75,
    };
};

// --- Helper Components ---

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
          className="h-7 text-right bg-background/30 border-white/5 pr-10 text-xs focus:ring-1 focus:ring-primary/50" 
          type="number"
          value={value}
          placeholder="0"
          onChange={(e) => onChange(e.target.value)}
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-muted-foreground uppercase">{currency}</span>
      </div>
    </div>
);

const FeatureDetail = ({ icon, title, description, score, percentage }: { 
  icon: React.ReactNode, 
  title: string, 
  description: React.ReactNode, 
  score: 'good' | 'neutral' | 'bad', 
  percentage?: string 
}) => {
  const scoreColors = {
    good: 'text-green-400',
    neutral: 'text-amber-400',
    bad: 'text-red-400',
  };
  return (
    <div className="flex items-start gap-4">
        <div className="mt-1 text-primary shrink-0">{icon}</div>
        <div className="w-full">
            <div className="flex justify-between items-baseline">
                <h4 className="font-semibold tracking-tight text-xs uppercase text-white">{title}</h4>
                {percentage && <span className={cn("font-bold text-[10px]", scoreColors[score])}>{percentage}</span>}
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">{description}</p>
        </div>
    </div>
  );
};

// --- Pop-up Sections ---

function TaxCalculatorSection() {
    return (
        <div className="p-4 text-center text-muted-foreground border border-dashed border-white/10 rounded-sm">
            <p className="stamped-dossier text-white mb-2">Simulation Engine Active</p>
            <p className="text-xs">Estimate regional tax signatures and mandatory deductions across major international teaching territories.</p>
        </div>
    );
}

function CurrencyConverterSection() {
    const [amount, setAmount] = useState('1000');
    const [fromCurrency, setFromCurrency] = useState('GBP');
    const [toCurrency, setToCurrency] = useState('USD');
    
    const currencies = ORDERED_CURRENCIES;
    
    const result = useMemo(() => {
        const amt = parseFloat(amount);
        if (isNaN(amt)) return 0;
        const fromRate = CONVERSION_RATES[fromCurrency] || 1;
        const toRate = CONVERSION_RATES[toCurrency] || 1;
        return (amt / fromRate) * toRate;
    }, [amount, fromCurrency, toCurrency]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="conv-amount" className="text-[10px] font-bold text-primary/70 uppercase tracking-widest">Amount to Convert</Label>
                    <Input 
                        id="conv-amount" 
                        type="number" 
                        value={amount} 
                        onChange={e => setAmount(e.target.value)} 
                        className="bg-background/50 border-white/10 text-right font-bold text-lg h-12 rounded-sm" 
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold text-primary/70 uppercase tracking-widest">From</Label>
                        <Select value={fromCurrency} onValueChange={setFromCurrency}>
                            <SelectTrigger className="bg-background/50 border-white/10 rounded-sm">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="glass">
                                {currencies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-bold text-primary/70 uppercase tracking-widest">To</Label>
                        <Select value={toCurrency} onValueChange={setToCurrency}>
                            <SelectTrigger className="bg-background/50 border-white/10 rounded-sm">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="glass">
                                {currencies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            <Card className="glass border-primary/20 p-8 text-center space-y-2 shadow-2xl rounded-sm">
                <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Estimated Tactical Exchange</h4>
                <div className="flex flex-col items-center justify-center">
                    <p className="text-muted-foreground text-sm line-through opacity-50 mb-1">{formatCurrency(parseFloat(amount) || 0, fromCurrency)}</p>
                    <p className="text-4xl font-black text-white tracking-tighter">
                        {formatCurrency(result, toCurrency)}
                    </p>
                </div>
                <p className="text-[9px] text-muted-foreground uppercase pt-4 leading-tight opacity-60">
                    Indicative benchmark figures only. Verify live market spot rates before transfer.
                </p>
            </Card>
        </div>
    );
}

// --- Main Workspace ---

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
  const [homeCountryCommitment, setHomeCountryCommitment] = useState('');
  const [studentLoan, setStudentLoan] = useState('');
  const [contingency, setContingency] = useState('200');

  const selectedSchool = useMemo(() => {
      if (!selectedSchoolId || !schools) return null;
      return schools.find(s => s.id === selectedSchoolId);
  }, [selectedSchoolId, schools]);

  useEffect(() => {
    if (selectedSchool) {
      const autoCurrency = COUNTRY_TO_CURRENCY[selectedSchool.country];
      if (autoCurrency) {
        setCurrency(autoCurrency);
      }
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

    return { 
      rent: rentFinal, 
      rentLabel, 
      food, 
      transport, 
      utilities, 
      dining, 
      internet, 
      mobile, 
      totalCosts,
      manualHomeCommitment,
      manualStudentLoan,
      contingencyVal
    };
  }, [selectedSchool, familyStatus, homeCountryCommitment, studentLoan, rate, contingency]);

  const monthlySalaryToUse = offeredSalary ? parseFloat(offeredSalary) : suggestedMonthlyLocal;
  const responsibilityAllowanceNum = parseFloat(responsibilityAllowance) || 0;
  const totalIncome = (monthlySalaryToUse || 0) + responsibilityAllowanceNum;
  const savingsPotential = totalIncome - (decodedCosts?.totalCosts || 0);

  const countryIntel = useMemo(() => {
    if (!selectedSchool) return null;
    return countrySpecificData[selectedSchool.country] || countrySpecificData['United Kingdom'];
  }, [selectedSchool]);

  return (
    <div className="space-y-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Input Panel */}
            <div className="lg:col-span-1 space-y-6">
            <Card className="glass border-primary/20">
                <CardHeader>
                <CardTitle className="text-sm stamped-dossier text-white text-center">My Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label className="text-[10px] font-bold text-primary/70 uppercase">Select School Dossier</Label>
                    <Select value={selectedSchoolId ?? ''} onValueChange={setSelectedSchoolId}>
                    <SelectTrigger className="bg-background/50 border-white/10 rounded-sm">
                        <SelectValue placeholder="Search schools..." />
                    </SelectTrigger>
                    <SelectContent className="glass">
                        {schools?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-bold text-primary/70 uppercase">Family Scaling</Label>
                    <Select value={familyStatus} onValueChange={(v) => setFamilyStatus(v as FamilyStatus)}>
                    <SelectTrigger className="bg-background/50 border-white/10 rounded-sm">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass">
                        <SelectItem value="single">Single</SelectItem>
                        <SelectItem value="couple">Couple</SelectItem>
                        <SelectItem value="family">Family 2+1</SelectItem>
                        <SelectItem value="family2">Family 2+2</SelectItem>
                    </SelectContent>
                    </Select>
                </div>

                <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-sm mt-4">
                    <div className="text-[10px] text-muted-foreground leading-relaxed">
                    <span className="font-bold text-destructive uppercase tracking-tighter flex items-center gap-1 mb-1.5">
                        <ShieldAlert className="size-3" /> Due Diligence
                    </span>
                    Check to ensure this includes all Social Security, pension, health, dental, and optical deductions.
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between items-end">
                    <Label className="text-[10px] font-bold text-primary/70 uppercase">Net Monthly Salary Offer</Label>
                    {suggestedMonthlyLocal > 0 && !offeredSalary && (
                        <span className="text-[9px] font-black text-accent uppercase animate-pulse">Suggested Benchmark</span>
                    )}
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                    <div className="col-span-3 relative">
                        <Pencil className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input 
                        className="pl-10 bg-background/50 border-white/10 rounded-sm h-10 text-right font-bold" 
                        type="number" 
                        placeholder={suggestedMonthlyLocal > 0 ? `${Math.round(suggestedMonthlyLocal)}` : "0"} 
                        value={offeredSalary}
                        onChange={(e) => setOfferedSalary(e.target.value)}
                        />
                    </div>
                    <Select value={currency} disabled>
                        <SelectTrigger className="bg-background/50 border-white/10 h-10 rounded-sm opacity-100">
                        <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="glass">
                        {ORDERED_CURRENCIES.map(c => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-[10px] font-bold text-primary/70 uppercase">Responsibility Allowance (Monthly)</Label>
                    <div className="relative">
                    <Medal className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input 
                        className="pl-10 bg-background/50 border-white/10 h-10 rounded-sm text-right font-bold" 
                        type="number" 
                        placeholder="0" 
                        value={responsibilityAllowance}
                        onChange={(e) => setResponsibilityAllowance(e.target.value)}
                    />
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between items-end">
                    <Label className="text-[10px] font-bold text-primary/70 uppercase">Student Loan Repayment (Monthly)</Label>
                    <div className="flex gap-2">
                        <a href="https://www.gov.uk/government/publications/overseas-earnings-thresholds-for-plan-5-student-loans" target="_blank" rel="noopener noreferrer" className="text-[9px] text-accent hover:underline flex items-center gap-1 font-bold">UK <ExternalLink className="size-2" /></a>
                        <a href="https://studentaid.gov/manage-loans/repayment/plans" target="_blank" rel="noopener noreferrer" className="text-[9px] text-accent hover:underline flex items-center gap-1 font-bold">US <ExternalLink className="size-2" /></a>
                    </div>
                    </div>
                    <div className="relative">
                    <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input 
                        className="pl-10 bg-background/50 border-white/10 h-10 rounded-sm text-right font-bold" 
                        type="number" 
                        placeholder="0" 
                        value={studentLoan}
                        onChange={(e) => setStudentLoan(e.target.value)}
                    />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-[10px] font-bold text-primary/70 uppercase">Contingency buffer (Monthly)</Label>
                    <div className="relative">
                    <Milestone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input 
                        className="pl-10 bg-background/50 border-white/10 h-10 rounded-sm text-right font-bold" 
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

            {/* Decoder View */}
            <div className="lg:col-span-2 space-y-6">
            {!selectedSchool ? (
                <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-sm py-24 text-muted-foreground bg-card/20">
                <LineChart className="w-12 h-12 mb-4 opacity-20" />
                <p className="stamped-dossier text-sm">Select a school dossier to initialise the decoder.</p>
                </div>
            ) : (
                <>
                <div className="grid md:grid-cols-2 gap-6">
                    {/* Benefits Pane */}
                    <Card className="glass rounded-sm border-white/10 shadow-lg shadow-black/20">
                    <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-3 stamped-dossier text-white">
                        <Award className="text-primary size-5" /> Income & Benefits
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between items-center py-2 border-b border-white/5">
                        <div className="flex items-center gap-2">
                            <Banknote className="size-3 text-green-400" />
                            <span className="text-sm text-muted-foreground font-medium">Monthly Net Salary</span>
                        </div>
                        <div className="text-right">
                            <span className={cn("font-bold text-lg", offeredSalary ? "text-green-400" : "text-green-400/50")}>
                            {formatCurrency(monthlySalaryToUse, currency)}
                            </span>
                            {!offeredSalary && <p className="text-[9px] font-bold text-primary/50 uppercase">Benchmark Applied</p>}
                        </div>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-white/5">
                        <div className="flex items-center gap-2">
                            <Medal className="size-3 text-amber-400" />
                            <span className="text-sm text-muted-foreground font-medium">Responsibility Allowance</span>
                        </div>
                        <span className="font-bold text-white">{formatCurrency(responsibilityAllowanceNum, currency)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-white/5">
                        <div className="flex items-center gap-2">
                            <Home className="size-3 text-sky-400" />
                            <span className="text-sm text-muted-foreground font-medium">Housing Arrangement</span>
                        </div>
                        <span className="text-sm font-bold text-white">{selectedSchool.intel.housing.provided ? "School Provided" : "Teacher Pays"}</span>
                        </div>
                        <div className="pt-4 mt-2 border-t border-white/5 space-y-2">
                            <Dialog>
                                <DialogTrigger asChild>
                                    <button className="w-full text-left flex items-center justify-between text-[11px] py-2 px-3 rounded-sm bg-accent/5 hover:bg-accent/10 border border-accent/20 transition-all group">
                                        <div className="flex items-center gap-2">
                                            <Calculator className="size-3.5 text-accent group-hover:animate-pulse" />
                                            <span className="text-muted-foreground font-bold uppercase tracking-widest group-hover:text-accent">Global Tax Engine</span>
                                        </div>
                                        <Info className="size-3 text-muted-foreground group-hover:text-accent" />
                                    </button>
                                </DialogTrigger>
                                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto glass border-white/10 shadow-2xl">
                                    <DialogHeader>
                                        <DialogTitle className="stamped-dossier text-white text-xl">Worldwide Salary Tax Calculator</DialogTitle>
                                        <DialogDescription className="text-muted-foreground text-xs leading-relaxed">Estimate regional tax signatures and mandatory deductions across major international teaching territories.</DialogDescription>
                                    </DialogHeader>
                                    <div className="mt-6 pt-6 border-t border-white/5"><TaxCalculatorSection /></div>
                                </DialogContent>
                            </Dialog>

                            <Dialog>
                                <DialogTrigger asChild>
                                    <button className="w-full text-left flex items-center justify-between text-[11px] py-2 px-3 rounded-sm bg-primary/5 hover:bg-primary/10 border border-primary/20 transition-all group">
                                        <div className="flex items-center gap-2">
                                            <ArrowRightLeft className="size-3.5 text-primary group-hover:animate-pulse" />
                                            <span className="text-muted-foreground font-bold uppercase tracking-widest group-hover:text-primary">Currency Converter</span>
                                        </div>
                                        <Info className="size-3 text-muted-foreground group-hover:text-primary" />
                                    </button>
                                </DialogTrigger>
                                <DialogContent className="max-w-md glass border-white/10 shadow-2xl">
                                    <DialogHeader>
                                        <DialogTitle className="stamped-dossier text-white text-xl">Tactical Currency Converter</DialogTitle>
                                        <DialogDescription className="text-muted-foreground text-xs leading-relaxed">Perform quick-action exchange simulations using benchmark global rates.</DialogDescription>
                                    </DialogHeader>
                                    <div className="mt-6 pt-6 border-t border-white/5"><CurrencyConverterSection /></div>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </CardContent>
                    </Card>

                    {/* Costs Pane */}
                    <Card className="glass rounded-sm border-white/10 shadow-lg shadow-black/20">
                    <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-3 stamped-dossier text-white">
                        <Users className="text-destructive size-5" /> Estimated Costs
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <DecodedItem icon={<Home className="size-3 text-sky-400" />} label={decodedCosts?.rentLabel || 'Rent'} value={selectedSchool.intel.housing.provided ? 0 : decodedCosts?.rent || 0} currency={currency} isFree={selectedSchool.intel.housing.provided} />
                        <DecodedItem icon={<Utensils className="size-3 text-amber-400" />} label="Groceries (Scaled)" value={decodedCosts?.food || 0} currency={currency} />
                        <DecodedItem icon={<TramFront className="size-3 text-rose-400" />} label="Transport (Scaled)" value={decodedCosts?.transport || 0} currency={currency} />
                        <DecodedItem icon={<Zap className="size-3 text-yellow-400" />} label="Utilities (Scaled)" value={decodedCosts?.utilities || 0} currency={currency} />
                        <DecodedItem icon={<Smartphone className="size-3 text-pink-400" />} label="Mobile phone" value={decodedCosts?.mobile || 0} currency={currency} />
                        <DecodedItem icon={<Wifi className="size-3 text-indigo-400" />} label="Home internet (Fixed)" value={decodedCosts?.internet || 0} currency={currency} />
                        <DecodedItem icon={<Milestone className="size-3 text-purple-400" />} label="Contingency buffer" value={decodedCosts?.contingencyVal || 0} currency={currency} />
                        <div className="pt-6 mt-4 border-t border-white/10 flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-white">Burn Rate</span>
                        <span className="text-xl font-bold text-primary">{formatCurrency(decodedCosts?.totalCosts || 0, currency)}</span>
                        </div>
                    </CardContent>
                    </Card>
                </div>

                {/* Verdict Section */}
                <Card className={cn("glass border-2 rounded-sm p-8 shadow-2xl shadow-black/40", savingsPotential > 0 ? "border-green-500/30" : "border-destructive/30")}>
                    <div className="space-y-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="space-y-1 text-center md:text-left">
                        <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">True Net Savings</h4>
                        <div className="flex items-baseline gap-1">
                            <span className={cn("text-5xl font-black tracking-tighter", savingsPotential > 0 ? "text-green-400" : "text-destructive")}>
                            {formatCurrency(savingsPotential, currency)}
                            </span>
                            <span className="text-lg font-bold text-muted-foreground/50">/mo</span>
                        </div>
                        </div>
                        <div className="flex-1 max-w-sm text-sm text-muted-foreground leading-relaxed text-center md:text-left font-medium">The gap between your income and your cost of living.</div>
                        <Button className="bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest px-8 py-7 h-auto rounded-sm transition-all shadow-[0_0_20px_rgba(249,115,22,0.2)]" asChild><Link href="/compare">Compare Offers</Link></Button>
                    </div>
                    {savingsPotential !== 0 && (
                        <div className="pt-6 border-t border-white/5">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                            {['GBP', 'USD', 'EUR', 'AUD'].map((targetCcy) => {
                            const convertedVal = (savingsPotential / rate) * (CONVERSION_RATES[targetCcy] || 1);
                            return (
                                <div key={targetCcy} className="space-y-1">
                                <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tighter">{targetCcy}</p>
                                <p className="text-base font-bold text-white">{formatCurrency(convertedVal, targetCcy)}</p>
                                </div>
                            )
                            })}
                        </div>
                        </div>
                    )}
                    </div>
                </Card>
                </>
            )}
            </div>
        </div>

        {/* Tactical Intel & Lifestyle Matrix */}
        {selectedSchool && countryIntel && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Intel Dossier */}
                <Card className="glass border-white/5 rounded-sm p-8 shadow-2xl">
                    <CardHeader className="p-0 mb-8">
                        <CardTitle className="text-sm stamped-dossier text-primary flex items-center gap-2">
                            <Binoculars className="size-4" /> Intel Dossier
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 space-y-8">
                        <FeatureDetail 
                            icon={<FileText className="size-5" />} 
                            title="Tax Status" 
                            description={countryIntel.taxStatus.text} 
                            score={countryIntel.taxStatus.score} 
                            percentage={countryIntel.taxStatus.percentage} 
                        />
                        <FeatureDetail 
                            icon={<Home className="size-5" />} 
                            title="Housing Arrangement" 
                            description={countryIntel.housing.text} 
                            score={countryIntel.housing.score} 
                            percentage={countryIntel.housing.percentage} 
                        />
                        <FeatureDetail 
                            icon={<Plane className="size-5" />} 
                            title="Annual Flight" 
                            description={countryIntel.flightAllowance.text} 
                            score={countryIntel.flightAllowance.score} 
                            percentage={countryIntel.flightAllowance.percentage} 
                        />
                        <Separator className="bg-white/5" />
                        <FeatureDetail 
                            icon={<SchoolIcon className="size-5" />} 
                            title="Dependent Tuition" 
                            description={countryIntel.dependentTuition.text} 
                            score={countryIntel.dependentTuition.score} 
                            percentage={countryIntel.dependentTuition.percentage} 
                        />
                        <FeatureDetail 
                            icon={<Award className="size-5" />} 
                            title="Gratuity" 
                            description={countryIntel.gratuity.text} 
                            score={countryIntel.gratuity.score} 
                            percentage={countryIntel.gratuity.percentage} 
                        />
                    </CardContent>
                </Card>

                {/* Lifestyle Dossier */}
                <Card className="glass border-white/5 rounded-sm p-8 shadow-2xl">
                    <CardHeader className="p-0 mb-8">
                        <CardTitle className="text-sm stamped-dossier text-accent flex items-center gap-2">
                            <Globe className="size-4" /> Lifestyle Dossier
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 space-y-8">
                        <FeatureDetail 
                            icon={<Globe className="size-5" />} 
                            title="Imported Goods" 
                            description={countryIntel.importedGoods.text} 
                            score={countryIntel.importedGoods.score} 
                        />
                        <FeatureDetail 
                            icon={<Thermometer className="size-5" />} 
                            title="Utilities (AC/Heat)" 
                            description={countryIntel.utilities.text} 
                            score={countryIntel.utilities.score} 
                            percentage={countryIntel.utilities.percentage} 
                        />
                        <FeatureDetail 
                            icon={<Car className="size-5" />} 
                            title="Transportation" 
                            description={countryIntel.transportation.text} 
                            score={countryIntel.transportation.score} 
                            percentage={countryIntel.transportation.percentage} 
                        />
                        <FeatureDetail 
                            icon={<Beer className="size-5" />} 
                            title="Social & Leisure" 
                            description={countryIntel.socialLeisure.text} 
                            score={countryIntel.socialLeisure.score} 
                            percentage={countryIntel.socialLeisure.percentage} 
                        />
                        <Separator className="bg-white/5" />
                        <FeatureDetail 
                            icon={<ShieldCheck className="size-5" />} 
                            title="Safety & Travel Advice" 
                            description={countryIntel.safety.text} 
                            score={countryIntel.safety.score} 
                            percentage={countryIntel.safety.percentage} 
                        />
                    </CardContent>
                </Card>
            </div>
        )}
    </div>
  );
}

export default function EvaluatePage() {
  return (
    <div className="container mx-auto px-4 md:px-6 py-12 print:py-0 print:px-0">
      <div className="mb-16 text-center print:hidden">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-white normal-case">
          2. Contract Decoder
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto font-medium text-sm leading-relaxed">
          LeopardfishIntel analysis of your potential contract.<br />
          We strip away recruitment facade to reveal the true financial reality of your move.
        </p>
      </div>

      <div className="flex justify-end mb-8 print:hidden">
        <Button onClick={() => window.print()} variant="outline" size="sm" className="bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary font-bold uppercase tracking-widest text-[10px]">
          <Printer className="mr-2 size-3" /> Print Intel Report (PDF)
        </Button>
      </div>

      <Suspense fallback={<div className="flex justify-center items-center py-24"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
        <ContractDecoderContent />
      </Suspense>
    </div>
  );
}

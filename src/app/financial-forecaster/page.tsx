
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
  ArrowRightLeft, 
  Home, 
  Utensils, 
  TramFront, 
  Zap, 
  Smartphone, 
  Wifi, 
  Medal, 
  Plus, 
  Banknote, 
  Info 
} from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { getRentForFamily, getFamilyScalingMultiplier, type FamilyStatus } from '@/lib/rent-calculator';
import type { School } from '@/lib/types';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

// --- Tax Calculator Logic ---
type TaxBracket = { upto: number; rate: number };
type FilingStatusBrackets = { brackets: TaxBracket[] };
type SpecialRegime = {
    name: string;
    description: string;
    taxablePercentage: number;
};

const taxData: { [key: string]: {
    currency: string;
    socialSecurity: { rate: number; floor?: number; cap?: number };
    childTaxCredit?: number;
    specialRegime?: SpecialRegime;
    filingStatuses: {
        single: FilingStatusBrackets;
        married: FilingStatusBrackets;
    };
} } = {
    "Italy": {
        currency: "EUR",
        socialSecurity: { rate: 0.0919 },
        childTaxCredit: 950,
        specialRegime: {
            name: "New Arrival Tax Discount",
            description: "Applies a 70% tax exemption on income for up to 5 years for new tax residents ('impatriati' regime). Social security is still calculated on the full gross salary.",
            taxablePercentage: 0.30
        },
        filingStatuses: {
            single: { brackets: [
                { upto: 28000, rate: 0.23 },
                { upto: 50000, rate: 0.35 },
                { upto: Infinity, rate: 0.43 },
            ]},
            married: { brackets: [
                { upto: 28000, rate: 0.23 },
                { upto: 50000, rate: 0.35 },
                { upto: Infinity, rate: 0.43 },
            ]},
        },
    },
    "Japan": {
        currency: "JPY",
        socialSecurity: { rate: 0.145, cap: 8160000 },
        childTaxCredit: 200000,
        filingStatuses: {
            single: { brackets: [
                { upto: 1950000, rate: 0.05 }, { upto: 3300000, rate: 0.10 }, { upto: 6950000, rate: 0.20 },
                { upto: 9000000, rate: 0.23 }, { upto: 18000000, rate: 0.33 }, { upto: 40000000, rate: 0.40 },
                { upto: Infinity, rate: 0.45 },
            ]},
            married: { brackets: [
                { upto: 3000000, rate: 0.05 }, { upto: 4500000, rate: 0.10 }, { upto: 7500000, rate: 0.20 },
                { upto: 10000000, rate: 0.23 }, { upto: 19000000, rate: 0.33 }, { upto: 41000000, rate: 0.40 },
                { upto: Infinity, rate: 0.45 },
            ]},
        },
    },
    "Netherlands": {
        currency: "EUR",
        socialSecurity: { rate: 0.2765, cap: 38098 },
        childTaxCredit: 800,
        filingStatuses: {
            single: { brackets: [
                { upto: 38098, rate: 0.0932 },
                { upto: 75518, rate: 0.3697 },
                { upto: Infinity, rate: 0.4950 },
            ]},
            married: { brackets: [
                { upto: 38098, rate: 0.0932 },
                { upto: 75518, rate: 0.3697 },
                { upto: Infinity, rate: 0.4950 },
            ]},
        },
    },
    "Singapore": {
        currency: "SGD",
        socialSecurity: { rate: 0.20, cap: 6000 * 12 },
        childTaxCredit: 2000,
        filingStatuses: {
            single: { brackets: [
                { upto: 20000, rate: 0 }, { upto: 30000, rate: 0.02 }, { upto: 40000, rate: 0.035 },
                { upto: 80000, rate: 0.07 }, { upto: 120000, rate: 0.115 }, { upto: 160000, rate: 0.15 },
                { upto: 320000, rate: 0.19 }, { upto: Infinity, rate: 0.22 },
            ]},
            married: { brackets: [
                { upto: 20000, rate: 0 }, { upto: 30000, rate: 0.02 }, { upto: 40000, rate: 0.035 },
                { upto: 80000, rate: 0.07 }, { upto: 120000, rate: 0.115 }, { upto: 160000, rate: 0.15 },
                { upto: 320000, rate: 0.19 }, { upto: Infinity, rate: 0.22 },
            ]},
        },
    },
    "South Korea": {
        currency: "KRW",
        socialSecurity: { rate: 0.09, cap: 70800000 },
        childTaxCredit: 150000,
        filingStatuses: {
            single: { brackets: [
                { upto: 14000000, rate: 0.06 }, { upto: 50000000, rate: 0.15 }, { upto: 88000000, rate: 0.24 },
                { upto: 150000000, rate: 0.35 }, { upto: 300000000, rate: 0.38 }, { upto: 500000000, rate: 0.40 },
                { upto: 1000000000, rate: 0.42 }, { upto: Infinity, rate: 0.45 },
            ]},
            married: { brackets: [
                { upto: 14000000, rate: 0.06 }, { upto: 50000000, rate: 0.15 }, { upto: 88000000, rate: 0.24 },
                { upto: 150000000, rate: 0.35 }, { upto: 300000000, rate: 0.38 }, { upto: 500000000, rate: 0.40 },
                { upto: 1000000000, rate: 0.42 }, { upto: Infinity, rate: 0.45 },
            ]},
        },
    },
    "Switzerland": {
        currency: "CHF",
        socialSecurity: { rate: 0.064 },
        childTaxCredit: 1200,
        filingStatuses: {
            single: { brackets: [
                { upto: 20000, rate: 0.05 }, { upto: 50000, rate: 0.12 }, { upto: 100000, rate: 0.18 },
                { upto: 200000, rate: 0.25 }, { upto: Infinity, rate: 0.30 },
            ]},
            married: { brackets: [
                { upto: 40000, rate: 0.05 }, { upto: 80000, rate: 0.10 }, { upto: 150000, rate: 0.15 },
                { upto: 250000, rate: 0.22 }, { upto: Infinity, rate: 0.28 },
            ]},
        },
    },
    "UAE": {
        currency: "AED",
        socialSecurity: { rate: 0 },
        childTaxCredit: 0,
        filingStatuses: {
            single: { brackets: [{ upto: Infinity, rate: 0 }] },
            married: { brackets: [{ upto: Infinity, rate: 0 }] },
        },
    },
    "United Kingdom": {
        currency: "GBP",
        socialSecurity: { rate: 0.12, floor: 12570, cap: 50270 },
        childTaxCredit: 0,
        filingStatuses: {
            single: { brackets: [
                { upto: 12570, rate: 0 }, { upto: 50270, rate: 0.20 },
                { upto: 125140, rate: 0.40 }, { upto: Infinity, rate: 0.45 },
            ]},
            married: { brackets: [
                { upto: 12570, rate: 0 }, { upto: 50270, rate: 0.20 },
                { upto: 125140, rate: 0.40 }, { upto: Infinity, rate: 0.45 },
            ]},
        },
    },
    "USA": {
        currency: "USD",
        socialSecurity: { rate: 0.0765, cap: 168600 },
        childTaxCredit: 2000,
        filingStatuses: {
            single: { brackets: [
                { upto: 11000, rate: 0.10 }, { upto: 44725, rate: 0.12 }, { upto: 95375, rate: 0.22 },
                { upto: 182100, rate: 0.24 }, { upto: 231250, rate: 0.32 }, { upto: 578125, rate: 0.35 },
                { upto: Infinity, rate: 0.37 },
            ]},
            married: { brackets: [
                { upto: 22000, rate: 0.10 }, { upto: 89450, rate: 0.12 }, { upto: 190750, rate: 0.22 },
                { upto: 364200, rate: 0.24 }, { upto: 462500, rate: 0.32 }, { upto: 693750, rate: 0.35 },
                { upto: Infinity, rate: 0.37 },
            ]},
        },
    },
};

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
  'Czech Republic': 'CZK',
  'Thailand': 'THB',
  'Qatar': 'QAR',
  'Saudi Arabia': 'SAR',
  'China': 'CNY',
  'Hong Kong': 'HKD',
  'Malaysia': 'MYR',
  'Vietnam': 'VND',
  'USA': 'USD',
  'Australia': 'AUD',
  'Canada': 'CAD',
  'South Africa': 'ZAR',
  'New Zealand': 'NZD'
};

const ORDERED_CURRENCIES = [
  'USD', 'GBP', 'EUR',
  ...Object.keys(CONVERSION_RATES)
    .filter(c => !['USD', 'GBP', 'EUR'].includes(c))
    .sort()
];

const calculateTax = (income: number, country: string, filingStatus: 'single' | 'married', applySpecialRegime: boolean, dependents: number) => {
    const countryData = taxData[country];
    if (!countryData || income <= 0) return { totalTax: 0, incomeTax: 0, socialSecurity: 0, netIncome: income, effectiveRate: 0, taxCredit: 0, incomeTaxBeforeCredit: 0 };
    
    const { socialSecurity, filingStatuses, specialRegime, childTaxCredit } = countryData;
    const brackets = filingStatuses[filingStatus].brackets;
    
    let socialSecurityContrib = 0;
    const socialSecurityTaxableIncome = socialSecurity.floor ? Math.max(0, income - socialSecurity.floor) : income;
    const socialSecurityCappedIncome = socialSecurity.cap ? Math.min(socialSecurityTaxableIncome, socialSecurity.cap) : socialSecurityTaxableIncome;
    if (socialSecurity.rate > 0) {
        socialSecurityContrib = socialSecurityCappedIncome * socialSecurity.rate;
    }

    let incomeForTaxCalculation = income;
    if (country === 'Italy' && applySpecialRegime && specialRegime) {
        incomeForTaxCalculation = income * specialRegime.taxablePercentage;
    }

    let incomeTaxBeforeCredit = 0;
    let lastBracketUpto = 0;
    for (const bracket of brackets) {
        if (incomeForTaxCalculation > lastBracketUpto) {
            const taxableInBracket = Math.min(incomeForTaxCalculation, bracket.upto) - lastBracketUpto;
            incomeTaxBeforeCredit += taxableInBracket * bracket.rate;
            lastBracketUpto = bracket.upto;
        } else {
            break;
        }
    }
    
    const taxCredit = (childTaxCredit || 0) * dependents;
    const incomeTax = Math.max(0, incomeTaxBeforeCredit - taxCredit);

    const totalTax = incomeTax + socialSecurityContrib;
    const netIncome = income - totalTax;
    const effectiveRate = income > 0 ? (totalTax / income) * 100 : 0;

    return { incomeTax, socialSecurity: socialSecurityContrib, netIncome, totalTax, effectiveRate, taxCredit, incomeTaxBeforeCredit };
};

const DecodedItem = ({ icon, label, value, currency, isFree }: { icon?: React.ReactNode, label: string, value: number, currency: string, isFree?: boolean }) => (
    <div className="flex justify-between items-center text-sm py-1">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-muted-foreground font-medium">{label}</span>
      </div>
      <span className={cn("font-bold text-white", isFree && "text-green-400")}>
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

function TaxCalculatorSection() {
    const [salary, setSalary] = useState('60000');
    const [country, setCountry] = useState('United Kingdom');
    const [currency, setCurrency] = useState('GBP');
    const [filingStatus, setFilingStatus] = useState<'single' | 'married'>('single');
    const [dependents, setDependents] = useState('0');
    const [applySpecialRegime, setApplySpecialRegime] = useState(false);
    const [result, setResult] = useState<any>(null);
    
    const countriesWithCalculators = Object.keys(taxData).sort();
    const currencies = ORDERED_CURRENCIES;

    useEffect(() => {
        if (taxData[country]) {
            setCurrency(taxData[country].currency);
        }
        if (country !== 'Italy') {
            setApplySpecialRegime(false);
        }
    }, [country]);

    const handleCalculate = () => {
        const income = parseFloat(salary);
        const numDependents = parseInt(dependents) || 0;
        const incomeInLocalCurrency = income * (CONVERSION_RATES[currency] || 1) / (CONVERSION_RATES[taxData[country].currency] || 1);
        
        if (isNaN(incomeInLocalCurrency) || incomeInLocalCurrency <= 0) {
            setResult(null);
            return;
        }
        const calcResult = calculateTax(incomeInLocalCurrency, country, filingStatus, applySpecialRegime, numDependents);
        setResult(calcResult);
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="salary">Gross Annual Salary</Label>
                    <Input id="salary" type="number" value={salary} onChange={e => setSalary(e.target.value)} className="bg-background/50 border-white/10 text-right" />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="currency">Salary Currency</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                        <SelectTrigger id="currency" className="bg-background/50 border-white/10">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="glass">
                            {currencies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="country">Tax Country</Label>
                    <Select value={country} onValueChange={setCountry}>
                        <SelectTrigger id="country" className="bg-background/50 border-white/10">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="glass">
                            {countriesWithCalculators.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            
            <div className="flex flex-col md:flex-row gap-6 md:items-center">
                <div className="space-y-2">
                    <Label>Filing Status</Label>
                    <RadioGroup name="filingStatus" value={filingStatus} onValueChange={(val: 'single' | 'married') => setFilingStatus(val)} className="flex pt-2 gap-6">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="single" id="single" />
                        <Label htmlFor="single" className="font-normal">Single</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="married" id="married" />
                        <Label htmlFor="married" className="font-normal">Married</Label>
                      </div>
                    </RadioGroup>
                </div>
                 <div className="space-y-2 w-full md:w-48">
                    <Label htmlFor="dependents">Dependents</Label>
                    <Select value={dependents} onValueChange={setDependents}>
                        <SelectTrigger id="dependents" className="bg-background/50 border-white/10">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="glass">
                            <SelectItem value="0">0</SelectItem>
                            <SelectItem value="1">1</SelectItem>
                            <SelectItem value="2">2</SelectItem>
                            <SelectItem value="3">3</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <Button onClick={handleCalculate} className="w-full bg-primary hover:bg-primary/90 text-white font-bold">Calculate Signal</Button>

            {result && (
                <Card className="glass border-white/10 p-6 space-y-4">
                    <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
                        <span className="text-muted-foreground">Original Gross Salary</span>
                        <span className="font-bold text-white">{formatCurrency(parseFloat(salary) || 0, currency)}</span>
                    </div>
                    <div className="flex justify-between items-center text-red-400">
                        <span className="text-sm">Estimated Income Tax</span>
                        <span className="font-bold">-{formatCurrency(result.incomeTax, taxData[country].currency)}</span>
                    </div>
                    <div className="flex justify-between items-center text-orange-400">
                        <span className="text-sm">Social Contributions</span>
                        <span className="font-bold">-{formatCurrency(result.socialSecurity, taxData[country].currency)}</span>
                    </div>
                    <div className="flex justify-between items-center text-green-400 font-bold border-t border-white/5 pt-4 mt-2">
                        <span>Net Take-Home (Annual)</span>
                        <span>{formatCurrency(result.netIncome, taxData[country].currency)}</span>
                    </div>
                </Card>
            )}
        </div>
    );
}

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
  const [homeObligations, setHomeObligations] = useState('');
  const [studentLoan, setStudentLoan] = useState('');
  const [contingency] = useState('200');

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

  const suggestedMonthlySalary = useMemo(() => {
    if (!selectedSchool) return 0;
    const avgAnnual = getAverageAnnualSalary(selectedSchool.intel.salary.value);
    return Math.round((avgAnnual * 0.8) / 12);
  }, [selectedSchool]);

  const decodedCosts = useMemo(() => {
    if (!selectedSchool) return null;
    const col = selectedSchool.costOfLiving || {};
    const { intel } = selectedSchool;
    
    const multiplier = getFamilyScalingMultiplier(familyStatus);
    const { rent, label: rentLabel } = getRentForFamily(col, familyStatus);

    const food = (Number(col.food) || 0) * multiplier;
    const transport = (Number(col.transport) || 0) * multiplier;
    const utilities = (Number(col.utilities) || 0) * multiplier;
    const mobile = (Number(col.mobile) || 0) * (familyStatus === 'single' ? 1 : 2); 
    
    const totalCosts = (intel.housing.provided ? 0 : rent) + food + transport + utilities + (Number(col.internet) || 0) + mobile;

    return { rent, rentLabel, food, transport, utilities, internet: Number(col.internet) || 0, mobile, totalCosts };
  }, [selectedSchool, familyStatus]);

  const monthlySalaryToUse = offeredSalary ? parseFloat(offeredSalary) : suggestedMonthlySalary;
  const responsibilityAllowanceNum = parseFloat(responsibilityAllowance) || 0;
  const homeObligationsNum = parseFloat(homeObligations) || 0;
  const studentLoanNum = parseFloat(studentLoan) || 0;
  const burnRate = (decodedCosts?.totalCosts || 0) + homeObligationsNum + studentLoanNum;
  const totalIncome = monthlySalaryToUse + responsibilityAllowanceNum;
  const savingsPotential = totalIncome - burnRate - parseFloat(contingency);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* MY SETTINGS */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="bg-card/40 border-white/5 rounded-sm">
            <CardHeader>
              <CardTitle className="text-sm stamped-dossier text-white text-center">My Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-primary/70 uppercase tracking-tighter">Select School Dossier</Label>
                <Select value={selectedSchoolId ?? ''} onValueChange={setSelectedSchoolId}>
                  <SelectTrigger className="bg-background/50 border-white/10 h-10 rounded-sm">
                    <SelectValue placeholder="Search schools..." />
                  </SelectTrigger>
                  <SelectContent className="glass">
                    {schools?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-primary/70 uppercase tracking-tighter">Family Scaling</Label>
                <Select value={familyStatus} onValueChange={(v) => setFamilyStatus(v as FamilyStatus)}>
                  <SelectTrigger className="bg-background/50 border-white/10 h-10 rounded-sm">
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

              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <Label className="text-[10px] font-bold text-primary/70 uppercase tracking-tighter">Net Monthly Salary Offer</Label>
                  {suggestedMonthlySalary > 0 && !offeredSalary && (
                    <span className="text-[9px] font-black text-accent uppercase animate-pulse">Suggested Benchmark</span>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <div className="col-span-3 relative">
                    <Pencil className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      className="pl-10 bg-background/50 border-white/10 h-10 rounded-sm text-right font-bold" 
                      type="number" 
                      placeholder={suggestedMonthlySalary > 0 ? `${suggestedMonthlySalary}` : "0"} 
                      value={offeredSalary}
                      onChange={(e) => setOfferedSalary(e.target.value)}
                    />
                  </div>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger className="bg-background/50 border-white/10 h-10 rounded-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass">
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-primary/70 uppercase tracking-tighter">Responsibility Allowance (Monthly)</Label>
                <div className="relative">
                  <Medal className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input 
                    className="pl-10 bg-background/50 border-white/10 h-10 rounded-sm text-right" 
                    type="number" 
                    placeholder="0" 
                    value={responsibilityAllowance}
                    onChange={(e) => setResponsibilityAllowance(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-primary/70 uppercase tracking-tighter">Home-Country Obligations (Monthly)</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input 
                    className="pl-10 bg-background/50 border-white/10 h-10 rounded-sm text-right" 
                    type="number" 
                    placeholder="0" 
                    value={homeObligations}
                    onChange={(e) => setHomeObligations(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <Label className="text-[10px] font-bold text-primary/70 uppercase tracking-tighter">Student Loan Repayment (Monthly)</Label>
                  <div className="flex gap-2">
                    <a 
                      href="https://www.gov.uk/government/publications/overseas-earnings-thresholds-for-plan-5-student-loans#:~:text=How%20we%20calculate%20your%20repayment,you%20your%20monthly%20repayment%20amount." 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[9px] text-accent hover:underline flex items-center gap-1 font-bold"
                    >
                      UK <ExternalLink className="size-2" />
                    </a>
                    <a 
                      href="https://studentaid.gov/manage-loans/repayment/plans" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[9px] text-accent hover:underline flex items-center gap-1 font-bold"
                    >
                      US <ExternalLink className="size-2" />
                    </a>
                  </div>
                </div>
                <div className="relative">
                  <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input 
                    className="pl-10 bg-background/50 border-white/10 h-10 rounded-sm text-right" 
                    type="number" 
                    placeholder="0" 
                    value={studentLoan}
                    onChange={(e) => setStudentLoan(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-destructive/10 border-destructive/20 rounded-sm p-4 space-y-2">
            <h4 className="text-[10px] font-black text-destructive uppercase tracking-widest flex items-center gap-2">
              <ShieldAlert className="size-3" /> Due Diligence
            </h4>
            <p className="text-[11px] text-muted-foreground leading-tight">
              Always verify if the salary quoted is 'Net' or 'Gross'. Social security can take up to 15%.
            </p>
          </Card>
        </div>

        {/* Decoder View: INCOME & COSTS */}
        <div className="lg:col-span-2 space-y-8">
          <div className="grid md:grid-cols-2 gap-8">
            {/* INCOME & BENEFITS */}
            <Card className="bg-card/40 border-white/5 rounded-sm min-h-[280px]">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-3 stamped-dossier text-white">
                  <Award className="text-primary size-5" /> Income & Benefits
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-4">
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <Banknote className="size-3 text-green-400" />
                    <div className="flex flex-col">
                      <span className="text-sm text-muted-foreground font-medium">Monthly Net Salary</span>
                      {!offeredSalary && selectedSchool && (
                        <span className="text-[9px] font-bold text-primary/50 uppercase">Benchmark Applied</span>
                      )}
                    </div>
                  </div>
                  <span className={cn("font-bold text-lg", offeredSalary ? "text-green-400" : "text-green-400/50")}>
                    {formatCurrency(monthlySalaryToUse, currency)}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <Medal className="size-3 text-amber-400" />
                    <span className="text-sm text-muted-foreground font-medium">Responsibility Allowance</span>
                  </div>
                  <span className="font-bold text-white">
                    {formatCurrency(responsibilityAllowanceNum, currency)}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2">
                  <div className="flex items-center gap-2">
                    <Home className="size-3 text-sky-400" />
                    <span className="text-sm text-muted-foreground font-medium">Housing Arrangement</span>
                  </div>
                  <span className="text-sm font-bold text-white">
                    {selectedSchool?.intel.housing.provided ? "School Provided" : "Teacher Pays"}
                  </span>
                </div>

                <div className="pt-4 mt-2 border-t border-white/5">
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
                                <DialogHeader>
                                    <DialogDescription className="text-muted-foreground text-xs leading-relaxed">
                                        Estimate regional tax signatures and mandatory deductions across major international teaching territories.
                                    </DialogDescription>
                                </DialogHeader>
                            </DialogHeader>
                            <div className="mt-6 pt-6 border-t border-white/5">
                                <TaxCalculatorSection />
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
              </CardContent>
            </Card>

            {/* ESTIMATED COSTS */}
            <Card className="bg-card/40 border-white/5 rounded-sm">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-3 stamped-dossier text-white">
                  <Users className="text-destructive size-5" /> Estimated Costs
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-4">
                <DecodedItem label={decodedCosts?.rentLabel || 'Monthly Rent'} value={selectedSchool?.intel.housing.provided ? 0 : (decodedCosts?.rent || 0)} currency={currency} isFree={selectedSchool?.intel.housing.provided} />
                <DecodedItem label="Groceries (Scaled)" value={decodedCosts?.food || 0} currency={currency} />
                <DecodedItem label="Transport (Scaled)" value={decodedCosts?.transport || 0} currency={currency} />
                <DecodedItem label="Utilities (Scaled)" value={decodedCosts?.utilities || 0} currency={currency} />
                <DecodedItem label="Mobile phone (2 sims)" value={decodedCosts?.mobile || 0} currency={currency} />
                <DecodedItem label="Home internet (Fixed)" value={decodedCosts?.internet || 0} currency={currency} />
                
                {studentLoanNum > 0 && (
                  <DecodedItem icon={<GraduationCap className="size-3 text-emerald-400" />} label="Student Loan" value={studentLoanNum} currency={currency} />
                )}
                
                <div className="pt-6 mt-4 border-t border-white/10 flex justify-between items-center">
                  <span className="text-xs font-black uppercase tracking-widest text-white">Burn Rate</span>
                  <span className="text-xl font-bold text-primary">{formatCurrency(burnRate, currency)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* TRUE NET SAVINGS VERDICT */}
          <Card className={cn("glass border-2 rounded-sm p-8 shadow-2xl shadow-black/40", savingsPotential > 0 ? "border-green-500/30" : "border-destructive/30")}>
            <div className="space-y-8">
              <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="space-y-1 text-center md:text-left">
                  <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">True Net Savings</h4>
                  <div className="flex items-baseline gap-1">
                    <span className={cn("text-5xl font-black tracking-tighter", savingsPotential > 0 ? "text-green-400" : "text-destructive")}>
                      {savingsPotential < 0 ? '-' : ''}{formatCurrency(Math.abs(savingsPotential), currency)}
                    </span>
                    <span className="text-lg font-bold text-muted-foreground/50">/mo</span>
                  </div>
                </div>
                
                <div className="flex-1 max-w-md text-sm text-muted-foreground leading-relaxed text-center md:text-left font-medium">
                  The gap between your income and your cost of living.
                </div>

                <Button className="bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest px-8 py-7 h-auto rounded-sm transition-all shadow-[0_0_20px_rgba(249,115,22,0.2)]" asChild>
                  <Link href="/compare">Compare Offers</Link>
                </Button>
              </div>

              {/* Wealth Equivalents Row */}
              {savingsPotential !== 0 && (
                <div className="pt-6 border-t border-white/5">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                    {['GBP', 'USD', 'EUR', 'AUD'].map((targetCcy) => {
                      const savingsInUSD = savingsPotential / rate;
                      const convertedVal = Math.round(savingsInUSD * (CONVERSION_RATES[targetCcy] || 1));
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
        </div>
      </div>
  );
}

export default function EvaluatePage() {
  return (
    <div className="container mx-auto px-4 md:px-6 py-12">
      <div className="mb-16 text-center">
        <h1 className="text-3xl md:text-5xl font-bold tracking-tighter mb-4 text-white">
          2. Contract Decoder
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto font-medium text-sm">
          Military-grade analysis of your potential contract. We strip away recruitment marketing to reveal the true financial reality of your move.
        </p>
      </div>

      <Suspense fallback={<div className="flex justify-center items-center py-24"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
        <ContractDecoderContent />
      </Suspense>
    </div>
  );
}


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
import { Calculator, Info, Home, Plane, School as SchoolIcon, Award, Thermometer, Car, Beer, ArrowRightLeft, PiggyBank, LineChart, FileText, DollarSign, Utensils, TramFront, Zap, Wifi, Smartphone, Coffee, Stethoscope, Globe, ExternalLink, ShieldAlert, Milestone, GraduationCap, Pencil, Users, Loader2, Printer, Plus, Banknote, Medal } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { PieChart, Pie, Cell } from 'recharts';
import { ChartContainer, type ChartConfig } from '@/components/ui/chart';
import type { School } from '@/lib/types';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { getRentForFamily, type FamilyStatus } from '@/lib/rent-calculator';


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

type FeatureScore = 'good' | 'neutral' | 'bad';

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
  const [contingency, setContingency] = useState('200');
  const [homeCountryCommitment, setHomeCountryCommitment] = useState('');
  const [studentLoan, setStudentLoan] = useState('');

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
    
    const multiplier = (familyStatus === 'couple' ? 1.6 : familyStatus === 'family' ? 2.1 : familyStatus === 'family2' ? 2.5 : 1.0);
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

  const savingsPotential = useMemo(() => {
    if (!decodedCosts || !selectedSchool) return 0;
    const monthlySalary = offeredSalary ? parseFloat(offeredSalary) : suggestedMonthlyLocal;
    const allowance = parseFloat(responsibilityAllowance) || 0;
    if (isNaN(monthlySalary)) return 0;
    return (monthlySalary + allowance) - decodedCosts.totalCosts;
  }, [decodedCosts, offeredSalary, suggestedMonthlyLocal, responsibilityAllowance]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Input Panel */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="glass border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg stamped-dossier text-white text-center">My Settings</CardTitle>
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
                  {suggestedMonthlyLocal > 0 && (
                    <button 
                      onClick={() => setOfferedSalary(String(Math.round(suggestedMonthlyLocal)))}
                      className="text-[9px] font-bold text-accent hover:underline uppercase tracking-tighter"
                    >
                      Use Suggested: {formatCurrency(Math.round(suggestedMonthlyLocal), currency)}
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2 relative">
                    <Pencil className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      className="pl-10 pr-12 bg-background/50 border-white/10 rounded-sm h-10 text-right" 
                      type="number" 
                      placeholder={suggestedMonthlyLocal > 0 ? String(Math.round(suggestedMonthlyLocal)) : "0"} 
                      value={offeredSalary}
                      onChange={(e) => setOfferedSalary(e.target.value)}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground uppercase">{currency}</span>
                  </div>
                  <Select value={currency} disabled>
                    <SelectTrigger className="bg-background/50 border-white/10 rounded-sm h-10 opacity-100">
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
                <Label className="text-[10px] font-bold text-primary/70 uppercase">Responsibilities Allowance (monthly)</Label>
                <div className="relative">
                  <Medal className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input 
                    className="pl-10 pr-12 bg-background/50 border-white/10 rounded-sm h-10 text-right" 
                    type="number" 
                    placeholder="0" 
                    value={responsibilityAllowance}
                    onChange={(e) => setResponsibilityAllowance(e.target.value)}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground uppercase">{currency}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <Label className="text-[10px] font-bold text-primary/70 uppercase">Student Loan Repayment (monthly)</Label>
                  <div className="flex gap-2">
                    <a 
                      href="https://www.gov.uk/government/publications/overseas-earnings-thresholds-for-plan-5-student-loans" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[9px] text-accent hover:underline flex items-center gap-1 font-bold"
                    >
                      Gov. Uk <ExternalLink className="size-2" />
                    </a>
                    <a 
                      href="https://studentaid.gov/manage-loans/repayment/plans" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[9px] text-accent hover:underline flex items-center gap-1 font-bold"
                    >
                      US Aid <ExternalLink className="size-2" />
                    </a>
                  </div>
                </div>
                <div className="relative">
                  <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input 
                    className="pl-10 pr-12 bg-background/50 border-white/10 rounded-sm h-10 text-right" 
                    type="number" 
                    placeholder="0" 
                    value={studentLoan}
                    onChange={(e) => setStudentLoan(e.target.value)}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground uppercase">{currency}</span>
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
                    <CardTitle className="text-lg flex items-center gap-2 stamped-dossier text-white">
                      <Award className="text-primary w-5 h-5" /> Income & Benefits
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b border-white/5">
                      <div className="flex items-center gap-2">
                        <Banknote className="size-3 text-green-400" />
                        <span className="text-sm text-muted-foreground font-medium">Monthly Net Salary</span>
                      </div>
                      <div className="text-right">
                        <span className={cn("font-bold", offeredSalary ? "text-green-400" : "text-green-400/50")}>
                          {formatCurrency((offeredSalary ? parseFloat(offeredSalary) : suggestedMonthlyLocal), currency)}
                        </span>
                        {!offeredSalary && <p className="text-[9px] font-black text-primary/50 uppercase tracking-tighter">Projected Benchmark</p>}
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center py-2 border-b border-white/5">
                      <div className="flex items-center gap-2">
                        <Medal className="size-3 text-amber-400" />
                        <span className="text-sm text-muted-foreground font-medium">Responsibility Allowance</span>
                      </div>
                      <span className="font-bold text-white">
                        {formatCurrency(parseFloat(responsibilityAllowance) || 0, currency)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-2 border-b border-white/5">
                      <div className="flex items-center gap-2">
                        <Home className="size-3 text-sky-400" />
                        <span className="text-sm text-muted-foreground font-medium">Housing Arrangement</span>
                      </div>
                      <span className="text-sm font-semibold text-white">{selectedSchool.intel.housing.provided ? "100% Provided" : "Teacher Pays"}</span>
                    </div>
                    {selectedSchool.intel.housing.provided && (
                      <div className="flex justify-between items-center py-2 border-b border-white/5 text-green-400">
                        <div className="flex items-center gap-2">
                          <Plus className="size-3" />
                          <span className="text-sm font-medium">Housing Value Added</span>
                        </div>
                        <span className="text-sm font-bold">+{formatCurrency(decodedCosts?.rent || 0, currency)}</span>
                      </div>
                    )}

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
                                    <DialogDescription className="text-muted-foreground text-xs leading-relaxed">
                                        Estimate regional tax signatures and mandatory deductions across major international teaching territories.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="mt-6 pt-6 border-t border-white/5">
                                    <TaxCalculatorSection />
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                  </CardContent>
                </Card>

                {/* Costs Pane */}
                <Card className="glass rounded-sm border-white/10 shadow-lg shadow-black/20">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2 stamped-dossier text-white">
                      <Users className="text-destructive w-5 h-5" /> Estimated Costs
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <DecodedItem 
                      icon={<Home className="size-3 text-sky-400" />}
                      label={decodedCosts?.rentLabel || 'Rent'} 
                      value={selectedSchool.intel.housing.provided ? 0 : decodedCosts?.rent || 0} 
                      currency={currency} 
                      isFree={selectedSchool.intel.housing.provided} 
                    />
                    <DecodedItem 
                      icon={<Utensils className="size-3 text-amber-400" />}
                      label="Groceries (Scaled)" 
                      value={decodedCosts?.food || 0} 
                      currency={currency} 
                    />
                    <DecodedItem 
                      icon={<TramFront className="size-3 text-rose-400" />}
                      label="Transport (Scaled)" 
                      value={decodedCosts?.transport || 0} 
                      currency={currency} 
                    />
                    <DecodedItem 
                      icon={<Zap className="size-3 text-yellow-400" />}
                      label="Utilities (Scaled)" 
                      value={decodedCosts?.utilities || 0} 
                      currency={currency} 
                    />
                    <DecodedItem 
                      icon={<Smartphone className="size-3 text-pink-400" />}
                      label="Mobile phone" 
                      value={decodedCosts?.mobile || 0} 
                      currency={currency} 
                    />
                    <DecodedItem 
                      icon={<Wifi className="size-3 text-indigo-400" />}
                      label="Home internet (Fixed)" 
                      value={decodedCosts?.internet || 0} 
                      currency={currency} 
                    />
                    
                    <InteractiveCostItem 
                      icon={<Globe className="size-3 text-blue-400" />}
                      label="Home Country Commitment" 
                      value={homeCountryCommitment} 
                      currency={currency} 
                      onChange={setHomeCountryCommitment}
                    />

                    {decodedCosts?.manualStudentLoan ? (
                      <DecodedItem 
                        icon={<GraduationCap className="size-3 text-emerald-400" />}
                        label="Student loan" 
                        value={decodedCosts.manualStudentLoan} 
                        currency={currency} 
                      />
                    ) : null}
                    
                    <InteractiveCostItem 
                      icon={<Milestone className="size-3 text-purple-400" />}
                      label="Contingency Fund" 
                      value={contingency} 
                      currency={currency} 
                      onChange={setContingency}
                    />

                    <Separator className="my-2 bg-white/5" />
                    <div className="flex justify-between items-center font-bold">
                      <span className="text-sm uppercase tracking-tighter text-white">Total Costs</span>
                      <span className="text-destructive">{formatCurrency(decodedCosts?.totalCosts || 0, currency)}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Verdict Section */}
              <Card className={cn("glass border-2 rounded-sm", savingsPotential > 0 ? "border-green-500/30" : "border-destructive/30")}>
                <CardContent className="pt-6 space-y-6">
                  <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="text-center md:text-left">
                      <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">True Net Savings</h4>
                      <p className={cn("text-5xl font-black", savingsPotential > 0 ? "text-green-400" : "text-destructive")}>
                        {formatCurrency(savingsPotential, currency)}<span className="text-lg">/mo</span>
                      </p>
                    </div>
                    <div className="flex-1 max-w-sm text-sm text-muted-foreground leading-relaxed font-medium">
                      The gap between your income and your cost of living.
                    </div>
                    <Button className="bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest rounded-sm shadow-[0_0_20px_rgba(249,115,22,0.3)] transition-all hover:shadow-[0_0_30px_rgba(249,115,22,0.5)]" asChild>
                      <Link href="/compare">Compare Offers</Link>
                    </Button>
                  </div>

                  {savingsPotential !== 0 && (
                    <div className="pt-6 border-t border-white/5">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                        {['USD', 'GBP', 'EUR', 'AUD', 'CAD', 'ZAR'].filter(c => c !== currency).slice(0, 4).map((targetCcy) => {
                          const savingsInUSD = savingsPotential / rate;
                          const convertedVal = savingsInUSD * (CONVERSION_RATES[targetCcy] || 1);
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
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
  );
}

function TrueCostsSection() {
  const firestore = useFirestore();
  const schoolsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'schools') : null),
    [firestore]
  );
  const { data: schools, isLoading: isLoadingSchools } = useCollection<School>(schoolsQuery);

  const [selectedCountry, setSelectedCountry] = useState('United Kingdom');
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [familyStatus, setFamilyStatus] = useState<FamilyStatus>('single');
  const [currency, setCurrency] = useState('GBP');
  const [offeredNetMonthlySalary, setOfferedNetMonthlySalary] = useState('');
  const [otherMonthlyBenefits, setOtherMonthlyBenefits] = useState('');
  const [utilitiesAllowance, setUtilitiesAllowance] = useState('');
  const [partnerIncome, setPartnerIncome] = useState('');
  const [gratuityBonus, setGratuityBonus] = useState('');
  const [contingency, setContingency] = useState('');
  const [homeCountryCommitment, setHomeCountryCommitment] = useState('');
  const data = countrySpecificData[selectedCountry];

  const searchParams = useSearchParams();
  const [isTaxDialogOpen, setIsTaxDialogOpen] = useState(searchParams.get('open_tax_calculator') === 'true');

  useEffect(() => {
    if (searchParams.get('open_tax_calculator') === 'true') {
        setIsTaxDialogOpen(true);
    }
  }, [searchParams]);

  const availableCountries = useMemo(() => {
    if (!schools) return [];
    const countriesInDb = [...new Set(schools.map(school => school.country))];
    const supportedCountries = countriesInDb.filter(c => Object.keys(countrySpecificData).includes(c));
    return supportedCountries.sort();
  }, [schools]);

  useEffect(() => {
    if (availableCountries.length > 0 && !availableCountries.includes(selectedCountry)) {
      setSelectedCountry(availableCountries[0]);
    }
  }, [availableCountries, selectedCountry]);

  const conversionRates: { [key: string]: number } = {
    USD: 1,
    GBP: 0.8,
    EUR: 0.92,
  };
  const usdRate = conversionRates[currency] ?? 1;

  const convert = (amount: number) => amount * usdRate;
  
  const schoolsInCountry = useMemo(() => {
    if (!schools) return [];
    return schools.filter(school => school.country === selectedCountry);
    }, [schools, selectedCountry]);

  const selectedSchool = useMemo(() => {
      if (!selectedSchoolId || !schools) return null;
      return schools.find(s => s.id === selectedSchoolId);
  }, [selectedSchoolId, schools]);

  useEffect(() => {
    if (schoolsInCountry.length > 0) {
      if (!selectedSchoolId || !schoolsInCountry.some(s => s.id === selectedSchoolId)) {
        const ukSchoolExists = schoolsInCountry.find(s => s.id === 'acs-cobham-international-school');
        if (selectedCountry === 'United Kingdom' && ukSchoolExists) {
          setSelectedSchoolId('acs-cobham-international-school');
        } else {
          setSelectedSchoolId(schoolsInCountry[0].id);
        }
      }
    } else {
      setSelectedSchoolId(null);
    }
  }, [schoolsInCountry, selectedCountry, selectedSchoolId]);

  const handleCountryChange = (country: string) => {
    setSelectedCountry(country);
    setSelectedSchoolId(null);
  };

  useEffect(() => {
    setOfferedNetMonthlySalary('');
    setUtilitiesAllowance('');
    setPartnerIncome('');
    setGratuityBonus('');
    if (selectedSchool && selectedSchool.intel.housing.provided) {
        const rentInUSD = getRentForFamily(selectedSchool.costOfLiving, familyStatus).rent;
        setOtherMonthlyBenefits(String(Math.round(convert(rentInUSD))));
    } else {
        setOtherMonthlyBenefits('');
    }
  }, [selectedSchoolId, selectedSchool, familyStatus, currency]);

  const familyStatusLabels: {[key: string]: string} = {
    single: 'Single',
    couple: 'Couple',
    family: 'Family 2+1',
    family2: 'Family 2+2',
  };

  let adults = 1;
  let children = 0;
  if (familyStatus === 'couple') {
    adults = 2;
    children = 0;
  } else if (familyStatus === 'family') {
    adults = 2;
    children = 1;
  } else if (familyStatus === 'family2') {
    adults = 2;
    children = 2;
  }

  const calculateTotal = (school: School | null | undefined) => {
    if (!school) return 0;
    const { costOfLiving, intel } = school;
    const foodCost = (costOfLiving.food ?? 0) * adults + (costOfLiving.food ?? 0) * 0.5 * children;
    const transportCost = (costOfLiving.transport ?? 0) * adults + (costOfLiving.transport ?? 0) * 0.3 * children;
    const mobileCost = (costOfLiving.mobile ?? 0) * adults;
    const diningSocialCost = (costOfLiving.diningSocial ?? 0) * adults;
    const uncoveredMedicalCost = (costOfLiving.uncoveredMedical ?? 0) * adults + (costOfLiving.uncoveredMedical ?? 0) * 0.5 * children;

    const { rent } = getRentForFamily(costOfLiving, familyStatus);
    const apartmentCost = intel.housing.provided ? 0 : rent;

    const total =
      apartmentCost +
      foodCost +
      transportCost +
      (costOfLiving.utilities ?? 0) +
      (costOfLiving.internet ?? 0) +
      mobileCost +
      diningSocialCost +
      (costOfLiving.vehicleInsuranceMaint ?? 0) +
      uncoveredMedicalCost;
      
    return total;
  };
  
  const avgGrossAnnualSalary = selectedSchool ? getAverageAnnualSalary(selectedSchool.intel.salary.value) : 0;
  const estimatedNetMonthlySalaryUSD = (avgGrossAnnualSalary * 0.8) / 12;

  const numericNetMonthlySalary = parseFloat(offeredNetMonthlySalary) || 0;
  const numericOtherMonthlyBenefits = parseFloat(otherMonthlyBenefits) || 0;
  const numericUtilitiesAllowance = parseFloat(utilitiesAllowance) || 0;
  const numericPartnerIncome = parseFloat(partnerIncome) || 0;
  const numericContingency = parseFloat(contingency) || 0;
  const numericGratuityBonus = parseFloat(gratuityBonus) || 0;
  const numericHomeCommitment = parseFloat(homeCountryCommitment) || 0;

  const offeredNetMonthlySalaryInUSD = numericNetMonthlySalary > 0 ? numericNetMonthlySalary / usdRate : 0;
  const otherMonthlyBenefitsInUSD = numericOtherMonthlyBenefits / usdRate;
  const utilitiesAllowanceInUSD = numericUtilitiesAllowance / usdRate;
  const partnerIncomeInUSD = numericPartnerIncome / usdRate;
  const contingencyInUSD = numericContingency / usdRate;
  const gratuityBonusInUSD = numericGratuityBonus / usdRate;
  const homeCommitmentInUSD = numericHomeCommitment / usdRate;

  const salaryToUseInUSD = offeredNetMonthlySalaryInUSD > 0 ? offeredNetMonthlySalaryInUSD : estimatedNetMonthlySalaryUSD;

  const totalMonthlyPackage = salaryToUseInUSD + otherMonthlyBenefitsInUSD + utilitiesAllowanceInUSD + partnerIncomeInUSD + gratuityBonusInUSD;
  const totalMonthlyCosts = (selectedSchool ? calculateTotal(selectedSchool) : 0) + contingencyInUSD + homeCommitmentInUSD;
  const monthlySavings = totalMonthlyPackage - totalMonthlyCosts;
  const annualSavings = monthlySavings * 12;

  let savingsDescription: React.ReactNode = data.savings.text;
  let savingsScore: FeatureScore = data.savings.score;

  if (selectedSchool) {
    const monthlyIncome = salaryToUseInUSD;
    const formattedSavings = formatCurrency(annualSavings * usdRate, currency);

    savingsDescription = `Based on an estimated net monthly income and your lifestyle costs, your projected annual savings are approximately ${formattedSavings}.`;

    if (monthlySavings > (monthlyIncome * 0.3)) {
        savingsScore = 'good';
    } else if (monthlySavings > (monthlyIncome * 0.1)) {
        savingsScore = 'neutral';
    } else {
        savingsScore = 'bad';
    }
  }

  const lifestyleData = {
    importedGoods: { ...data.importedGoods },
    utilities: { ...data.utilities },
    transportation: { ...data.transportation },
    socialLeisure: { ...data.socialLeisure },
    safety: { ...data.safety },
  };

  if (selectedSchool) {
      const { costOfLiving, location } = selectedSchool;

      if ((costOfLiving.utilities ?? 0) > 250) {
          lifestyleData.utilities.score = 'bad';
          lifestyleData.utilities.text = `AC in summer or heating in winter can lead to high utility bills in ${location}. Expect costs to be a significant budget item.`;
      } else if ((costOfLiving.utilities ?? 0) < 150) {
          lifestyleData.utilities.score = 'good';
          lifestyleData.utilities.text = `Utility costs in ${location} are generally reasonable, helping to keep monthly expenses down.`;
      } else {
           lifestyleData.utilities.score = 'neutral';
           lifestyleData.utilities.text = `Utility costs in ${location} are average for the region. ${data.utilities.text}`;
      }

      if ((costOfLiving.transport ?? 0) > 200) {
          lifestyleData.transportation.score = 'bad';
          lifestyleData.transportation.text = `Transportation in ${location} can be costly. Whether using public transit or owning a car, this should be factored into your budget.`;
      } else if ((costOfLiving.transport ?? 0) < 100) {
          lifestyleData.transportation.text = `Getting around ${location} is affordable, with efficient and cost-effective public transport options available.`;
      } else {
          lifestyleData.transportation.score = 'neutral';
          lifestyleData.transportation.text = `Transportation costs in ${location} are moderate. ${data.transportation.text}`;
      }

      if ((costOfLiving.diningSocial ?? 0) > 400) {
          lifestyleData.socialLeisure.score = 'bad';
          lifestyleData.socialLeisure.text = `The social scene in ${location} is vibrant but can be expensive. Dining out and entertainment are premium-priced.`;
      } else if ((costOfLiving.diningSocial ?? 0) < 250) {
          lifestyleData.socialLeisure.score = 'good';
          lifestyleData.socialLeisure.text = `Enjoying a social life in ${location} is quite affordable, with many budget-friendly options for dining and leisure.`;
      } else {
          lifestyleData.socialLeisure.score = 'neutral';
          lifestyleData.socialLeisure.text = `The cost of social activities in ${location} is on par with other major cities. ${data.socialLeisure.text}`;
      }
      
      lifestyleData.importedGoods.text = `In ${location}, you'll find supermarkets full of imported Western brands, but they often come at a premium. ${data.importedGoods.text}`;
  }

  const contractPerksData = {
    taxStatus: data.taxStatus,
    housing: data.housing,
    flightAllowance: data.flightAllowance,
    dependentTuition: data.dependentTuition,
    gratuity: data.gratuity,
  };

  if (selectedSchool) {
    if (selectedSchool.intel.salary.isTaxFree) {
      contractPerksData.taxStatus = { text: 'This school offers a 100% tax-free salary, a major financial advantage.', score: 'good', percentage: '0%' };
    } else {
      contractPerksData.taxStatus = { ...data.taxStatus, text: `At this school, salaries are subject to ${selectedCountry}'s income tax. ${data.taxStatus.text}`};
    }

    if (selectedSchool.intel.housing.provided) {
      contractPerksData.housing = { text: `This school provides housing (${selectedSchool.intel.housing.value}), removing a teacher's largest monthly expense.`, score: 'good', percentage: '100%' };
    } else {
      contractPerksData.housing = { text: `Housing is not provided by this school (${selectedSchool.intel.housing.value}). Rent will be a significant monthly cost.`, score: 'bad', percentage: '0%' };
    }

    const note = "Note: This is a school-specific benefit. Verify contract details.";
    contractPerksData.flightAllowance = { ...data.flightAllowance, text: `${data.flightAllowance.text} ${note}` };
    contractPerksData.dependentTuition = { ...data.dependentTuition, text: `${data.dependentTuition.text} ${note}` };
    contractPerksData.gratuity = { ...data.gratuity, text: `${data.gratuity.text} ${note}` };
  }

  const homeObligationsData = { ...data.homeObligations };
    homeObligationsData.text = `Working abroad requires managing finances across two countries. Your net salary in ${selectedCountry} needs to cover commitments back home.`;
    homeObligationsData.score = 'neutral';

    const getSafetyScore = (rankString: string | undefined): FeatureScore => {
        if (!rankString) return 'neutral';
        const rank = parseInt(rankString.replace('Rank ', ''));
        if (isNaN(rank)) return 'neutral';
        if (rank <= 20) return 'good';
        if (rank <= 60) return 'neutral';
        return 'bad';
    };

    lifestyleData.safety.score = getSafetyScore(lifestyleData.safety.percentage);
    
    if (isLoadingSchools) {
        return (
          <div className="flex justify-center items-center h-96">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        );
    }

  return (
    <div className="max-w-5xl mx-auto">
        <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4 print:hidden">
          <div>
            <Label htmlFor="country-select" className="text-base font-semibold block text-center mb-2">Target Country</Label>
            <Select value={selectedCountry} onValueChange={handleCountryChange}>
              <SelectTrigger id="country-select">
                <SelectValue placeholder="Select a country" />
              </SelectTrigger>
              <SelectContent>
                {availableCountries.map(country => (
                  <SelectItem key={country} value={country}>{country}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="school-select" className="text-base font-semibold block text-center mb-2">School (Optional)</Label>
             <Select value={selectedSchoolId ?? 'all'} onValueChange={(value) => setSelectedSchoolId(value === 'all' ? null : value)} disabled={schoolsInCountry.length === 0}>
                <SelectTrigger id="school-select">
                  <SelectValue placeholder="Select a school" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">-- All Schools in {selectedCountry} --</SelectItem>
                  {schoolsInCountry.map(school => (
                    <SelectItem key={school.id} value={school.id}>{school.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
          </div>
          <div>
            <Label htmlFor="family-status-select" className="text-base font-semibold block text-center mb-2">Family Status</Label>
            <Select value={familyStatus} onValueChange={(v) => setFamilyStatus(v as FamilyStatus)}>
              <SelectTrigger id="family-status-select">
                <SelectValue placeholder="Select family status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Single</SelectItem>
                <SelectItem value="couple">Couple</SelectItem>
                <SelectItem value="family">Family 2+1</SelectItem>
                <SelectItem value="family2">Family of 4</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end mb-4 print:hidden">
            <Button onClick={() => window.print()} variant="outline" size="sm" className="bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary font-bold uppercase tracking-widest text-[10px]">
                <Printer className="mr-2 h-3 w-3" />
                Print Intel Report (PDF)
            </Button>
        </div>

        {selectedSchool && (
            <Card id="financial-snapshot" className="mb-8 bg-card/70 backdrop-blur-sm border-border scroll-mt-24 print:bg-white print:text-black print:shadow-none print:border-black/10">
                <CardHeader className="flex-row items-center justify-between pb-4">
                    <div>
                        <CardTitle className="flex flex-wrap items-baseline text-xl print:text-black">
                            <LineChart className="w-5 h-5 mr-2 text-primary shrink-0 print:hidden" />
                            <span>Financial Snapshot:</span>
                            <span className="ml-2 text-lg text-muted-foreground font-medium normal-case tracking-normal print:text-black">{selectedSchool.name}</span>
                        </CardTitle>
                        <CardDescription className="mt-1 print:text-gray-600">
                             Use our <Dialog open={isTaxDialogOpen} onOpenChange={setIsTaxDialogOpen}><DialogTrigger asChild><span className="text-sky-400 hover:underline cursor-pointer print:hidden">Tax Calculator</span></DialogTrigger><DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Worldwide Salary Tax Calculator</DialogTitle><CardDescription>
                            Estimate your take-home pay in different countries. This tool calculates based on standard local resident tax rates.
                        </CardDescription></DialogHeader><TaxCalculatorSection /></DialogContent></Dialog> and Family Status selector to ensure best results.
                        </CardDescription>
                    </div>
                    <div className="w-[120px] print:hidden">
                        <Select value={currency} onValueChange={setCurrency}>
                            <SelectTrigger id="currency-select-page">
                                <SelectValue placeholder="Currency" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="GBP">GBP (GBP)</SelectItem>
                                <SelectItem value="USD">USD (USD)</SelectItem>
                                <SelectItem value="EUR">EUR (EUR)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="hidden print:block font-bold text-lg uppercase tracking-widest">
                        {currency} REPORT
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                        
                        <div className="space-y-4 flex flex-col justify-between">
                            <div className="space-y-2">
                                <h3 className="font-semibold text-lg text-foreground border-b pb-2 mb-2 print:text-black print:border-black">Income &amp; Benefits (Monthly)</h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between items-center">
                                        <Label htmlFor="offered-salary" className="flex items-center text-muted-foreground print:text-gray-600">
                                            <Pencil className="w-4 h-4 mr-2 text-green-400 print:hidden" /> Your Net Monthly Salary
                                        </Label>
                                        <div className="relative w-[120px]">
                                            <Input
                                                id="offered-salary"
                                                type="text"
                                                inputMode="numeric"
                                                placeholder={`${Math.round(convert(estimatedNetMonthlySalaryUSD))}`}
                                                value={offeredNetMonthlySalary}
                                                onChange={(e) => setOfferedNetMonthlySalary(e.target.value)}
                                                className="mt-0 max-w-[120px] h-8 text-right bg-input/40 print:bg-transparent print:border-none print:text-black print:p-0 print:font-bold"
                                            />
                                            <span className="hidden print:inline-block ml-1 text-[8px] font-bold text-gray-400">{currency}</span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <Label htmlFor="other-benefits" className="flex items-center text-muted-foreground print:text-gray-600">
                                            <Award className="w-4 h-4 mr-2 text-blue-400 print:hidden" /> Housing Benefit Est.
                                        </Label>
                                        <div className="relative w-[120px]">
                                            <Input
                                                id="other-benefits"
                                                type="text"
                                                inputMode="numeric"
                                                placeholder="0"
                                                value={otherMonthlyBenefits}
                                                onChange={(e) => setOtherMonthlyBenefits(e.target.value)}
                                                className="mt-0 max-w-[120px] h-8 text-right bg-input/40 print:bg-transparent print:border-none print:text-black print:p-0 print:font-bold"
                                            />
                                            <span className="hidden print:inline-block ml-1 text-[8px] font-bold text-gray-400">{currency}</span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <Label htmlFor="utilities-allowance" className="flex items-center text-muted-foreground print:text-gray-600">
                                            <Zap className="w-4 h-4 mr-2 text-yellow-400 print:hidden" /> Utilities Allowance
                                        </Label>
                                        <div className="relative w-[120px]">
                                            <Input
                                                id="utilities-allowance"
                                                type="text"
                                                inputMode="numeric"
                                                placeholder="0"
                                                value={utilitiesAllowance}
                                                onChange={(e) => setUtilitiesAllowance(e.target.value)}
                                                className="mt-0 max-w-[120px] h-8 text-right bg-input/40 print:bg-transparent print:border-none print:text-black print:p-0 print:font-bold"
                                            />
                                            <span className="hidden print:inline-block ml-1 text-[8px] font-bold text-gray-400">{currency}</span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <Label htmlFor="partner-income" className="flex items-center text-muted-foreground print:text-gray-600">
                                            <Users className="w-4 h-4 mr-2 text-purple-400 print:hidden" /> Other / Partner Income
                                        </Label>
                                        <div className="relative w-[120px]">
                                            <Input
                                                id="partner-income"
                                                type="text"
                                                inputMode="numeric"
                                                placeholder="0"
                                                value={partnerIncome}
                                                onChange={(e) => setPartnerIncome(e.target.value)}
                                                className="mt-0 max-w-[120px] h-8 text-right bg-input/40 print:bg-transparent print:border-none print:text-black print:p-0 print:font-bold"
                                            />
                                            <span className="hidden print:inline-block ml-1 text-[8px] font-bold text-gray-400">{currency}</span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <Label htmlFor="gratuity-bonus" className="flex items-center text-muted-foreground print:text-gray-600">
                                            <Award className="w-4 h-4 mr-2 text-yellow-500 print:hidden" /> Gratuity / Bonus
                                        </Label>
                                        <div className="relative w-[120px]">
                                            <Input
                                                id="gratuity-bonus"
                                                type="text"
                                                inputMode="numeric"
                                                placeholder="0"
                                                value={gratuityBonus}
                                                onChange={(e) => setGratuityBonus(e.target.value)}
                                                className="mt-0 max-w-[120px] h-8 text-right bg-input/40 print:bg-transparent print:border-none print:text-black print:p-0 print:font-bold"
                                            />
                                            <span className="hidden print:inline-block ml-1 text-[8px] font-bold text-gray-400">{currency}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <Separator className="my-4 print:border-black"/>
                                <div className="flex justify-between items-center font-bold text-lg print:text-black">
                                    <span className="text-primary-foreground print:text-black">Total Monthly Package</span>
                                    <span className="text-green-400 print:text-green-700">{formatCurrency(totalMonthlyPackage * usdRate, currency)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 flex flex-col justify-between">
                             <div className="space-y-1">
                                <h3 className="font-semibold text-lg text-foreground border-b pb-2 mb-2 print:text-black print:border-black">Estimated Costs ({familyStatusLabels[familyStatus]})</h3>
                                <div className="space-y-1 text-sm text-muted-foreground print:text-gray-600">
                                    <div className="flex justify-between items-center">
                                        <span className="flex items-center"><Home className="w-4 h-4 mr-2 text-sky-400 print:hidden" /> Monthly Rent ({familyStatus === 'single' ? '1BR' : '2BR+'})</span>
                                        <span className="print:font-bold print:text-black">{selectedSchool.intel.housing.provided ? "Provided" : formatCurrency(getRentForFamily(selectedSchool.costOfLiving, familyStatus).rent * usdRate, currency)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="flex items-center"><Zap className="w-4 h-4 mr-2 text-yellow-400 print:hidden" /> Utilities</span>
                                        <span className="print:font-bold print:text-black">{formatCurrency((selectedSchool.costOfLiving.utilities ?? 0) * usdRate, currency)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="flex items-center"><Wifi className="w-4 h-4 mr-2 text-indigo-400 print:hidden" /> Internet</span>
                                        <span className="print:font-bold print:text-black">{formatCurrency((selectedSchool.costOfLiving.internet ?? 0) * usdRate, currency)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="flex items-center"><Smartphone className="w-4 h-4 mr-2 text-pink-400 print:hidden" /> Mobile</span>
                                        <span className="print:font-bold print:text-black">{formatCurrency((selectedSchool.costOfLiving.mobile ?? 0) * adults * usdRate, currency)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="flex items-center"><Utensils className="w-4 h-4 mr-2 text-amber-400 print:hidden" /> Groceries</span>
                                        <span className="print:font-bold print:text-black">{formatCurrency(((selectedSchool.costOfLiving.food ?? 0) * adults + (selectedSchool.costOfLiving.food ?? 0) * 0.5 * children) * usdRate, currency)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="flex items-center"><Coffee className="w-4 h-4 mr-2 text-yellow-600 print:hidden" /> Dining &amp; Social</span>
                                        <span className="print:font-bold print:text-black">{formatCurrency((selectedSchool.costOfLiving.diningSocial ?? 0) * adults * usdRate, currency)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="flex items-center"><TramFront className="w-4 h-4 mr-2 text-rose-400 print:hidden" /> Transport</span>
                                        <span className="print:font-bold print:text-black">{formatCurrency(((selectedSchool.costOfLiving.transport ?? 0) * adults + (selectedSchool.costOfLiving.transport ?? 0) * 0.3 * children) * usdRate, currency)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <Label htmlFor="home-commitment" className="flex items-center text-muted-foreground print:text-gray-600">
                                            <Globe className="w-4 h-4 mr-2 text-sky-400 print:hidden" /> Home Country Commitment
                                        </Label>
                                        <div className="relative w-[120px]">
                                            <Input
                                                id="home-commitment"
                                                type="text"
                                                inputMode="numeric"
                                                placeholder="0"
                                                value={homeCountryCommitment}
                                                onChange={(e) => setHomeCountryCommitment(e.target.value)}
                                                className="mt-0 max-w-[120px] h-8 text-right bg-input/40 print:bg-transparent print:border-none print:text-black print:p-0 print:font-bold"
                                            />
                                            <span className="hidden print:inline-block ml-1 text-[8px] font-bold text-gray-400">{currency}</span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <Label htmlFor="contingency-cost" className="flex items-center text-muted-foreground print:text-gray-600">
                                            <Milestone className="w-4 h-4 mr-2 text-purple-400 print:hidden" /> Contingency Fund
                                        </Label>
                                        <div className="relative w-[120px]">
                                            <Input
                                                id="contingency-cost"
                                                type="text"
                                                inputMode="numeric"
                                                placeholder="0"
                                                value={contingency}
                                                onChange={(e) => setContingency(e.target.value)}
                                                className="mt-0 max-w-[120px] h-8 text-right bg-input/40 print:bg-transparent print:border-none print:text-black print:p-0 print:font-bold"
                                            />
                                            <span className="hidden print:inline-block ml-1 text-[8px] font-bold text-gray-400">{currency}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <Separator className="my-4 print:border-black"/>
                                <div className="flex justify-between items-center font-bold text-lg print:text-black">
                                    <span className="text-primary-foreground print:text-black">Total Estimated Costs</span>
                                    <span className="text-red-400 print:text-red-700">{formatCurrency(totalMonthlyCosts * usdRate, currency)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="pt-6">
                        <Separator className="mb-6 print:border-black" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center print:grid-cols-2">
                            <div className={cn("p-4 rounded-lg print:border print:border-gray-200", monthlySavings >= 0 ? "bg-green-500/10 print:bg-green-50" : "bg-red-500/10 print:bg-red-50")}>
                                <h4 className="text-sm font-semibold text-muted-foreground print:text-gray-600 uppercase tracking-widest">PROJECTED MONTHLY SAVINGS</h4>
                                <p className={cn("text-3xl font-bold mt-1", monthlySavings >= 0 ? "text-green-400 print:text-green-700" : "text-red-400 print:text-red-700")}>
                                    {formatCurrency(monthlySavings * usdRate, currency)}
                                </p>
                            </div>
                             <div className={cn("p-4 rounded-lg print:border print:border-gray-200", annualSavings >= 0 ? "bg-green-500/10 print:bg-green-50" : "bg-red-500/10 print:bg-red-50")}>
                                <h4 className="text-sm font-semibold text-muted-foreground print:text-gray-600 uppercase tracking-widest">PROJECTED ANNUAL SAVINGS</h4>
                                <p className={cn("text-3xl font-bold mt-1", annualSavings >= 0 ? "text-green-400 print:text-green-700" : "text-red-400 print:text-red-700")}>
                                    {formatCurrency(annualSavings * usdRate, currency)}
                                </p>
                            </div>
                        </div>
                        <div className="mt-6 text-center print:hidden">
                           <p className="text-muted-foreground text-sm">
                                Use our{' '}
                                <Dialog open={isTaxDialogOpen} onOpenChange={setIsTaxDialogOpen}>
                                    <DialogTrigger asChild>
                                        <span className="text-sky-400 hover:underline cursor-pointer">Tax Calculator</span>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                                        <DialogHeader>
                                            <DialogTitle>Worldwide Salary Tax Calculator</DialogTitle>
                                            <CardDescription>
                                                Estimate your take-home pay in different countries. This tool calculates based on standard local resident tax rates.
                                            </CardDescription>
                                        </DialogHeader>
                                        <TaxCalculatorSection />
                                    </DialogContent>
                                </Dialog>
                                {' '}and Family Status selector to ensure best results.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        )}

        <div className="mt-12 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print:grid-cols-2">
                <Card id="package-deals" className="bg-card/70 backdrop-blur-sm border-border flex flex-col scroll-mt-24 print:bg-white print:text-black print:shadow-none print:border-black/10">
                    <CardHeader>
                        <CardTitle className="print:text-black">Intel</CardTitle>
                        <p className="text-sm text-muted-foreground capitalize pt-1 print:text-gray-600">
                            {selectedCountry}
                            {selectedSchool ? ` | ${selectedSchool.name}` : ''}
                            {' | '}
                            {familyStatusLabels[familyStatus]}
                        </p>
                    </CardHeader>
                    <CardContent className="flex-grow pt-0">
                        <div className="space-y-4">
                            <FeatureDetail 
                                icon={<FileText className="w-5 h-5 print:hidden" />}
                                title="Tax Status"
                                description={<>
                                    {contractPerksData.taxStatus.text}
                                </>}
                                score={contractPerksData.taxStatus.score}
                                percentage={contractPerksData.taxStatus.percentage}
                            />
                            <FeatureDetail 
                                icon={<Home className="w-5 h-5 print:hidden" />}
                                title="Housing Arrangement"
                                description={contractPerksData.housing.text}
                                score={contractPerksData.housing.score}
                                percentage={contractPerksData.housing.percentage}
                            />
                            <FeatureDetail 
                                icon={<Plane className="w-5 h-5 print:hidden" />}
                                title="Annual Flight"
                                description={contractPerksData.flightAllowance.text}
                                score={contractPerksData.flightAllowance.score}
                                percentage={contractPerksData.flightAllowance.percentage}
                            />
                        </div>
                        <Separator className="my-4 print:border-black" />
                        <div className="space-y-4">
                            <FeatureDetail 
                                icon={<SchoolIcon className="w-5 h-5 print:hidden" />}
                                title="Dependent Tuition"
                                description={contractPerksData.dependentTuition.text}
                                score={contractPerksData.dependentTuition.score}
                                percentage={contractPerksData.dependentTuition.percentage}
                            />
                            <FeatureDetail 
                                icon={<Award className="w-5 h-5 print:hidden" />}
                                title="Gratuity"
                                description={contractPerksData.gratuity.text}
                                score={contractPerksData.gratuity.score}
                                percentage={contractPerksData.gratuity.percentage}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card id="true-lifestyle" className="bg-card/70 backdrop-blur-sm border-border flex flex-col scroll-mt-24 print:bg-white print:text-black print:shadow-none print:border-black/10">
                    <CardHeader>
                        <CardTitle className="print:text-black">Lifestyle</CardTitle>
                        <p className="text-sm text-muted-foreground capitalize pt-1 print:text-gray-600">
                            {selectedCountry}
                            {selectedSchool ? ` | ${selectedSchool.name}` : ''}
                            {' | '}
                            {familyStatusLabels[familyStatus]}
                        </p>
                    </CardHeader>
                    <CardContent className="flex-grow pt-0">
                        <div className="space-y-4">
                            <FeatureDetail 
                                icon={<Globe className="w-5 h-5 print:hidden" />}
                                title="Imported Goods"
                                description={lifestyleData.importedGoods.text}
                                score={lifestyleData.importedGoods.score}
                                percentage={lifestyleData.importedGoods.percentage}
                            />
                            <FeatureDetail 
                                icon={<Thermometer className="w-5 h-5 print:hidden" />}
                                title="Utilities (AC/Heat)"
                                description={lifestyleData.utilities.text}
                                score={lifestyleData.utilities.score}
                                percentage={lifestyleData.utilities.percentage}
                            />
                            <FeatureDetail 
                                icon={<Car className="w-5 h-5 print:hidden" />}
                                title="Transportation"
                                description={lifestyleData.transportation.text}
                                score={lifestyleData.transportation.score}
                                percentage={lifestyleData.transportation.percentage}
                            />
                            <FeatureDetail 
                                icon={<Beer className="w-5 h-5 print:hidden" />}
                                title="Social &amp; Leisure"
                                description={lifestyleData.socialLeisure.text}
                                score={lifestyleData.socialLeisure.score}
                                percentage={lifestyleData.socialLeisure.percentage}
                            />
                        </div>
                        <Separator className="my-4 print:border-black" />
                        <div className="space-y-4">
                            <FeatureDetail 
                                icon={<ShieldAlert className="w-5 h-5 print:hidden" />}
                                title="Safety &amp; Travel Advice"
                                description={lifestyleData.safety.text}
                                score={lifestyleData.safety.score}
                                percentage={lifestyleData.safety.percentage}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8 print:grid-cols-2">
                <Card id="financial-strategy-card" className="bg-card/70 backdrop-blur-sm border-border flex flex-col scroll-mt-24 print:bg-white print:text-black print:shadow-none print:border-black/10">
                    <CardHeader>
                        <CardTitle className="print:text-black">Financial</CardTitle>
                        <p className="text-sm text-muted-foreground capitalize pt-1 print:text-gray-600">
                                {selectedCountry}
                                {selectedSchool ? ` | ${selectedSchool.name}` : ''}
                                {' | '}
                                {familyStatusLabels[familyStatus]}
                        </p>
                    </CardHeader>
                    <CardContent className="flex-grow pt-0">
                        <div className="space-y-4">
                            <FeatureDetail 
                                icon={<ArrowRightLeft className="w-5 h-5 print:hidden" />}
                                title="Currency &amp; Fees"
                                description={data.currency.text}
                                score={data.currency.score}
                            />
                            <FeatureDetail 
                                icon={<PiggyBank className="w-5 h-5 print:hidden" />}
                                title="Home Obligations"
                                description={homeObligationsData.text}
                                score={homeObligationsData.score}
                            />
                        </div>
                        <Separator className="my-4 print:border-black" />
                        <div className="space-y-4">
                            <FeatureDetail 
                                icon={<LineChart className="w-5 h-5 print:hidden" />}
                                title="True Savings Potential"
                                description={savingsDescription}
                                score={savingsScore}
                            />
                        </div>
                    </CardContent>
                </Card>
                <Card id="red-flags" className="bg-destructive/10 border-destructive/50 scroll-mt-24 print:bg-red-50 print:text-black print:shadow-none print:border-red-200">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2 print:text-red-700">
                            <ShieldAlert className="h-6 w-6 print:hidden" />
                            Red Flags
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <h4 className="font-semibold text-destructive print:text-red-700">🚩 Hidden Tax &amp; Social Security Deductions</h4>
                            <p className="text-muted-foreground mt-1 text-sm print:text-gray-700">
                                Approximately 30% of teachers report being surprised by "hidden" deductions from their gross salary. These can include local income taxes, social security contributions, or even utility fees for school housing. Always ask for a net salary projection or a full breakdown of all potential deductions before signing.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-destructive print:text-red-700">🚩 Currency Fluctuations</h4>
                            <p className="text-muted-foreground mt-1 text-sm print:text-gray-700">
                                Fewer than 10% of international school contracts include a "currency protection clause." This leaves you vulnerable if the local currency devalues against your home currency, which can significantly impact your savings and ability to meet financial obligations back home. This has been a major issue in countries like Egypt, Turkey, and Argentina recently.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>

        
        <div className="mt-8 pt-8 border-t border-border text-center text-sm text-muted-foreground print:text-gray-400 print:border-gray-200">
          <p className="animate-pulse-slow">Disclaimer: The figures provided are estimates for illustrative purposes only and do not constitute financial advice. Actual costs and savings may vary based on individual lifestyle, spending habits, and market conditions.</p>
        </div>
    </div>
  );
}


export default function FinancialForecasterPage() {

    return (
        <div className="container mx-auto px-4 md:px-6 py-12 print:py-0 print:px-0">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-center normal-case print:hidden">2. Contract Decoder</h1>
            
            <section id="true-costs-analysis" className="scroll-mt-20 pt-12 print:pt-0">
               <TrueCostsSection />
            </section>

        </div>
    )
}

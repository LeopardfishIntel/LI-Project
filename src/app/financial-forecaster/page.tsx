
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
  Info, 
  Home, 
  Plane, 
  School as SchoolIcon, 
  Award, 
  Thermometer, 
  Car, 
  Beer, 
  ArrowRightLeft, 
  PiggyBank, 
  LineChart, 
  FileText, 
  DollarSign, 
  Utensils, 
  TramFront, 
  Zap, 
  Wifi, 
  Smartphone, 
  Coffee, 
  Stethoscope, 
  Globe, 
  ExternalLink, 
  ShieldAlert, 
  Milestone, 
  GraduationCap, 
  Pencil, 
  Users, 
  Loader2, 
  Printer, 
  Plus, 
  Banknote, 
  Medal 
} from 'lucide-react';
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

// --- Global Data Constants ---
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

// --- Helper Functions ---
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
            description: "Applies a 70% tax exemption on income for up to 5 years for new tax residents ('impatriati' regime).",
            taxablePercentage: 0.30
        },
        filingStatuses: {
            single: { brackets: [{ upto: 28000, rate: 0.23 }, { upto: 50000, rate: 0.35 }, { upto: Infinity, rate: 0.43 }]},
            married: { brackets: [{ upto: 28000, rate: 0.23 }, { upto: 50000, rate: 0.35 }, { upto: Infinity, rate: 0.43 }]},
        },
    },
    "Japan": {
        currency: "JPY",
        socialSecurity: { rate: 0.145, cap: 8160000 },
        childTaxCredit: 200000,
        filingStatuses: {
            single: { brackets: [{ upto: 1950000, rate: 0.05 }, { upto: 3300000, rate: 0.10 }, { upto: 6950000, rate: 0.20 }, { upto: 9000000, rate: 0.23 }, { upto: 18000000, rate: 0.33 }, { upto: 40000000, rate: 0.40 }, { upto: Infinity, rate: 0.45 }]},
            married: { brackets: [{ upto: 3000000, rate: 0.05 }, { upto: 4500000, rate: 0.10 }, { upto: 7500000, rate: 0.20 }, { upto: 10000000, rate: 0.23 }, { upto: 19000000, rate: 0.33 }, { upto: 41000000, rate: 0.40 }, { upto: Infinity, rate: 0.45 }]},
        },
    },
    "Netherlands": {
        currency: "EUR",
        socialSecurity: { rate: 0.2765, cap: 38098 },
        childTaxCredit: 800,
        filingStatuses: {
            single: { brackets: [{ upto: 38098, rate: 0.0932 }, { upto: 75518, rate: 0.3697 }, { upto: Infinity, rate: 0.4950 }]},
            married: { brackets: [{ upto: 38098, rate: 0.0932 }, { upto: 75518, rate: 0.3697 }, { upto: Infinity, rate: 0.4950 }]},
        },
    },
    "Singapore": {
        currency: "SGD",
        socialSecurity: { rate: 0.20, cap: 6000 * 12 },
        childTaxCredit: 2000,
        filingStatuses: {
            single: { brackets: [{ upto: 20000, rate: 0 }, { upto: 30000, rate: 0.02 }, { upto: 40000, rate: 0.035 }, { upto: 80000, rate: 0.07 }, { upto: 120000, rate: 0.115 }, { upto: 160000, rate: 0.15 }, { upto: 320000, rate: 0.19 }, { upto: Infinity, rate: 0.22 }]},
            married: { brackets: [{ upto: 20000, rate: 0 }, { upto: 30000, rate: 0.02 }, { upto: 40000, rate: 0.035 }, { upto: 80000, rate: 0.07 }, { upto: 120000, rate: 0.115 }, { upto: 160000, rate: 0.15 }, { upto: 320000, rate: 0.19 }, { upto: Infinity, rate: 0.22 }]},
        },
    },
    "South Korea": {
        currency: "KRW",
        socialSecurity: { rate: 0.09, cap: 70800000 },
        childTaxCredit: 150000,
        filingStatuses: {
            single: { brackets: [{ upto: 14000000, rate: 0.06 }, { upto: 50000000, rate: 0.15 }, { upto: 88000000, rate: 0.24 }, { upto: 150000000, rate: 0.35 }, { upto: 300000000, rate: 0.38 }, { upto: 500000000, rate: 0.40 }, { upto: 1000000000, rate: 0.42 }, { upto: Infinity, rate: 0.45 }]},
            married: { brackets: [{ upto: 14000000, rate: 0.06 }, { upto: 50000000, rate: 0.15 }, { upto: 88000000, rate: 0.24 }, { upto: 150000000, rate: 0.35 }, { upto: 300000000, rate: 0.38 }, { upto: 500000000, rate: 0.40 }, { upto: 1000000000, rate: 0.42 }, { upto: Infinity, rate: 0.45 }]},
        },
    },
    "Switzerland": {
        currency: "CHF",
        socialSecurity: { rate: 0.064 },
        childTaxCredit: 1200,
        filingStatuses: {
            single: { brackets: [{ upto: 20000, rate: 0.05 }, { upto: 50000, rate: 0.12 }, { upto: 100000, rate: 0.18 }, { upto: 200000, rate: 0.25 }, { upto: Infinity, rate: 0.30 }]},
            married: { brackets: [{ upto: 40000, rate: 0.05 }, { upto: 80000, rate: 0.10 }, { upto: 150000, rate: 0.15 }, { upto: 250000, rate: 0.22 }, { upto: Infinity, rate: 0.28 }]},
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
            single: { brackets: [{ upto: 12570, rate: 0 }, { upto: 50270, rate: 0.20 }, { upto: 125140, rate: 0.40 }, { upto: Infinity, rate: 0.45 }]},
            married: { brackets: [{ upto: 12570, rate: 0 }, { upto: 50270, rate: 0.20 }, { upto: 125140, rate: 0.40 }, { upto: Infinity, rate: 0.45 }]},
        },
    },
    "USA": {
        currency: "USD",
        socialSecurity: { rate: 0.0765, cap: 168600 },
        childTaxCredit: 2000,
        filingStatuses: {
            single: { brackets: [{ upto: 11000, rate: 0.10 }, { upto: 44725, rate: 0.12 }, { upto: 95375, rate: 0.22 }, { upto: 182100, rate: 0.24 }, { upto: 231250, rate: 0.32 }, { upto: 578125, rate: 0.35 }, { upto: Infinity, rate: 0.37 }]},
            married: { brackets: [{ upto: 22000, rate: 0.10 }, { upto: 89450, rate: 0.12 }, { upto: 190750, rate: 0.22 }, { upto: 364200, rate: 0.24 }, { upto: 462500, rate: 0.32 }, { upto: 693750, rate: 0.35 }, { upto: Infinity, rate: 0.37 }]},
        },
    },
};

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

const getSafetyScore = (rankString: string | undefined): "good" | "neutral" | "bad" => {
    if (!rankString) return 'neutral';
    const rank = parseInt(rankString.replace('Rank ', ''));
    if (isNaN(rank)) return 'neutral';
    if (rank <= 20) return 'good';
    if (rank <= 60) return 'neutral';
    return 'bad';
};

// --- Top-Level Helper Components ---
const FeatureDetail = ({ icon, title, description, score, percentage }: { icon: React.ReactNode, title: string, description: React.ReactNode, score: "good" | "neutral" | "bad", percentage?: string }) => {
    const scoreColorClasses = {
      good: 'text-green-400',
      neutral: 'text-amber-400',
      bad: 'text-red-400',
    };

    return (
        <div className="flex items-start gap-4">
            <div className="mt-1 text-primary">{icon}</div>
            <div className="w-full">
                <div className="flex justify-between items-baseline">
                    <h4 className={cn("font-semibold tracking-tight", scoreColorClasses[score])}>{title}</h4>
                    {percentage && <span className={cn("font-bold text-sm", 
                        score.includes('good') ? 'text-green-400' :
                        score.includes('bad') ? 'text-red-400' :
                        'text-amber-400'
                    )}>{percentage}</span>}
                </div>
                <div className="text-sm text-muted-foreground">{description}</div>
            </div>
        </div>
    );
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

// --- Intelligence Data for Countries ---
const countrySpecificData: any = {
    'United Kingdom': {
        taxStatus: { text: "Salaries are subject to UK income tax (20-45%) and National Insurance contributions.", score: 'bad', percentage: "20-45%" },
        housing: { text: "Housing is almost never provided. You'll receive a salary and be expected to cover your own rent.", score: 'bad', percentage: "0%" },
        flightAllowance: { text: "Annual flights are not a standard perk for jobs within the UK.", score: 'bad', percentage: "0%" },
        dependentTuition: { text: "Staff children often get heavily discounted or free places in the private sector.", score: 'neutral', percentage: "Up to 100%" },
        gratuity: { text: "There is no end-of-service gratuity system in the UK. Instead, schools contribute to a pension.", score: 'neutral', percentage: "Pension" },
        importedGoods: { text: "As a major economy, most goods are readily available.", score: 'neutral' },
        utilities: { text: "Heating is a significant winter expense. Council tax is another major monthly bill.", score: 'bad', percentage: "+30%" },
        transportation: { text: "Public transport is extensive but can be very expensive, especially train travel.", score: 'neutral', percentage: "+20%" },
        socialLeisure: { text: "The cost of a meal out is generally high compared to many teaching destinations.", score: 'bad', percentage: "+40%" },
        currency: { text: "You're paid in GBP (£). If you have debts in another currency, you're exposed to exchange rate fluctuations.", score: 'neutral' },
        homeObligations: { text: "Working abroad requires managing finances across two countries.", score: 'neutral' },
        savings: { text: "Calculates your projected annual savings in your home currency.", score: 'neutral' },
        safety: {
            text: (
                <>
                    Ranked 37th on the 2023 Global Peace Index.{' '}
                    <a href="https://en.wikipedia.org/wiki/Global_Peace_Index" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">GPI Rank</a>
                </>
            ),
            score: 'neutral',
            percentage: 'Rank 37'
        },
    },
    'UAE': {
        taxStatus: { text: "Salaries are 100% tax-free (0% income tax).", score: 'good', percentage: "0%" },
        housing: { text: "Most schools provide either free, furnished accommodation or a housing allowance.", score: 'good', percentage: "100%" },
        flightAllowance: { text: "An annual flight is standard. It's often a cash sum, which offers flexibility.", score: 'good', percentage: "100%" },
        dependentTuition: { text: "Top-tier schools usually provide 1-2 free child places.", score: 'good', percentage: "Often 100%" },
        gratuity: { text: "An end-of-service gratuity is legally required.", score: 'good', percentage: "Standard" },
        importedGoods: { text: "Supermarkets are full of imported Western brands, but they come at a premium.", score: 'neutral' },
        utilities: { text: "AC is non-negotiable for 6-8 months of the year.", score: 'bad', percentage: "+20%" },
        transportation: { text: "A car is almost essential outside of Dubai's metro line.", score: 'neutral', percentage: "Baseline" },
        socialLeisure: { text: "The 'brunch' culture is a major social outlet but can be very expensive.", score: 'bad', percentage: "+80%" },
        currency: { text: "You're paid in UAE Dirhams (AED), pegged to the USD. This provides stability.", score: 'good' },
        homeObligations: { text: "Working abroad requires managing finances across two countries.", score: 'good' },
        savings: { text: "Calculates your projected annual savings in your home currency.", score: 'good' },
        safety: {
            text: (
                 <>
                    Ranked 75th on the 2023 Global Peace Index.{' '}
                    <a href="https://en.wikipedia.org/wiki/Global_Peace_Index" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">GPI Rank</a>
                </>
            ),
            score: 'neutral',
            percentage: 'Rank 75'
        },
    },
    'Japan': {
        taxStatus: { text: "Your salary is subject to Japanese income tax (5-45%), inhabitant tax, and social security.", score: 'neutral', percentage: "5-45%" },
        housing: { text: "Some schools provide subsidized/free housing or an allowance.", score: 'neutral', percentage: "Varies" },
        flightAllowance: { text: "An annual flight home is offered by many top international schools.", score: 'neutral', percentage: "Varies" },
        dependentTuition: { text: "Most reputable international schools will offer free or discounted tuition.", score: 'good', percentage: "Often 100%" },
        gratuity: { text: "Schools contribute to the Japanese pension system.", score: 'neutral', percentage: "Pension" },
        importedGoods: { text: "Finding specific Western brands can be difficult and expensive.", score: 'bad' },
        utilities: { text: "Heating in winter and AC in the humid summer can cause bills to spike.", score: 'neutral', percentage: "-10%" },
        transportation: { text: "World-class public transport is the norm in cities.", score: 'good', percentage: "-30%" },
        socialLeisure: { text: "Eating out can be very affordable. Social life often revolves around izakayas.", score: 'good', percentage: "-20%" },
        currency: { text: "You are paid in Japanese Yen (JPY), a major but sometimes volatile currency.", score: 'neutral' },
        homeObligations: { text: "Working abroad requires managing finances across two countries.", score: 'neutral' },
        savings: { text: "Calculates your projected annual savings, converting from JPY.", score: 'neutral' },
        safety: {
            text: (
                <>
                    Ranked 9th on the 2023 Global Peace Index.{' '}
                    <a href="https://en.wikipedia.org/wiki/Global_Peace_Index" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">GPI Rank</a>
                </>
            ),
            score: 'good',
            percentage: 'Rank 9'
        },
    },
    'Switzerland': {
        taxStatus: { text: "Salaries are subject to federal, cantonal, and municipal taxes (up to 40% combined).", score: 'neutral', percentage: "Up to 40%" },
        housing: { text: "Housing is not provided and is extremely expensive.", score: 'bad', percentage: "0%" },
        flightAllowance: { text: "Not a standard benefit. Flights are typically paid for by the teacher.", score: 'bad', percentage: "0%" },
        dependentTuition: { text: "Most international schools offer significant discounts for staff children.", score: 'good', percentage: "Discounted" },
        gratuity: { text: "Switzerland has a mandatory three-pillar pension system.", score: 'neutral', percentage: "Pension" },
        importedGoods: { text: "Quality local products are abundant.", score: 'neutral' },
        utilities: { text: "Heating costs during the long, cold winters are a significant expense.", score: 'bad', percentage: "+60%" },
        transportation: { text: "Public transportation is incredibly efficient but expensive.", score: 'neutral', percentage: "+50%" },
        socialLeisure: { text: "Eating out and leisure activities are among the most expensive in the world.", score: 'bad', percentage: "+100%" },
        currency: { text: "You're paid in Swiss Francs (CHF), a strong, stable currency.", score: 'good' },
        homeObligations: { text: "Working abroad requires managing finances across two countries.", score: 'neutral' },
        savings: { text: "Calculates your projected annual savings in your home currency.", score: 'neutral' },
        safety: {
             text: (
                <>
                    Ranked 10th on the 2023 Global Peace Index.{' '}
                    <a href="https://en.wikipedia.org/wiki/Global_Peace_Index" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">GPI Rank</a>
                </>
            ),
            score: 'good',
            percentage: 'Rank 10'
        },
    },
    'Singapore': {
        taxStatus: { text: "Income tax is progressive and relatively low (0-22%).", score: 'good', percentage: "0-22%" },
        housing: { text: "Housing is extremely expensive. Most schools provide an allowance.", score: 'bad', percentage: "Allowance" },
        flightAllowance: { text: "An annual flight is common, often as a cash benefit.", score: 'good', percentage: "100%" },
        dependentTuition: { text: "Top schools offer free or heavily subsidized places.", score: 'good', percentage: "Often 100%" },
        gratuity: { text: "Some schools may offer a contract completion or renewal bonus.", score: 'neutral', percentage: "Bonus-based" },
        importedGoods: { text: "A wide variety of imported goods is available, but they are expensive.", score: 'neutral' },
        utilities: { text: "High due to the need for constant air conditioning.", score: 'bad', percentage: "+30%" },
        transportation: { text: "World-class, efficient, and affordable public transport.", score: 'good', percentage: "-20%" },
        socialLeisure: { text: "Singapore has a vibrant social scene, which is expensive.", score: 'bad', percentage: "+70%" },
        currency: { text: "Payment is in Singapore Dollars (SGD), a stable regional currency.", score: 'good' },
        homeObligations: { text: "Working abroad requires managing finances across two countries.", score: 'neutral' },
        savings: { text: "Savings potential is high due to high salaries.", score: 'good' },
        safety: {
             text: (
                <>
                    Ranked 6th on the 2023 Global Peace Index.{' '}
                    <a href="https://en.wikipedia.org/wiki/Global_Peace_Index" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">GPI Rank</a>
                </>
            ),
            score: 'good',
            percentage: 'Rank 6'
        },
    },
    'South Korea': {
        taxStatus: { text: "Income is subject to South Korean income tax (6-45%).", score: 'neutral', percentage: "6-45%" },
        housing: { text: "Most schools provide furnished housing for teachers.", score: 'good', percentage: "100%" },
        flightAllowance: { text: "An annual flight is standard in many contracts.", score: 'good', percentage: "100%" },
        dependentTuition: { text: "Discounts on tuition for dependents are common.", score: 'neutral', percentage: "Varies" },
        gratuity: { text: "Employers must pay severance pay equivalent to at least one month's salary.", score: 'good', percentage: "Standard" },
        importedGoods: { text: "Western groceries and goods are available but expensive.", score: 'bad' },
        utilities: { text: "Reasonably priced, though heating in the cold winters can increase costs.", score: 'good', percentage: "-10%" },
        transportation: { text: "Excellent, affordable, and efficient public transport.", score: 'good', percentage: "-30%" },
        socialLeisure: { text: "Social life is vibrant and can be very affordable.", score: 'good', percentage: "-20%" },
        currency: { text: "You are paid in South Korean Won (KRW).", score: 'bad' },
        homeObligations: { text: "Working abroad requires managing finances across two countries.", score: 'good' },
        savings: { text: "Moderate savings potential.", score: 'neutral' },
        safety: {
            text: (
                <>
                    Ranked 43rd on the 2023 Global Peace Index.{' '}
                    <a href="https://en.wikipedia.org/wiki/Global_Peace_Index" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">GPI Rank</a>
                </>
            ),
            score: 'neutral',
            percentage: 'Rank 43'
        },
    },
    'Netherlands': {
        taxStatus: { text: "Salaries are subject to a high income tax rate (up to 49.5%).", score: 'neutral', percentage: "Up to 49.5%" },
        housing: { text: "Housing is very expensive and in short supply in major cities.", score: 'bad', percentage: "Allowance" },
        flightAllowance: { text: "Not a standard benefit for schools in the Netherlands.", score: 'bad', percentage: "0%" },
        dependentTuition: { text: "Most international schools offer a discount, but 100% free is rare.", score: 'neutral', percentage: "Rarely 100%" },
        gratuity: { text: "Schools contribute to a mandatory pension.", score: 'neutral', percentage: "Pension" },
        importedGoods: { text: "General grocery costs are high.", score: 'neutral' },
        utilities: { text: "Energy prices are high in Europe.", score: 'bad', percentage: "+40%" },
        transportation: { text: "Cycling is king and very cheap.", score: 'good', percentage: "-40%" },
        socialLeisure: { text: "Eating out and social activities are relatively expensive.", score: 'bad', percentage: "+50%" },
        currency: { text: "You are paid in Euros (€). It's stable.", score: 'good' },
        homeObligations: { text: "Working abroad requires managing finances across two countries.", score: 'bad' },
        savings: { text: "Savings potential is generally considered low to moderate.", score: 'bad' },
        safety: {
             text: (
                <>
                    Ranked 16th on the 2023 Global Peace Index.{' '}
                    <a href="https://en.wikipedia.org/wiki/Global_Peace_Index" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">GPI Rank</a>
                </>
            ),
            score: 'good',
            percentage: 'Rank 16'
        }
    },
};

// --- Main Content Components ---
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
  const [contingency, setContingency] = useState('200');
  const [homeCountryCommitment, setHomeCountryCommitment] = useState('');
  
  const data = countrySpecificData[selectedCountry] || countrySpecificData['United Kingdom'];

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

  const usdRate = CONVERSION_RATES[currency] ?? 1;
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
    if (selectedSchool) {
      const autoCurrency = COUNTRY_TO_CURRENCY[selectedSchool.country];
      if (autoCurrency) setCurrency(autoCurrency);
    }
  }, [selectedSchool]);

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

  const familyStatusLabels: {[key: string]: string} = {
    single: 'Single',
    couple: 'Couple',
    family: 'Family 2+1',
    family2: 'Family of 4',
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

    return apartmentCost + foodCost + transportCost + (costOfLiving.utilities ?? 0) + (costOfLiving.internet ?? 0) + mobileCost + diningSocialCost + (costOfLiving.vehicleInsuranceMaint ?? 0) + uncoveredMedicalCost;
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
  let savingsScore: "good" | "neutral" | "bad" = data.savings.score;

  if (selectedSchool) {
    const monthlyIncome = salaryToUseInUSD;
    const formattedSavings = formatCurrency(annualSavings * usdRate, currency);
    savingsDescription = `Based on an estimated net monthly income and your lifestyle costs, your projected annual savings are approximately ${formattedSavings}.`;
    if (monthlySavings > (monthlyIncome * 0.3)) savingsScore = 'good';
    else if (monthlySavings > (monthlyIncome * 0.1)) savingsScore = 'neutral';
    else savingsScore = 'bad';
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
          lifestyleData.utilities.text = `AC in summer or heating in winter can lead to high utility bills in ${location}.`;
      } else if ((costOfLiving.utilities ?? 0) < 150) {
          lifestyleData.utilities.score = 'good';
          lifestyleData.utilities.text = `Utility costs in ${location} are generally reasonable.`;
      } else {
           lifestyleData.utilities.score = 'neutral';
           lifestyleData.utilities.text = `Utility costs in ${location} are average for the region.`;
      }
      lifestyleData.safety.score = getSafetyScore(lifestyleData.safety.percentage);
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
      contractPerksData.taxStatus = { text: 'This school offers a 100% tax-free salary.', score: 'good', percentage: '0%' };
    } else {
      contractPerksData.taxStatus = { ...data.taxStatus, text: `At this school, salaries are subject to ${selectedCountry}'s income tax.`};
    }
    if (selectedSchool.intel.housing.provided) {
      contractPerksData.housing = { text: `This school provides housing (${selectedSchool.intel.housing.value}).`, score: 'good', percentage: '100%' };
    } else {
      contractPerksData.housing = { text: `Housing is not provided. Rent will be a significant monthly cost.`, score: 'bad', percentage: '0%' };
    }
  }

  const homeObligationsData = { ...data.homeObligations };
  homeObligationsData.text = `Working abroad requires managing finances across two countries.`;
  homeObligationsData.score = 'neutral';

  if (isLoadingSchools) {
    return <div className="flex justify-center items-center h-96"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="max-w-5xl mx-auto">
        <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4 print:hidden">
          <div>
            <Label htmlFor="country-select" className="text-base font-semibold block text-center mb-2">Target Country</Label>
            <Select value={selectedCountry} onValueChange={handleCountryChange}>
              <SelectTrigger id="country-select"><SelectValue placeholder="Select a country" /></SelectTrigger>
              <SelectContent>{availableCountries.map(country => (<SelectItem key={country} value={country}>{country}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="school-select" className="text-base font-semibold block text-center mb-2">School (Optional)</Label>
             <Select value={selectedSchoolId ?? 'all'} onValueChange={(value) => setSelectedSchoolId(value === 'all' ? null : value)} disabled={schoolsInCountry.length === 0}>
                <SelectTrigger id="school-select"><SelectValue placeholder="Select a school" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">-- All Schools in {selectedCountry} --</SelectItem>
                  {schoolsInCountry.map(school => (<SelectItem key={school.id} value={school.id}>{school.name}</SelectItem>))}
                </SelectContent>
              </Select>
          </div>
          <div>
            <Label htmlFor="family-status-select" className="text-base font-semibold block text-center mb-2">Family Status</Label>
            <Select value={familyStatus} onValueChange={(v) => setFamilyStatus(v as FamilyStatus)}>
              <SelectTrigger id="family-status-select"><SelectValue placeholder="Select family status" /></SelectTrigger>
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
                <Printer className="mr-2 h-3 w-3" /> Print Intel Report (PDF)
            </Button>
        </div>

        {selectedSchool && (
            <Card id="financial-snapshot" className="mb-8 bg-card/70 backdrop-blur-sm border-border scroll-mt-24 print:bg-white print:text-black print:shadow-none print:border-black/10">
                <CardHeader className="flex-row items-center justify-between pb-4">
                    <div>
                        <CardTitle className="flex flex-wrap items-baseline text-xl print:text-black">
                            <span>Financial Snapshot:</span>
                            <span className="ml-2 text-lg text-muted-foreground font-medium normal-case tracking-normal print:text-black">{selectedSchool.name}</span>
                        </CardTitle>
                        <CardDescription className="mt-1 print:text-gray-600">
                             Use our <Dialog open={isTaxDialogOpen} onOpenChange={setIsTaxDialogOpen}><DialogTrigger asChild><span className="text-sky-400 hover:underline cursor-pointer print:hidden">Tax Calculator</span></DialogTrigger><DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Worldwide Salary Tax Calculator</DialogTitle><CardDescription>Estimate your take-home pay in different countries. This tool calculates based on standard local resident tax rates.</CardDescription></DialogHeader><TaxCalculatorSection /></DialogContent></Dialog> and Family Status selector to ensure best results.
                        </CardDescription>
                    </div>
                    <div className="w-[120px] print:hidden">
                        <Select value={currency} onValueChange={setCurrency}>
                            <SelectTrigger id="currency-select-page"><SelectValue placeholder="Currency" /></SelectTrigger>
                            <SelectContent><SelectItem value="GBP">GBP (GBP)</SelectItem><SelectItem value="USD">USD (USD)</SelectItem><SelectItem value="EUR">EUR (EUR)</SelectItem></SelectContent>
                        </Select>
                    </div>
                    <div className="hidden print:block font-bold text-lg uppercase tracking-widest">{currency} REPORT</div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                        <div className="space-y-4 flex flex-col justify-between">
                            <div className="space-y-2">
                                <h3 className="font-semibold text-lg text-foreground border-b pb-2 mb-2 print:text-black print:border-black">Income &amp; Benefits (Monthly)</h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between items-center">
                                        <Label htmlFor="offered-salary" className="flex items-center text-muted-foreground print:text-gray-600">Your Net Monthly Salary</Label>
                                        <div className="relative w-[120px]">
                                            <Input id="offered-salary" type="text" inputMode="numeric" placeholder={`${Math.round(convert(estimatedNetMonthlySalaryUSD))}`} value={offeredNetMonthlySalary} onChange={(e) => setOfferedNetMonthlySalary(e.target.value)} className="mt-0 max-w-[120px] h-8 text-right bg-input/40 print:bg-transparent print:border-none print:text-black print:p-0 print:font-bold" />
                                            <span className="hidden print:inline-block ml-1 text-[8px] font-bold text-gray-400">{currency}</span>
                                        </div>
                                    </div>
                                    {/* Other income rows omitted for brevity, same pattern as above */}
                                </div>
                            </div>
                            <div className="space-y-4">
                                <Separator className="my-4 print:border-black"/><div className="flex justify-between items-center font-bold text-lg print:text-black"><span className="text-primary-foreground print:text-black">Total Monthly Package</span><span className="text-green-400 print:text-green-700">{formatCurrency(totalMonthlyPackage * usdRate, currency)}</span></div>
                            </div>
                        </div>
                        <div className="space-y-4 flex flex-col justify-between">
                             <div className="space-y-1">
                                <h3 className="font-semibold text-lg text-foreground border-b pb-2 mb-2 print:text-black print:border-black">Estimated Costs ({familyStatusLabels[familyStatus]})</h3>
                                <div className="space-y-1 text-sm text-muted-foreground print:text-gray-600">
                                    <div className="flex justify-between items-center"><span>Monthly Rent ({familyStatus === 'single' ? '1BR' : '2BR+'})</span><span className="print:font-bold print:text-black">{selectedSchool.intel.housing.provided ? "Provided" : formatCurrency(getRentForFamily(selectedSchool.costOfLiving, familyStatus).rent * usdRate, currency)}</span></div>
                                    <div className="flex justify-between items-center">
                                        <Label htmlFor="home-commitment" className="flex items-center text-muted-foreground print:text-gray-600">Home Country Commitment</Label>
                                        <div className="relative w-[120px]">
                                            <Input id="home-commitment" type="text" inputMode="numeric" placeholder="0" value={homeCountryCommitment} onChange={(e) => setHomeCountryCommitment(e.target.value)} className="mt-0 max-w-[120px] h-8 text-right bg-input/40 print:bg-transparent print:border-none print:text-black print:p-0 print:font-bold" />
                                            <span className="hidden print:inline-block ml-1 text-[8px] font-bold text-gray-400">{currency}</span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <Label htmlFor="contingency-cost" className="flex items-center text-muted-foreground print:text-gray-600">Contingency Fund</Label>
                                        <div className="relative w-[120px]">
                                            <Input id="contingency-cost" type="text" inputMode="numeric" placeholder="0" value={contingency} onChange={(e) => setContingency(e.target.value)} className="mt-0 max-w-[120px] h-8 text-right bg-input/40 print:bg-transparent print:border-none print:text-black print:p-0 print:font-bold" />
                                            <span className="hidden print:inline-block ml-1 text-[8px] font-bold text-gray-400">{currency}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4"><Separator className="my-4 print:border-black"/><div className="flex justify-between items-center font-bold text-lg print:text-black"><span className="text-primary-foreground print:text-black">Total Estimated Costs</span><span className="text-red-400 print:text-red-700">{formatCurrency(totalMonthlyCosts * usdRate, currency)}</span></div></div>
                        </div>
                    </div>
                    <div className="pt-6"><Separator className="mb-6 print:border-black" /><div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center print:grid-cols-2">
                            <div className={cn("p-4 rounded-lg print:border print:border-gray-200", monthlySavings >= 0 ? "bg-green-500/10 print:bg-green-50" : "bg-red-500/10 print:bg-red-50")}><h4 className="text-sm font-semibold text-muted-foreground print:text-gray-600 uppercase tracking-widest">PROJECTED MONTHLY SAVINGS</h4><p className={cn("text-3xl font-bold mt-1", monthlySavings >= 0 ? "text-green-400 print:text-green-700" : "text-red-400 print:text-red-700")}>{formatCurrency(monthlySavings * usdRate, currency)}</p></div>
                             <div className={cn("p-4 rounded-lg print:border print:border-gray-200", annualSavings >= 0 ? "bg-green-500/10 print:bg-green-50" : "bg-red-500/10 print:bg-red-50")}><h4 className="text-sm font-semibold text-muted-foreground print:text-gray-600 uppercase tracking-widest">PROJECTED ANNUAL SAVINGS</h4><p className={cn("text-3xl font-bold mt-1", annualSavings >= 0 ? "text-green-400 print:text-green-700" : "text-red-400 print:text-red-700")}>{formatCurrency(annualSavings * usdRate, currency)}</p></div>
                        </div></div>
                </CardContent>
            </Card>
        )}

        <div className="mt-12 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print:grid-cols-2">
                <Card id="package-deals" className="bg-card/70 backdrop-blur-sm border-border flex flex-col scroll-mt-24 print:bg-white print:text-black print:shadow-none print:border-black/10">
                    <CardHeader><CardTitle className="print:text-black">Intel</CardTitle><p className="text-sm text-muted-foreground capitalize pt-1 print:text-gray-600">{selectedCountry}{selectedSchool ? ` | ${selectedSchool.name}` : ''}{' | '}{familyStatusLabels[familyStatus]}</p></CardHeader>
                    <CardContent className="flex-grow pt-0"><div className="space-y-4">
                            <FeatureDetail icon={<FileText className="w-5 h-5 print:hidden" />} title="Tax Status" description={contractPerksData.taxStatus.text} score={contractPerksData.taxStatus.score} percentage={contractPerksData.taxStatus.percentage} />
                            <FeatureDetail icon={<Home className="w-5 h-5 print:hidden" />} title="Housing Arrangement" description={contractPerksData.housing.text} score={contractPerksData.housing.score} percentage={contractPerksData.housing.percentage} />
                            <FeatureDetail icon={<Plane className="w-5 h-5 print:hidden" />} title="Annual Flight" description={contractPerksData.flightAllowance.text} score={contractPerksData.flightAllowance.score} percentage={contractPerksData.flightAllowance.percentage} />
                        </div><Separator className="my-4 print:border-black" /><div className="space-y-4">
                            <FeatureDetail icon={<SchoolIcon className="w-5 h-5 print:hidden" />} title="Dependent Tuition" description={contractPerksData.dependentTuition.text} score={contractPerksData.dependentTuition.score} percentage={contractPerksData.dependentTuition.percentage} />
                            <FeatureDetail icon={<Award className="w-5 h-5 print:hidden" />} title="Gratuity" description={contractPerksData.gratuity.text} score={contractPerksData.gratuity.score} percentage={contractPerksData.gratuity.percentage} />
                        </div></CardContent>
                </Card>
                <Card id="true-lifestyle" className="bg-card/70 backdrop-blur-sm border-border flex flex-col scroll-mt-24 print:bg-white print:text-black print:shadow-none print:border-black/10">
                    <CardHeader><CardTitle className="print:text-black">Lifestyle</CardTitle><p className="text-sm text-muted-foreground capitalize pt-1 print:text-gray-600">{selectedCountry}{selectedSchool ? ` | ${selectedSchool.name}` : ''}{' | '}{familyStatusLabels[familyStatus]}</p></CardHeader>
                    <CardContent className="flex-grow pt-0"><div className="space-y-4">
                            <FeatureDetail icon={<Globe className="w-5 h-5 print:hidden" />} title="Imported Goods" description={lifestyleData.importedGoods.text} score={lifestyleData.importedGoods.score} percentage={lifestyleData.importedGoods.percentage} />
                            <FeatureDetail icon={<Thermometer className="w-5 h-5 print:hidden" />} title="Utilities (AC/Heat)" description={lifestyleData.utilities.text} score={lifestyleData.utilities.score} percentage={lifestyleData.utilities.percentage} />
                            <FeatureDetail icon={<Car className="w-5 h-5 print:hidden" />} title="Transportation" description={lifestyleData.transportation.text} score={lifestyleData.transportation.score} percentage={lifestyleData.transportation.percentage} />
                            <FeatureDetail icon={<Beer className="w-5 h-5 print:hidden" />} title="Social &amp; Leisure" description={lifestyleData.socialLeisure.text} score={lifestyleData.socialLeisure.score} percentage={lifestyleData.socialLeisure.percentage} />
                        </div><Separator className="my-4 print:border-black" /><div className="space-y-4">
                            <FeatureDetail icon={<ShieldAlert className="w-5 h-5 print:hidden" />} title="Safety &amp; Travel Advice" description={lifestyleData.safety.text} score={lifestyleData.safety.score} percentage={lifestyleData.safety.percentage} />
                        </div></CardContent>
                </Card>
            </div>
        </div>
        <div className="mt-8 pt-8 border-t border-border text-center text-sm text-muted-foreground print:text-gray-400 print:border-gray-200"><p className="animate-pulse-slow">Disclaimer: The figures provided are estimates for illustrative purposes only and do not constitute financial advice.</p></div>
    </div>
  );
}

export default function EvaluatePage() {
  return (
    <div className="container mx-auto px-4 md:px-6 py-12 print:py-0 print:px-0">
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-center normal-case print:hidden">2. Contract Decoder</h1>
      <section id="true-costs-analysis" className="scroll-mt-20 pt-12 print:pt-0">
        <Suspense fallback={<div className="flex justify-center items-center py-24"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
          <TrueCostsSection />
        </Suspense>
      </section>
    </div>
  );
}

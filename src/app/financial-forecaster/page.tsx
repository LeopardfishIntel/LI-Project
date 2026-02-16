

"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { cn, formatCurrency } from '@/lib/utils';
import { Calculator, Info, Landmark, Home, Plane, School as SchoolIcon, Award, Thermometer, Car, Beer, ArrowRightLeft, PiggyBank, LineChart, FileText, DollarSign, Utensils, TramFront, Zap, Wifi, Smartphone, Coffee, Stethoscope, Globe, ExternalLink, ShieldAlert, Milestone, GraduationCap, Pencil, Users } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { PieChart, Pie, Cell } from 'recharts';
import { ChartContainer, type ChartConfig } from '@/components/ui/chart';
import { schools } from '@/lib/mock-data';
import type { School } from '@/lib/types';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';


// --- Tax Calculator Code ---
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
        socialSecurity: { rate: 0.0919 }, // Employee INPS contribution
        childTaxCredit: 950, // Simplified annual credit per child
        specialRegime: {
            name: "New Arrival Tax Discount",
            description: "Applies a 70% tax exemption on income for up to 5 years for new tax residents ('impatriati' regime). Social security is still calculated on the full gross salary.",
            taxablePercentage: 0.30
        },
        filingStatuses: {
            single: { brackets: [ // IRPEF 2024 (simplified)
                { upto: 28000, rate: 0.23 },
                { upto: 50000, rate: 0.35 },
                { upto: Infinity, rate: 0.43 },
            ]},
            married: { brackets: [ // Italy has individual taxation
                { upto: 28000, rate: 0.23 },
                { upto: 50000, rate: 0.35 },
                { upto: Infinity, rate: 0.43 },
            ]},
        },
    },
    "Japan": {
        currency: "JPY",
        socialSecurity: { rate: 0.145, cap: 8160000 }, // Simplified Pension + Health
        childTaxCredit: 200000, // Simplified annual credit
        filingStatuses: { // Simplified, actual system is more complex
            single: { brackets: [
                { upto: 1950000, rate: 0.05 }, { upto: 3300000, rate: 0.10 }, { upto: 6950000, rate: 0.20 },
                { upto: 9000000, rate: 0.23 }, { upto: 18000000, rate: 0.33 }, { upto: 40000000, rate: 0.40 },
                { upto: Infinity, rate: 0.45 },
            ]},
            married: { brackets: [ // Simplified by increasing lower brackets
                { upto: 3000000, rate: 0.05 }, { upto: 4500000, rate: 0.10 }, { upto: 7500000, rate: 0.20 },
                { upto: 10000000, rate: 0.23 }, { upto: 19000000, rate: 0.33 }, { upto: 41000000, rate: 0.40 },
                { upto: Infinity, rate: 0.45 },
            ]},
        },
    },
    "Netherlands": {
        currency: "EUR",
        socialSecurity: { rate: 0.2765, cap: 38098 }, // Volksverzekeringen
        childTaxCredit: 800, // Simplified
        filingStatuses: { // Individual taxation
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
        socialSecurity: { rate: 0.20, cap: 6000 * 12 }, // Employee CPF contribution
        childTaxCredit: 2000, // Simplified
        filingStatuses: {
            single: { brackets: [
                { upto: 20000, rate: 0 }, { upto: 30000, rate: 0.02 }, { upto: 40000, rate: 0.035 },
                { upto: 80000, rate: 0.07 }, { upto: 120000, rate: 0.115 }, { upto: 160000, rate: 0.15 },
                { upto: 320000, rate: 0.19 }, { upto: Infinity, rate: 0.22 },
            ]},
            married: { brackets: [ // Same individual taxation
                { upto: 20000, rate: 0 }, { upto: 30000, rate: 0.02 }, { upto: 40000, rate: 0.035 },
                { upto: 80000, rate: 0.07 }, { upto: 120000, rate: 0.115 }, { upto: 160000, rate: 0.15 },
                { upto: 320000, rate: 0.19 }, { upto: Infinity, rate: 0.22 },
            ]},
        },
    },
    "South Korea": {
        currency: "KRW",
        socialSecurity: { rate: 0.09, cap: 70800000 }, // Pension + Health + Employment
        childTaxCredit: 150000, // Simplified
        filingStatuses: { // Individual taxation
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
        socialSecurity: { rate: 0.064 }, // Simplified AHV/DI/EO/ALV
        childTaxCredit: 1200, // Simplified
        filingStatuses: {
            single: { brackets: [ // Simplified combined cantonal/federal for Zurich
                { upto: 20000, rate: 0.05 }, { upto: 50000, rate: 0.12 }, { upto: 100000, rate: 0.18 },
                { upto: 200000, rate: 0.25 }, { upto: Infinity, rate: 0.30 },
            ]},
            married: { brackets: [ // Simplified married brackets
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
        socialSecurity: { rate: 0.12, floor: 12570, cap: 50270 }, // Simplified NI Class 1
        childTaxCredit: 0, // Child benefit is a payment, too complex to model as a credit
        filingStatuses: { // UK tax is individual, so brackets are the same
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
        socialSecurity: { rate: 0.0765, cap: 168600 }, // Social Security (6.2%) + Medicare (1.45%)
        childTaxCredit: 2000, // Federal Child Tax Credit
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

const conversionRatesToUSD: { [key: string]: number } = { "GBP": 1.25, "EUR": 1.08, "AED": 0.27, "JPY": 0.0064, "CHF": 1.10, "SGD": 0.74, "KRW": 0.00073, "USD": 1 };

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

const chartConfig = {
  netPay: { label: "Net Pay", color: "hsl(var(--chart-1))" },
  incomeTax: { label: "Income Tax", color: "hsl(var(--chart-2))" },
  socialContributions: { label: "Social Contributions", color: "hsl(var(--chart-4))" },
} satisfies ChartConfig;

function TaxCalculatorSection() {
    const [salary, setSalary] = useState('60000');
    const [country, setCountry] = useState('United Kingdom');
    const [currency, setCurrency] = useState('GBP');
    const [filingStatus, setFilingStatus] = useState<'single' | 'married'>('single');
    const [dependents, setDependents] = useState('0');
    const [applySpecialRegime, setApplySpecialRegime] = useState(false);
    const [result, setResult] = useState<{ incomeTax: number, socialSecurity: number, netIncome: number, totalTax: number, effectiveRate: number, taxCredit: number, incomeTaxBeforeCredit: number } | null>(null);
    
    const countriesWithCalculators = Object.keys(taxData).sort();
    const currencies = Object.keys(conversionRatesToUSD).sort();

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
        const incomeInLocalCurrency = income * (conversionRatesToUSD[currency] || 1) / (conversionRatesToUSD[taxData[country].currency] || 1);
        
        if (isNaN(incomeInLocalCurrency) || incomeInLocalCurrency <= 0) {
            setResult(null);
            return;
        }
        const calcResult = calculateTax(incomeInLocalCurrency, country, filingStatus, applySpecialRegime, numDependents);
        setResult(calcResult);
    };

    const chartData = useMemo(() => {
        if (!result) return [];
        return [
            { name: 'netPay', value: result.netIncome, fill: 'var(--color-netPay)' },
            { name: 'incomeTax', value: result.incomeTax, fill: 'var(--color-incomeTax)' },
            { name: 'socialContributions', value: result.socialSecurity, fill: 'var(--color-socialContributions)' },
        ].filter(d => d.value > 0);
    }, [result]);
    
    const CustomLegend = () => {
      if (!result) return null;
        
      const chartItems = [
        { name: 'netPay', value: result.netIncome },
        { name: 'incomeTax', value: result.incomeTax },
        { name: 'socialContributions', value: result.socialSecurity },
      ];
      const localCurrency = taxData[country].currency;

      return (
        <div className="space-y-2 text-sm">
          <h3 className="font-semibold">Breakdown</h3>
          {chartItems.map(item => {
              const config = chartConfig[item.name as keyof typeof chartConfig];
              if (item.value < 0) return null;
              
              return (
                <div key={item.name}>
                  <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: config.color }}></span>
                          <span>{config.label}</span>
                      </div>
                      <span className="font-mono font-medium">{formatCurrency(item.value, localCurrency)}</span>
                  </div>
                  {item.name === 'incomeTax' && result.taxCredit > 0 && (
                      <div className="pl-5 mt-1 text-xs space-y-1 text-muted-foreground border-l ml-1.5 pl-4 border-dashed">
                          <div className="flex justify-between">
                              <span>Gross Tax</span>
                              <span>{formatCurrency(result.incomeTaxBeforeCredit, localCurrency)}</span>
                          </div>
                          <div className="flex justify-between text-blue-400">
                              <span>Credits</span>
                              <span>-{formatCurrency(result.taxCredit, localCurrency)}</span>
                          </div>
                      </div>
                  )}
                </div>
              )
          })}
        </div>
      );
    };


    return (
        <div className="max-w-4xl mx-auto">
            <Card className="bg-card/70 backdrop-blur-sm border-border">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Calculator className="w-6 h-6 text-primary" /> Salary Tax Calculator</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="salary">Gross Annual Salary</Label>
                            <Input id="salary" type="number" value={salary} onChange={e => setSalary(e.target.value)} placeholder="e.g., 60000" />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="currency">Salary Currency</Label>
                            <Select value={currency} onValueChange={setCurrency}>
                                <SelectTrigger id="currency">
                                    <SelectValue placeholder="Select currency" />
                                </SelectTrigger>
                                <SelectContent>
                                    {currencies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="country">Tax Country</Label>
                            <Select value={country} onValueChange={setCountry}>
                                <SelectTrigger id="country">
                                    <SelectValue placeholder="Select country" />
                                </SelectTrigger>
                                <SelectContent>
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
                            <Label htmlFor="dependents">Number of Dependents</Label>
                            <Select value={dependents} onValueChange={setDependents}>
                                <SelectTrigger id="dependents">
                                    <SelectValue placeholder="Select dependents" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="0">0</SelectItem>
                                    <SelectItem value="1">1</SelectItem>
                                    <SelectItem value="2">2</SelectItem>
                                    <SelectItem value="3">3</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {country === 'Italy' && taxData['Italy'].specialRegime && (
                        <div className="space-y-2 pt-2">
                            <div className="flex items-center space-x-2">
                                <Checkbox id="special-regime" checked={applySpecialRegime} onCheckedChange={(checked) => setApplySpecialRegime(!!checked)} />
                                <Label htmlFor="special-regime" className="font-normal">{taxData['Italy'].specialRegime.name}</Label>
                            </div>
                            {applySpecialRegime && (
                                 <Alert className="mt-2" variant="destructive">
                                    <Info className="h-4 w-4" />
                                    <AlertDescription>
                                        {taxData['Italy'].specialRegime.description} This significantly reduces income tax but is subject to specific eligibility criteria.
                                    </AlertDescription>
                                </Alert>
                            )}
                        </div>
                    )}

                    <Button onClick={handleCalculate} className="w-full">Calculate</Button>
                </CardContent>
            </Card>

            {result && (
                <>
                    <Card className="mt-8 bg-card/70 backdrop-blur-sm border-border">
                        <CardHeader>
                            <CardTitle>Estimated Annual Results in {taxData[country].currency}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-lg">
                            <div className="flex justify-between items-center text-sm border-b pb-2">
                                <span className="text-muted-foreground">Original Gross Salary</span>
                                <span className="font-bold">{formatCurrency(parseFloat(salary) || 0, currency)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Gross Salary in {taxData[country].currency}</span>
                                <span className="font-bold">{formatCurrency(parseFloat(salary) * (conversionRatesToUSD[currency] || 1) / (conversionRatesToUSD[taxData[country].currency] || 1), taxData[country].currency)}</span>
                            </div>
                            <div className="flex justify-between items-center text-red-400">
                                <span >Estimated Income Tax</span>
                                <span className="font-bold">-{formatCurrency(result.incomeTax, taxData[country].currency)}</span>
                            </div>
                            <div className="flex justify-between items-center text-orange-400">
                                <span >Social Contributions</span>
                                <span className="font-bold">-{formatCurrency(result.socialSecurity, taxData[country].currency)}</span>
                            </div>
                            {result.taxCredit > 0 && (
                                <div className="flex justify-between items-center text-blue-400 text-base">
                                    <span >Tax Credits (Dependents)</span>
                                    <span className="font-bold">+{formatCurrency(result.taxCredit, taxData[country].currency)}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center text-green-400 font-bold border-t pt-4 mt-2">
                                <span >Net Take-Home Pay (Annual)</span>
                                <span>{formatCurrency(result.netIncome, taxData[country].currency)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm pt-2 border-t mt-2">
                                <span className="text-muted-foreground">Effective Tax Rate (incl. social)</span>
                                <span className="font-bold">{result.effectiveRate.toFixed(2)}%</span>
                            </div>
                        </CardContent>
                    </Card>

                    {chartData.length > 0 && (
                        <Card className="mt-8 bg-card/70 backdrop-blur-sm border-border">
                            <CardHeader>
                                <CardTitle>Salary Breakdown</CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                                <CustomLegend />
                                <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[250px]">
                                    <PieChart>
                                        <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} strokeWidth={5} labelLine={false} label={false}>
                                            {chartData.map((entry) => (
                                                <Cell key={`cell-${entry.name}`} fill={entry.fill} className="stroke-background focus:outline-none" />
                                            ))}
                                        </Pie>
                                    </PieChart>
                                </ChartContainer>
                            </CardContent>
                        </Card>
                    )}
                </>
            )}
             <p className="text-xs text-muted-foreground text-center mt-4 animate-pulse-slow">
                Disclaimer: This is a simplified model for illustrative purposes only and does not constitute financial advice. It calculates based on standard local resident tax rates, and any child tax credits are simplified estimates. Expatriate tax laws can be complex; always consult a professional financial advisor.
            </p>
        </div>
    );
}


// --- True Costs Code ---
type FeatureScore = 'good' | 'neutral' | 'bad';
type Feature = { text: React.ReactNode; score: FeatureScore; percentage?: string };

type CountryData = {
  [country: string]: {
    taxStatus: Feature;
    housing: Feature;
    flightAllowance: Feature;
    dependentTuition: Feature;
    gratuity: Feature;
    importedGoods: Feature;
    utilities: Feature;
    transportation: Feature;
    socialLeisure: Feature;
    currency: Feature;
    homeObligations: Feature;
    savings: Feature;
    safety: Feature;
  };
};

const countrySpecificData: CountryData = {
    'United Kingdom': {
        taxStatus: { text: "Salaries are subject to UK income tax (20-45%) and National Insurance contributions. Tax-free salaries are not a feature here.", score: 'bad' },
        housing: { text: "Housing is almost never provided. You'll receive a salary and be expected to cover your own rent, which varies massively between cities like London and smaller towns.", score: 'bad' },
        flightAllowance: { text: "Annual flights are not a standard perk for jobs within the UK. This is typically reserved for international posts abroad.", score: 'bad' },
        dependentTuition: { text: "In the private sector (where most international schools are), staff children often get heavily discounted or free places, but this is a key point to negotiate.", score: 'neutral' },
        gratuity: { text: "There is no end-of-service gratuity system in the UK. Instead, schools contribute to a pension scheme (like the Teachers' Pension Scheme).", score: 'neutral' },
        importedGoods: { text: "As a major economy, most goods are readily available. You won't face a significant 'expat premium' on groceries, but costs are generally high.", score: 'neutral', percentage: "+10%" },
        utilities: { text: "Heating is a significant winter expense. Council tax (a local property tax) is another major monthly bill not found in many other countries.", score: 'bad', percentage: "+30%" },
        transportation: { text: "Public transport is extensive but can be very expensive, especially train travel. Many people outside of major cities rely on a car.", score: 'neutral', percentage: "+20%" },
        socialLeisure: { text: "The cost of a pint of beer or a meal out varies by city but is generally high compared to many teaching destinations. Gym memberships are common.", score: 'bad', percentage: "+40%" },
        currency: { text: "You're paid in GBP (£). If you have debts in another currency, you're exposed to exchange rate fluctuations. Remittance fees for sending money abroad are standard, averaging 0.5-2% via banks or online services. For example, making 6 transfers a year of a significant portion of your savings could easily add up to over £100-£200 in annual fees.", score: 'neutral' },
        homeObligations: { text: "This is your home base. The tool helps you budget your UK salary against your existing UK financial commitments like mortgages or loans.", score: 'neutral' },
        savings: { text: "Calculates your projected annual savings in GBP after all UK taxes and your specified lifestyle costs are deducted.", score: 'neutral' },
        safety: {
            text: (
                <>
                    Ranked 37th on the 2023 Global Peace Index. UK/US travel advisories note a "substantial" terrorism threat, but day-to-day life is generally safe. Exercise standard precautions for petty crime.{' '}
                    <Link href="https://en.wikipedia.org/wiki/Global_Peace_Index" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">GPI Rank</Link> / {' '}
                    <Link href="https://www.gov.uk/foreign-travel-advice/united-kingdom" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">UK.GOV</Link> / {' '}
                    <Link href="https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories/united-kingdom-travel-advisory.html" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">US Travel</Link>
                </>
            ),
            score: 'neutral',
            percentage: 'Rank 37'
        },
    },
    'UAE': {
        taxStatus: { text: "Salaries are 100% tax-free (0% income tax). This is the single biggest financial advantage of working in the UAE.", score: 'good' },
        housing: { text: "Most schools provide either free, furnished accommodation (often on a shared campus) or a housing allowance. Check if the allowance covers a good quality apartment in a desirable area.", score: 'good' },
        flightAllowance: { text: "An annual flight allowance is standard. It's often a cash sum, which offers flexibility. Check if it covers dependents.", score: 'good' },
        dependentTuition: { text: "Crucial. Top-tier schools usually provide 1-2 free child places. Less established schools may offer partial discounts. A lack of this benefit can wipe out your savings.", score: 'good' },
        gratuity: { text: "An end-of-service gratuity is legally required, typically 21 days' basic salary for each of the first five years of service, and 30 days for each year after.", score: 'good' },
        importedGoods: { text: "Supermarkets are full of imported Western brands, but they come at a premium. Eating and buying local is cheaper.", score: 'neutral', percentage: "+30%" },
        utilities: { text: "AC is non-negotiable for 6-8 months of the year and will be your largest utility bill. 'Chiller fees' (for AC) can be a major variable.", score: 'bad', percentage: "+20%" },
        transportation: { text: "A car is almost essential outside of Dubai's metro line. Factor in costs for car leasing/purchase, petrol (which is relatively cheap), and road tolls (Salik).", score: 'neutral', percentage: "Baseline" },
        socialLeisure: { text: "The 'brunch' culture is a major social outlet but can be very expensive. Alcohol is heavily taxed, making it a luxury item.", score: 'bad', percentage: "+80%" },
        currency: { text: "You're paid in UAE Dirhams (AED), pegged to the USD. This provides stability. Remittance fees are very low, often a small fixed fee. For example, 6 transfers a year would likely cost less than £50 in total, maximizing what you send home.", score: 'good' },
        homeObligations: { text: "Your tax-free salary makes it easier to cover obligations back home. The tool lets you input these to see your true disposable income.", score: 'good' },
        savings: { text: "Calculates your projected annual savings in your home currency, showcasing the power of a tax-free salary and benefits package.", score: 'good' },
        safety: {
            text: (
                 <>
                    Ranked 75th on the 2023 Global Peace Index. Crime rates are very low, but US advisories highlight the risk of regional conflict. Adherence to local laws is essential.{' '}
                    <Link href="https://en.wikipedia.org/wiki/Global_Peace_Index" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">GPI Rank</Link> / {' '}
                    <Link href="https://www.gov.uk/foreign-travel-advice/uae" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">UK.GOV</Link> / {' '}
                    <Link href="https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories/united-arab-emirates-travel-advisory.html" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">US Travel</Link>
                </>
            ),
            score: 'neutral',
            percentage: 'Rank 75'
        },
    },
    'Japan': {
        taxStatus: { text: "Your salary is subject to Japanese income tax (5-45%), inhabitant tax, and social security. Taxes are significant but often lower than Western Europe.", score: 'neutral' },
        housing: { text: "Varies. Some schools provide subsidized/free housing. In Tokyo, you'll likely get an allowance that may not cover the full rent, requiring a top-up.", score: 'neutral' },
        flightAllowance: { text: "An annual flight home is not always standard but is offered by many top international schools. It might be a reimbursed ticket rather than cash.", score: 'neutral' },
        dependentTuition: { text: "Most reputable international schools will offer free or heavily discounted tuition for dependents. This is a critical benefit due to the high cost of education in Japan.", score: 'good' },
        gratuity: { text: "There is no 'gratuity' system. Schools contribute to the Japanese pension system. Some schools might offer a contract completion bonus, but it's not standard.", score: 'neutral' },
        importedGoods: { text: "Finding specific Western brands can be difficult and expensive outside of specialty import stores in major cities. You'll adapt to excellent local alternatives.", score: 'bad', percentage: "+50%" },
        utilities: { text: "Reasonable, but heating in winter and AC in the humid summer can cause bills to spike. Housing is often less insulated than in colder climates.", score: 'neutral', percentage: "-10%" },
        transportation: { text: "World-class public transport is the norm in cities. A monthly pass (Teiki) is cost-effective. Owning a car in a major city is prohibitively expensive and unnecessary.", score: 'good', percentage: "-30%" },
        socialLeisure: { text: "Eating out can be very affordable. Social life often revolves around restaurants and izakayas. Western-style bars, gyms, and social events can be more expensive.", score: 'good', percentage: "-20%" },
        currency: { text: "You are paid in Japanese Yen (JPY), a major but sometimes volatile currency. Standard bank remittance fees can be high; using a service like Wise is recommended to minimize costs (under 1%). With bank fees being higher, 6 transfers a year could cost several hundred dollars if not managed carefully.", score: 'neutral' },
        homeObligations: { text: "Use the tool to see how your net JPY salary stacks up against your financial commitments in your home currency after conversion.", score: 'neutral' },
        savings: { text: "Calculates your projected annual savings, converting from JPY to your home currency to give a clear picture of your wealth-building potential.", score: 'neutral' },
        safety: {
            text: (
                <>
                    Ranked 9th on the 2023 Global Peace Index. Japan has very low crime rates and is one of the safest countries in the world. UK and US advisories recommend normal precautions.{' '}
                    <Link href="https://en.wikipedia.org/wiki/Global_Peace_Index" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">GPI Rank</Link> / {' '}
                    <Link href="https://www.gov.uk/foreign-travel-advice/japan" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">UK.GOV</Link> / {' '}
                    <Link href="https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories/japan-travel-advisory.html" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">US Travel</Link>
                </>
            ),
            score: 'good',
            percentage: 'Rank 9'
        },
    },
    'Switzerland': {
        taxStatus: { text: "Salaries are subject to federal, cantonal, and municipal taxes, which can be high (up to 40% combined). However, salaries are also among the highest in the world.", score: 'neutral' },
        housing: { text: "Housing is not provided and is extremely expensive, especially in cities like Zurich and Geneva. This is the largest expense for most teachers.", score: 'bad' },
        flightAllowance: { text: "Not a standard benefit. Flights are typically paid for by the teacher.", score: 'bad' },
        dependentTuition: { text: "Most international schools offer significant discounts for staff children, which is a major benefit given the high cost of tuition.", score: 'good' },
        gratuity: { text: "There is no end-of-service gratuity. Instead, Switzerland has a mandatory three-pillar pension system to which both employer and employee contribute.", score: 'neutral' },
        importedGoods: { text: "Switzerland is not in the EU, so imported goods can be more expensive. However, quality local products are abundant.", score: 'neutral', percentage: "+20%" },
        utilities: { text: "Heating costs during the long, cold winters are a significant expense. Electricity and other utilities are also costly.", score: 'bad', percentage: "+60%" },
        transportation: { text: "Public transportation is incredibly efficient and widely used, but it is expensive. Many people in cities do not own cars.", score: 'neutral', percentage: "+50%" },
        socialLeisure: { text: "The cost of living is very high. Eating out, drinks, and leisure activities are among the most expensive in the world. Outdoor activities like hiking are popular and free.", score: 'bad', percentage: "+100%" },
        currency: { text: "You're paid in Swiss Francs (CHF), a strong, stable currency. International bank transfers can be costly (1-3%). For 6 annual transfers, this could mean paying over £500 a year in fees on a high savings amount. Choosing a low-fee provider is crucial.", score: 'good' },
        homeObligations: { text: "High salaries can help cover home country obligations, but the high cost of living in Switzerland reduces savings potential.", score: 'neutral' },
        savings: { text: "Calculates your projected annual savings in your home currency, taking into account high salaries but also very high living costs.", score: 'neutral' },
        safety: {
             text: (
                <>
                    Ranked 10th on the 2023 Global Peace Index. Crime rates are very low. Be aware of petty crimes in tourist areas. Both UK and US advisories recommend normal precautions.{' '}
                    <Link href="https://en.wikipedia.org/wiki/Global_Peace_Index" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">GPI Rank</Link> / {' '}
                    <Link href="https://www.gov.uk/foreign-travel-advice/switzerland" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">UK.GOV</Link> / {' '}
                    <Link href="https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories/switzerland-travel-advisory.html" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">US Travel</Link>
                </>
            ),
            score: 'good',
            percentage: 'Rank 10'
        },
    },
    'Singapore': {
        taxStatus: { text: "Income tax is progressive and relatively low (0-22%) compared to many Western countries. It is not tax-free, but the effective tax rate is often competitive.", score: 'good' },
        housing: { text: "Housing is extremely expensive. Most schools provide a housing allowance, but it is unlikely to cover the full cost of a family-sized condominium in a central location.", score: 'bad' },
        flightAllowance: { text: "An annual flight allowance is common, often as a cash benefit, providing flexibility.", score: 'good' },
        dependentTuition: { text: "A crucial benefit. Top schools offer free or heavily subsidized places for dependents, which is a massive financial saving.", score: 'good' },
        gratuity: { text: "There is no mandatory end-of-service gratuity. Some schools may offer a contract completion or renewal bonus.", score: 'neutral' },
        importedGoods: { text: "A major trade hub, so a wide variety of imported goods is available, but they are expensive. Local food in hawker centers is famously delicious and affordable.", score: 'neutral', percentage: "+40%" },
        utilities: { text: "High due to the need for constant air conditioning. Electricity costs are a significant part of the monthly budget.", score: 'bad', percentage: "+30%" },
        transportation: { text: "World-class, efficient, and affordable public transport (MRT and buses) makes owning a car unnecessary and prohibitively expensive.", score: 'good', percentage: "-20%" },
        socialLeisure: { text: "Singapore has a vibrant social scene with many high-end restaurants and bars, which are expensive. Gym memberships are comparable to other major world cities.", score: 'bad', percentage: "+70%" },
        currency: { text: "Payment is in Singapore Dollars (SGD), a stable regional currency. Sending money overseas is efficient with competitive fees, especially through Singapore's fintech solutions. 6 annual transfers of your savings would likely cost well under £100 with the right service.", score: 'good' },
        homeObligations: { text: "Your net salary after tax and high living costs needs to be carefully budgeted against any financial commitments in your home country.", score: 'neutral' },
        savings: { text: "Savings potential is high due to high salaries, but it is heavily dependent on lifestyle choices, especially regarding housing and dining out.", score: 'good' },
        safety: {
             text: (
                <>
                    Ranked 6th on the 2023 Global Peace Index. Strict laws result in extremely low crime rates, making Singapore one of the safest countries globally. Both UK and US advisories recommend normal precautions.{' '}
                    <Link href="https://en.wikipedia.org/wiki/Global_Peace_Index" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">GPI Rank</Link> / {' '}
                    <Link href="https://www.gov.uk/foreign-travel-advice/singapore" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">UK.GOV</Link> / {' '}
                    <Link href="https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories/singapore-travel-advisory.html" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">US Travel</Link>
                </>
            ),
            score: 'good',
            percentage: 'Rank 6'
        },
    },
    'South Korea': {
        taxStatus: { text: "Income is subject to South Korean income tax (6-45%). Rates are progressive. Your school will handle deductions.", score: 'neutral' },
        housing: { text: "Most schools provide furnished housing for teachers, which is a significant benefit as it removes a major expense and the hassle of finding a place.", score: 'good' },
        flightAllowance: { text: "An annual flight allowance is standard in many contracts, often as a reimbursed flight or a fixed amount.", score: 'good' },
        dependentTuition: { text: "Discounts on tuition for dependents are common but may not always be 100%. This is an important point to clarify in the contract.", score: 'neutral' },
        gratuity: { text: "By law, employers must pay a severance pay ('toegig-geum') equivalent to at least one month's salary for every year of service upon contract completion.", score: 'good' },
        importedGoods: { text: "Western groceries and goods are available in larger cities like Seoul but are expensive. A local diet is much more economical.", score: 'bad', percentage: "+40%" },
        utilities: { text: "Reasonably priced, though heating in the cold winters can increase costs. Some school-provided housing may include some utilities.", score: 'good', percentage: "-10%" },
        transportation: { text: "Excellent, affordable, and efficient public transport systems in major cities like Seoul make cars unnecessary.", score: 'good', percentage: "-30%" },
        socialLeisure: { text: "Social life is vibrant and can be very affordable. Local restaurants, soju, and beer are cheap. Western-style bars and restaurants are more expensive.", score: 'good', percentage: "-20%" },
        currency: { text: "You are paid in South Korean Won (KRW). The currency can fluctuate. Strict regulations can make sending large sums of money out of the country more complex; plan remittances carefully. Fees can be moderate. Plan for 6 annual transfers of your savings to cost a couple of hundred pounds, and be aware of regulations on large transfers.", score: 'bad' },
        homeObligations: { text: "With housing often provided, it can be easier to manage home country financial obligations from your Korean salary.", score: 'good' },
        savings: { text: "Moderate savings potential. The low cost of daily living and provided housing helps, but salaries are not as high as in some other regions.", score: 'neutral' },
        safety: {
            text: (
                <>
                    Ranked 43rd on the 2023 Global Peace Index. Daily life is very safe with low crime rates. The political situation with North Korea is a long-standing issue but rarely affects residents.{' '}
                    <Link href="https://en.wikipedia.org/wiki/Global_Peace_Index" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">GPI Rank</Link> / {' '}
                    <Link href="https://www.gov.uk/foreign-travel-advice/south-korea" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">UK.GOV</Link> / {' '}
                    <Link href="https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories/republic-of-korea-travel-advisory.html" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">US Travel</Link>
                </>
            ),
            score: 'neutral',
            percentage: 'Rank 43'
        },
    },
    'Netherlands': {
        taxStatus: { text: "Salaries are subject to a high income tax rate (up to 49.5%) and social security contributions. The '30% ruling' for skilled migrants can provide a significant tax advantage.", score: 'neutral' },
        housing: { text: "Housing is very expensive and in short supply in major cities like Amsterdam. Most schools offer an allowance, but it may not cover the full cost.", score: 'bad' },
        flightAllowance: { text: "Not a standard benefit for schools in the Netherlands.", score: 'bad' },
        dependentTuition: { text: "Most international schools offer a discount, but 100% free tuition is rare. This is a significant cost to factor in.", score: 'neutral' },
        gratuity: { text: "There is no end-of-service gratuity. Schools contribute to a mandatory pension scheme.", score: 'neutral' },
        importedGoods: { text: "As part of the EU, there's a wide availability of goods, but general grocery costs are high.", score: 'neutral', percentage: "+15%" },
        utilities: { text: "Energy prices are high in Europe. Expect significant heating costs in the winter.", score: 'bad', percentage: "+40%" },
        transportation: { text: "Cycling is king and very cheap. Public transport is efficient but can be expensive. Many residents do not own a car.", score: 'good', percentage: "-40%" },
        socialLeisure: { text: "Eating out and social activities are on par with other major Western European cities - relatively expensive.", score: 'bad', percentage: "+50%" },
        currency: { text: "You are paid in Euros (€). As a major world currency, it's stable. Remittance fees are low within the SEPA zone but can be higher for sending money outside of it. Using a fintech service is recommended.", score: 'good' },
        homeObligations: { text: "The high cost of living, particularly rent, can make it challenging to cover significant financial commitments back home.", score: 'bad' },
        savings: { text: "Savings potential is generally considered low to moderate unless you secure a high salary and benefit from the 30% ruling.", score: 'bad' },
        safety: {
             text: (
                <>
                    Ranked 16th on the 2023 Global Peace Index. Crime rates are low, but petty crime like bike theft and pickpocketing is common in major cities. UK and US advisories mention a terrorism threat.{' '}
                    <Link href="https://en.wikipedia.org/wiki/Global_Peace_Index" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">GPI Rank</Link> / {' '}
                    <Link href="https://www.gov.uk/foreign-travel-advice/netherlands" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">UK.GOV</Link> / {' '}
                    <Link href="https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories/netherlands-travel-advisory.html" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">US Travel</Link>
                </>
            ),
            score: 'good',
            percentage: 'Rank 16'
        }
    },
};

const scoreColorClasses = {
  good: 'text-green-400',
  neutral: 'text-amber-400',
  bad: 'text-red-400',
};

const FeatureDetail = ({ icon, title, description, score, percentage }: { icon: React.ReactNode, title: string, description: React.ReactNode, score: FeatureScore, percentage?: string }) => (
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
            <p className="text-sm text-muted-foreground">{description}</p>
        </div>
    </div>
);

function TrueCostsSection() {
  const [selectedCountry, setSelectedCountry] = useState('United Kingdom');
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>('acs-cobham-international-school');
  const [familyStatus, setFamilyStatus] = useState('single');
  const [currency, setCurrency] = useState('GBP');
  const [homeCountry, setHomeCountry] = useState('United Kingdom');
  const [offeredNetMonthlySalary, setOfferedNetMonthlySalary] = useState('');
  const [otherMonthlyBenefits, setOtherMonthlyBenefits] = useState('');
  const [utilitiesAllowance, setUtilitiesAllowance] = useState('');
  const [partnerIncome, setPartnerIncome] = useState('');
  const [contingency, setContingency] = useState('');
  const data = countrySpecificData[selectedCountry];

  const conversionRates: { [key: string]: number } = {
    USD: 1, // Base currency in mock data
    GBP: 0.8,
    EUR: 0.92,
  };
  const usdRate = conversionRates[currency];

  const convert = (amount: number) => amount * usdRate;

  const handleCountryChange = (country: string) => {
    setSelectedCountry(country);
    const firstSchoolInCountry = schools.find(s => s.country === country);
    if (country === 'United Kingdom') {
      setSelectedSchoolId('acs-cobham-international-school');
    } else {
      setSelectedSchoolId(firstSchoolInCountry?.id || null);
    }
  };

  const schoolsInCountry = schools.filter(school => school.country === selectedCountry);
  const selectedSchool = selectedSchoolId ? schools.find(s => s.id === selectedSchoolId) : null;

  useEffect(() => {
    setOfferedNetMonthlySalary('');
    setUtilitiesAllowance('');
    if (selectedSchool && selectedSchool.intel.housing.provided) {
        setOtherMonthlyBenefits(String(Math.round(selectedSchool.costOfLiving.apartment)));
    } else {
        setOtherMonthlyBenefits('');
    }
  }, [selectedSchoolId, selectedSchool]);

  const familyStatusLabels: {[key: string]: string} = {
    single: 'Single',
    couple: 'Couple',
    family: 'Family (2+1)',
    family2: 'Family (2+2)',
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

  const calculateTotal = (school: School | null) => {
    if (!school) return 0;
    const { costOfLiving, intel } = school;
    const foodCost = costOfLiving.food * adults + costOfLiving.food * 0.5 * children;
    const transportCost = costOfLiving.transport * adults + costOfLiving.transport * 0.3 * children;
    const mobileCost = costOfLiving.mobile * adults;
    const diningSocialCost = costOfLiving.diningSocial * adults;
    const uncoveredMedicalCost = costOfLiving.uncoveredMedical * adults + costOfLiving.uncoveredMedical * 0.5 * children;

    const apartmentCost = intel.housing.provided ? 0 : costOfLiving.apartment;

    const total =
      apartmentCost +
      foodCost +
      transportCost +
      costOfLiving.utilities +
      costOfLiving.internet +
      mobileCost +
      diningSocialCost +
      costOfLiving.vehicleInsuranceMaint +
      uncoveredMedicalCost;
      
    return total;
  };
  
  const getAverageAnnualSalary = (salaryRange: string): number => {
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

  const avgGrossAnnualSalary = selectedSchool ? getAverageAnnualSalary(selectedSchool.intel.salary.value) : 0;
  // Assuming ~20% for taxes and deductions for a rough estimate
  const estimatedNetMonthlySalary = (avgGrossAnnualSalary * 0.8) / 12;

  const numericNetMonthlySalary = parseFloat(offeredNetMonthlySalary) || 0;
  const numericOtherMonthlyBenefits = parseFloat(otherMonthlyBenefits) || 0;
  const numericUtilitiesAllowance = parseFloat(utilitiesAllowance) || 0;
  const numericPartnerIncome = parseFloat(partnerIncome) || 0;
  const numericContingency = parseFloat(contingency) || 0;

  const offeredNetMonthlySalaryInUSD = numericNetMonthlySalary > 0 ? numericNetMonthlySalary / usdRate : 0;
  const otherMonthlyBenefitsInUSD = numericOtherMonthlyBenefits / usdRate;
  const utilitiesAllowanceInUSD = numericUtilitiesAllowance / usdRate;
  const partnerIncomeInUSD = numericPartnerIncome / usdRate;
  const contingencyInUSD = numericContingency / usdRate;

  const salaryToUseInUSD = offeredNetMonthlySalaryInUSD > 0 ? offeredNetMonthlySalaryInUSD : estimatedNetMonthlySalary;

  const totalMonthlyPackage = salaryToUseInUSD + otherMonthlyBenefitsInUSD + utilitiesAllowanceInUSD + partnerIncomeInUSD;
  const totalMonthlyCosts = (selectedSchool ? calculateTotal(selectedSchool) : 0) + contingencyInUSD;
  const monthlySavings = totalMonthlyPackage - totalMonthlyCosts;
  const annualSavings = monthlySavings * 12;

  
  let savingsDescription: React.ReactNode = data.savings.text;
  let savingsScore: FeatureScore = data.savings.score;

  if (selectedSchool) {
    const monthlyIncome = salaryToUseInUSD;
    const convertedAnnualSavings = convert(annualSavings);
    const formattedSavings = formatCurrency(convertedAnnualSavings, currency);

    savingsDescription = `Based on an estimated net monthly income and your lifestyle costs, your projected annual savings are approximately ${formattedSavings}.`;

    if (monthlySavings > (monthlyIncome * 0.3)) { // saving > 30% of salary
        savingsScore = 'good';
    } else if (monthlySavings > (monthlyIncome * 0.1)) { // saving > 10%
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

      // Utilities
      if (costOfLiving.utilities > 250) {
          lifestyleData.utilities.score = 'bad';
          lifestyleData.utilities.text = `AC in summer or heating in winter can lead to high utility bills in ${location}. Expect costs to be a significant budget item.`;
      } else if (costOfLiving.utilities < 150) {
          lifestyleData.utilities.score = 'good';
          lifestyleData.utilities.text = `Utility costs in ${location} are generally reasonable, helping to keep monthly expenses down.`;
      } else {
           lifestyleData.utilities.score = 'neutral';
           lifestyleData.utilities.text = `Utility costs in ${location} are average for the region. ${data.utilities.text}`;
      }

      // Transportation
      if (costOfLiving.transport > 200) {
          lifestyleData.transportation.score = 'bad';
          lifestyleData.transportation.text = `Transportation in ${location} can be costly. Whether using public transit or owning a car, this should be factored into your budget.`;
      } else if (costOfLiving.transport < 100) {
          lifestyleData.transportation.text = `Getting around ${location} is affordable, with efficient and cost-effective public transport options available.`;
      } else {
          lifestyleData.transportation.score = 'neutral';
          lifestyleData.transportation.text = `Transportation costs in ${location} are moderate. ${data.transportation.text}`;
      }

      // Social & Leisure
      if (costOfLiving.diningSocial > 400) {
          lifestyleData.socialLeisure.score = 'bad';
          lifestyleData.socialLeisure.text = `The social scene in ${location} is vibrant but can be expensive. Dining out and entertainment are premium-priced.`;
      } else if (costOfLiving.diningSocial < 250) {
          lifestyleData.socialLeisure.score = 'good';
          lifestyleData.socialLeisure.text = `Enjoying a social life in ${location} is quite affordable, with many budget-friendly options for dining and leisure.`;
      } else {
          lifestyleData.socialLeisure.score = 'neutral';
          lifestyleData.socialLeisure.text = `The cost of social activities in ${location} is on par with other major cities. ${data.socialLeisure.text}`;
      }
      
      // Imported Goods
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
      contractPerksData.taxStatus = { text: 'This school offers a 100% tax-free salary, a major financial advantage.', score: 'good' };
    } else {
      contractPerksData.taxStatus = { ...data.taxStatus, text: `At this school, salaries are subject to ${selectedCountry}'s income tax. ${data.taxStatus.text}`};
    }

    if (selectedSchool.intel.housing.provided) {
      contractPerksData.housing = { text: `This school provides housing (${selectedSchool.intel.housing.value}), removing a teacher's largest monthly expense.`, score: 'good' };
    } else {
      contractPerksData.housing = { text: `Housing is not provided by this school (${selectedSchool.intel.housing.value}). Rent will be a significant monthly cost.`, score: 'bad' };
    }

    const note = "Note: This is a school-specific benefit. Verify contract details.";
    contractPerksData.flightAllowance = { ...data.flightAllowance, text: `${data.flightAllowance.text} ${note}` };
    contractPerksData.dependentTuition = { ...data.dependentTuition, text: `${data.dependentTuition.text} ${note}` };
    contractPerksData.gratuity = { ...data.gratuity, text: `${data.gratuity.text} ${note}` };
  }

  const homeObligationsData = { ...data.homeObligations };
  if (homeCountry === selectedSchool?.country) {
    homeObligationsData.text = `As your target country is also your home country, you can manage financial commitments like mortgages or student loans directly from your local salary.`;
    homeObligationsData.score = 'good';
  } else {
    homeObligationsData.text = `Working abroad requires managing finances across two countries. Your net salary in ${selectedCountry} needs to cover commitments in ${homeCountry}.`;
    homeObligationsData.score = 'neutral';
  }

    const getSafetyScore = (rankString: string | undefined): FeatureScore => {
        if (!rankString) return 'neutral';
        const rank = parseInt(rankString.replace('Rank ', ''));
        if (rank <= 20) return 'good';
        if (rank <= 60) return 'neutral';
        return 'bad';
    };

    lifestyleData.safety.score = getSafetyScore(lifestyleData.safety.percentage);

  return (
    <div className="max-w-5xl mx-auto">
        <div className="mb-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="home-country-select" className="text-base font-semibold block text-center mb-2">Home Country</Label>
            <Select value={homeCountry} onValueChange={setHomeCountry}>
              <SelectTrigger id="home-country-select">
                <SelectValue placeholder="Select home country" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(countrySpecificData).map(country => (
                  <SelectItem key={country} value={country}>{country}</SelectItem>
                ))}
                 <SelectItem value="USA">USA</SelectItem>
                 <SelectItem value="Canada">Canada</SelectItem>
                 <SelectItem value="Australia">Australia</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="country-select" className="text-base font-semibold block text-center mb-2">Target Country</Label>
            <Select value={selectedCountry} onValueChange={handleCountryChange}>
              <SelectTrigger id="country-select">
                <SelectValue placeholder="Select a country" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(countrySpecificData).map(country => (
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
            <Select value={familyStatus} onValueChange={setFamilyStatus}>
              <SelectTrigger id="family-status-select">
                <SelectValue placeholder="Select family status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Single</SelectItem>
                <SelectItem value="couple">Couple</SelectItem>
                <SelectItem value="family">Family (2+1)</SelectItem>
                <SelectItem value="family2">Family (2+2)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedSchool && (
            <Card id="financial-snapshot" className="mb-8 bg-card/70 backdrop-blur-sm border-border scroll-mt-24">
                <CardHeader className="flex-row items-center justify-between pb-4">
                    <div>
                        <CardTitle className="flex items-center text-xl">
                            <LineChart className="w-5 h-5 mr-2 text-primary" />
                            Financial Snapshot
                        </CardTitle>
                        <CardDescription className="mt-1">
                           Estimate your monthly budget. Replace our mid range estimates with your net salary offer for a more accurate forecast.
                        </CardDescription>
                    </div>
                    <div className="w-[120px]">
                        <Select value={currency} onValueChange={setCurrency}>
                            <SelectTrigger id="currency-select-page">
                                <SelectValue placeholder="Currency" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="GBP">GBP (£)</SelectItem>
                                <SelectItem value="USD">USD ($)</SelectItem>
                                <SelectItem value="EUR">EUR (€)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                        {/* Income & Benefits Column */}
                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg text-green-400 border-b pb-2">Income &amp; Benefits (Monthly)</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between items-center">
                                    <Label htmlFor="offered-salary" className="flex items-center text-muted-foreground">
                                        <Pencil className="w-4 h-4 mr-2 text-green-400" /> Your Net Monthly Salary
                                    </Label>
                                    <Input
                                        id="offered-salary"
                                        type="text"
                                        inputMode="numeric"
                                        placeholder={`${Math.round(convert(estimatedNetMonthlySalary))}`}
                                        value={offeredNetMonthlySalary}
                                        onChange={(e) => setOfferedNetMonthlySalary(e.target.value)}
                                        className="mt-0 max-w-[120px] h-8 text-right bg-input/40"
                                    />
                                </div>
                                <div className="flex justify-between items-center">
                                    <Label htmlFor="other-benefits" className="flex items-center text-muted-foreground">
                                        <Award className="w-4 h-4 mr-2 text-blue-400" /> Housing Benefit Est.
                                    </Label>
                                    <Input
                                        id="other-benefits"
                                        type="text"
                                        inputMode="numeric"
                                        placeholder="0"
                                        value={otherMonthlyBenefits}
                                        onChange={(e) => setOtherMonthlyBenefits(e.target.value)}
                                        className="mt-0 max-w-[120px] h-8 text-right bg-input/40"
                                    />
                                </div>
                                <div className="flex justify-between items-center">
                                    <Label htmlFor="utilities-allowance" className="flex items-center text-muted-foreground">
                                        <Zap className="w-4 h-4 mr-2 text-yellow-400" /> Utilities Allowance
                                    </Label>
                                    <Input
                                        id="utilities-allowance"
                                        type="text"
                                        inputMode="numeric"
                                        placeholder="0"
                                        value={utilitiesAllowance}
                                        onChange={(e) => setUtilitiesAllowance(e.target.value)}
                                        className="mt-0 max-w-[120px] h-8 text-right bg-input/40"
                                    />
                                </div>
                                <div className="flex justify-between items-center">
                                    <Label htmlFor="partner-income" className="flex items-center text-muted-foreground">
                                        <Users className="w-4 h-4 mr-2 text-purple-400" /> Other / Partner Income
                                    </Label>
                                    <Input
                                        id="partner-income"
                                        type="text"
                                        inputMode="numeric"
                                        placeholder="0"
                                        value={partnerIncome}
                                        onChange={(e) => setPartnerIncome(e.target.value)}
                                        className="mt-0 max-w-[120px] h-8 text-right bg-input/40"
                                    />
                                </div>
                            </div>
                            <Separator />
                            <div className="flex justify-between items-center font-bold text-lg">
                                <span className="text-primary-foreground">Total Monthly Package</span>
                                <span className="text-green-400">{formatCurrency(convert(totalMonthlyPackage), currency)}</span>
                            </div>
                            <div className="text-right pt-1">
                                <p className="text-xs text-muted-foreground">
                                    For an accurate net salary, use the{' '}
                                    <Link href="#tax-calculator" className="text-sky-400 hover:underline">
                                        tax calculator
                                    </Link>
                                    .
                                </p>
                            </div>
                        </div>

                        {/* Estimated Costs Column */}
                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg text-red-400 border-b pb-2">Estimated Costs ({familyStatusLabels[familyStatus]})</h3>
                            <div className="space-y-1 text-sm text-muted-foreground">
                                <div className="flex justify-between items-center">
                                    <span className="flex items-center"><Home className="w-4 h-4 mr-2 text-sky-400" /> Monthly Rent (1-2 Bed)</span>
                                    <span>{selectedSchool.intel.housing.provided ? "Provided" : formatCurrency(convert(selectedSchool.costOfLiving.apartment), currency)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="flex items-center"><Zap className="w-4 h-4 mr-2 text-green-400" /> Utilities</span>
                                    <span>{formatCurrency(convert(selectedSchool.costOfLiving.utilities), currency)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="flex items-center"><Wifi className="w-4 h-4 mr-2 text-indigo-400" /> Internet</span>
                                    <span>{formatCurrency(convert(selectedSchool.costOfLiving.internet), currency)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="flex items-center"><Smartphone className="w-4 h-4 mr-2 text-slate-400" /> Mobile</span>
                                    <span>{formatCurrency(convert(selectedSchool.costOfLiving.mobile * adults), currency)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="flex items-center"><Utensils className="w-4 h-4 mr-2 text-amber-400" /> Groceries</span>
                                    <span>{formatCurrency(convert(selectedSchool.costOfLiving.food * adults + selectedSchool.costOfLiving.food * 0.5 * children), currency)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="flex items-center"><Coffee className="w-4 h-4 mr-2 text-yellow-600" /> Dining &amp; Social</span>
                                    <span>{formatCurrency(convert(selectedSchool.costOfLiving.diningSocial * adults), currency)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="flex items-center"><TramFront className="w-4 h-4 mr-2 text-rose-400" /> Transport</span>
                                    <span>{formatCurrency(convert(selectedSchool.costOfLiving.transport * adults + selectedSchool.costOfLiving.transport * 0.3 * children), currency)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <Label htmlFor="contingency-cost" className="flex items-center text-muted-foreground">
                                        <Milestone className="w-4 h-4 mr-2" /> Contingency Fund
                                    </Label>
                                    <Input
                                        id="contingency-cost"
                                        type="text"
                                        inputMode="numeric"
                                        placeholder="0"
                                        value={contingency}
                                        onChange={(e) => setContingency(e.target.value)}
                                        className="mt-0 max-w-[120px] h-8 text-right bg-input/40"
                                    />
                                </div>
                            </div>
                            <Separator />
                            <div className="flex justify-between items-center font-bold text-lg">
                                <span className="text-primary-foreground">Total Estimated Costs</span>
                                <span className="text-red-400">{formatCurrency(convert(totalMonthlyCosts), currency)}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="pt-6">
                        <Separator className="mb-6" />
                        <div className="mb-6 text-center text-amber-400">
                          <p>
                              Ensure your <span className="underline font-semibold">Family Status</span> is correct.
                          </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
                            <div className={cn("p-4 rounded-lg", monthlySavings >= 0 ? "bg-green-500/10" : "bg-red-500/10")}>
                                <h4 className="text-sm font-semibold text-muted-foreground">PROJECTED MONTHLY SAVINGS</h4>
                                <p className={cn("text-3xl font-bold mt-1", monthlySavings >= 0 ? "text-green-400" : "text-red-400")}>
                                    {formatCurrency(convert(monthlySavings), currency)}
                                </p>
                            </div>
                             <div className={cn("p-4 rounded-lg", annualSavings >= 0 ? "bg-green-500/10" : "bg-red-500/10")}>
                                <h4 className="text-sm font-semibold text-muted-foreground">PROJECTED ANNUAL SAVINGS</h4>
                                <p className={cn("text-3xl font-bold mt-1", annualSavings >= 0 ? "text-green-400" : "text-red-400")}>
                                    {formatCurrency(convert(annualSavings), currency)}
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        )}

        <div className="mt-12 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card id="package-deals" className="bg-card/70 backdrop-blur-sm border-border flex flex-col scroll-mt-24">
                    <CardHeader>
                        <CardTitle>Leopardfish Intel</CardTitle>
                        <p className="text-sm text-muted-foreground capitalize pt-1">
                            {selectedCountry}
                            {selectedSchool ? ` | ${selectedSchool.name}` : ''}
                            {' | '}
                            {familyStatusLabels[familyStatus]}
                        </p>
                    </CardHeader>
                    <CardContent className="flex-grow pt-0">
                        <div className="space-y-4">
                            <FeatureDetail 
                                icon={<FileText className="w-5 h-5" />}
                                title="Tax Status"
                                description={<>
                                    {contractPerksData.taxStatus.text}
                                </>}
                                score={contractPerksData.taxStatus.score}
                            />
                            <FeatureDetail 
                                icon={<Home className="w-5 h-5" />}
                                title="Housing Arrangement"
                                description={contractPerksData.housing.text}
                                score={contractPerksData.housing.score}
                            />
                            <FeatureDetail 
                                icon={<Plane className="w-5 h-5" />}
                                title="Annual Flight Allowance"
                                description={contractPerksData.flightAllowance.text}
                                score={contractPerksData.flightAllowance.score}
                            />
                        </div>
                        <Separator className="my-4" />
                        <div className="space-y-4">
                            <FeatureDetail 
                                icon={<SchoolIcon className="w-5 h-5" />}
                                title="Dependent Tuition"
                                description={contractPerksData.dependentTuition.text}
                                score={contractPerksData.dependentTuition.score}
                            />
                            <FeatureDetail 
                                icon={<Award className="w-5 h-5" />}
                                title="Gratuity / Bonus"
                                description={contractPerksData.gratuity.text}
                                score={contractPerksData.gratuity.score}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card id="true-lifestyle" className="bg-card/70 backdrop-blur-sm border-border flex flex-col scroll-mt-24">
                    <CardHeader>
                        <CardTitle>True Lifestyle</CardTitle>
                        <p className="text-sm text-muted-foreground capitalize pt-1">
                            {selectedCountry}
                            {selectedSchool ? ` | ${selectedSchool.name}` : ''}
                            {' | '}
                            {familyStatusLabels[familyStatus]}
                        </p>
                        <p className="text-xs text-muted-foreground pt-1">Percentages are cost estimates vs. a UK/USA baseline.</p>
                    </CardHeader>
                    <CardContent className="flex-grow pt-0">
                        <div className="space-y-4">
                            <FeatureDetail 
                                icon={<Globe className="w-5 h-5" />}
                                title="Imported Goods"
                                description={lifestyleData.importedGoods.text}
                                score={lifestyleData.importedGoods.score}
                                percentage={lifestyleData.importedGoods.percentage}
                            />
                            <FeatureDetail 
                                icon={<Thermometer className="w-5 h-5" />}
                                title="Utilities (AC/Heat)"
                                description={lifestyleData.utilities.text}
                                score={lifestyleData.utilities.score}
                                percentage={lifestyleData.utilities.percentage}
                            />
                            <FeatureDetail 
                                icon={<Car className="w-5 h-5" />}
                                title="Transportation"
                                description={lifestyleData.transportation.text}
                                score={lifestyleData.transportation.score}
                                percentage={lifestyleData.transportation.percentage}
                            />
                            <FeatureDetail 
                                icon={<Beer className="w-5 h-5" />}
                                title="Social &amp; Leisure"
                                description={lifestyleData.socialLeisure.text}
                                score={lifestyleData.socialLeisure.score}
                                percentage={lifestyleData.socialLeisure.percentage}
                            />
                        </div>
                        <Separator className="my-4" />
                        <div className="space-y-4">
                            <FeatureDetail 
                                icon={<ShieldAlert className="w-5 h-5" />}
                                title="Safety &amp; Travel Advice"
                                description={lifestyleData.safety.text}
                                score={lifestyleData.safety.score}
                                percentage={lifestyleData.safety.percentage}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card id="financial-strategy-card" className="bg-card/70 backdrop-blur-sm border-border flex flex-col scroll-mt-24">
                    <CardHeader>
                        <CardTitle>Financial Strategy</CardTitle>
                        <p className="text-sm text-muted-foreground capitalize pt-1">
                                {selectedCountry}
                                {selectedSchool ? ` | ${selectedSchool.name}` : ''}
                                {' | '}
                                {familyStatusLabels[familyStatus]}
                        </p>
                    </CardHeader>
                    <CardContent className="flex-grow pt-0">
                        <div className="space-y-4">
                            <FeatureDetail 
                                icon={<ArrowRightLeft className="w-5 h-5" />}
                                title="Currency &amp; Fees"
                                description={data.currency.text}
                                score={data.currency.score}
                            />
                            <FeatureDetail 
                                icon={<PiggyBank className="w-5 h-5" />}
                                title="Home Obligations"
                                description={homeObligationsData.text}
                                score={homeObligationsData.score}
                            />
                        </div>
                        <Separator className="my-4" />
                        <div className="space-y-4">
                            <FeatureDetail 
                                icon={<LineChart className="w-5 h-5" />}
                                title="True Savings Potential"
                                description={savingsDescription}
                                score={savingsScore}
                            />
                        </div>
                    </CardContent>
                </Card>
                <Card id="red-flags" className="bg-destructive/10 border-destructive/50 scroll-mt-24">
                    <CardHeader>
                        <CardTitle className="text-destructive flex items-center gap-2">
                            <ShieldAlert className="h-6 w-6" />
                            Financial Red Flags
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <h4 className="font-semibold text-foreground">🚩 Hidden Tax &amp; Social Security Deductions</h4>
                            <p className="text-muted-foreground mt-1">
                                Approximately 30% of teachers report being surprised by "hidden" deductions from their gross salary. These can include local income taxes, social security contributions, or even utility fees for school housing. Always ask for a net salary projection or a full breakdown of all potential deductions before signing.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-foreground">🚩 Currency Fluctuations</h4>
                            <p className="text-muted-foreground mt-1">
                                Fewer than 10% of international school contracts include a "currency protection clause." This leaves you vulnerable if the local currency devalues against your home currency, which can significantly impact your savings and ability to meet financial obligations back home. This has been a major issue in countries like Egypt, Turkey, and Argentina recently.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>

        
        <div className="mt-8 pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <p className="animate-pulse-slow">Disclaimer: The figures provided are estimates for illustrative purposes only and do not constitute financial advice. Actual costs and savings may vary based on individual lifestyle, spending habits, and market conditions.</p>
        </div>
    </div>
  );
}


export default function FinancialForecasterPage() {

    const MiniMenu = () => {
      const menuItems = [
          { label: 'Snapshot', href: '#financial-snapshot'},
          { label: 'Intel', href: '#package-deals' },
          { label: 'Lifestyle', href: '#true-lifestyle' },
          { label: 'Strategy', href: '#financial-strategy-card' },
          { label: 'Red Flags', href: '#red-flags' },
          { label: 'Tax Calculator', href: '#tax-calculator' },
      ];
  
      return (
          <div className="flex justify-center flex-wrap gap-2 mb-12">
              {menuItems.map(item => (
                  <Link href={item.href} key={item.href}
                      className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-muted text-sky-400 hover:bg-background hover:text-sky-300 shadow-sm">
                          {item.label}
                  </Link>
              ))}
          </div>
      )
    }

    return (
        <div className="container mx-auto px-4 md:px-6 py-12">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-center normal-case">Contract decoder</h1>
            <p className="text-muted-foreground text-center mt-4 mb-2 max-w-3xl mx-auto">
                30% of teachers break their contracts because the financial reality was a total shock.
            </p>
            <p className="text-muted-foreground text-center mt-4 mb-8 max-w-3xl mx-auto">
                Our Contract Decoder hacks through the fluff, we calculate your actual take-home pay, and map out your genuine disposable income. Focus on your real financial position and see if you’ll actually grow a savings pot or just treading water.
            </p>
            
            <MiniMenu />

            <section id="true-costs-analysis" className="scroll-mt-20">
               <TrueCostsSection />
            </section>

            <Separator className="my-16" />

            <section id="tax-calculator" className="scroll-mt-20">
              <TaxCalculatorSection />
            </section>

        </div>
    )
}

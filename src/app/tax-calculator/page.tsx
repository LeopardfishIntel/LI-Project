
"use client";

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { Calculator, Info } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { PieChart, Pie, Cell } from 'recharts';
import { ChartContainer, type ChartConfig } from '@/components/ui/chart';

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
    
    // 1. Calculate Social Security (on full income)
    let socialSecurityContrib = 0;
    const socialSecurityTaxableIncome = socialSecurity.floor ? Math.max(0, income - socialSecurity.floor) : income;
    const socialSecurityCappedIncome = socialSecurity.cap ? Math.min(socialSecurityTaxableIncome, socialSecurity.cap) : socialSecurityTaxableIncome;
    if (socialSecurity.rate > 0) {
        socialSecurityContrib = socialSecurityCappedIncome * socialSecurity.rate;
    }

    // Determine taxable income for income tax
    let incomeForTaxCalculation = income;
    if (country === 'Italy' && applySpecialRegime && specialRegime) {
        incomeForTaxCalculation = income * specialRegime.taxablePercentage;
    }

    // 2. Calculate Income Tax
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
    
    // 3. Apply tax credits for dependents
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


export default function TaxCalculatorPage() {
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
        <div className="container mx-auto px-4 md:px-6 py-12">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-center">Worldwide Salary Tax Calculator</h1>
                <p className="text-muted-foreground text-center mt-4 mb-8">
                    Estimate your take-home pay in different countries. This tool calculates based on standard local resident tax rates.
                </p>

                <Card className="bg-card/70 backdrop-blur-sm border-border">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Calculator className="w-6 h-6 text-primary" /> Calculator</CardTitle>
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
                                        <AlertTitle>Special Regime Active</AlertTitle>
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
                                            </PieChart>
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
        </div>
    );
}

    
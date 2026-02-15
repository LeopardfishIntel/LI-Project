
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { Calculator } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

type TaxBracket = { upto: number; rate: number };
type FilingStatusBrackets = { brackets: TaxBracket[] };

const taxData: { [key: string]: {
    currency: string;
    socialSecurity: { rate: number; floor?: number; cap?: number };
    filingStatuses: {
        single: FilingStatusBrackets;
        married: FilingStatusBrackets;
    };
} } = {
    "Japan": {
        currency: "JPY",
        socialSecurity: { rate: 0.145, cap: 8160000 }, // Simplified Pension + Health
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
        filingStatuses: {
            single: { brackets: [{ upto: Infinity, rate: 0 }] },
            married: { brackets: [{ upto: Infinity, rate: 0 }] },
        },
    },
    "United Kingdom": {
        currency: "GBP",
        socialSecurity: { rate: 0.12, floor: 12570, cap: 50270 }, // Simplified NI Class 1
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

const calculateTax = (income: number, country: string, filingStatus: 'single' | 'married') => {
    const countryData = taxData[country];
    if (!countryData || income <= 0) return { totalTax: 0, socialSecurity: 0, netIncome: income, effectiveRate: 0 };
    
    const { socialSecurity, filingStatuses } = countryData;
    const brackets = filingStatuses[filingStatus].brackets;
    
    // 1. Calculate Social Security
    let socialSecurityContrib = 0;
    const socialSecurityTaxableIncome = socialSecurity.floor ? Math.max(0, income - socialSecurity.floor) : income;
    const socialSecurityCappedIncome = socialSecurity.cap ? Math.min(socialSecurityTaxableIncome, socialSecurity.cap) : socialSecurityTaxableIncome;
    if (socialSecurity.rate > 0) {
        socialSecurityContrib = socialSecurityCappedIncome * socialSecurity.rate;
    }

    // 2. Calculate Income Tax
    let incomeTax = 0;
    let lastBracketUpto = 0;
    for (const bracket of brackets) {
        if (income > lastBracketUpto) {
            const taxableInBracket = Math.min(income, bracket.upto) - lastBracketUpto;
            incomeTax += taxableInBracket * bracket.rate;
            lastBracketUpto = bracket.upto;
        } else {
            break;
        }
    }
    
    const totalTax = incomeTax + socialSecurityContrib;
    const netIncome = income - totalTax;
    const effectiveRate = income > 0 ? (totalTax / income) * 100 : 0;

    return { incomeTax, socialSecurity: socialSecurityContrib, netIncome, totalTax, effectiveRate };
};

export default function TaxCalculatorPage() {
    const [salary, setSalary] = useState('60000');
    const [country, setCountry] = useState('United Kingdom');
    const [currency, setCurrency] = useState('GBP');
    const [filingStatus, setFilingStatus] = useState<'single' | 'married'>('single');
    const [result, setResult] = useState<{ incomeTax: number, socialSecurity: number, netIncome: number, totalTax: number, effectiveRate: number } | null>(null);
    
    const countriesWithCalculators = Object.keys(taxData).sort();
    const currencies = Object.keys(conversionRatesToUSD).sort();

    useEffect(() => {
        if (taxData[country]) {
            setCurrency(taxData[country].currency);
        }
    }, [country]);

    const handleCalculate = () => {
        const income = parseFloat(salary);
        const incomeInLocalCurrency = income * (conversionRatesToUSD[currency] || 1) / (conversionRatesToUSD[taxData[country].currency] || 1);
        
        if (isNaN(incomeInLocalCurrency) || incomeInLocalCurrency <= 0) {
            setResult(null);
            return;
        }
        const calcResult = calculateTax(incomeInLocalCurrency, country, filingStatus);
        setResult(calcResult);
    };

    return (
        <div className="container mx-auto px-4 md:px-6 py-12">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-center">Worldwide Salary Tax Calculator</h1>
                <p className="text-muted-foreground text-center mt-4 mb-8">
                    Estimate your take-home pay in different countries. This tool calculates based on standard local resident tax rates.
                </p>

                <Card className="bg-card/70 backdrop-blur-sm border-border">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Calculator className="w-6 h-6 text-primary" /> Calculator</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        </div>
                        <Button onClick={handleCalculate} className="w-full">Calculate</Button>
                    </CardContent>
                </Card>

                {result && (
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
                )}
                 <p className="text-xs text-muted-foreground text-center mt-4">
                    Disclaimer: This is a simplified model for illustrative purposes only and does not constitute financial advice. It calculates based on standard local resident tax and social security rates, excluding other potential deductions or tax credits. Expatriate tax laws can be complex; always consult a professional financial advisor.
                </p>
            </div>
        </div>
    );
}

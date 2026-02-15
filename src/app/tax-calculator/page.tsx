
"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { Calculator } from 'lucide-react';

// Basic tax data for demonstration purposes. In a real app, this would be more complex.
const taxBrackets: { [key: string]: { brackets: { upto: number, rate: number }[] } } = {
    "United Kingdom": {
        brackets: [
            { upto: 12570, rate: 0 },
            { upto: 50270, rate: 0.20 },
            { upto: 125140, rate: 0.40 },
            { upto: Infinity, rate: 0.45 },
        ],
    },
    "UAE": {
        brackets: [
            { upto: Infinity, rate: 0 },
        ],
    },
    "Japan": {
         brackets: [
            { upto: 1950000, rate: 0.05 },
            { upto: 3300000, rate: 0.10 },
            { upto: 6950000, rate: 0.20 },
            { upto: 9000000, rate: 0.23 },
            { upto: 18000000, rate: 0.33 },
            { upto: 40000000, rate: 0.40 },
            { upto: Infinity, rate: 0.45 },
        ],
    },
    "Switzerland": { // Simplified, varies by Canton
        brackets: [
            { upto: 14500, rate: 0 },
            { upto: 31600, rate: 0.08 },
            { upto: 41400, rate: 0.11 },
            { upto: 55200, rate: 0.15 },
            { upto: 78100, rate: 0.20 },
            { upto: Infinity, rate: 0.25 },
        ],
    },
    "Singapore": {
        brackets: [
            { upto: 20000, rate: 0 },
            { upto: 30000, rate: 0.02 },
            { upto: 40000, rate: 0.035 },
            { upto: 80000, rate: 0.07 },
            { upto: 120000, rate: 0.115 },
            { upto: 160000, rate: 0.15 },
            { upto: 200000, rate: 0.18 },
            { upto: 240000, rate: 0.19 },
            { upto: 280000, rate: 0.195 },
            { upto: 320000, rate: 0.20 },
            { upto: Infinity, rate: 0.22 },
        ],
    },
     "South Korea": {
        brackets: [
            { upto: 12000000, rate: 0.06 },
            { upto: 46000000, rate: 0.15 },
            { upto: 88000000, rate: 0.24 },
            { upto: 150000000, rate: 0.35 },
            { upto: 300000000, rate: 0.38 },
            { upto: 500000000, rate: 0.40 },
            { upto: 1000000000, rate: 0.42 },
            { upto: Infinity, rate: 0.45 },
        ],
    },
     "USA": { // Simplified Federal
        brackets: [
            { upto: 11000, rate: 0.10 },
            { upto: 44725, rate: 0.12 },
            { upto: 95375, rate: 0.22 },
            { upto: 182100, rate: 0.24 },
            { upto: 231250, rate: 0.32 },
            { upto: 578125, rate: 0.35 },
            { upto: Infinity, rate: 0.37 },
        ],
    },
};

// For countries with very different income scales (e.g., JPY, KRW), we convert to a common currency (USD) before applying brackets.
const conversionRatesToUSD: { [key: string]: number } = { "GBP": 1.25, "EUR": 1.08, "AED": 0.27, "JPY": 0.0064, "CHF": 1.10, "SGD": 0.74, "KRW": 0.00073, "USD": 1 };
const needsConversion = (country: string) => ['Japan', 'South Korea'].includes(country);


const calculateTax = (income: number, country: string, currency: string) => {
    if (!taxBrackets[country] || income <= 0) return { totalTax: 0, netIncome: income, effectiveRate: 0 };
    
    let incomeInBracketCurrency = income;
    if (needsConversion(country)) {
        incomeInBracketCurrency = income * (conversionRatesToUSD[currency] || 1);
    }

    const { brackets } = taxBrackets[country];
    let totalTax = 0;
    let lastBracketUpto = 0;

    for (const bracket of brackets) {
        if (incomeInBracketCurrency > lastBracketUpto) {
            const taxableInBracket = Math.min(incomeInBracketCurrency, bracket.upto) - lastBracketUpto;
            totalTax += taxableInBracket * bracket.rate;
            lastBracketUpto = bracket.upto;
        } else {
            break;
        }
    }
    
    if (needsConversion(country)) {
        totalTax = totalTax / (conversionRatesToUSD[currency] || 1);
    }
    
    const netIncome = income - totalTax;
    const effectiveRate = income > 0 ? (totalTax / income) * 100 : 0;

    return { totalTax, netIncome, effectiveRate };
};

export default function TaxCalculatorPage() {
    const [salary, setSalary] = useState('60000');
    const [country, setCountry] = useState('United Kingdom');
    const [currency, setCurrency] = useState('USD');
    const [result, setResult] = useState<{ totalTax: number, netIncome: number, effectiveRate: number } | null>(null);
    
    const countriesWithCalculators = Object.keys(taxBrackets);
    const currencies = ['USD', 'GBP', 'EUR', 'AED', 'JPY', 'CHF', 'SGD', 'KRW'];

    const handleCalculate = () => {
        const income = parseFloat(salary);
        if (isNaN(income) || income <= 0) {
            setResult(null);
            return;
        }
        const calcResult = calculateTax(income, country, currency);
        setResult(calcResult);
    };

    return (
        <div className="container mx-auto px-4 md:px-6 py-12">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-center">Worldwide Salary Tax Calculator</h1>
                <p className="text-muted-foreground text-center mt-4 mb-8">
                    Estimate your take-home pay in different countries. This is a simplified model for illustrative purposes and does not constitute financial advice.
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
                                <Label htmlFor="currency">Currency</Label>
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
                                <Label htmlFor="country">Country</Label>
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
                        <Button onClick={handleCalculate} className="w-full">Calculate</Button>
                    </CardContent>
                </Card>

                {result && (
                    <Card className="mt-8 bg-card/70 backdrop-blur-sm border-border">
                        <CardHeader>
                            <CardTitle>Estimated Results</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-lg">
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Gross Annual Salary</span>
                                <span className="font-bold">{formatCurrency(parseFloat(salary) || 0, currency)}</span>
                            </div>
                            <div className="flex justify-between items-center text-red-400">
                                <span >Estimated Annual Tax</span>
                                <span className="font-bold">{formatCurrency(result.totalTax, currency)}</span>
                            </div>
                            <div className="flex justify-between items-center text-green-400">
                                <span >Net Take-Home Pay</span>
                                <span className="font-bold">{formatCurrency(result.netIncome, currency)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm pt-2 border-t mt-2">
                                <span className="text-muted-foreground">Effective Tax Rate</span>
                                <span className="font-bold">{result.effectiveRate.toFixed(2)}%</span>
                            </div>
                        </CardContent>
                    </Card>
                )}
                 <p className="text-xs text-muted-foreground text-center mt-4">
                    Note: Calculations do not include social security, pension contributions, or other deductions which can be significant. Tax laws for expatriates can be complex. Always consult a professional.
                </p>
            </div>
        </div>
    );
}

    
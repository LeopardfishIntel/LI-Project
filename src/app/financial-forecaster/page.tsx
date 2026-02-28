
"use client";

import { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { cn, formatCurrency } from '@/lib/utils';
import { Home, Utensils, TramFront, Zap, Wifi, Smartphone, Globe, LineChart, Award, Pencil, Users, Loader2, ShieldAlert, GraduationCap, ExternalLink, ArrowRightLeft, Milestone } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { getRentForFamily, type FamilyStatus } from '@/lib/rent-calculator';
import { Separator } from '@/components/ui/separator';
import type { School } from '@/lib/types';

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

// Tactical Order: Priority first (USD, GBP, EUR), then alphabetical
const ORDERED_CURRENCIES = [
  'USD', 'GBP', 'EUR',
  ...Object.keys(CONVERSION_RATES)
    .filter(c => !['USD', 'GBP', 'EUR'].includes(c))
    .sort()
];

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
  const [contingency, setContingency] = useState('200');
  const [homeCountryCost, setHomeCountryCost] = useState('');
  const [studentLoan, setStudentLoan] = useState('');

  const selectedSchool = useMemo(() => {
      if (!selectedSchoolId || !schools) return null;
      return schools.find(s => s.id === selectedSchoolId);
  }, [selectedSchoolId, schools]);

  // Automated Currency Sync Stage
  useEffect(() => {
    if (selectedSchool) {
      const autoCurrency = COUNTRY_TO_CURRENCY[selectedSchool.country];
      if (autoCurrency) {
        setCurrency(autoCurrency);
      }
    }
  }, [selectedSchool]);

  const rate = CONVERSION_RATES[currency] || 1;

  const decodedCosts = useMemo(() => {
    if (!selectedSchool) return null;
    const col = selectedSchool.costOfLiving || {};
    const { intel } = selectedSchool;
    
    const adults = familyStatus === 'single' ? 1 : 2;
    const children = familyStatus === 'family' ? 1 : familyStatus === 'family2' ? 2 : 0;
    
    const multiplier = familyStatus === 'single' ? 1 : familyStatus === 'couple' ? 1.6 : familyStatus === 'family' ? 2.1 : 2.5;

    const { rent, label: rentLabel } = getRentForFamily(col, familyStatus);

    const food = (Number(col.food) || 0) * (adults + 0.5 * children) * rate;
    const transport = (Number(col.transport) || 0) * (adults + 0.3 * children) * rate;
    const utilities = (Number(col.utilities) || 0) * multiplier * rate;
    const dining = (Number(col.diningSocial) || 0) * adults * rate;
    const internet = (Number(col.internet) || 0) * rate; 
    const mobile = (Number(col.mobile) || 0) * multiplier * rate; 
    const rentFinal = rent * rate;
    
    const manualHomeCost = parseFloat(homeCountryCost) || 0;
    const manualStudentLoan = parseFloat(studentLoan) || 0;
    const contingencyVal = parseFloat(contingency) || 0;
    
    const totalCosts = (intel.housing.provided ? 0 : rentFinal) + food + transport + utilities + dining + internet + mobile + (manualHomeCost * rate) + (manualStudentLoan * rate) + contingencyVal;

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
      simCount: adults,
      manualHomeCost: manualHomeCost * rate,
      manualStudentLoan: manualStudentLoan * rate,
      contingencyVal
    };
  }, [selectedSchool, familyStatus, homeCountryCost, studentLoan, rate, contingency]);

  const savingsPotential = useMemo(() => {
    if (!decodedCosts || !selectedSchool) return 0;
    const monthlySalary = parseFloat(offeredSalary) || 0;
    return monthlySalary - decodedCosts.totalCosts;
  }, [decodedCosts, offeredSalary]);

  if (isLoadingSchools) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
                  Always verify if the salary quoted is 'Net' or 'Gross'.<br />
                  Check to ensure this includes all Social Security, pension, health, dental, and optical deductions.
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-primary/70 uppercase">Net Monthly Salary Offer</Label>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2 relative">
                    <Pencil className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      className="pl-10 bg-background/50 border-white/10 rounded-sm h-10" 
                      type="number" 
                      placeholder="e.g. 5000" 
                      value={offeredSalary}
                      onChange={(e) => setOfferedSalary(e.target.value)}
                    />
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
                <Label className="text-[10px] font-bold text-primary/70 uppercase">Home-Country Obligations (monthly)</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input 
                    className="pl-10 bg-background/50 border-white/10 rounded-sm h-10" 
                    type="number" 
                    placeholder="e.g. 800" 
                    value={homeCountryCost}
                    onChange={(e) => setHomeCountryCost(e.target.value)}
                  />
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
                    className="pl-10 bg-background/50 border-white/10 rounded-sm h-10" 
                    type="number" 
                    placeholder="e.g. 150" 
                    value={studentLoan}
                    onChange={(e) => setStudentLoan(e.target.value)}
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
                    <CardTitle className="text-lg flex items-center gap-2 stamped-dossier text-white">
                      <Award className="text-primary w-5 h-5" /> Income & Benefits
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b border-white/5">
                      <span className="text-sm text-muted-foreground">Monthly Net Salary</span>
                      <span className="font-bold text-green-400">{formatCurrency(parseFloat(offeredSalary) || 0, currency)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-white/5">
                      <span className="text-sm text-muted-foreground">Housing Arrangement</span>
                      <span className="text-sm font-semibold text-white">{selectedSchool.intel.housing.provided ? "100% Provided" : "Teacher Pays"}</span>
                    </div>
                    {selectedSchool.intel.housing.provided && (
                      <div className="flex justify-between items-center py-2 border-b border-white/5 text-green-400">
                        <span className="text-sm">Housing Value Added</span>
                        <span className="text-sm font-bold">+{formatCurrency(decodedCosts?.rent || 0, currency)}</span>
                      </div>
                    )}
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
                    <DecodedItem label={decodedCosts?.rentLabel || 'Rent'} value={selectedSchool.intel.housing.provided ? 0 : decodedCosts?.rent || 0} currency={currency} isFree={selectedSchool.intel.housing.provided} />
                    <DecodedItem label="Groceries (Scaled)" value={decodedCosts?.food || 0} currency={currency} />
                    <DecodedItem label="Transport (Scaled)" value={decodedCosts?.transport || 0} currency={currency} />
                    <DecodedItem label="Utilities (Scaled)" value={decodedCosts?.utilities || 0} currency={currency} />
                    <DecodedItem label={`Mobile phone (${decodedCosts?.simCount} sims)`} value={decodedCosts?.mobile || 0} currency={currency} />
                    <DecodedItem label="Home internet (Fixed)" value={decodedCosts?.internet || 0} currency={currency} />
                    {decodedCosts?.manualHomeCost ? (
                      <DecodedItem label="Home commitments" value={decodedCosts.manualHomeCost} currency={currency} />
                    ) : null}
                    {decodedCosts?.manualStudentLoan ? (
                      <DecodedItem label="Student loan" value={decodedCosts.manualStudentLoan} currency={currency} />
                    ) : null}
                    
                    {/* Integrated Contingency Fund Input */}
                    <div className="flex justify-between items-center text-sm py-1">
                      <div className="flex items-center gap-2">
                        <Milestone className="size-3 text-purple-400" />
                        <span className="text-muted-foreground font-medium">Contingency Fund</span>
                      </div>
                      <div className="relative w-24">
                        <Input 
                          className="h-7 text-right bg-background/30 border-white/5 pr-2 text-xs focus:ring-1 focus:ring-primary/50" 
                          type="number"
                          value={contingency}
                          onChange={(e) => setContingency(e.target.value)}
                        />
                      </div>
                    </div>

                    <Separator className="my-2 bg-white/5" />
                    <div className="flex justify-between items-center font-bold">
                      <span className="text-sm uppercase tracking-tighter text-white">Burn Rate</span>
                      <span className="text-destructive">{formatCurrency(decodedCosts?.totalCosts || 0, currency)}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Verdict Section */}
              <Card className={cn("glass border-2 rounded-sm", savingsPotential > 0 ? "border-green-500/30" : "border-destructive/30")}>
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="text-center md:text-left">
                      <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">True Net Savings</h4>
                      <p className={cn("text-5xl font-black tracking-tighter", savingsPotential > 0 ? "text-green-400" : "text-destructive")}>
                        {formatCurrency(savingsPotential, currency)}<span className="text-lg">/mo</span>
                      </p>
                    </div>
                    <div className="flex-1 max-w-sm text-sm text-muted-foreground leading-relaxed font-medium">
                      This representing your potential to build wealth after basic survival costs and domestic obligations.
                    </div>
                    <Button className="bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest rounded-sm shadow-[0_0_20px_rgba(249,115,22,0.3)] transition-all hover:shadow-[0_0_30px_rgba(249,115,22,0.5)]" asChild>
                      <Link href="/compare">Final Verdict</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Currency Conversion Section */}
              {savingsPotential !== 0 && (
                <Card className="glass border-white/5 bg-background/20 rounded-sm">
                  <CardHeader className="py-3 px-4 border-b border-white/5">
                    <CardTitle className="text-[10px] font-black text-primary/70 uppercase tracking-widest flex items-center gap-2">
                      <ArrowRightLeft className="size-3" /> Wealth Equivalents (Home Currencies)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                      {['USD', 'GBP', 'EUR', 'AUD', 'CAD', 'ZAR'].filter(c => c !== currency).slice(0, 4).map((targetCcy) => {
                        const savingsInUSD = savingsPotential / rate;
                        const convertedVal = savingsInUSD * (CONVERSION_RATES[targetCcy] || 1);
                        return (
                          <div key={targetCcy} className="space-y-1">
                            <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tighter">{targetCcy} Value</p>
                            <p className="text-base font-bold text-white">{formatCurrency(convertedVal, targetCcy)}</p>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
  );
}

function DecodedItem({ label, value, currency, isFree }: { label: string, value: number, currency: string, isFree?: boolean }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-muted-foreground font-medium">{label}</span>
      <span className={cn("font-bold", isFree ? "text-green-400" : "text-white")}>
        {isFree ? "COVERED" : formatCurrency(value, currency)}
      </span>
    </div>
  );
}

export default function EvaluatePage() {
  return (
    <div className="container mx-auto px-4 md:px-6 py-12">
      <div className="mb-12 text-center">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2 text-center normal-case text-white">
          2. Contract Decoder
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto font-medium text-sm">
          Move with certainty. We strip away recruitment marketing to show actual disposable income with family scaling and bespoke obligations.
        </p>
      </div>

      <Suspense fallback={
        <div className="flex justify-center items-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }>
        <ContractDecoderContent />
      </Suspense>
    </div>
  );
}

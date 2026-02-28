
"use client";

import { useState, useMemo, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { cn, formatCurrency } from '@/lib/utils';
import { Award, Pencil, Users, Loader2, ShieldAlert, LineChart, Globe } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { getRentForFamily, getFamilyScalingMultiplier, type FamilyStatus } from '@/lib/rent-calculator';
import type { School } from '@/lib/types';
import { Separator } from '@/components/ui/separator';

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

const DecodedItem = ({ label, value, currency, isFree }: { label: string, value: number, currency: string, isFree?: boolean }) => (
    <div className="flex justify-between items-center text-sm py-1">
      <span className="text-muted-foreground font-medium">{label}</span>
      <span className={cn("font-bold text-white", isFree && "text-green-400")}>
        {isFree ? "COVERED" : formatCurrency(value, currency)}
      </span>
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
  const [homeObligations, setHomeObligations] = useState('');
  const [contingency] = useState('200');

  const selectedSchool = useMemo(() => {
      if (!selectedSchoolId || !schools) return null;
      return schools.find(s => s.id === selectedSchoolId);
  }, [selectedSchoolId, schools]);

  const decodedCosts = useMemo(() => {
    if (!selectedSchool) return null;
    const col = selectedSchool.costOfLiving || {};
    const { intel } = selectedSchool;
    
    const multiplier = getFamilyScalingMultiplier(familyStatus);
    const { rent, label: rentLabel } = getRentForFamily(col, familyStatus);

    const food = (Number(col.food) || 0) * multiplier;
    const transport = (Number(col.transport) || 0) * multiplier;
    const utilities = (Number(col.utilities) || 0) * multiplier;
    const mobile = (Number(col.mobile) || 0) * (familyStatus === 'single' ? 1 : 2); // logic for 2 sims
    
    const totalCosts = (intel.housing.provided ? 0 : rent) + food + transport + utilities + (Number(col.internet) || 0) + mobile;

    return { rent, rentLabel, food, transport, utilities, internet: Number(col.internet) || 0, mobile, totalCosts };
  }, [selectedSchool, familyStatus]);

  const monthlySalaryNum = offeredSalary ? parseFloat(offeredSalary) : (selectedSchool ? (getAverageAnnualSalary(selectedSchool.intel.salary.value) * 0.8 / 12) : 0);
  const homeObligationsNum = parseFloat(homeObligations) || 0;
  const burnRate = (decodedCosts?.totalCosts || 0) + homeObligationsNum;
  const savingsPotential = monthlySalaryNum - burnRate - parseFloat(contingency);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* MY SETTINGS */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="bg-card/40 border-white/5 rounded-sm">
            <CardHeader>
              <CardTitle className="text-sm stamped-dossier text-white">My Settings</CardTitle>
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
                <Label className="text-[10px] font-bold text-primary/70 uppercase tracking-tighter">Net Monthly Salary Offer</Label>
                <div className="grid grid-cols-4 gap-2">
                  <div className="col-span-3 relative">
                    <Pencil className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      className="pl-10 bg-background/50 border-white/10 h-10 rounded-sm text-right" 
                      type="number" 
                      placeholder="e.g. 5000" 
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
                <Label className="text-[10px] font-bold text-primary/70 uppercase tracking-tighter">Home-Country Obligations (Monthly)</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    className="pl-10 bg-background/50 border-white/10 h-10 rounded-sm text-right" 
                    type="number" 
                    placeholder="e.g. 800" 
                    value={homeObligations}
                    onChange={(e) => setHomeObligations(e.target.value)}
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
                  <span className="text-sm text-muted-foreground font-medium">Monthly Net Salary</span>
                  <span className="font-bold text-green-400 text-lg">
                    {formatCurrency(monthlySalaryNum, currency)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground font-medium">Housing Arrangement</span>
                  <span className="text-sm font-bold text-white">
                    {selectedSchool?.intel.housing.provided ? "School Provided" : "Teacher Pays"}
                  </span>
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
                
                <div className="pt-6 mt-4 border-t border-white/10 flex justify-between items-center">
                  <span className="text-xs font-black uppercase tracking-widest text-white">Burn Rate</span>
                  <span className="text-xl font-bold text-primary">{formatCurrency(burnRate, currency)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* TRUE NET SAVINGS VERDICT */}
          <Card className="border-destructive/40 bg-destructive/5 rounded-sm p-8 shadow-2xl shadow-black/40">
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
              
              <div className="flex-1 max-w-md text-sm text-muted-foreground leading-relaxed text-center md:text-left">
                The gap between your income and your cost of living, including a <strong>${contingency}</strong> contingency buffer.
              </div>

              <Button className="bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest px-8 py-7 h-auto rounded-sm transition-all shadow-[0_0_20px_rgba(249,115,22,0.2)]" asChild>
                <Link href="/compare">Compare Multiple Offers</Link>
              </Button>
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
        <h1 className="text-3xl md:text-5xl font-bold tracking-tighter mb-4 text-white uppercase">
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

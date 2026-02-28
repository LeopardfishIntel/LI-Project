
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
import { Calculator, Home, Utensils, TramFront, Zap, Wifi, Smartphone, Coffee, Stethoscope, LineChart, Award, Pencil, Users, Loader2, ShieldAlert, Milestone, Globe } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { getRentForFamily, type FamilyStatus } from '@/lib/rent-calculator';
import type { School } from '@/lib/types';
import { Separator } from '@/components/ui/separator';

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

  const selectedSchool = useMemo(() => {
      if (!selectedSchoolId || !schools) return null;
      return schools.find(s => s.id === selectedSchoolId);
  }, [selectedSchoolId, schools]);

  const decodedCosts = useMemo(() => {
    if (!selectedSchool) return null;
    const { costOfLiving, intel } = selectedSchool;
    
    // Safety check for missing CoL data
    const col = costOfLiving || {};
    
    const adults = familyStatus === 'single' ? 1 : 2;
    const children = familyStatus === 'family' ? 1 : familyStatus === 'family2' ? 2 : 0;
    const multiplier = familyStatus === 'single' ? 1 : familyStatus === 'couple' ? 1.6 : familyStatus === 'family' ? 2.1 : 2.5;

    const { rent, label: rentLabel } = getRentForFamily(col, familyStatus);

    const food = (Number(col.food) || 0) * (adults + 0.5 * children);
    const transport = (Number(col.transport) || 0) * (adults + 0.3 * children);
    const utilities = (Number(col.utilities) || 0) * multiplier;
    const dining = (Number(col.diningSocial) || 0) * adults;
    const internet = Number(col.internet) || 0; // Fixed cost
    const mobile = (Number(col.mobile) || 0) * multiplier; // Scaled cost
    
    const manualHomeCost = parseFloat(homeCountryCost) || 0;
    
    const totalCosts = (intel.housing.provided ? 0 : rent) + food + transport + utilities + dining + internet + mobile + manualHomeCost;

    return { 
      rent, 
      rentLabel, 
      food, 
      transport, 
      utilities, 
      dining, 
      internet, 
      mobile, 
      totalCosts,
      simCount: adults,
      manualHomeCost
    };
  }, [selectedSchool, familyStatus, homeCountryCost]);

  const savingsPotential = useMemo(() => {
    if (!decodedCosts || !selectedSchool) return 0;
    const monthlySalary = parseFloat(offeredSalary) || 0;
    return monthlySalary - decodedCosts.totalCosts - (parseFloat(contingency) || 0);
  }, [decodedCosts, offeredSalary, contingency]);

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
              <CardTitle className="text-lg stamped-dossier">Decoder Settings</CardTitle>
              <CardDescription className="text-[10px] uppercase tracking-widest">Initialise Mission Parameters</CardDescription>
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
                    <SelectItem value="couple">Couple (Scaling 1.6x)</SelectItem>
                    <SelectItem value="family">Family 2+1 (Scaling 2.1x)</SelectItem>
                    <SelectItem value="family2">Family 2+2 (Scaling 2.5x)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-primary/70 uppercase">Net Monthly Salary Offer ({currency})</Label>
                <div className="relative">
                  <Pencil className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    className="pl-10 bg-background/50 border-white/10 rounded-sm" 
                    type="number" 
                    placeholder="e.g. 5000" 
                    value={offeredSalary}
                    onChange={(e) => setOfferedSalary(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-primary/70 uppercase">Home Country Cost (Monthly)</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input 
                    className="pl-10 bg-background/50 border-white/10 rounded-sm" 
                    type="number" 
                    placeholder="e.g. 800" 
                    value={homeCountryCost}
                    onChange={(e) => setHomeCountryCost(e.target.value)}
                  />
                </div>
                <p className="text-[9px] text-muted-foreground uppercase tracking-widest">Ongoing debts, mortgages, or storage.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-destructive/10 border-destructive/20 rounded-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-destructive font-black uppercase">
                <ShieldAlert className="w-4 h-4" /> Due Diligence
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground leading-relaxed">Always verify if the salary quoted is 'Net' (take-home) or 'Gross'. In many regions, social security can take up to 15% of the headline figure.</p>
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
                <Card className="glass rounded-sm border-white/10">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2 stamped-dossier">
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
                      <span className="text-sm font-semibold">{selectedSchool.intel.housing.provided ? "100% Provided" : "Teacher Pays"}</span>
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
                <Card className="glass rounded-sm border-white/10">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2 stamped-dossier">
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
                    <Separator className="my-2 bg-white/5" />
                    <div className="flex justify-between items-center font-bold">
                      <span className="text-sm uppercase tracking-tighter">Total Burn Rate</span>
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
                    <div className="flex-1 max-w-sm text-sm text-muted-foreground leading-relaxed">
                      This represents your potential to build wealth after basic survival costs and a <span className="text-white font-bold">{formatCurrency(parseFloat(contingency), currency)}</span> contingency buffer.
                    </div>
                    <Link href="/compare">
                      <Button className="bg-primary hover:bg-primary/90 text-white font-bold px-8 h-12 rounded-sm uppercase tracking-widest text-xs">
                        Compare Offers
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
  );
}

function DecodedItem({ label, value, currency, isFree }: { label: string, value: number, currency: string, isFree?: boolean }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium", isFree ? "text-green-400" : "")}>
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
        <p className="text-muted-foreground max-w-2xl mx-auto font-medium">
          Move with certainty. We strip away recruitment marketing to show actual disposable income adjusted for your family size.
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

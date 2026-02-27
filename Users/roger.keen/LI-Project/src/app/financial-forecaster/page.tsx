
"use client";

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { cn, formatCurrency } from '@/lib/utils';
import { Calculator, Award, Pencil, Users, Loader2, ShieldAlert, LineChart, Milestone } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { getRentForFamily, getFamilyScalingMultiplier, type FamilyStatus } from '@/lib/rent-calculator';
import type { School } from '@/lib/types';
import { Separator } from '@/components/ui/separator';

export default function ContractDecoderPage() {
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

  const selectedSchool = useMemo(() => {
      if (!selectedSchoolId || !schools) return null;
      return schools.find(s => s.id === selectedSchoolId);
  }, [selectedSchoolId, schools]);

  const decodedCosts = useMemo(() => {
    if (!selectedSchool) return null;
    const { costOfLiving, intel } = selectedSchool;
    const multiplier = getFamilyScalingMultiplier(familyStatus);
    const { rent, label: rentLabel } = getRentForFamily(costOfLiving, familyStatus);

    const food = (costOfLiving.food ?? 0) * multiplier;
    const transport = (costOfLiving.transport ?? 0) * multiplier;
    const utilities = (costOfLiving.utilities ?? 0) * multiplier;
    const medical = (costOfLiving.uncoveredMedical ?? 0) * multiplier;
    const dining = (costOfLiving.diningSocial ?? 0) * multiplier;
    
    const totalCosts = (intel.housing.provided ? 0 : rent) + food + transport + utilities + medical + dining + (costOfLiving.internet ?? 0) + (costOfLiving.mobile ?? 0);

    return { rent, rentLabel, food, transport, utilities, medical, dining, internet: costOfLiving.internet ?? 0, mobile: costOfLiving.mobile ?? 0, totalCosts };
  }, [selectedSchool, familyStatus]);

  const savingsPotential = useMemo(() => {
    if (!decodedCosts || !selectedSchool) return 0;
    const monthlySalary = parseFloat(offeredSalary) || 0;
    return monthlySalary - decodedCosts.totalCosts - (parseFloat(contingency) || 0);
  }, [decodedCosts, offeredSalary, contingency, selectedSchool]);

  if (isLoadingSchools) {
    return (
      <div className="container mx-auto flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 md:px-6 py-12">
      <div className="mb-12 text-center">
        <h1 className="text-4xl md:text-6xl mb-4 tracking-tighter">Stage 2: <span className="text-primary">Contract Decoder</span></h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">We strip away recruitment marketing to show actual disposable income adjusted for your family size.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Input Panel */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="glass border-primary/20">
            <CardHeader>
              <CardTitle className="text-lg stamped-dossier">Decoder Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select School Dossier</Label>
                <Select value={selectedSchoolId ?? ''} onValueChange={setSelectedSchoolId}>
                  <SelectTrigger className="bg-background/50">
                    <SelectValue placeholder="Search schools..." />
                  </SelectTrigger>
                  <SelectContent>
                    {schools?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Family Scaling</Label>
                <Select value={familyStatus} onValueChange={(v) => setFamilyStatus(v as FamilyStatus)}>
                  <SelectTrigger className="bg-background/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single</SelectItem>
                    <SelectItem value="couple">Couple (Scaling 1.6x)</SelectItem>
                    <SelectItem value="family">Family 2+1 (Scaling 2.1x)</SelectItem>
                    <SelectItem value="family2">Family 2+2 (Scaling 2.5x)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Net Monthly Salary Offer ({currency})</Label>
                <div className="relative">
                  <Pencil className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    className="pl-10 bg-background/50" 
                    type="number" 
                    placeholder="e.g. 5000" 
                    value={offeredSalary}
                    onChange={(e) => setOfferedSalary(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-destructive/10 border-destructive/20 rounded-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-destructive font-black">
                <ShieldAlert className="w-4 h-4" /> DUE DILIGENCE REMINDER
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
            <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-lg py-24 text-muted-foreground bg-card/20">
              <LineChart className="w-12 h-12 mb-4 opacity-20" />
              <p className="stamped-dossier">Select a school dossier to initialize the decoder.</p>
            </div>
          ) : (
            <>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Benefits Pane */}
                <Card className="glass">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2 stamped-dossier">
                      <Award className="text-success w-5 h-5" /> Income & Benefits
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b border-white/5">
                      <span className="text-sm text-muted-foreground">Monthly Net Salary</span>
                      <span className="font-bold text-success">{formatCurrency(parseFloat(offeredSalary) || 0, currency)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-white/5">
                      <span className="text-sm text-muted-foreground">Housing Arrangement</span>
                      <span className="text-sm font-semibold">{selectedSchool.intel.housing.provided ? "100% Provided" : "Teacher Pays"}</span>
                    </div>
                    {selectedSchool.intel.housing.provided && (
                      <div className="flex justify-between items-center py-2 border-b border-white/5 text-success">
                        <span className="text-sm">Housing Value Added</span>
                        <span className="text-sm font-bold">+{formatCurrency(decodedCosts?.rent || 0, currency)}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Costs Pane */}
                <Card className="glass">
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
                    <DecodedItem label="Medical Gaps" value={decodedCosts?.medical || 0} currency={currency} />
                    <Separator className="my-2 bg-white/5" />
                    <div className="flex justify-between items-center font-bold">
                      <span className="text-sm uppercase tracking-tighter">Total Burn Rate</span>
                      <span className="text-destructive">{formatCurrency(decodedCosts?.totalCosts || 0, currency)}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Verdict Section */}
              <Card className={cn("glass border-2", savingsPotential > 0 ? "border-success/30" : "border-destructive/30")}>
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="text-center md:text-left">
                      <h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1">True Net Savings</h4>
                      <p className={cn("text-5xl font-black", savingsPotential > 0 ? "text-success" : "text-destructive")}>
                        {formatCurrency(savingsPotential, currency)}<span className="text-lg">/mo</span>
                      </p>
                    </div>
                    <div className="flex-1 max-w-sm text-sm text-muted-foreground leading-relaxed">
                      This represents your potential to build wealth after basic survival costs and a <span className="text-white font-bold">{formatCurrency(parseFloat(contingency), currency)}</span> contingency buffer.
                    </div>
                    <Button className="bg-primary hover:bg-primary/90 text-white font-bold px-8 h-12 rounded-sm" asChild>
                      <Link href="/compare">Compare Multiple Offers</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DecodedItem({ label, value, currency, isFree }: { label: string, value: number, currency: string, isFree?: boolean }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium", isFree ? "text-success" : "")}>
        {isFree ? "COVERED" : formatCurrency(value, currency)}
      </span>
    </div>
  );
}

"use client";

import { useState, useMemo, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { cn, formatCurrency } from '@/lib/utils';
import { 
  Calculator, 
  Award, 
  Pencil, 
  Loader2, 
  LineChart, 
  Sparkles,
  ServerCrash,
  TrendingUp,
  TrendingDown,
  Compass,
  AlertTriangle
} from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { School } from '@/lib/types';
import { getOfferTacticalVerdict } from './actions';
import type { EvaluateOfferOutput } from '@/ai/flows/evaluate-offer-flow';

const noSpinners = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

const CONVERSION_RATES: Record<string, number> = {
  USD: 1,
  GBP: 0.78,
  EUR: 0.92,
  AED: 3.67,
};

function ContractDecoderContent() {
  const firestore = useFirestore();
  const schoolsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'schools') : null),
    [firestore]
  );
  const { data: schools, isLoading: isLoadingSchools } = useCollection<School>(schoolsQuery);

  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [familyStatus, setFamilyStatus] = useState<string>('single');
  const [currency, setCurrency] = useState('USD');
  const [offeredSalary, setOfferedSalary] = useState('');
  const [contingency, setContingency] = useState('200');

  const [verdict, setVerdict] = useState<EvaluateOfferOutput | null>(null);
  const [isVerdictLoading, setIsVerdictLoading] = useState(false);
  const [verdictError, setVerdictError] = useState<string | null>(null);

  const selectedSchool = useMemo(() => {
      if (!selectedSchoolId || !schools) return null;
      return schools.find(s => s.id === selectedSchoolId);
  }, [selectedSchoolId, schools]);

  const rate = CONVERSION_RATES[currency] || 1;

  const decodedCosts = useMemo(() => {
    if (!selectedSchool) return null;
    const col = selectedSchool.costOfLiving || {};
    const { intel } = selectedSchool;
    const multiplier = familyStatus === 'single' ? 1 : 1.6;
    const rent = (Number(col.monthlyRent1BR || (col as any).apartment || 0)) * rate;
    const food = (Number(col.food) || 0) * multiplier * rate;
    const transport = (Number(col.transport) || 0) * multiplier * rate;
    const utilities = (Number(col.utilities) || 0) * rate;
    const totalCosts = (intel.housing.provided ? 0 : rent) + food + transport + utilities + (parseFloat(contingency) || 0);
    return { totalCosts };
  }, [selectedSchool, familyStatus, contingency, rate]);

  const totalIncome = parseFloat(offeredSalary) || 0;
  const savingsPotential = totalIncome - (decodedCosts?.totalCosts || 0);

  const handleGenerateVerdict = async () => {
    if (!selectedSchool) return;
    setIsVerdictLoading(true);
    setVerdictError(null);
    const result = await getOfferTacticalVerdict({
        schoolName: selectedSchool.name,
        location: selectedSchool.location,
        country: selectedSchool.country,
        monthlySavings: Math.round(savingsPotential),
        currency: currency,
        familyStatus: familyStatus
    });
    if (result.error) setVerdictError(result.error);
    if (result.data) setVerdict(result.data);
    setIsVerdictLoading(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <Card className="glass border-primary/20">
            <CardHeader><CardTitle className="text-sm stamped-dossier text-white text-center">Operational settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-primary/70 tracking-widest">Select school dossier</Label>
                <Select value={selectedSchoolId ?? ''} onValueChange={setSelectedSchoolId}>
                  <SelectTrigger className="bg-background/50 border-white/10 rounded-sm text-white font-bold"><SelectValue placeholder="Search schools..." /></SelectTrigger>
                  <SelectContent className="glass">{schools?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-primary/70 tracking-widest">Net monthly salary offer</Label>
                <div className="relative">
                  <Pencil className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input 
                    className={cn("pl-10 bg-background/50 border-white/10 rounded-sm h-10 text-right font-bold text-white", noSpinners)} 
                    type="number" 
                    placeholder="0" 
                    value={offeredSalary} 
                    onChange={(e) => setOfferedSalary(e.target.value)} 
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {!selectedSchool ? (
            <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-sm py-24 text-muted-foreground bg-card/20">
              <LineChart className="w-12 h-12 mb-4 opacity-20" />
              <p className="stamped-dossier text-sm text-white/50">Select a school dossier to initialise the decoder.</p>
            </div>
          ) : (
            <Card className={cn("glass border-2 rounded-sm p-8 shadow-2xl", savingsPotential > 0 ? "border-green-500/30" : "border-destructive/30")}>
                <div className="space-y-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="space-y-1 text-center md:text-left">
                            <h4 className="text-[10px] font-black text-muted-foreground tracking-[0.2em]">True net savings</h4>
                            <div className="flex items-baseline gap-1">
                                <span className={cn("text-5xl font-black tracking-tighter", savingsPotential > 0 ? "text-green-400" : "text-destructive")}>
                                  {formatCurrency(savingsPotential, currency)}
                                </span>
                                <span className="text-lg font-bold text-muted-foreground/50">/mo</span>
                            </div>
                        </div>
                        <Button 
                          onClick={handleGenerateVerdict} 
                          disabled={isVerdictLoading}
                          className="bg-primary hover:bg-primary/90 text-white font-black tracking-widest px-8 py-7 h-auto rounded-sm"
                        >
                          {isVerdictLoading ? <Loader2 className="size-4 animate-spin mr-2" /> : <Sparkles className="size-4 mr-2" />}
                          Generate SWOT verdict
                        </Button>
                    </div>

                    {verdictError && (
                        <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-sm flex items-start gap-3">
                            <ServerCrash className="size-4 text-destructive shrink-0 mt-0.5" />
                            <p className="text-xs text-muted-foreground">{verdictError}</p>
                        </div>
                    )}

                    {verdict && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                            <div className="glass p-4 rounded-sm border-l-4 border-l-green-500/50 space-y-2">
                                <h4 className="text-[10px] font-black text-green-400 tracking-widest flex items-center gap-2">
                                    <TrendingUp className="size-3" /> Strengths
                                </h4>
                                <p className="text-xs text-muted-foreground leading-relaxed font-medium">{verdict.strengths}</p>
                            </div>
                            <div className="glass p-4 rounded-sm border-l-4 border-l-amber-500/50 space-y-2">
                                <h4 className="text-[10px] font-black text-amber-400 tracking-widest flex items-center gap-2">
                                    <TrendingDown className="size-3" /> Weaknesses
                                </h4>
                                <p className="text-xs text-muted-foreground leading-relaxed font-medium">{verdict.weaknesses}</p>
                            </div>
                            <div className="glass p-4 rounded-sm border-l-4 border-l-accent/50 space-y-2">
                                <h4 className="text-[10px] font-black text-accent tracking-widest flex items-center gap-2">
                                    <Compass className="size-3" /> Opportunities
                                </h4>
                                <p className="text-xs text-muted-foreground leading-relaxed font-medium">{verdict.opportunities}</p>
                            </div>
                            <div className="glass p-4 rounded-sm border-l-4 border-l-destructive/50 space-y-2">
                                <h4 className="text-[10px] font-black text-destructive tracking-widest flex items-center gap-2">
                                    <AlertTriangle className="size-3" /> Threats
                                </h4>
                                <p className="text-xs text-muted-foreground leading-relaxed font-medium">{verdict.threats}</p>
                            </div>
                        </div>
                    )}
                </div>
            </Card>
          )}
        </div>
      </div>
  );
}

export default function EvaluatePage() {
  return (
    <div className="container mx-auto px-4 md:px-6 py-12">
      <div className="mb-16 text-center">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-white normal-case">2. Contract decoder</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto font-medium text-sm leading-relaxed">LeopardfishIntel analysis of your potential contract.</p>
      </div>
      <Suspense fallback={<div className="flex justify-center items-center py-24"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}><ContractDecoderContent /></Suspense>
    </div>
  );
}

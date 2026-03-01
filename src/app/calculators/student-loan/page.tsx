
'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Loader2, 
  ShieldAlert, 
  GraduationCap, 
  Lock, 
  Globe, 
  ServerCrash, 
  Info, 
  ArrowRight,
  HelpCircle
} from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { calculateRepayment, type CalculationOutput } from './actions';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import Link from 'next/link';

export default function StudentLoanCalculator() {
  const [loanType, setLoanType] = useState<'UK' | 'US'>('UK');
  const [salaryLocal, setSalaryLocal] = useState('50000');
  const [ukPlan, setUkPlan] = useState('Plan 1');
  const [country, setCountry] = useState('UAE');
  const [isFeieEnabled, setIsFeieEnabled] = useState(true);
  
  const [result, setResult] = useState<CalculationOutput | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCalculate = async () => {
    setLoading(true);
    try {
      const output = await calculateRepayment({
        loanType,
        salaryLocal: parseFloat(salaryLocal) || 0,
        countryName: country,
        ukPlan,
        isFeieEnabled
      });
      setResult(output);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080c18] text-[#f8fafc] p-6 font-sans flex flex-col items-center">
      <div className="w-full max-w-[380px] space-y-6 flex-grow">
        <header className="flex flex-col items-center text-center space-y-2">
          <GraduationCap className="size-10 text-primary mb-2" />
          <h1 className="text-xl font-black uppercase tracking-widest stamped-dossier text-primary">Repayment Simulation</h1>
          <p className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em] opacity-70">Operational Protocol: 2026/27 Overseas</p>
        </header>

        <div className="flex items-center justify-between gap-4 glass bg-white/5 p-3 rounded-sm border border-white/5">
          <span className={cn("text-[10px] font-black uppercase transition-colors", loanType === 'UK' ? "text-primary" : "text-muted-foreground")}>UK Loans</span>
          <Switch 
            checked={loanType === 'US'} 
            onCheckedChange={(checked) => {
                setLoanType(checked ? 'US' : 'UK');
                if(checked) setCountry('USA');
                else setCountry('UAE');
                setResult(null);
            }} 
          />
          <span className={cn("text-[10px] font-black uppercase transition-colors", loanType === 'US' ? "text-primary" : "text-muted-foreground")}>US Loans</span>
        </div>

        <Card className="glass border-white/10 bg-transparent rounded-sm">
          <CardContent className="pt-6 space-y-5">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-primary/70 tracking-widest">Gross Annual Salary (Local)</Label>
              <div className="relative">
                <Input 
                  type="number" 
                  value={salaryLocal} 
                  onChange={(e) => setSalaryLocal(e.target.value)} 
                  className="bg-background/50 border-white/10 h-12 text-right font-black text-lg pr-4 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>

            {loanType === 'UK' ? (
              <>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-primary/70 tracking-widest">Loan Plan Type</Label>
                  <Select value={ukPlan} onValueChange={setUkPlan}>
                    <SelectTrigger className="bg-background/50 border-white/10 h-10 rounded-sm">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass">
                      <SelectItem value="Plan 1">Plan 1</SelectItem>
                      <SelectItem value="Plan 2">Plan 2</SelectItem>
                      <SelectItem value="Plan 4">Plan 4 (Scottish)</SelectItem>
                      <SelectItem value="Plan 5">Plan 5</SelectItem>
                      <SelectItem value="PGL">Postgraduate (PGL)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-primary/70 tracking-widest">Country of Residence</Label>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger className="bg-background/50 border-white/10 h-10 rounded-sm">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass">
                      <SelectItem value="UAE">UAE</SelectItem>
                      <SelectItem value="USA">USA</SelectItem>
                      <SelectItem value="Spain">Spain</SelectItem>
                      <SelectItem value="Thailand">Thailand</SelectItem>
                      <SelectItem value="China">China</SelectItem>
                      <SelectItem value="Qatar">Qatar</SelectItem>
                      <SelectItem value="Japan">Japan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <div className="space-y-4 pt-2">
                <div className="flex items-start gap-3 p-4 bg-primary/5 rounded-sm border border-primary/20">
                  <Checkbox id="feie" checked={isFeieEnabled} onCheckedChange={(v) => setIsFeieEnabled(!!v)} className="mt-1" />
                  <Label htmlFor="feie" className="text-[11px] font-bold leading-relaxed cursor-pointer text-primary-foreground/90">
                    I am a US Citizen claiming Foreign Earned Income Exclusion (FEIE).
                  </Label>
                </div>
                <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-sm">
                  <p className="text-[9px] text-muted-foreground uppercase font-bold leading-tight flex items-center gap-2">
                    <Lock className="size-3 text-destructive" /> IRS Safe Harbor Rule
                  </p>
                  <p className="text-[9px] mt-1 text-muted-foreground italic">If FEIE is active, your adjusted gross income (AGI) is typically $0 for repayment purposes if below $126k.</p>
                </div>
              </div>
            )}

            <Button onClick={handleCalculate} disabled={loading} className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-[0.2em] rounded-sm shadow-lg shadow-primary/20 transition-all active:scale-95">
              {loading ? <Loader2 className="size-4 animate-spin" /> : "Transmit Pulse"}
            </Button>
          </CardContent>
        </Card>

        {result && (
          <Card className={cn("glass transition-all duration-500 rounded-sm border-2 p-6 space-y-4 shadow-2xl", result.error ? "border-destructive/50" : "border-green-500/30 bg-green-500/5")}>
            {result.error ? (
                <div className="flex flex-col items-center text-center space-y-2">
                    <ServerCrash className="size-6 text-destructive" />
                    <p className="text-xs font-bold text-destructive uppercase tracking-widest">Protocol Failure</p>
                    <p className="text-[10px] text-muted-foreground">{result.error}</p>
                </div>
            ) : (
                <>
                    <div className="text-center space-y-1">
                    <h4 className="text-[10px] font-black text-green-400 uppercase tracking-widest">Monthly Estimated Repayment</h4>
                    <div className="flex flex-col items-center">
                        <span className="text-4xl font-black text-white tracking-tighter">{formatCurrency(result.monthlyRepaymentLocal, 'LOCAL')}</span>
                        <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest mt-1">≈ {formatCurrency(result.monthlyRepaymentHome, result.homeCurrency)}</span>
                    </div>
                    </div>
                    <p className="text-[9px] text-muted-foreground text-center font-bold uppercase leading-relaxed border-t border-white/5 pt-3">{result.message}</p>
                </>
            )}
          </Card>
        )}

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="help" className="border-white/10">
            <AccordionTrigger className="text-[10px] font-black uppercase tracking-widest text-primary/80 hover:no-underline">
              <span className="flex items-center gap-2"><HelpCircle className="size-3" /> Need Help? Tactical Briefing</span>
            </AccordionTrigger>
            <AccordionContent className="text-[11px] text-muted-foreground space-y-4 pt-2">
              <div>
                <h4 className="text-white font-bold mb-1">How to Use This Estimator (2026/27 Update)</h4>
                
                <div className="space-y-3">
                  <div className="border-l-2 border-primary/30 pl-3">
                    <p className="text-white font-bold mb-1">🇬🇧 For UK Loan Holders:</p>
                    <ul className="space-y-1 list-disc list-inside opacity-80">
                      <li><span className="font-bold text-white/90">Plan 1:</span> Started uni between 1998 and 2012.</li>
                      <li><span className="font-bold text-white/90">Plan 2:</span> Started uni between 2012 and 2023.</li>
                      <li><span className="font-bold text-white/90">Plan 5:</span> Started uni after Sept 2023.</li>
                      <li><span className="font-bold text-white/90">Postgrad (PGL):</span> Masters or Doctoral loans.</li>
                    </ul>
                    <p className="mt-2 leading-relaxed">Repayment thresholds change based on the <span className="text-white font-bold">Price Level Index (PLI)</span> of your country. The SLC updated these "Country Bands" on April 6, 2026, to reflect global inflation.</p>
                  </div>

                  <div className="border-l-2 border-accent/30 pl-3">
                    <p className="text-white font-bold mb-1">🇺🇸 For US Loan Holders:</p>
                    <ul className="space-y-1 list-disc list-inside opacity-80">
                      <li><span className="font-bold text-white/90">FEIE Exclusion:</span> Citizens earning under $126,000 (2026 limit) usually qualify.</li>
                      <li><span className="font-bold text-white/90">RAP/SAVE Plan:</span> If your Adjusted Gross Income (AGI) is $0 after the exclusion, your monthly payment is $0.</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 p-3 rounded-sm border border-white/5">
                <h4 className="text-white font-bold mb-1 flex items-center gap-2">
                  <ShieldAlert className="size-3 text-primary" /> 2026 Critical Intel
                </h4>
                <p className="mb-2 italic">The "Evidence of Income" Rule: If you don't keep employment evidence updated with the SLC, they will default you to a Fixed Installment Rate, which is significantly higher than 9%.</p>
                <p className="text-[10px] opacity-60">Disclaimer: This tool provides an estimate. Always verify final schedules via your official SLC or US Federal Student Aid portal.</p>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="pt-4 pb-8">
          <Button asChild variant="outline" className="w-full h-14 border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary font-black uppercase tracking-widest text-[10px] rounded-sm group">
            <Link href="/discover" target="_blank">
              <span>Moving country? Find your next nook</span>
              <ArrowRight className="ml-2 size-3 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </div>

        <footer className="pt-4 border-t border-white/5 opacity-50 pb-6">
          <div className="flex items-start gap-2">
            <ShieldAlert className="size-3 text-primary shrink-0 mt-0.5" />
            <p className="text-[8px] text-muted-foreground font-bold uppercase leading-normal tracking-tighter">
              BETA INTEL. INDICATIVE BENCHMARKS ONLY. VERIFY FINAL REPAYMENT OBLIGATIONS WITH THE SLC OR YOUR LOAN SERVICER.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

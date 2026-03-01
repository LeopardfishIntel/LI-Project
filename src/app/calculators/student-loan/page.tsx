
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Calculator, Info, ShieldAlert, GraduationCap } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { calculateRepayment, type CalculationOutput } from './actions';

export default function StudentLoanCalculator() {
  const [loanType, setLoanType] = useState<'UK' | 'US'>('UK');
  const [salaryLocal, setSalaryLocal] = useState('50000');
  const [currency, setCurrency] = useState('AED');
  const [ukPlan, setUkPlan] = useState('Plan 1');
  const [country, setCountry] = useState('UAE');
  const [usFeie, setUsFeie] = useState(true);
  
  const [result, setResult] = useState<CalculationOutput | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCalculate = async () => {
    setLoading(true);
    try {
      const output = await calculateRepayment({
        loanType,
        salaryLocal: parseFloat(salaryLocal) || 0,
        currency,
        ukPlan,
        country,
        usFeie
      });
      setResult(output);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080c18] text-[#f8fafc] p-6 font-sans">
      <div className="max-w-[350px] mx-auto space-y-6">
        <header className="flex flex-col items-center text-center space-y-2">
          <GraduationCap className="size-8 text-primary" />
          <h1 className="text-lg font-black uppercase tracking-widest stamped-dossier">Repayment Simulation</h1>
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Operational Protocol: 2026/27 Overseas</p>
        </header>

        <div className="flex items-center justify-center gap-4 bg-white/5 p-2 rounded-sm border border-white/5">
          <span className={cn("text-[10px] font-black uppercase", loanType === 'UK' ? "text-primary" : "text-muted-foreground")}>UK Loans</span>
          <Switch 
            checked={loanType === 'US'} 
            onCheckedChange={(checked) => setLoanType(checked ? 'US' : 'UK')} 
          />
          <span className={cn("text-[10px] font-black uppercase", loanType === 'US' ? "text-primary" : "text-muted-foreground")}>US Loans</span>
        </div>

        <Card className="glass border-white/10 bg-transparent">
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-primary/70">Local Annual Salary</Label>
              <div className="relative">
                <Input 
                  type="number" 
                  value={salaryLocal} 
                  onChange={(e) => setSalaryLocal(e.target.value)} 
                  className="bg-background/50 border-white/5 text-right font-bold pr-12"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-muted-foreground">{currency}</span>
              </div>
            </div>

            {loanType === 'UK' ? (
              <>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-primary/70">Plan Selection</Label>
                  <Select value={ukPlan} onValueChange={setUkPlan}>
                    <SelectTrigger className="bg-background/50 border-white/5"><SelectValue /></SelectTrigger>
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
                  <Label className="text-[10px] font-black uppercase text-primary/70">Host Country</Label>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger className="bg-background/50 border-white/5"><SelectValue /></SelectTrigger>
                    <SelectContent className="glass">
                      <SelectItem value="UAE">UAE</SelectItem>
                      <SelectItem value="Japan">Japan</SelectItem>
                      <SelectItem value="Switzerland">Switzerland</SelectItem>
                      <SelectItem value="Singapore">Singapore</SelectItem>
                      <SelectItem value="Thailand">Thailand</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <div className="space-y-4 pt-2">
                <div className="flex items-start gap-3 p-3 bg-white/5 rounded-sm border border-white/5">
                  <Checkbox id="feie" checked={usFeie} onCheckedChange={(v) => setUsFeie(!!v)} className="mt-1" />
                  <Label htmlFor="feie" className="text-[10px] font-bold leading-tight cursor-pointer">
                    I am a US Citizen claiming Foreign Earned Income Exclusion (FEIE).
                  </Label>
                </div>
                <div className="bg-destructive/10 border border-destructive/20 p-2 rounded-sm">
                  <p className="text-[9px] text-muted-foreground italic"><span className="text-destructive font-black">NOTE:</span> AGI is typically $0 if Salary &lt; $126k (2026 est) when FEIE is applied correctly.</p>
                </div>
              </div>
            )}

            <Button onClick={handleCalculate} disabled={loading} className="w-full bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest rounded-sm">
              {loading ? <Loader2 className="size-4 animate-spin" /> : "Transmit Logic"}
            </Button>
          </CardContent>
        </Card>

        {result && (
          <Card className="glass border-green-500/30 bg-green-500/5 p-6 space-y-4 shadow-2xl">
            <div className="text-center space-y-1">
              <h4 className="text-[10px] font-black text-green-400 uppercase tracking-widest">Monthly Estimated Repayment</h4>
              <div className="flex flex-col items-center">
                <span className="text-3xl font-black text-white">{formatCurrency(result.monthlyRepaymentLocal, currency)}</span>
                <span className="text-xs font-bold text-muted-foreground opacity-60">≈ {formatCurrency(result.monthlyRepaymentHome, result.homeCurrency)}</span>
              </div>
            </div>
            <p className="text-[9px] text-muted-foreground text-center font-bold uppercase leading-relaxed">{result.message}</p>
          </Card>
        )}

        <footer className="pt-4 border-t border-white/5">
          <div className="flex items-start gap-2">
            <ShieldAlert className="size-3 text-primary shrink-0 mt-0.5" />
            <p className="text-[8px] text-muted-foreground font-medium leading-normal">
              PROTOTYPE ONLY. All calculations are indicative benchmarks. SLC and IRS thresholds are subject to annual adjustments and inflation scaling.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}

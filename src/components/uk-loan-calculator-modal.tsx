'use client';

import React, { useState, useMemo } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { GraduationCap, ShieldAlert, Globe } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/**
 * 2025/26 uk student loan plan signatures
 */
const PLAN_DATA: Record<string, { base: number; rate: number }> = {
  'Plan 1': { base: 26065, rate: 0.09 },
  'Plan 2': { base: 29385, rate: 0.09 },
  'Plan 4': { base: 32500, rate: 0.09 },
  'Plan 5': { base: 25000, rate: 0.09 },
  'Postgraduate': { base: 21000, rate: 0.06 },
};

/**
 * Price level index (PLI) multipliers for overseas bands
 */
const BAND_MULTIPLIERS: Record<string, number> = {
  'Band 1': 0.4,
  'Band 2': 0.6,
  'Band 3': 0.8,
  'Band 4': 1.0,
  'Band 5': 1.2,
};

/**
 * Mapping of countries to SLC bands
 */
const COUNTRY_CONFIG: Record<string, { band: string; currency: string }> = {
  'United Kingdom': { band: 'Band 4', currency: 'GBP' },
  'UAE': { band: 'Band 4', currency: 'AED' },
  'USA': { band: 'Band 5', currency: 'USD' },
  'Switzerland': { band: 'Band 5', currency: 'CHF' },
  'Singapore': { band: 'Band 4', currency: 'SGD' },
  'Japan': { band: 'Band 3', currency: 'JPY' },
  'South Korea': { band: 'Band 3', currency: 'KRW' },
  'Thailand': { band: 'Band 1', currency: 'THB' },
  'Vietnam': { band: 'Band 1', currency: 'VND' },
  'China': { band: 'Band 2', currency: 'CNY' },
  'Netherlands': { band: 'Band 3', currency: 'EUR' },
  'Spain': { band: 'Band 3', currency: 'EUR' },
  'Italy': { band: 'Band 3', currency: 'EUR' },
};

interface UkLoanCalculatorModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (amountLocal: string) => void;
  selectedCountry?: string;
  localCurrency: string;
  exchangeRate: number; // Local per 1 GBP
}

export function UkLoanCalculatorModal({ 
  isOpen, 
  onOpenChange, 
  onConfirm, 
  selectedCountry, 
  localCurrency,
  exchangeRate 
}: UkLoanCalculatorModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<string>('Plan 2');
  const [monthlyGrossLocal, setMonthlyGrossLocal] = useState<string>('5000');
  
  const currentCountry = selectedCountry || 'United Kingdom';
  const config = COUNTRY_CONFIG[currentCountry] || { band: 'Band 3', currency: localCurrency };
  const plan = PLAN_DATA[selectedPlan];
  
  const scaledThreshold = plan.base * BAND_MULTIPLIERS[config.band];
  
  const monthlyRepayment = useMemo(() => {
    // 1. Convert local gross to GBP
    const monthlyGrossGbp = (parseFloat(monthlyGrossLocal) || 0) / exchangeRate;
    const annualGrossGbp = monthlyGrossGbp * 12;
    
    // 2. Calculate annual GBP repayment
    const annualRepaymentGbp = Math.max(0, (annualGrossGbp - scaledThreshold) * plan.rate);
    const monthlyRepaymentGbp = annualRepaymentGbp / 12;
    
    // 3. Convert back to local
    const monthlyRepaymentLocal = monthlyRepaymentGbp * exchangeRate;
    
    return { gbp: monthlyRepaymentGbp, local: monthlyRepaymentLocal };
  }, [monthlyGrossLocal, scaledThreshold, plan.rate, exchangeRate]);

  const handleApply = () => {
    onConfirm(Math.round(monthlyRepayment.local).toString());
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] glass bg-background/95 border-primary/30 text-white shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl font-bold text-primary normal-case">
            <GraduationCap className="size-6" />
            Uk student loan decoder
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-base leading-relaxed">
            Configure your loan plan and apply 2025/26 regional threshold scaling.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-bold text-primary/70">Loan plan type</Label>
              <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                <SelectTrigger className="bg-slate-950/50 border-white/10 h-11 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass">
                  {Object.keys(PLAN_DATA).map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-bold text-primary/70">Mission region</Label>
              <div className="h-11 flex items-center px-3 bg-primary/5 border border-primary/20 rounded-sm">
                <span className="text-sm font-bold truncate">{currentCountry}</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-accent/5 border border-accent/20 rounded-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Globe className="size-5 text-accent" />
              <div>
                <p className="text-xs font-bold text-muted-foreground tracking-widest">Regional threshold</p>
                <p className="text-base font-bold text-white">{formatCurrency(scaledThreshold, 'GBP')} <span className="text-xs text-muted-foreground">(annual)</span></p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-muted-foreground tracking-widest">Repayment rate</p>
              <p className="text-base font-bold text-accent">{(plan.rate * 100).toFixed(0)}%</p>
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="monthly-gross" className="text-sm font-bold text-primary/70">Monthly gross household salary ({localCurrency})</Label>
            <div className="relative">
              <Input 
                id="monthly-gross"
                type="number"
                value={monthlyGrossLocal}
                onChange={(e) => setMonthlyGrossLocal(e.target.value)}
                className="h-12 bg-slate-950/50 border-white/10 text-right font-bold text-lg pr-4 focus:border-primary/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>

          <div className="p-6 rounded-sm border-2 border-green-500/30 bg-green-500/5 text-center space-y-3 shadow-inner">
            <h4 className="text-sm font-bold text-green-400 tracking-widest">Estimated monthly deduction</h4>
            <div className="space-y-1">
              <p className="text-5xl font-black text-white tracking-tighter">
                {formatCurrency(monthlyRepayment.local, localCurrency)}
              </p>
              <p className="text-base font-bold text-muted-foreground/60">
                ≈ {formatCurrency(monthlyRepayment.gbp, 'GBP')}
              </p>
            </div>
          </div>

          <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-sm flex items-start gap-3">
            <ShieldAlert className="size-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              Repayments are calculated using current price level index (PLI) bands. If you do not provide employment evidence, the slc will default you to a fixed-rate penalty significantly higher than these estimates.
            </p>
          </div>
        </div>

        <DialogFooter className="border-t border-white/5 pt-4">
          <Button onClick={handleApply} className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-12 rounded-sm text-lg">
            Agree
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

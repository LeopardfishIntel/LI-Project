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
import { GraduationCap, ShieldAlert } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';

const US_CONFIG = {
  feieLimit: 126000,
  povertyLevel: 16000,
  discretionaryMultiplier: 2.25,
  repaymentRate: 0.10,
};

interface UsLoanCalculatorModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (amountLocal: string) => void;
  localCurrency: string;
  exchangeRate: number;
}

export function UsLoanCalculatorModal({ 
  isOpen, 
  onOpenChange, 
  onConfirm, 
  localCurrency,
  exchangeRate 
}: UsLoanCalculatorModalProps) {
  const [monthlyGrossLocal, setMonthlyGrossLocal] = useState<string>('5000');
  const [claimFeie, setClaimFeie] = useState(true);
  
  const results = useMemo(() => {
    const monthlyGrossUsd = (parseFloat(monthlyGrossLocal) || 0) / (exchangeRate || 1);
    const annualGrossUsd = monthlyGrossUsd * 12;
    let agi = annualGrossUsd;
    if (claimFeie) {
      agi = Math.max(0, annualGrossUsd - US_CONFIG.feieLimit);
    }
    const discretionaryThreshold = US_CONFIG.povertyLevel * US_CONFIG.discretionaryMultiplier;
    const annualDiscretionary = Math.max(0, agi - discretionaryThreshold);
    const annualRepaymentUsd = annualDiscretionary * US_CONFIG.repaymentRate;
    const monthlyRepaymentUsd = annualRepaymentUsd / 12;
    const monthlyRepaymentLocal = monthlyRepaymentUsd * (exchangeRate || 1);
    return {
      usd: monthlyRepaymentUsd,
      local: monthlyRepaymentLocal,
      isZeroDueToFeie: claimFeie && annualGrossUsd <= US_CONFIG.feieLimit
    };
  }, [monthlyGrossLocal, claimFeie, exchangeRate]);

  const handleApply = () => {
    onConfirm(Math.round(results.local).toString());
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] glass bg-background/95 border-primary/30 text-white shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl font-bold text-primary normal-case">
            <GraduationCap className="size-6" />
            Us student loan decoder
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-base leading-relaxed">
            Configure your us federal student aid profile for overseas service (2026/27 specs).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4 max-h-[60vh] overflow-y-auto px-1 pr-3">
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-4 bg-primary/5 border border-primary/20 rounded-sm">
              <Checkbox 
                id="claim-feie" 
                checked={claimFeie} 
                onCheckedChange={(v) => setClaimFeie(!!v)} 
                className="mt-1 border-white/20 data-[state=checked]:bg-primary"
              />
              <div className="space-y-1">
                <Label htmlFor="claim-feie" className="text-base font-bold cursor-pointer text-primary-foreground/90">
                  Claim foreign earned income exclusion (feie)
                </Label>
                <p className="text-sm text-muted-foreground leading-tight">
                  Most us teachers abroad can exclude up to 126,000 usd from their adjusted gross income, often resulting in a 0 usd monthly payment.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="us-monthly-gross" className="text-sm font-bold text-primary/70">Monthly gross household salary ({localCurrency})</Label>
            <div className="relative">
              <Input 
                id="us-monthly-gross"
                type="number"
                value={monthlyGrossLocal}
                onChange={(e) => setMonthlyGrossLocal(e.target.value)}
                className="h-12 bg-slate-950/50 border-white/10 text-right font-black text-lg pr-4 focus:border-primary/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>

          <div className={cn(
            "p-6 rounded-sm border-2 text-center space-y-3 shadow-inner transition-all",
            results.isZeroDueToFeie ? "border-green-500/50 bg-green-500/10" : "border-accent/30 bg-accent/5"
          )}>
            <h4 className="text-xs font-bold tracking-widest uppercase text-muted-foreground">Estimated monthly deduction</h4>
            <div className="space-y-1">
              <p className="text-5xl font-black text-white tracking-tighter">
                {formatCurrency(results.local, localCurrency)}
              </p>
              <p className="text-base font-bold text-muted-foreground/60">
                ≈ {formatCurrency(results.usd, 'USD')}
              </p>
            </div>
            {results.isZeroDueToFeie && (
              <p className="text-xs text-green-400 font-bold tracking-widest pt-2">Feie safe harbor active</p>
            )}
          </div>

          <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-sm flex items-start gap-3">
            <ShieldAlert className="size-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              Calculations assume enrolment in a federal income-driven repayment (idr) plan. Private loans do not qualify for exclusion offsets.
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
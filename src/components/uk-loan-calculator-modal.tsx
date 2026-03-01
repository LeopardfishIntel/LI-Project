'use client';

import React, { useState, useEffect } from 'react';
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
import { GraduationCap, ShieldAlert, Globe, Info } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';

/**
 * Plan 5 Overseas Thresholds (Indicative for 2025/26)
 * Scaled by Price Level Index (PLI)
 */
const PLAN_5_THRESHOLDS: Record<string, number> = {
  'Band 1': 10000,
  'Band 2': 15000,
  'Band 3': 20000,
  'Band 4': 25000,
  'Band 5': 30000,
};

/**
 * Tactical mapping of countries to SLC Plan 5 Bands
 * Based on latest PLI data.
 */
const COUNTRY_TO_BAND: Record<string, string> = {
  'United Kingdom': 'Band 4',
  'USA': 'Band 5',
  'Switzerland': 'Band 5',
  'Norway': 'Band 5',
  'UAE': 'Band 4',
  'United Arab Emirates': 'Band 4',
  'Singapore': 'Band 4',
  'Qatar': 'Band 4',
  'Japan': 'Band 3',
  'South Korea': 'Band 3',
  'Italy': 'Band 3',
  'Spain': 'Band 3',
  'China': 'Band 2',
  'Malaysia': 'Band 2',
  'Turkey': 'Band 2',
  'Thailand': 'Band 1',
  'Vietnam': 'Band 1',
  'Egypt': 'Band 1',
  'Philippines': 'Band 1',
};

interface UkLoanCalculatorModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCountry?: string;
}

export function UkLoanCalculatorModal({ isOpen, onOpenChange, selectedCountry }: UkLoanCalculatorModalProps) {
  const [monthlyGross, setMonthlyGross] = useState<string>('3500');
  
  const currentCountry = selectedCountry || 'United Kingdom';
  const currentBand = COUNTRY_TO_BAND[currentCountry] || 'Band 3';
  const currentThreshold = PLAN_5_THRESHOLDS[currentBand];
  
  const annualGross = (parseFloat(monthlyGross) || 0) * 12;
  // SLC Repayment Formula: 9% of income above the threshold
  const monthlyRepayment = Math.max(0, (annualGross - currentThreshold) * 0.09 / 12);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px] glass bg-background/95 border-primary/30 text-white shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl font-bold text-primary">
            <GraduationCap className="size-6" />
            UK overseas loan decoder
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm leading-relaxed">
            Real-time simulation using 2025/26 Plan 5 overseas repayment protocols.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-6">
          <div className="flex items-center justify-between p-4 bg-primary/5 border border-primary/20 rounded-sm">
            <div className="flex items-center gap-3">
              <Globe className="size-5 text-accent" />
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Active region</p>
                <p className="text-base font-bold text-white">{currentCountry}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Plan 5 band</p>
              <p className="text-base font-bold text-accent">{currentBand}</p>
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="monthly-gross" className="text-sm font-bold text-primary/70">Monthly gross salary (estimated GBP equivalent)</Label>
            <div className="relative">
              <Input 
                id="monthly-gross"
                type="number"
                value={monthlyGross}
                onChange={(e) => setMonthlyGross(e.target.value)}
                className="h-12 bg-slate-950/50 border-white/10 text-right font-black text-lg pr-14 focus:border-primary/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-muted-foreground">GBP</span>
            </div>
          </div>

          <div className="p-6 rounded-sm border-2 border-green-500/30 bg-green-500/5 text-center space-y-2">
            <h4 className="text-xs font-bold text-green-400 tracking-widest">Estimated monthly repayment</h4>
            <p className="text-5xl font-black text-white tracking-tighter">
              {formatCurrency(monthlyRepayment, 'GBP')}
            </p>
            <p className="text-xs text-muted-foreground font-medium italic">Threshold applied: {formatCurrency(currentThreshold, 'GBP')} annual</p>
          </div>

          <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-sm flex items-start gap-3">
            <ShieldAlert className="size-4 text-destructive shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-black text-destructive tracking-tighter">Operational advisory</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Repayments are calculated at 9% of income above your regional PLI threshold. Failure to provide employment evidence will result in higher fixed-rate penalties.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-white/5 pt-4">
          <Button onClick={() => onOpenChange(false)} className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-12 rounded-sm text-base">
            Confirm and close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

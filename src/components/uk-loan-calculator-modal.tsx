
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
import { GraduationCap, Loader2, ShieldAlert, Globe, Info } from 'lucide-react';
import { useUser, useFirestore } from '@/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { cn, formatCurrency } from '@/lib/utils';

const THRESHOLDS: Record<string, number> = {
  'UK': 28470,
  'Band A': 22780,
  'Band B': 17085,
  'Band C': 11390,
  'Band D': 5695,
};

// Tactical mapping of countries to SLC bands
const COUNTRY_TO_BAND: Record<string, string> = {
  'United Kingdom': 'UK',
  'USA': 'Band A',
  'Switzerland': 'Band A',
  'Norway': 'Band A',
  'Japan': 'Band B',
  'UAE': 'Band B',
  'United Arab Emirates': 'Band B',
  'Netherlands': 'Band B',
  'Singapore': 'Band B',
  'Thailand': 'Band C',
  'China': 'Band C',
  'Spain': 'Band C',
  'South Korea': 'Band C',
  'Vietnam': 'Band D',
  'Egypt': 'Band D',
};

interface UkLoanCalculatorModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UkLoanCalculatorModal({ isOpen, onOpenChange }: UkLoanCalculatorModalProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  
  const [userCountry, setUserCountry] = useState<string>('United Kingdom');
  const [monthlyGross, setMonthlyGross] = useState<string>('3500');
  const [isLoading, setIsLoading] = useState(true);

  // Real-time listener for user settings
  useEffect(() => {
    if (!firestore || !user) return;

    const profileRef = doc(firestore, 'users', user.uid, 'teacherProfile', user.uid);
    const unsubscribe = onSnapshot(profileRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        // Take country from saved profile or first preferred country
        const country = data.country || (data.preferredCountries && data.preferredCountries[0]) || 'United Kingdom';
        setUserCountry(country);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, user]);

  const currentBand = COUNTRY_TO_BAND[userCountry] || 'Band B';
  const currentThreshold = THRESHOLDS[currentBand];
  
  const annualGross = (parseFloat(monthlyGross) || 0) * 12;
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
            Real-time simulation using 2025/26 Plan 2 overseas repayment protocols.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-6">
          <div className="flex items-center justify-between p-4 bg-primary/5 border border-primary/20 rounded-sm">
            <div className="flex items-center gap-3">
              <Globe className="size-5 text-accent" />
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Active region</p>
                <p className="text-base font-bold text-white">{userCountry}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">SLC Band</p>
              <p className="text-base font-bold text-accent">{currentBand}</p>
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="monthly-gross" className="text-xs font-bold text-primary/70">Monthly gross salary (GBP equivalent)</Label>
            <div className="relative">
              <Input 
                id="monthly-gross"
                type="number"
                value={monthlyGross}
                onChange={(e) => setMonthlyGross(e.target.value)}
                className="h-12 bg-slate-950/50 border-white/10 text-right font-black text-lg pr-12 focus:border-primary/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-muted-foreground">GBP</span>
            </div>
          </div>

          <div className="p-6 rounded-sm border-2 border-green-500/30 bg-green-500/5 text-center space-y-2">
            <h4 className="text-xs font-bold text-green-400 uppercase tracking-widest">Estimated monthly repayment</h4>
            <p className="text-5xl font-black text-white tracking-tighter">
              {formatCurrency(monthlyRepayment, 'GBP')}
            </p>
            <p className="text-[10px] text-muted-foreground font-medium italic">Threshold applied: {formatCurrency(currentThreshold, 'GBP')} annual</p>
          </div>

          <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-sm flex items-start gap-3">
            <ShieldAlert className="size-4 text-destructive shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-[10px] font-black text-destructive uppercase tracking-tighter">Operational advisory</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Repayments are calculated at 9% of income above your regional threshold. Ensure you maintain updated employment evidence with the SLC to avoid default fixed-rate penalties.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-white/5 pt-4">
          <Button onClick={() => onOpenChange(false)} className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-12 rounded-sm text-sm">
            Confirm and close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

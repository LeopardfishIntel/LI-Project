
"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/utils';
import type { School, LocationCostOfLiving } from '@/lib/types';
import { DollarSign, Home, Utensils, TramFront, Zap, Wifi, Smartphone, Coffee, Car, Stethoscope, RefreshCcw } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { getRentForFamily, getFamilyStatusFromCounts } from '@/lib/rent-calculator';


interface CostOfLivingCalculatorProps {
  school: School;
  overrideLocationData?: LocationCostOfLiving;
}

export function CostOfLivingCalculator({ school, overrideLocationData }: CostOfLivingCalculatorProps) {
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [currency, setCurrency] = useState('GBP');

  const conversionRates: { [key: string]: number } = {
    USD: 1, 
    GBP: 0.8,
    EUR: 0.92,
  };

  const convert = (amount: number) => amount * conversionRates[currency];

  // Use the master location data if provided (linked Sheet model), 
  // otherwise fallback to the school's local snapshot.
  const activeCoL = overrideLocationData || school.costOfLiving;
  const familyStatus = getFamilyStatusFromCounts(adults, children);

  const calculateTotal = () => {
    const foodCost = (activeCoL.food ?? 0) * adults + (activeCoL.food ?? 0) * 0.5 * children;
    const transportCost = (activeCoL.transport ?? 0) * adults + (activeCoL.transport ?? 0) * 0.3 * children;
    const mobileCost = (activeCoL.mobile ?? 0) * adults;
    const diningSocialCost = (activeCoL.diningSocial ?? 0) * adults;
    const uncoveredMedicalCost = (activeCoL.uncoveredMedical ?? 0) * adults + (activeCoL.uncoveredMedical ?? 0) * 0.5 * children;
    
    let rentCost = 0;
    if (!school.intel.housing.provided) {
        rentCost = getRentForFamily(activeCoL as any, familyStatus).rent;
    }
    
    const total =
      rentCost +
      foodCost +
      transportCost +
      (activeCoL.utilities ?? 0) +
      (activeCoL.internet ?? 0) +
      mobileCost +
      diningSocialCost +
      (activeCoL.vehicleInsuranceMaint ?? 0) +
      uncoveredMedicalCost;
      
    return total;
  };

  const totalCost = calculateTotal();
  const { rent: rentToShow, label: rentLabel } = getRentForFamily(activeCoL as any, familyStatus);


  return (
    <Card className="bg-card/70 backdrop-blur-sm border-border">
      <CardHeader className="flex-row items-center justify-between border-b border-white/5 pb-4">
        <CardTitle className="flex items-center text-primary normal-case">
          <DollarSign className="w-6 h-6 mr-2" />
          Cost of Living Index
        </CardTitle>
        <div className="flex items-center gap-3">
          {overrideLocationData && (
            <div className="p-1.5 bg-primary/10 rounded-sm" title="Master Index Sync Active">
              <RefreshCcw className="size-3 text-primary animate-pulse" />
            </div>
          )}
          <div className="w-[100px]">
            <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="currency-select-component" className="h-8 text-xs font-bold bg-background/50 border-white/10">
                    <SelectValue placeholder="Currency" />
                </SelectTrigger>
                <SelectContent className="glass">
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="space-y-1.5">
            <Label htmlFor="adults" className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Adults</Label>
            <Input
              id="adults"
              type="number"
              value={adults}
              onChange={(e) => setAdults(Math.max(1, parseInt(e.target.value) || 1))}
              min="1"
              className="h-9 bg-background/50 border-white/10 font-bold"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="children" className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Children</Label>
            <Input
              id="children"
              type="number"
              value={children}
              onChange={(e) => setChildren(Math.max(0, parseInt(e.target.value) || 0))}
              min="0"
              className="h-9 bg-background/50 border-white/10 font-bold"
            />
          </div>
        </div>

        <div className="space-y-3 text-sm text-muted-foreground font-medium">
          <div className="flex justify-between items-center py-1.5 border-b border-white/5">
            <span className="flex items-center gap-2"><Home className="w-4 h-4 text-sky-400" /> {rentLabel}</span>
            <span className="text-white font-bold">{school.intel.housing.provided ? 'Provided' : formatCurrency(convert(rentToShow), currency)}</span>
          </div>
           <div className="flex justify-between items-center py-1.5 border-b border-white/5">
            <span className="flex items-center gap-2"><Zap className="w-4 h-4 text-green-400" /> Utilities (Water/Elec/Gas)</span>
            <span className="text-white font-bold">{formatCurrency(convert(activeCoL.utilities ?? 0), currency)}</span>
          </div>
          <div className="flex justify-between items-center py-1.5 border-b border-white/5">
            <span className="flex items-center gap-2"><Wifi className="w-4 h-4 text-indigo-400" /> High-Speed Internet</span>
            <span className="text-white font-bold">{formatCurrency(convert(activeCoL.internet ?? 0), currency)}</span>
          </div>
           <div className="flex justify-between items-center py-1.5 border-b border-white/5">
            <span className="flex items-center gap-2"><Smartphone className="w-4 h-4 text-pink-400" /> Mobile data</span>
            <span className="text-white font-bold">{formatCurrency(convert((activeCoL.mobile ?? 0) * adults), currency)}</span>
          </div>
           <div className="flex justify-between items-center py-1.5 border-b border-white/5">
            <span className="flex items-center gap-2"><Utensils className="w-4 h-4 text-amber-400" /> Monthly Groceries</span>
            <span className="text-white font-bold">{formatCurrency(convert((activeCoL.food ?? 0) * adults + (activeCoL.food ?? 0) * 0.5 * children), currency)}</span>
          </div>
           <div className="flex justify-between items-center py-1.5 border-b border-white/5">
            <span className="flex items-center gap-2"><Coffee className="w-4 h-4 text-orange-400" /> Dining & social</span>
            <span className="text-white font-bold">{formatCurrency(convert((activeCoL.diningSocial ?? 0) * adults), currency)}</span>
          </div>
          <div className="flex justify-between items-center py-1.5 border-b border-white/5">
            <span className="flex items-center gap-2"><TramFront className="w-4 h-4 text-rose-400" /> Public transport / fuel</span>
            <span className="text-white font-bold">{formatCurrency(convert((activeCoL.transport ?? 0) * adults + (activeCoL.transport ?? 0) * 0.3 * children), currency)}</span>
          </div>
          {(activeCoL.vehicleInsuranceMaint ?? 0) > 0 && <div className="flex justify-between items-center py-1.5 border-b border-white/5">
              <span className="flex items-center gap-2"><Car className="w-4 h-4 text-neutral-400" /> Vehicle maintenance</span>
              <span className="text-white font-bold">{formatCurrency(convert(activeCoL.vehicleInsuranceMaint!), currency)}</span>
          </div>}
           <div className="flex justify-between items-center py-1.5">
            <span className="flex items-center gap-2"><Stethoscope className="w-4 h-4 text-red-400" /> Medical gaps (e.g. Dental)</span>
            <span className="text-white font-bold">{formatCurrency(convert((activeCoL.uncoveredMedical ?? 0) * adults + (activeCoL.uncoveredMedical ?? 0) * 0.5 * children), currency)}</span>
          </div>
        </div>
        
        <div className="mt-8 pt-6 border-t border-primary/30">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Monthly burn rate</span>
            <span className="text-3xl font-black text-white tracking-tighter">{formatCurrency(convert(totalCost), currency)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

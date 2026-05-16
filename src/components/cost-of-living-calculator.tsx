
"use client";

import { useState } from 'react';
import { RATES } from '@/lib/calculations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { formatCurrency, cn } from '@/lib/utils';
import type { School, LocationCostOfLiving } from '@/lib/types';
import { DollarSign, Home, Utensils, TramFront, Zap, Wifi, Smartphone, Coffee, Car, Stethoscope, RefreshCcw, Baby } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { getRentForFamily, getFamilyStatusFromCounts } from '@/lib/rent-calculator';


interface CostOfLivingCalculatorProps {
  school: School;
  overrideLocationData?: LocationCostOfLiving;
  externalCurrency?: string;
  onExternalCurrencyChange?: (val: string) => void;
  showSelector?: boolean;
  adults?: number;
  setAdults?: (val: number) => void;
  children?: number;
  setChildren?: (val: number) => void;
}

export function CostOfLivingCalculator({ 
  school, 
  overrideLocationData, 
  externalCurrency, 
  onExternalCurrencyChange,
  showSelector = true,
  adults: externalAdults,
  setAdults: setExternalAdults,
  children: externalChildren,
  setChildren: setExternalChildren
}: CostOfLivingCalculatorProps) {
  const [internalAdults, setInternalAdults] = useState(1);
  const [internalChildren, setInternalChildren] = useState(0);
  
  const adults = externalAdults !== undefined ? externalAdults : internalAdults;
  const setAdults = setExternalAdults || setInternalAdults;
  const children = externalChildren !== undefined ? externalChildren : internalChildren;
  const setChildren = setExternalChildren || setInternalChildren;

  // Use external state if available, otherwise local default
  const [localCurrency, setLocalCurrency] = useState('GBP');
  const currency = externalCurrency || localCurrency;
  const setCurrency = onExternalCurrencyChange || setLocalCurrency;

  const getCurrencyFromCountry = (country?: string) => {
    const c = country?.toLowerCase() || '';
    if (c.includes('oman')) return 'OMR';
    if (c.includes('emirates') || c.includes('uae')) return 'AED';
    if (c.includes('qatar')) return 'QAR';
    if (c.includes('saudi')) return 'SAR';
    if (c.includes('kuwait')) return 'KWD';
    if (c.includes('bahrain')) return 'BHD';
    if (c.includes('vietnam')) return 'VND';
    if (c.includes('czech') || c.includes('prague')) return 'CZK';
    if (c.includes('hong kong')) return 'HKD';
    if (c.includes('singapore')) return 'SGD';
    if (c.includes('japan')) return 'JPY';
    return 'USD';
  };

  const activeCoL = overrideLocationData || school.costOfLiving || {};
  
  // 🛡️ Robust Currency Resolution (matches page.tsx logic)
  const cityCurrency = (activeCoL as any).currencyCode || (activeCoL as any).currency_code || (activeCoL as any).currency || getCurrencyFromCountry(school.country || (school as any).location);
  
  const targetCurrency = currency === 'Local' ? (cityCurrency || 'USD') : currency;

  const convert = (amount: number) => {
    // If the currency matches the data source currency (usually USD), and target is USD, don't convert
    if (targetCurrency === 'USD') return amount;
    
    const rate = RATES[targetCurrency] || 1;
    const usdRate = RATES['USD'] || 1.27;
    return (amount / usdRate) * rate;
  };
  const familyStatus = getFamilyStatusFromCounts(adults, children);

  const calculateTotal = () => {
    const safeVal = (val: any) => parseFloat(String(val)) || 0;
    
    const foodCost = (safeVal(activeCoL.food) || safeVal((activeCoL as any).monthlyFood) || 350) * adults + (safeVal(activeCoL.food) || 350) * 0.5 * children;
    const transportCost = (safeVal(activeCoL.transport) || safeVal((activeCoL as any).monthlyTransport) || 60) * adults + (safeVal(activeCoL.transport) || 60) * 0.3 * children;
    const mobileCost = (safeVal(activeCoL.mobile) || safeVal((activeCoL as any).mobileMonthly) || 30) * adults;
    const diningSocialCost = (safeVal(activeCoL.diningSocial) || safeVal((activeCoL as any).socialMonthly) || 150) * adults;
    const uncoveredMedicalCost = (safeVal(activeCoL.uncoveredMedical) || 50) * adults + (safeVal(activeCoL.uncoveredMedical) || 50) * 0.5 * children;
    
    let rentCost = 0;
    const isProvided = school.housingprovision?.toLowerCase().includes('provided') || school.intel?.housing?.provided;
    
    if (!isProvided) {
        rentCost = getRentForFamily(activeCoL as any, familyStatus).rent || (safeVal(activeCoL.monthlyRent1BR) || 1200);
    }
    
    const total =
      rentCost +
      foodCost +
      transportCost +
      (safeVal(activeCoL.utilities) || 150) +
      (safeVal(activeCoL.internet) || 60) +
      mobileCost +
      diningSocialCost +
      safeVal((activeCoL as any).vehicleInsuranceMaint) +
      safeVal((activeCoL as any).childcareMonthly) * children +
      uncoveredMedicalCost;
      
    return total;
  };

  const totalCost = calculateTotal();
  const { rent: rentToShow, label: rentLabel } = getRentForFamily(activeCoL as any, familyStatus);
  const isHousingProvided = school.housingprovision?.toLowerCase().includes('provided') || school.intel?.housing?.provided;

  return (
    <Card className="bg-card/70 backdrop-blur-sm border-border">
      <CardHeader className="flex-row items-center justify-between border-b border-white/5 pb-4">
        <CardTitle className="flex items-center text-primary normal-case">
          <DollarSign className="w-6 h-6 mr-2 text-primary" />
          Cost of Living Index
        </CardTitle>
        <div className="flex items-center gap-3">
          {overrideLocationData && (
            <div className="p-1.5 bg-primary/10 rounded-sm" title="Master Index Sync Active">
              <RefreshCcw className="size-3 text-primary animate-pulse" />
            </div>
          )}
          {showSelector && (
            <div className="w-[100px]">
              <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger id="currency-select-component" className="h-8 text-xs font-bold bg-background/50 border-white/10">
                      <SelectValue placeholder="Currency" />
                  </SelectTrigger>
                  <SelectContent className="glass">
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="Local">Local ({targetCurrency})</SelectItem>
                  </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest px-1">Adults</Label>
            <div className="flex gap-1 p-1 bg-white/5 rounded-sm">
              {[1, 2].map(val => (
                <button
                  key={val}
                  onClick={() => setAdults(val)}
                  className={cn(
                    "flex-1 py-1.5 text-xs font-black rounded-[2px] transition-all",
                    adults === val ? "bg-primary text-black" : "text-white/40 hover:text-white"
                  )}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest px-1">Children</Label>
            <div className="flex gap-1 p-1 bg-white/5 rounded-sm">
              {[0, 1, 2, 3].map(val => (
                <button
                  key={val}
                  onClick={() => setChildren(val)}
                  className={cn(
                    "flex-1 py-1.5 text-xs font-black rounded-[2px] transition-all",
                    children === val ? "bg-primary text-black" : "text-white/40 hover:text-white"
                  )}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-3 text-sm text-muted-foreground font-medium">
          <div className="flex justify-between items-center py-1.5 border-b border-white/5">
            <span className="flex items-center gap-2"><Home className="w-4 h-4 text-primary" /> {rentLabel}</span>
            <span className="text-white font-bold">{isHousingProvided ? 'PROVIDED' : formatCurrency(convert(rentToShow || 1200), targetCurrency)}</span>
          </div>
           <div className="flex justify-between items-center py-1.5 border-b border-white/5">
            <span className="flex items-center gap-2"><Zap className="w-4 h-4 text-yellow-400" /> Utilities (Water/Elec/Gas)</span>
            <span className="text-white font-bold">{formatCurrency(convert(parseFloat(String((activeCoL as any).utilities)) || 150), targetCurrency)}</span>
          </div>
          <div className="flex justify-between items-center py-1.5 border-b border-white/5">
            <span className="flex items-center gap-2"><Wifi className="w-4 h-4 text-blue-400" /> High-Speed Internet</span>
            <span className="text-white font-bold">{formatCurrency(convert(parseFloat(String((activeCoL as any).internet)) || 60), targetCurrency)}</span>
          </div>
          <div className="flex justify-between items-center py-1.5 border-b border-white/5">
            <span className="flex items-center gap-2"><Smartphone className="w-4 h-4 text-purple-400" /> Mobile data</span>
            <span className="text-white font-bold">{formatCurrency(convert((parseFloat(String((activeCoL as any).mobile)) || 30) * adults), targetCurrency)}</span>
          </div>
           <div className="flex justify-between items-center py-1.5 border-b border-white/5">
            <span className="flex items-center gap-2"><Utensils className="w-4 h-4 text-amber-400" /> Monthly Groceries</span>
            <span className="text-white font-bold">{formatCurrency(convert((parseFloat(String((activeCoL as any).food)) || 350) * adults + (parseFloat(String((activeCoL as any).food)) || 350) * 0.5 * children), targetCurrency)}</span>
          </div>
           <div className="flex justify-between items-center py-1.5 border-b border-white/5">
            <span className="flex items-center gap-2"><Coffee className="w-4 h-4 text-orange-400" /> Dining & social</span>
            <span className="text-white font-bold">{formatCurrency(convert((parseFloat(String((activeCoL as any).diningSocial)) || 150) * adults), targetCurrency)}</span>
          </div>
          <div className="flex justify-between items-center py-1.5 border-b border-white/5">
            <span className="flex items-center gap-2"><TramFront className="w-4 h-4 text-rose-400" /> Public transport / fuel</span>
            <span className="text-white font-bold">{formatCurrency(convert((parseFloat(String((activeCoL as any).transport)) || 60) * adults + (parseFloat(String((activeCoL as any).transport)) || 60) * 0.3 * children), targetCurrency)}</span>
          </div>
          {(parseFloat(String((activeCoL as any).vehicleInsuranceMaint)) > 0) && <div className="flex justify-between items-center py-1.5 border-b border-white/5">
              <span className="flex items-center gap-2"><Car className="w-4 h-4 text-neutral-400" /> Vehicle maintenance</span>
              <span className="text-white font-bold">{formatCurrency(convert(parseFloat(String((activeCoL as any).vehicleInsuranceMaint)) || 0), targetCurrency)}</span>
          </div>}
           <div className="flex justify-between items-center py-1.5 border-b border-white/5">
            <span className="flex items-center gap-2"><Stethoscope className="w-4 h-4 text-red-400" /> Medical gaps (e.g. Dental)</span>
            <span className="text-white font-bold">{formatCurrency(convert((parseFloat(String((activeCoL as any).uncoveredMedical)) || 50) * adults + (parseFloat(String((activeCoL as any).uncoveredMedical)) || 50) * 0.5 * children), targetCurrency)}</span>
          </div>
          {(parseFloat(String((activeCoL as any).childcareMonthly)) > 0) && <div className="flex justify-between items-center py-1.5">
            <span className="flex items-center gap-2"><Baby className="w-4 h-4 text-sky-400" /> Childcare (Monthly)</span>
            <span className="text-white font-bold">{formatCurrency(convert((parseFloat(String((activeCoL as any).childcareMonthly)) || 0) * children), targetCurrency)}</span>
          </div>}
        </div>
        
        <div className="mt-8 pt-6 border-t border-white/5 flex justify-between items-end">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">Monthly Cost Forecast</p>
            <p className="text-4xl font-black text-white tracking-tighter uppercase italic">
              {formatCurrency(convert(totalCost), targetCurrency)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

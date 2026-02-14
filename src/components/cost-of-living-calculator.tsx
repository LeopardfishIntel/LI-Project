"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/utils';
import type { School } from '@/lib/types';
import { DollarSign, Home, Utensils, TramFront, Zap, Wifi, Smartphone, Coffee, Car, Stethoscope } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface CostOfLivingCalculatorProps {
  school: School;
}

export function CostOfLivingCalculator({ school }: CostOfLivingCalculatorProps) {
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [currency, setCurrency] = useState('GBP');

  const conversionRates: { [key: string]: number } = {
    USD: 1, // Base currency in mock data
    GBP: 0.8,
    EUR: 0.92,
  };

  const convert = (amount: number) => amount * conversionRates[currency];

  const { costOfLiving } = school;

  const calculateTotal = () => {
    const foodCost = costOfLiving.food * adults + costOfLiving.food * 0.5 * children;
    const transportCost = costOfLiving.transport * adults + costOfLiving.transport * 0.3 * children;
    const mobileCost = costOfLiving.mobile * adults;
    const diningSocialCost = costOfLiving.diningSocial * adults;
    const uncoveredMedicalCost = costOfLiving.uncoveredMedical * adults + costOfLiving.uncoveredMedical * 0.5 * children;
    
    const total =
      costOfLiving.apartment +
      foodCost +
      transportCost +
      costOfLiving.utilities +
      costOfLiving.internet +
      mobileCost +
      diningSocialCost +
      costOfLiving.vehicleInsuranceMaint +
      uncoveredMedicalCost;
      
    return total;
  };

  const totalCost = calculateTotal();

  return (
    <Card className="bg-card/70 backdrop-blur-sm border-border">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center">
          <DollarSign className="w-6 h-6 mr-2 text-primary" />
          Cost of Living Estimator
        </CardTitle>
        <div className="w-[120px]">
          <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger id="currency-select-component">
                  <SelectValue placeholder="Currency" />
              </SelectTrigger>
              <SelectContent>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
              </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <Label htmlFor="adults">Adults</Label>
            <Input
              id="adults"
              type="number"
              value={adults}
              onChange={(e) => setAdults(Math.max(1, parseInt(e.target.value) || 1))}
              min="1"
            />
          </div>
          <div>
            <Label htmlFor="children">Children</Label>
            <Input
              id="children"
              type="number"
              value={children}
              onChange={(e) => setChildren(Math.max(0, parseInt(e.target.value) || 0))}
              min="0"
            />
          </div>
        </div>

        <div className="space-y-4 text-sm text-muted-foreground mb-6">
          <div>
            <h4 className="font-semibold text-primary-foreground/90 mb-1">Housing & Setup</h4>
            <div className="flex justify-between items-center">
              <span className="flex items-center"><Home className="w-4 h-4 mr-2 text-sky-400" /> Monthly Rent (1-2 Bed)</span>
              <span>{formatCurrency(convert(costOfLiving.apartment), currency)}</span>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold text-primary-foreground/90 mb-1">Utilities & Tech</h4>
             <div className="flex justify-between items-center">
              <span className="flex items-center"><Zap className="w-4 h-4 mr-2 text-green-400" /> Utilities (Water/Elec/Gas)</span>
              <span>{formatCurrency(convert(costOfLiving.utilities), currency)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="flex items-center"><Wifi className="w-4 h-4 mr-2 text-indigo-400" /> High-Speed Internet</span>
              <span>{formatCurrency(convert(costOfLiving.internet), currency)}</span>
            </div>
             <div className="flex justify-between items-center">
              <span className="flex items-center"><Smartphone className="w-4 h-4 mr-2 text-slate-400" /> Mobile</span>
              <span>{formatCurrency(convert(costOfLiving.mobile * adults), currency)}</span>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-primary-foreground/90 mb-1">Daily Living</h4>
             <div className="flex justify-between items-center">
              <span className="flex items-center"><Utensils className="w-4 h-4 mr-2 text-amber-400" /> Monthly Groceries</span>
              <span>{formatCurrency(convert(costOfLiving.food * adults + costOfLiving.food * 0.5 * children), currency)}</span>
            </div>
             <div className="flex justify-between items-center">
              <span className="flex items-center"><Coffee className="w-4 h-4 mr-2 text-yellow-600" /> Dining & Social</span>
              <span>{formatCurrency(convert(costOfLiving.diningSocial * adults), currency)}</span>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-primary-foreground/90 mb-1">Transport</h4>
            <div className="flex justify-between items-center">
              <span className="flex items-center"><TramFront className="w-4 h-4 mr-2 text-rose-400" /> Public Transport / Fuel</span>
              <span>{formatCurrency(convert(costOfLiving.transport * adults + costOfLiving.transport * 0.3 * children), currency)}</span>
            </div>
            {costOfLiving.vehicleInsuranceMaint > 0 && <div className="flex justify-between items-center">
                <span className="flex items-center"><Car className="w-4 h-4 mr-2 text-neutral-400" /> Vehicle Insurance/Maint.</span>
                <span>{formatCurrency(convert(costOfLiving.vehicleInsuranceMaint), currency)}</span>
            </div>}
          </div>

          <div>
            <h4 className="font-semibold text-primary-foreground/90 mb-1">Health</h4>
             <div className="flex justify-between items-center">
              <span className="flex items-center"><Stethoscope className="w-4 h-4 mr-2 text-red-400" /> Medical Gaps (e.g. Dental)</span>
              <span>{formatCurrency(convert(costOfLiving.uncoveredMedical * adults + costOfLiving.uncoveredMedical * 0.5 * children), currency)}</span>
            </div>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex justify-between items-center text-lg font-bold">
            <span className="text-primary-foreground">Estimated Monthly Total</span>
            <span className="text-primary">{formatCurrency(convert(totalCost), currency)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

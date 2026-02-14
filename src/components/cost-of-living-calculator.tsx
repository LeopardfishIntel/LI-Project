"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/utils';
import type { School } from '@/lib/types';
import { DollarSign, Home, Utensils, TramFront, Zap } from 'lucide-react';

interface CostOfLivingCalculatorProps {
  school: School;
}

export function CostOfLivingCalculator({ school }: CostOfLivingCalculatorProps) {
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);

  const { costOfLiving } = school;

  const calculateTotal = () => {
    const foodCost = costOfLiving.food * adults + costOfLiving.food * 0.5 * children;
    const transportCost = costOfLiving.transport * adults + costOfLiving.transport * 0.3 * children;
    const total = costOfLiving.apartment + foodCost + transportCost + costOfLiving.utilities;
    return total;
  };

  const totalCost = calculateTotal();

  return (
    <Card className="bg-card/70 backdrop-blur-sm border-border">
      <CardHeader>
        <CardTitle className="flex items-center">
          <DollarSign className="w-6 h-6 mr-2 text-primary" />
          Cost of Living Estimator
        </CardTitle>
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

        <div className="space-y-2 text-sm text-muted-foreground mb-6">
          <div className="flex justify-between items-center">
            <span className="flex items-center"><Home className="w-4 h-4 mr-2 text-sky-400" /> Apartment (1-2 bed)</span>
            <span>{formatCurrency(costOfLiving.apartment)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="flex items-center"><Utensils className="w-4 h-4 mr-2 text-amber-400" /> Monthly Groceries</span>
            <span>~{formatCurrency(costOfLiving.food * adults + costOfLiving.food * 0.5 * children)}</span>
          </div>
           <div className="flex justify-between items-center">
            <span className="flex items-center"><TramFront className="w-4 h-4 mr-2 text-rose-400" /> Public Transport</span>
            <span>~{formatCurrency(costOfLiving.transport * adults + costOfLiving.transport * 0.3 * children)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="flex items-center"><Zap className="w-4 h-4 mr-2 text-green-400" /> Utilities</span>
            <span>{formatCurrency(costOfLiving.utilities)}</span>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex justify-between items-center text-lg font-bold">
            <span className="text-primary-foreground">Estimated Monthly Total</span>
            <span className="text-primary">{formatCurrency(totalCost)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

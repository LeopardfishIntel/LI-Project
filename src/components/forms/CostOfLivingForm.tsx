
'use client';

import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { 
  FormField, 
  FormItem, 
  FormLabel, 
  FormControl, 
  FormMessage 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

export function CostOfLivingForm({ form }: { form: UseFormReturn<any> }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
      <FormField
        control={form.control}
        name="costOfLiving.monthlyRent1BR"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Rent (1BR)</FormLabel>
            <FormControl>
              <Input type="number" {...field} className="bg-background/50 border-white/10" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="costOfLiving.monthlyRent2BR"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Rent (2BR)</FormLabel>
            <FormControl>
              <Input type="number" {...field} className="bg-background/50 border-white/10" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="costOfLiving.monthlyRent3BR"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Rent (3BR)</FormLabel>
            <FormControl>
              <Input type="number" {...field} className="bg-background/50 border-white/10" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="costOfLiving.food"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Groceries</FormLabel>
            <FormControl>
              <Input type="number" {...field} className="bg-background/50 border-white/10" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="costOfLiving.transport"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Transport</FormLabel>
            <FormControl>
              <Input type="number" {...field} className="bg-background/50 border-white/10" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="costOfLiving.utilities"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Utilities</FormLabel>
            <FormControl>
              <Input type="number" {...field} className="bg-background/50 border-white/10" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="costOfLiving.internet"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Internet</FormLabel>
            <FormControl>
              <Input type="number" {...field} className="bg-background/50 border-white/10" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="costOfLiving.mobile"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Mobile</FormLabel>
            <FormControl>
              <Input type="number" {...field} className="bg-background/50 border-white/10" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="costOfLiving.diningSocial"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Dining/social</FormLabel>
            <FormControl>
              <Input type="number" {...field} className="bg-background/50 border-white/10" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="costOfLiving.vehicleInsuranceMaint"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Vehicle maint.</FormLabel>
            <FormControl>
              <Input type="number" {...field} className="bg-background/50 border-white/10" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="costOfLiving.uncoveredMedical"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Uncovered medical</FormLabel>
            <FormControl>
              <Input type="number" {...field} className="bg-background/50 border-white/10" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

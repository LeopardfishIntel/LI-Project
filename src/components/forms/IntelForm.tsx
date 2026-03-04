
'use client';

import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { 
  FormField, 
  FormItem, 
  FormLabel, 
  FormControl, 
  FormMessage, 
  FormDescription 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';

const curriculumOptions = ["IB", "AP", "British", "US", "Other"];

export function IntelForm({ form }: { form: UseFormReturn<any> }) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
        <FormField
          control={form.control}
          name="intel.salary.value"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Salary range</FormLabel>
              <FormControl>
                <Input placeholder="$60k - $80k" {...field} className="bg-background/50 border-white/10" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="intel.salary.score"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Salary score</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="bg-background/50 border-white/10">
                    <SelectValue placeholder="Select score" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="glass">
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="neutral">Neutral</SelectItem>
                  <SelectItem value="bad">Bad</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="intel.salary.isTaxFree"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-white/10 p-4 md:col-span-2">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Tax-free salary</FormLabel>
                <FormDescription>Is the salary tax-free in the host country?</FormDescription>
              </div>
            </FormItem>
          )}
        />
      </div>

      <Separator className="bg-white/5" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
        <FormField
          control={form.control}
          name="intel.housing.value"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Housing</FormLabel>
              <FormControl>
                <Input placeholder="Allowance" {...field} className="bg-background/50 border-white/10" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="intel.housing.provided"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center space-x-3 space-y-0 pt-8">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <FormLabel className="!mt-0">Housing provided</FormLabel>
            </FormItem>
          )}
        />
      </div>

      <Separator className="bg-white/5" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
        <FormField
          control={form.control}
          name="intel.savingsPotential.value"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Savings potential</FormLabel>
              <FormControl>
                <Input placeholder="High" {...field} className="bg-background/50 border-white/10" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="intel.savingsPotential.score"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Savings score</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="bg-background/50 border-white/10">
                    <SelectValue placeholder="Select score" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="glass">
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="neutral">Neutral</SelectItem>
                  <SelectItem value="bad">Bad</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <Separator className="bg-white/5" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <FormField
          control={form.control}
          name="intel.curriculum"
          render={({ field }) => (
            <FormItem className="md:col-span-2 lg:col-span-3">
              <FormLabel>Curriculum</FormLabel>
              <FormControl>
                <div className="flex flex-wrap gap-x-6 gap-y-2 pt-2">
                  {curriculumOptions.map((item) => {
                    const selectedValues = field.value ? field.value.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
                    return (
                      <div key={item} className="flex items-center space-x-2">
                        <Checkbox
                          id={`curriculum-${item}`}
                          checked={selectedValues.includes(item)}
                          onCheckedChange={(checked) => {
                            const currentValues = field.value ? field.value.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
                            let newValues;
                            if (checked) {
                              newValues = [...currentValues, item];
                            } else {
                              newValues = currentValues.filter((value: string) => value !== item);
                            }
                            const sortedValues = curriculumOptions.filter(option => newValues.includes(option));
                            field.onChange(sortedValues.join(', '));
                          }}
                        />
                        <Label htmlFor={`curriculum-${item}`} className="font-normal">{item}</Label>
                      </div>
                    );
                  })}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="intel.accreditation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Accreditation</FormLabel>
              <FormControl>
                <Input placeholder="CIS, WASC" {...field} className="bg-background/50 border-white/10" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="intel.studentTeacherRatio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Student-teacher ratio</FormLabel>
              <FormControl>
                <Input placeholder="10:1" {...field} className="bg-background/50 border-white/10" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="intel.classSize"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Average class size</FormLabel>
              <FormControl>
                <Input type="number" {...field} className="bg-background/50 border-white/10" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="intel.nonContactTime"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Non-contact time (%)</FormLabel>
              <FormControl>
                <Input type="number" {...field} className="bg-background/50 border-white/10" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="intel.healthInsurance"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Health insurance</FormLabel>
              <FormControl>
                <Input placeholder="Premium" {...field} className="bg-background/50 border-white/10" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <FormField
        control={form.control}
        name="intel.technologyEcosystem"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Tech ecosystem</FormLabel>
            <FormControl>
              <Input placeholder="1:1 iPads, Google Workspace" {...field} className="bg-background/50 border-white/10" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="intel.benefitsSummary"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Benefits summary</FormLabel>
            <FormControl>
              <Textarea placeholder="Full medical, annual flights..." {...field} className="bg-background/50 border-white/10" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="intel.jobsPortal"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Jobs portal</FormLabel>
            <FormControl>
              <Input placeholder="TES, Search Associates" {...field} className="bg-background/50 border-white/10" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="intel.minQualifications"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Min. qualifications</FormLabel>
            <FormControl>
              <Input placeholder="Teaching License + 2 Yrs Exp" {...field} className="bg-background/50 border-white/10" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="intel.visaRestrictions"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Visa restrictions</FormLabel>
            <FormControl>
              <Input placeholder="Under 60" {...field} className="bg-background/50 border-white/10" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}

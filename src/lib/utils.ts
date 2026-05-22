import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: any, currency = 'USD') {
  if (typeof amount === 'string' && amount.includes('-')) return `${currency} ${amount}`;
  const numericAmount = parseFloat(amount);
  if (isNaN(numericAmount)) return `${currency} 0`;

  let validCurrency = typeof currency === 'string' && currency.length === 3 ? currency.toUpperCase() : 'USD';
  if (validCurrency === 'LOCAL' || validCurrency === 'ALL') {
    validCurrency = 'USD';
  }

  const formatted = numericAmount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  return `${validCurrency} ${formatted}`;
}

/**
 * 🛰️ TACTICAL COLOR MAP: Use Brand Tokens only.
 */
export function getTacticalColor(rating: string | undefined): string {
    const low = rating?.toLowerCase() || '';
    if (low.includes('g') || low === 'good') return 'text-[#d95f02]'; // Brand Orange
    if (low.includes('b') || low === 'bad') return 'text-[#007FFF]';  // Intel Blue (Tactical Alert)
    return 'text-slate-500';
}

/**
 * Enforces the global data override and merge rules for Dulwich College Shanghai campuses.
 */
export function applyDulwichCollegeShanghaiOverride(school: any): any {
  if (!school) return school;
  
  const schoolName = (school.schoolname || school.name || '').toLowerCase();
  
  // Match any Dulwich Shanghai campus Pudong, Puxi, or standard Shanghai
  if (schoolName.includes('dulwich') && 
      (schoolName.includes('shanghai') || schoolName.includes('pudong') || schoolName.includes('puxi'))) {
    
    // 1. Overarching Name Merge Override
    if (school.schoolname !== undefined) school.schoolname = 'Dulwich College Shanghai (DCS)';
    if (school.name !== undefined) school.name = 'Dulwich College Shanghai (DCS)';
    
    // 2. Head of College Global Overwrite
    const correctHead = 'Mr. Garry Russell';
    school.current_head = correctHead;
    school.currentHead = correctHead;
    school.headmaster = correctHead;
    school.Headmaster = correctHead;
    school.principal = correctHead;
    school.Principal = correctHead;
    school.head = correctHead;
    school.Head = correctHead;
    
    if (school.intel) {
      school.intel.headmaster = correctHead;
      school.intel.Headmaster = correctHead;
      school.intel.principal = correctHead;
      school.intel.Principal = correctHead;
      school.intel.currentHead = correctHead;
      school.intel.current_head = correctHead;
    }
  }
  return school;
}
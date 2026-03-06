
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a number as currency and appends the ISO currency code.
 * Robust to string inputs and ranges (e.g. "18-20").
 */
export function formatCurrency(amount: any, currency = 'USD') {
  if (typeof amount === 'string' && amount.includes('-')) {
    return `${amount} ${currency}`;
  }
  
  const numericAmount = parseFloat(amount);
  if (isNaN(numericAmount)) return `0 ${currency}`;

  const formattedNumber = new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numericAmount);

  return `${formattedNumber} ${currency}`;
}

/**
 * Normalizes institutional health insurance data into three tactical categories.
 */
export function categorizeInsurance(val: string | undefined): string {
  const low = val?.toLowerCase() || '';
  if (low.includes('premium') || low.includes('elite') || low.includes('top global') || low.includes('global private')) return 'Elite';
  if (low.includes('state') || low.includes('national') || low.includes('public') || low.includes('emerg')) return 'State';
  return 'Comp';
}

/**
 * Tactical Rating Parser: Maps ratings to UI color classes.
 */
export function getTacticalColor(rating: string | undefined): string {
    const low = rating?.toLowerCase() || '';
    if (low.includes('g') || low === 'good') return 'text-green-400';
    if (low.includes('b') || low === 'bad') return 'text-red-400';
    return 'text-slate-400';
}

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: any, currency = 'USD') {
  if (typeof amount === 'string' && amount.includes('-')) return `${amount} ${currency}`;
  const numericAmount = parseFloat(amount);
  if (isNaN(numericAmount)) return `0 ${currency}`;

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numericAmount);
}

/**
 * 🛰️ TACTICAL COLOR MAP: Use Brand Tokens only.
 */
export function getTacticalColor(rating: string | undefined): string {
    const low = rating?.toLowerCase() || '';
    if (low.includes('g') || low === 'good') return 'text-[#f97316]'; // Brand Orange
    if (low.includes('b') || low === 'bad') return 'text-[#007FFF]';  // Intel Blue (Tactical Alert)
    return 'text-slate-500';
}
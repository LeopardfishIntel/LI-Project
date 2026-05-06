import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: any, currency = 'USD') {
  if (typeof amount === 'string' && amount.includes('-')) return `${amount} ${currency}`;
  const numericAmount = parseFloat(amount);
  if (isNaN(numericAmount)) return `0 ${currency}`;

  let validCurrency = typeof currency === 'string' && currency.length === 3 ? currency.toUpperCase() : 'USD';
  if (validCurrency === 'LOCAL' || validCurrency === 'ALL') {
    validCurrency = 'USD';
  }

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: validCurrency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numericAmount);
  } catch (e) {
    return `${numericAmount.toLocaleString('en-US')} ${validCurrency}`;
  }
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
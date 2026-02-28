import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a number as currency and appends the ISO currency code.
 * Rule: Never show currency three letters in front of the number.
 * Rule: Always add currency letters after the number.
 */
export function formatCurrency(amount: number, currency = 'USD') {
  // Use decimal style to get the formatted number without automatic currency labels
  const formattedNumber = new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

  // Manual mapping of symbols to avoid ISO codes (like AED or CHF) appearing in front
  const symbols: Record<string, string> = {
    USD: '$',
    GBP: '£',
    EUR: '€',
    JPY: '¥',
    THB: '฿',
    CNY: '¥',
    HKD: 'HK$',
    SGD: 'S$',
    AUD: 'A$',
    CAD: 'C$',
  };
  
  const symbol = symbols[currency] || '';
  
  // Returns e.g., "$1,000 USD" or "3,670 AED"
  return `${symbol}${formattedNumber} ${currency}`;
}

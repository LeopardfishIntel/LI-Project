
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a number as currency and appends the ISO currency code.
 * Rule: Only have a currency sign OR the three letters, never both.
 * Rule: Always add currency letters after the number (ISO suffix).
 * Rule: Never show currency three letters in front of the number.
 * Strategy: To satisfy "letters after" and "never both", we use only the ISO code suffix.
 */
export function formatCurrency(amount: number, currency = 'USD') {
  const formattedNumber = new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

  // Returns e.g., "1,000 USD" or "3,670 AED"
  return `${formattedNumber} ${currency}`;
}

/**
 * Normalizes institutional health insurance data into three tactical categories.
 * Elite, Comp, State.
 */
export function categorizeInsurance(val: string | undefined): string {
  const low = val?.toLowerCase() || '';
  if (low.includes('premium') || low.includes('elite') || low.includes('top global')) return 'Elite';
  if (low.includes('state') || low.includes('national') || low.includes('public') || low.includes('emerg')) return 'State';
  return 'Comp';
}

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a number as currency using the ISO code as a suffix.
 * Rule: Only show the three letters (ISO code) AFTER the number.
 * Rule: No symbols ($, £, €) if letters are present.
 * Rule: Letters never appear in front.
 */
export function formatCurrency(amount: number, currency = 'USD') {
  const formattedNumber = new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

  // Returns e.g., "1,000 USD"
  return `${formattedNumber} ${currency}`;
}

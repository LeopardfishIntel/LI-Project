
import type { School } from './types';

// The family status string literals
export type FamilyStatus = 'single' | 'couple' | 'family' | 'family2';

/**
 * Calculates rent based on family status using Tactical Ember PRD multipliers.
 * Single: Base
 * Couple: (Base * 1.4)
 * Family 2+1: (Base * 1.8)
 * Family 2+2: (Base * 2.2)
 */
export const getRentForFamily = (
  costOfLiving: School['costOfLiving'], 
  familyStatus: FamilyStatus
): { rent: number; label: string } => {
  if (!costOfLiving) return { rent: 0, label: 'Monthly Rent' };

  // Ensure all values are numbers, defaulting to 0 and providing fallbacks.
  const rent1BR = Number(costOfLiving.monthlyRent1BR ?? (costOfLiving as any).apartment ?? 0);
  const rent2BR = Number(costOfLiving.monthlyRent2BR ?? rent1BR * 1.4);
  const rent3BR = Number(costOfLiving.monthlyRent3BR ?? rent1BR * 1.8);

  switch (familyStatus) {
    case 'family2': // Family of 4+
      return { rent: rent3BR, label: 'Monthly Rent (3BR+)' };
    case 'family': // Family 2+1
      return { rent: rent2BR, label: 'Monthly Rent (2BR)' };
    case 'couple':
      return { rent: rent1BR, label: 'Monthly Rent (1BR)' };
    case 'single':
    default:
      return { rent: rent1BR, label: 'Monthly Rent (1BR)' };
  }
};

/**
 * Family Scaling Multiplier for living costs (food, transport, utilities)
 */
export const getFamilyScalingMultiplier = (status: FamilyStatus): number => {
    switch (status) {
        case 'couple': return 1.6;
        case 'family': return 2.1;
        case 'family2': return 2.5;
        case 'single':
        default: return 1.0;
    }
}

export const getFamilyStatusFromCounts = (adults: number, children: number): FamilyStatus => {
  if (adults >= 2 && children >= 2) return 'family2';
  if (adults >= 2 && children === 1) return 'family';
  if (adults >= 2 && children === 0) return 'couple';
  return 'single';
}

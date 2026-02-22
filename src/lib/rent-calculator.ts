import type { School } from './types';

// The family status string literals
export type FamilyStatus = 'single' | 'couple' | 'family' | 'family2';

export const getRentForFamily = (
  costOfLiving: School['costOfLiving'], 
  familyStatus: FamilyStatus
): { rent: number; label: string } => {
  if (!costOfLiving) return { rent: 0, label: 'Monthly Rent' };

  // Handle old data structure with `apartment` field for backward compatibility
  const rent1BR = costOfLiving.monthlyRent1BR ?? (costOfLiving as any).apartment ?? 0;
  const rent2BR = costOfLiving.monthlyRent2BR ?? rent1BR;
  const rent3BR = costOfLiving.monthlyRent3BR ?? rent2BR;

  if (familyStatus === 'family2') {
      return { rent: rent3BR, label: 'Monthly Rent (3BR)' };
  }
  if (familyStatus === 'family') {
      return { rent: rent2BR, label: 'Monthly Rent (2BR)' };
  }
  // single or couple
  return { rent: rent1BR, label: 'Monthly Rent (1BR)' };
};

export const getFamilyStatusFromCounts = (adults: number, children: number): FamilyStatus => {
  if (adults >= 2 && children >= 2) return 'family2';
  if (adults >= 2 && children === 1) return 'family';
  if (adults >= 2 && children === 0) return 'couple';
  return 'single';
}

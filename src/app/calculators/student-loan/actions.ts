
'use server';

/**
 * @fileOverview Secure logic for Student Loan Repayment simulations (2026/27 Specs).
 */

import { initializeFirebase } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

export type CalculationInput = {
  loanType: 'UK' | 'US';
  salaryLocal: number;
  currency: string;
  ukPlan?: string;
  country?: string;
  usFeie?: boolean;
};

export type CalculationOutput = {
  monthlyRepaymentLocal: number;
  monthlyRepaymentHome: number;
  homeCurrency: string;
  message: string;
};

export async function calculateRepayment(input: CalculationInput): Promise<CalculationOutput> {
  const { firestore } = await initializeFirebase();
  if (!firestore) throw new Error('System Offline: Datastore unreachable.');

  if (input.loanType === 'UK') {
    // 1. Fetch 2026 Threshold & PLI
    const thresholdDoc = await getDoc(doc(firestore, 'thresholds_2026', input.ukPlan?.toLowerCase() || 'plan1'));
    if (!thresholdDoc.exists()) throw new Error('Signature Error: Unknown Plan Protocol.');
    
    const { base_threshold, pli_indices } = thresholdDoc.data();
    const pli = pli_indices[input.country || 'Japan'] || 1.0;

    // 2. Fetch Exchange Rate (HMRC 2026 Benchmark)
    const rateDoc = await getDoc(doc(firestore, 'exchange_rates_2026', input.currency));
    const rate = rateDoc.exists() ? rateDoc.data().rate_to_gbp : 1.0;

    // 3. Apply UK Formula: ((Local Salary * Rate) - (UK_Base_Threshold * PLI)) * 0.09 / 12
    const gbpSalary = input.salaryLocal * rate;
    const gbpThreshold = base_threshold * pli;
    const annualRepaymentGBP = Math.max(0, (gbpSalary - gbpThreshold) * 0.09);
    const monthlyRepaymentGBP = annualRepaymentGBP / 12;
    const monthlyRepaymentLocal = monthlyRepaymentGBP / rate;

    return {
      monthlyRepaymentLocal,
      monthlyRepaymentHome: monthlyRepaymentGBP,
      homeCurrency: 'GBP',
      message: `Calculated using 2026/27 UK ${input.ukPlan} overseas protocol.`
    };
  } else {
    // US Protocol
    const homeCurrency = 'USD';
    if (input.usFeie && input.salaryLocal < 126000) {
      return {
        monthlyRepaymentLocal: 0,
        monthlyRepaymentHome: 0,
        homeCurrency,
        message: 'FEIE Protection active: Repayment is $0 while income is below 2026 threshold.'
      };
    }

    // Simplified SAVE/RAP 2026: 10% of discretionary income (est)
    const discretionaryThreshold = 35000; // Simplified 2026 poverty scaling
    const monthlyDiscretionary = Math.max(0, (input.salaryLocal - discretionaryThreshold) / 12);
    const monthlyRepayment = monthlyDiscretionary * 0.10;

    return {
      monthlyRepaymentLocal: monthlyRepayment,
      monthlyRepaymentHome: monthlyRepayment,
      homeCurrency,
      message: 'Estimated using 2026 RAP/SAVE discretionary income formula.'
    };
  }
}

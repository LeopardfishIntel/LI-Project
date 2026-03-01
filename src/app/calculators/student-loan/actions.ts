
'use server';

/**
 * @fileOverview Secure logic for Student Loan Repayment simulations (2026/27 Specs).
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore/lite';
import { firebaseConfig } from '@/firebase/config';

export type CalculationInput = {
  loanType: 'UK' | 'US';
  salaryLocal: number;
  countryName: string;
  ukPlan?: string;
  isFeieEnabled?: boolean;
};

export type CalculationOutput = {
  monthlyRepaymentLocal: number;
  monthlyRepaymentHome: number;
  homeCurrency: string;
  message: string;
  error?: string;
};

// Server-side initialization
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const firestore = getFirestore(app);

export async function calculateRepayment(input: CalculationInput): Promise<CalculationOutput> {
  try {
    const configSnap = await getDoc(doc(firestore, 'config', 'student_loans_2026'));
    if (!configSnap.exists()) throw new Error('Protocol Error: 2026 thresholds not found.');
    
    const config = configSnap.data();

    if (input.loanType === 'UK') {
      const planKey = (input.ukPlan || 'Plan_1').replace(' ', '_');
      const plan = config.UK_Config_2026[planKey];
      const country = config.Country_Bands_2026[input.countryName];

      if (!plan || !country) {
        throw new Error(`Incomplete Intel: Thresholds for ${input.countryName} or ${input.ukPlan} are unavailable.`);
      }

      // Formula: ((Local Salary / Exch_Rate) - (Plan_Base * PLI)) * Rate / 12
      const gbpSalary = input.salaryLocal / country.exch_rate;
      const scaledThreshold = plan.base_threshold * country.pli;
      const annualRepaymentGBP = Math.max(0, (gbpSalary - scaledThreshold) * plan.rate);
      const monthlyRepaymentGBP = annualRepaymentGBP / 12;
      const monthlyRepaymentLocal = monthlyRepaymentGBP * country.exch_rate;

      return {
        monthlyRepaymentLocal,
        monthlyRepaymentHome: monthlyRepaymentGBP,
        homeCurrency: 'GBP',
        message: `Calculated using 2026/27 UK ${input.ukPlan} (${country.band}) protocol.`
      };
    } else {
      // US Protocol
      const usConfig = config.US_Config_2026;
      const homeCurrency = 'USD';

      if (input.isFeieEnabled && input.salaryLocal < usConfig.FEIE_Limit) {
        return {
          monthlyRepaymentLocal: 0,
          monthlyRepaymentHome: 0,
          homeCurrency,
          message: 'FEIE Protocol Active: Repayment set to 0 USD while income remains below 2026 threshold.'
        };
      }

      // RAP/SAVE 2026 formula simulation
      const discretionaryThreshold = usConfig.RAP_Threshold_Single;
      const monthlyDiscretionary = Math.max(0, (input.salaryLocal - discretionaryThreshold) / 12);
      const monthlyRepayment = monthlyDiscretionary * 0.10; // 10% rate simulation

      return {
        monthlyRepaymentLocal: monthlyRepayment,
        monthlyRepaymentHome: monthlyRepayment,
        homeCurrency,
        message: 'Estimated using 2026 RAP/SAVE discretionary income algorithm.'
      };
    }
  } catch (error: any) {
    console.error('Calculation failure:', error);
    return {
      monthlyRepaymentLocal: 0,
      monthlyRepaymentHome: 0,
      homeCurrency: input.loanType === 'UK' ? 'GBP' : 'USD',
      message: 'System Error',
      error: error.message
    };
  }
}

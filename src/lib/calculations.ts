/**
 * 🛰️ TACTICAL CALCULATION ENGINE
 * Centralized logic for budget forecasting and regional heuristics.
 */

export const RATES: Record<string, number> = {
  CZK: 30.2, AED: 4.65, EUR: 1.18, GBP: 1.0, SAR: 4.75, QAR: 4.62,
  CHF: 1.12, DKK: 8.85, USD: 1.27, AZN: 2.15, HKD: 9.85, JPY: 190, 
  SGD: 1.7, MYR: 5.9, THB: 45, CNY: 9.1, BRL: 6.5, ARS: 1200
};

export const canonicalCountry = (c: string) => {
  const n = c?.toLowerCase().trim() || "";
  if (n.includes("czech")) return "czech republic";
  if (n.includes("uae") || n.includes("emirates")) return "united arab emirates";
  if (n.includes("uk") || n.includes("britain")) return "united kingdom";
  if (n.includes("usa") || n.includes("america")) return "united states";
  return n;
};

export const PROFILE_MAP: Record<string, string> = {
  "single": "single",
  "married-dual": "marriedDualIncome",
  "family-1": "family1Child",
  "family-2": "family2Children",
  "family-3": "family3PlusChildren"
};

/**
 * 🕵️ AI VISA HEURISTIC (Region-based Realistic Estimates)
 * Returns a base cost and a per-dependent cost in GBP.
 */
export const getVisaHeuristic = (region: string = "Global") => {
  const r = region.toLowerCase();
  if (r.includes("middle east")) return { base: 1000, perDependent: 350 };
  if (r.includes("asia")) return { base: 800, perDependent: 250 };
  if (r.includes("america")) return { base: 600, perDependent: 200 };
  if (r.includes("europe")) return { base: 350, perDependent: 150 };
  return { base: 500, perDependent: 200 };
};

/**
 * 🧮 BUDGET CALCULATION UTILITY
 */
export interface BudgetParams {
  calcStatus: string;
  selectedSchool: any;
  cityData: any;
  countryIntel: any;
  doYouDrive: boolean;
  setupDays: string;
  currency: string; // Target display currency
  monthlyCommitments?: number;
  baggageCount?: number;
  baggageOverride?: number | null;
  shippingCost?: number;
  uniformOverride?: number | null;
  electronicsTotal?: number;
  // New overrides
  docsOverride?: number | null;
  housingOverride?: number | null;
  expenditureOverride?: number | null;
  transportOverride?: number | null;
  logisticsOverride?: number | null;
  familyOverride?: number | null;
  electronicsOverride?: number | null;
}

export function calculateBudget(params: BudgetParams) {
  const { 
    calcStatus, selectedSchool, cityData, countryIntel, doYouDrive, setupDays, currency, 
    monthlyCommitments = 0, baggageCount = 0, baggageOverride = null, shippingCost = 2000, 
    uniformOverride = null, electronicsTotal = 500,
    docsOverride = null, housingOverride = null, expenditureOverride = null, transportOverride = null,
    logisticsOverride = null, familyOverride = null, electronicsOverride = null
  } = params;
  
  const targetData = cityData || countryIntel;
  const profileKey = PROFILE_MAP[calcStatus] || "single";
  
  // Person count
  let personCount = 1;
  let childrenCount = 0;
  let scalar = 1.0;
  if (calcStatus === 'married-dual')       { personCount = 2; scalar = 1.9; }
  else if (calcStatus === 'family-1')       { personCount = 3; childrenCount = 1; scalar = 2.3; }
  else if (calcStatus === 'family-2')       { personCount = 4; childrenCount = 2; scalar = 2.65; }
  else if (calcStatus === 'family-3')       { personCount = 5; childrenCount = 3; scalar = 3.0; }

  const safeParse = (val: any) => { const n = parseFloat(String(val)); return isNaN(n) ? 0 : n; };
  
  const getVal = (data: any, key: string, mult: number) => {
    if (!data) return 0;
    if (typeof data === 'object') {
      if (data[key]) return safeParse(data[key]);
      return safeParse(data.single || data.base || 0) * mult;
    }
    return safeParse(data) * mult;
  };

  // Convert USD → Display Currency
  const localCurrency = targetData?.currencyCode || 'USD';
  const usdToDisplay = (usd: number) => {
    const displayRate = currency === 'Local' ? (RATES[localCurrency] || 1.0) : (RATES[currency] || 1.0);
    return (usd / (RATES['USD'] || 1.27)) * displayRate;
  };
  
  // Helper for GBP → Display Currency
  const gbpToDisplay = (gbp: number) => {
    const displayRate = currency === 'Local' ? (RATES[localCurrency] || 1.0) : (RATES[currency] || 1.0);
    return gbp * displayRate;
  };

  // 1. Visas & Docs (AI Heuristic)
  const region = targetData?.region || "Global";
  const heuristic = getVisaHeuristic(region);
  const docsVal = docsOverride !== null ? docsOverride : usdToDisplay(heuristic.base + (personCount - 1) * heuristic.perDependent);

  // 2. Rent & Deposit
  const rentKey = calcStatus === 'single' ? 'rent1br' : (calcStatus.includes('family-2') || calcStatus.includes('family-3') ? 'rent3br' : 'rent2br');
  let rentVal = housingOverride !== null ? housingOverride : (usdToDisplay(safeParse(targetData?.[rentKey] || targetData?.rent1br || 2000)) * 2.5); 
  
  const housingProv = selectedSchool?.housingprovision?.toLowerCase() || "";
  if (housingOverride === null) {
    if (housingProv.includes('provided')) {
      rentVal = 0;
    } else if (housingProv.includes('subsidised')) {
      rentVal = rentVal * 0.5; // 50% discount for subsidised housing
    }
  }

  // 3. Living Costs (Scaled by scalar)
  const setupMultiplier = parseInt(setupDays) / 30;
  const groceriesMonthly = usdToDisplay(getVal(targetData?.groceries, profileKey, scalar));
  const utilitiesMonthly = usdToDisplay(getVal(targetData?.utilities, profileKey, scalar * 0.8));
  const livingVal = expenditureOverride !== null ? expenditureOverride : ((groceriesMonthly + utilitiesMonthly) * setupMultiplier);

  // 4. Transport (Direct map lookup from DB)
  const mapType = doYouDrive ? 'carPurchase' : 'publicTransport';
  const transportMap = targetData?.transport?.[mapType] || targetData?.[mapType];
  const transportVal = transportOverride !== null ? transportOverride : (usdToDisplay(getVal(transportMap, profileKey, doYouDrive ? 1 : personCount)));

  // 5. Monthly Commitments (Student Loans etc)
  const commitmentsVal = usdToDisplay(monthlyCommitments) * setupMultiplier;
  
  // 6. Logistics (Baggage & Shipping)
  const baggageTotal = baggageOverride !== null ? baggageOverride : (baggageCount * 100);
  const logisticsVal = logisticsOverride !== null ? logisticsOverride : gbpToDisplay(baggageTotal + shippingCost);
  
  // 7. Family Setup (Uniforms)
  const uniformTotal = childrenCount > 0 ? (uniformOverride !== null ? uniformOverride : (childrenCount * 250)) : 0;
  const familyVal = familyOverride !== null ? familyOverride : gbpToDisplay(uniformTotal);
  
  // 8. Electronics (Base Setup)
  const electronicsVal = electronicsOverride !== null ? electronicsOverride : gbpToDisplay(electronicsTotal);

  return { 
    docs: docsVal, 
    housing: rentVal, 
    expenditure: livingVal, 
    transport: transportVal, 
    commitments: commitmentsVal,
    logistics: logisticsVal,
    family: familyVal,
    electronics: electronicsVal,
    total: docsVal + rentVal + livingVal + transportVal + commitmentsVal + logisticsVal + familyVal + electronicsVal,
    displayCurrency: currency === 'Local' ? localCurrency : currency,
    isSubsidised: housingProv.includes('subsidised')
  };
}

/**
 * 🛰️ TACTICAL CALCULATION ENGINE
 * Centralized logic for budget forecasting and regional heuristics.
 */

export const RATES: Record<string, number> = {
  CZK: 30.2, AED: 4.65, EUR: 1.18, GBP: 1.0, SAR: 4.75, QAR: 4.62,
  CHF: 1.12, DKK: 8.85, USD: 1.27, AZN: 2.15, HKD: 9.85, JPY: 190, 
  SGD: 1.7, MYR: 5.9, THB: 45, CNY: 9.1, BRL: 6.5, ARS: 1200, OMR: 0.49,
  KRW: 1750, VND: 32000, IDR: 20000, KWD: 0.39, BHD: 0.48, EGP: 60, JOD: 0.90, ZAR: 24, MXN: 21, COP: 4900
};

export const canonicalCountry = (c: string) => {
  const n = c?.toLowerCase().trim() || "";
  if (n.includes("czech") || n.includes("czechia")) return "czechia";
  if (n.includes("uae") || n.includes("emirates")) return "united arab emirates";
  if (n.includes("uk") || n.includes("britain")) return "united kingdom";
  if (n.includes("usa") || n.includes("america")) return "united states";
  if (n.includes("swiz") || n.includes("swit")) return "switzerland";
  if (n.includes("viet")) return "vietnam";
  return n;
};

/**
 * 🕵️ STRATEGIC INTELLIGENCE TIERS
 * Tier 3: Legendary | Tier 2: High | Tier 1: Standard | Tier 0: Limited
 */
export const INTELLIGENCE_TIERS: Record<string, { adv: number, cul: number }> = {
  "jordan": { adv: 3, cul: 3 },
  "vietnam": { adv: 3, cul: 2 },
  "switzerland": { adv: 3, cul: 2 },
  "nepal": { adv: 3, cul: 1 },
  "italy": { adv: 2, cul: 3 },
  "france": { adv: 2, cul: 3 },
  "japan": { adv: 2, cul: 3 },
  "egypt": { adv: 2, cul: 3 },
  "china": { adv: 2, cul: 2 },
  "thailand": { adv: 2, cul: 2 },
  "spain": { adv: 1, cul: 3 },
  "greece": { adv: 1, cul: 3 },
  "portugal": { adv: 1, cul: 3 },
  "united arab emirates": { adv: 1, cul: 1 },
  "qatar": { adv: 1, cul: 1 },
  "singapore": { adv: 1, cul: 2 },
  "hong kong": { adv: 1, cul: 2 },
  "saudi arabia": { adv: 1, cul: 1 },
  "oman": { adv: 2, cul: 2 },
  "kuwait": { adv: 0, cul: 1 },
  "bahrain": { adv: 0, cul: 1 },
  "united kingdom": { adv: 1, cul: 2 },
  "united states": { adv: 2, cul: 1 },
  "brazil": { adv: 3, cul: 2 },
  "kenya": { adv: 3, cul: 1 },
  "tanzania": { adv: 3, cul: 1 },
  "peru": { adv: 3, cul: 2 },
  "new zealand": { adv: 3, cul: 1 },
};

export function getStrategicScores(countryName: string, region: string) {
  const c = canonicalCountry(countryName);
  const r = (region || "").toLowerCase();
  const tiers = INTELLIGENCE_TIERS[c];

  const getBase = (lvl: number) => {
    if (lvl === 3) return 9.0;
    if (lvl === 2) return 8.0;
    if (lvl === 1) return 6.5;
    return 4.5;
  };

  // Regional Fallbacks
  const fallbackAdv = r.includes("asia") || r.includes("africa") || r.includes("south america") ? 2 : 1;
  const fallbackCul = r.includes("europe") || r.includes("east asia") ? 2 : 1;

  let advBase = getBase(tiers?.adv ?? fallbackAdv);
  let culBase = getBase(tiers?.cul ?? fallbackCul);

  // Micro-Variance (0.0 to 0.8)
  const hash = c.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const advVar = (hash % 9) / 10;
  const culVar = ((hash * 7) % 9) / 10;

  return {
    adventure: Number(Math.min(9.9, advBase + advVar).toFixed(1)),
    culture: Number(Math.min(9.9, culBase + culVar).toFixed(1))
  };
}

export const PROFILE_MAP: Record<string, string> = {
  "single": "single",
  "married-dual": "marriedDualIncome",
  "married-sole": "marriedDualIncome",
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
  transportMode: 'public' | 'drive' | 'taxi';
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
  childcareOverride?: number | null;
  ikeaOverride?: number | null;
  selectedIkea?: any;
  ratesOverride?: Record<string, number>;
}

export function calculateBudget(params: BudgetParams) {
  const { 
    calcStatus, selectedSchool, cityData, countryIntel, transportMode, setupDays, currency, 
    monthlyCommitments = 0, baggageCount = 0, baggageOverride = null, shippingCost = 2000, 
    uniformOverride = null, electronicsTotal = 500,
    docsOverride = null, housingOverride = null, expenditureOverride = null, transportOverride = null,
    logisticsOverride = null, familyOverride = null, electronicsOverride = null, 
    childcareOverride = null, ikeaOverride = null,
    selectedIkea = null, ratesOverride = null
  } = params;
  
  const targetData = cityData || countryIntel;
  const profileKey = PROFILE_MAP[calcStatus] || "single";
  
  // Person count
  let personCount = 1;
  let childrenCount = 0;
  let scalar = 1.0;
  let ikeaScalar = 1.0;
  if (calcStatus === 'married-dual' || calcStatus === 'married-sole') { personCount = 2; scalar = 1.9; ikeaScalar = 1.4; }
  else if (calcStatus === 'family-1')       { personCount = 3; childrenCount = 1; scalar = 2.3; ikeaScalar = 1.85; }
  else if (calcStatus === 'family-2')       { personCount = 4; childrenCount = 2; scalar = 2.65; ikeaScalar = 2.2; }
  else if (calcStatus === 'family-3')       { personCount = 5; childrenCount = 3; scalar = 3.0; ikeaScalar = 2.58; }

  const safeParse = (val: any) => { const n = parseFloat(String(val)); return isNaN(n) ? 0 : n; };
  const setupMultiplier = parseInt(setupDays) / 30;
  
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
  const currentRates = ratesOverride || RATES;
  
  const usdToDisplay = (usd: number) => {
    const displayRate = currency === 'Local' ? (currentRates[localCurrency] || 1.0) : (currentRates[currency] || 1.0);
    return (usd / (currentRates['USD'] || 1.27)) * displayRate;
  };
  
  // Helper for GBP → Display Currency
  const gbpToDisplay = (gbp: number) => {
    const displayRate = currency === 'Local' ? (currentRates[localCurrency] || 1.0) : (currentRates[currency] || 1.0);
    return gbp * displayRate;
  };

  // 1. Visas & Docs (AI Heuristic)
  const region = targetData?.region || "Global";
  const heuristic = getVisaHeuristic(region);
  const docsVal = docsOverride !== null ? docsOverride : usdToDisplay(heuristic.base + (personCount - 1) * heuristic.perDependent);

  // 2. Rent & Deposit (Scales with payday gap)
  // Base: 1.5 (Deposit) + (setupDays / 30) (Months of rent needed)
  const rentKey = calcStatus === 'single' ? 'rent1br' : (calcStatus.includes('family-2') || calcStatus.includes('family-3') ? 'rent3br' : 'rent2br');
  const rentMonthly = usdToDisplay(safeParse(targetData?.[rentKey] || targetData?.rent1br || 2000));
  
  let rentVal = housingOverride !== null ? housingOverride : (rentMonthly * (1.5 + setupMultiplier)); 
  
  const housingProv = selectedSchool?.housingprovision?.toLowerCase() || "";
  if (housingOverride === null) {
    if (housingProv.includes('provided')) {
      rentVal = 0;
    } else if (housingProv.includes('subsidised')) {
      rentVal = rentVal * 0.5; // 50% discount for subsidised housing
    }
  }

  // 3. Living Costs (Scaled by scalar)
  const groceriesMonthly = usdToDisplay(getVal(targetData?.groceries, profileKey, scalar));
  const utilitiesMonthly = usdToDisplay(getVal(targetData?.utilities, profileKey, scalar * 0.8));
  const livingVal = expenditureOverride !== null ? expenditureOverride : ((groceriesMonthly + utilitiesMonthly) * setupMultiplier);

  // 4. Transport
  const isDriving = transportMode === 'drive';
  const isTaxi = transportMode === 'taxi';
  
  const mapType = isDriving ? 'carHire' : 'publicTransport';
  const transportMap = targetData?.transport?.[mapType] || targetData?.[mapType] || targetData?.transport;
  const baseTransport = usdToDisplay(getVal(transportMap, profileKey, isDriving ? 1.0 : personCount));
  
  let transportVal = transportOverride !== null ? transportOverride : 0;
  if (transportOverride === null) {
    if (isDriving) {
      // If carHire is missing, we use a heuristic (e.g. 1.8x public transport)
      const finalBase = (targetData?.transport?.carHire || targetData?.carHire) ? baseTransport : (usdToDisplay(getVal(targetData?.transport?.publicTransport || targetData?.publicTransport, profileKey, personCount)) * 1.8);
      transportVal = finalBase * setupMultiplier;
    }
    else if (isTaxi) transportVal = (baseTransport * 4) * setupMultiplier;
    else transportVal = baseTransport * setupMultiplier;
  }

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
  // 9. Childcare (User defined, defaults to 0)
  const childcareVal = childcareOverride !== null ? childcareOverride : 0;

  // 10. IKEA Run (Furnishing)
  let ikeaBase = 1000;
  let useIkeaScalar = true;

  if (selectedIkea) {
    const fieldMap: Record<string, string> = {
      'single': 'Single',
      'married-dual': 'Couple',
      'married-sole': 'Couple',
      'family-1': 'Family +1',
      'family-2': 'Family +2',
      'family-3': 'Family +3'
    };
    const field = fieldMap[calcStatus];
    if (field && selectedIkea[field] !== undefined && selectedIkea[field] !== null) {
      ikeaBase = safeParse(selectedIkea[field]);
      useIkeaScalar = false; // Use the specific status value directly
    }
  }

  const ikeaVal = ikeaOverride !== null ? ikeaOverride : usdToDisplay(ikeaBase * (useIkeaScalar ? ikeaScalar : 1.0));

  return { 
    docs: docsVal, 
    housing: rentVal, 
    expenditure: livingVal, 
    transport: transportVal, 
    commitments: commitmentsVal,
    logistics: logisticsVal,
    family: familyVal,
    electronics: electronicsVal,
    childcare: childcareVal,
    ikea: ikeaVal,
    total: docsVal + rentVal + livingVal + transportVal + commitmentsVal + logisticsVal + familyVal + electronicsVal + childcareVal + ikeaVal,
    displayCurrency: currency === 'Local' ? localCurrency : currency,
    isSubsidised: housingProv.includes('subsidised')
  };
}

/**
 * 🧮 SAVINGS SCORE MATRIX NORMALIZATION
 * Returns a 0.0 to 9.9 score based on surplus ratio.
 */
export function calculateSavingsScore(salaryNum: number, familyStatus: string, cityData: any): number {
  const isFamily = familyStatus.toLowerCase().includes('family');
  const isDual = familyStatus.toLowerCase().includes('dual');
  const incomeMultiplier = isDual ? 1.85 : 1;
  const colMultiplier = isFamily ? 1.4 : 1; // The Family Scale Factor
  
  const netUSD = Math.round((salaryNum * incomeMultiplier * 0.8) / 12);
  
  let rent = Number(cityData?.rent1br) || 1200;
  if (familyStatus.includes('family-2') || familyStatus.includes('family-3')) {
    rent = Number(cityData?.rent3br) || (rent * 1.5);
  } else if (isFamily || isDual) {
    rent = Number(cityData?.rent2br) || (rent * 1.2);
  }
  
  const living = 600; // Base baseline heuristic
  const outgoings = (rent + living) * colMultiplier;
  
  const surplus = Math.max(-500, netUSD - outgoings);
  const ratio = (surplus * 12) / (salaryNum * incomeMultiplier); // Annual surplus vs Annual salary
  
  // Base 4.0 + up to 6 points based on ratio
  let rawScore = 4.0 + (ratio * 15);
  rawScore = Math.max(0.0, Math.min(9.9, rawScore));
  
  return Number(rawScore.toFixed(1));
}

export function calculateOutflows(
  adults: number,
  children: number,
  activeCoL: any,
  isHousingProvided = false
): number {
  const safeVal = (val: any) => parseFloat(String(val)) || 0;
  const col = activeCoL || {};

  // Food
  const foodCost = (safeVal(col.food) || safeVal(col.monthlyFood) || 350) * adults + 
                   (safeVal(col.food) || 350) * 0.5 * children;

  // Transport
  const transportCost = (safeVal(col.transport) || safeVal(col.monthlyTransport) || 60) * adults + 
                        (safeVal(col.transport) || 60) * 0.3 * children;

  // Mobile
  const mobileCost = (safeVal(col.mobile) || safeVal(col.mobileMonthly) || 30) * adults;

  // Dining & Social
  const diningSocialCost = (safeVal(col.diningSocial) || safeVal(col.socialMonthly) || 150) * adults;

  // Medical
  const uncoveredMedicalCost = (safeVal(col.uncoveredMedical) || 50) * adults + 
                               (safeVal(col.uncoveredMedical) || 50) * 0.5 * children;

  // Rent
  let rentCost = 0;
  if (!isHousingProvided) {
    const rent1BR = Number(col.monthlyRent1BR ?? col.rent1br ?? col.apartment ?? 1200);
    const rent2BR = Number(col.monthlyRent2BR ?? col.rent2br ?? rent1BR * 1.4);
    const rent3BR = Number(col.monthlyRent3BR ?? col.rent3br ?? rent1BR * 1.8);

    if (children >= 2) {
      rentCost = rent3BR;
    } else if (children === 1) {
      rentCost = rent2BR;
    } else {
      rentCost = rent1BR;
    }
  }

  const total =
    rentCost +
    foodCost +
    transportCost +
    (safeVal(col.utilities) || 150) +
    (safeVal(col.internet) || 60) +
    mobileCost +
    diningSocialCost +
    safeVal(col.vehicleInsuranceMaint) +
    safeVal(col.childcareMonthly) * children +
    uncoveredMedicalCost;

  return total;
}

/**
 * 🧮 LOCAL SAVINGS SCORE
 */
export function calculateSurplus(
  localNetUSD: number,
  familyStatusOrAdults: string | number,
  cityDataOrChildren: any,
  isHousingProvidedOrCityData: boolean | any = false,
  isHousingProvidedFallback = false
): number {
  let adults = 1;
  let children = 0;
  let cityData: any = {};
  let isHousingProvided = false;

  if (typeof familyStatusOrAdults === 'number') {
    adults = familyStatusOrAdults;
    children = typeof cityDataOrChildren === 'number' ? cityDataOrChildren : 0;
    cityData = isHousingProvidedOrCityData;
    isHousingProvided = !!isHousingProvidedFallback;
  } else {
    // Legacy support for string familyStatus
    const status = String(familyStatusOrAdults).toLowerCase();
    cityData = cityDataOrChildren;
    isHousingProvided = isHousingProvidedOrCityData === true;

    if (status === "single") {
      adults = 1;
      children = 0;
    } else if (status === "couple" || status === "marrieddualincome") {
      adults = 2;
      children = 0;
    } else if (status.includes("family-1")) {
      adults = 2;
      children = 1;
    } else if (status.includes("family-2")) {
      adults = 2;
      children = 2;
    } else if (status.includes("family-3")) {
      adults = 2;
      children = 3;
    }
  }

  const totalOut = calculateOutflows(adults, children, cityData, isHousingProvided);
  const rawSurplus = localNetUSD - totalOut;
  const isFamily = children > 0;
  const maxCap = isFamily ? 4400 : 5700;
  
  return Math.min(rawSurplus, maxCap);
}

export function calculateLocalSavingsScore(localNetUSD: number, familyStatus: string, cityData: any, isHousingProvided: boolean = false): number {
  const surplus = calculateSurplus(localNetUSD, familyStatus, cityData, isHousingProvided);
  let rawScore = 4.0 + (surplus / 960);
  rawScore = Math.max(0.0, Math.min(9.9, rawScore));
  
  return Number(rawScore.toFixed(1));
}

export function matchesRegion(dbRegion: string, queryRegion: string): boolean {
  const dbReg = dbRegion.toLowerCase().trim();
  const qReg = queryRegion.toLowerCase().trim();
  
  if (!dbReg || !qReg) return false;
  if (dbReg === qReg) return true;
  
  const isSEAsiaDb = dbReg === 'southeast asia' || dbReg === 'south east asia' || dbReg === 'se asia';
  const isSEAsiaQuery = qReg === 'southeast asia' || qReg === 'south east asia' || qReg === 'se asia' || qReg === 'se-asia';
  if (isSEAsiaDb && isSEAsiaQuery) return true;
  
  const isAmericasDb = dbReg === 'americas' || dbReg === 'latin america' || dbReg === 'south america' || dbReg === 'north america';
  const isAmericasQuery = qReg === 'americas' || qReg === 'latin america' || qReg === 'south america' || qReg === 'north america' || qReg === 'latin-america';
  if (isAmericasDb && isAmericasQuery) return true;
  
  return dbReg.includes(qReg);
}

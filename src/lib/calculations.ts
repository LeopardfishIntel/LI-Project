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

export interface FamilyProfileInfo {
  value: string;
  label: string;
  personCount: number;
  childrenCount: number;
  scalar: number;
  ikeaScalar: number;
  pKey: string;
}

export const FAMILY_PROFILES: FamilyProfileInfo[] = [
  { value: "single", label: "Single", personCount: 1, childrenCount: 0, scalar: 1.0, ikeaScalar: 1.0, pKey: "single" },
  { value: "married-sole", label: "Married (sole earner)", personCount: 2, childrenCount: 0, scalar: 1.9, ikeaScalar: 1.4, pKey: "marriedDualIncome" },
  { value: "married-dual", label: "Married (dual income)", personCount: 2, childrenCount: 0, scalar: 1.9, ikeaScalar: 1.4, pKey: "marriedDualIncome" },
  { value: "family-1", label: "Family +1", personCount: 3, childrenCount: 1, scalar: 2.3, ikeaScalar: 1.85, pKey: "family1Child" },
  { value: "family-2", label: "Family +2", personCount: 4, childrenCount: 2, scalar: 2.65, ikeaScalar: 2.2, pKey: "family2Children" },
  { value: "family-3", label: "Family +3", personCount: 5, childrenCount: 3, scalar: 3.0, ikeaScalar: 2.58, pKey: "family3PlusChildren" },
];

export function getProfileByLabel(label: string): FamilyProfileInfo {
  const normalizedLabel = String(label || '').trim().toLowerCase();
  
  const profile = FAMILY_PROFILES.find(p => 
    p.label.toLowerCase() === normalizedLabel || 
    p.value.toLowerCase() === normalizedLabel ||
    (normalizedLabel.includes("family") && normalizedLabel.includes("1") && p.value === "family-1") ||
    (normalizedLabel.includes("family") && normalizedLabel.includes("2") && p.value === "family-2") ||
    (normalizedLabel.includes("family") && (normalizedLabel.includes("3") || normalizedLabel.includes("more") || normalizedLabel.includes("+3")) && p.value === "family-3") ||
    (normalizedLabel.includes("sole") && p.value === "married-sole") ||
    (normalizedLabel.includes("dual") && p.value === "married-dual") ||
    ((normalizedLabel.includes("couple") || normalizedLabel.includes("married") || normalizedLabel.includes("husband") || normalizedLabel.includes("wife")) && p.value === "married-sole")
  );
  
  return profile || FAMILY_PROFILES[0];
}

export function getCOLField(data: any, keys: string[]): any {
  if (!data) return null;
  const targetKeys = keys.map(k => k.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const foundKey = Object.keys(data).find(k => targetKeys.includes(k.toLowerCase().replace(/[^a-z0-9]/g, '')));
  return foundKey ? data[foundKey] : null;
}

export function findCostOfLiving(city: string, country: string, costOfLivingList: any[]): any {
  if (!costOfLivingList || costOfLivingList.length === 0) return null;
  
  const cleanStr = (s: any) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
  
  const sCity = cleanStr(city);
  const sCountry = cleanStr(canonicalCountry(country));

  const matches = costOfLivingList.filter((c: any) => {
    const cCity = cleanStr(c.city || c.city_name || '');
    const cCountry = cleanStr(canonicalCountry(c.country || c.country_name || ''));
    const cId = cleanStr(c.id || '');
    
    return (
      (sCity && cCity === sCity) ||
      (sCountry && cCountry === sCountry) ||
      (sCity && cId === sCity) ||
      (sCountry && cId === sCountry)
    );
  });

  if (matches.length === 0) return null;
  return matches.find((c: any) => Object.keys(c).some(k => k.toLowerCase().includes('groceries') || k.toLowerCase().includes('rent'))) || matches[0] || null;
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
  const profile = getProfileByLabel(calcStatus);
  const profileKey = profile.pKey;
  
  // Person count
  const personCount = profile.personCount;
  const childrenCount = profile.childrenCount;
  const scalar = profile.scalar;
  const ikeaScalar = profile.ikeaScalar;

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
  const rentKey = profileKey === 'single' ? 'rent1br' : ((profileKey === 'family2Children' || profileKey === 'family3PlusChildren') ? 'rent3br' : 'rent2br');
  const rentMonthly = usdToDisplay(safeParse(getCOLField(targetData, [rentKey]) || getCOLField(targetData, ['rent1br']) || 2000));
  
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
  const groceriesMonthly = usdToDisplay(getVal(getCOLField(targetData, ['groceries', 'food', 'groceriesIndex']), profileKey, scalar));
  const utilitiesMonthly = usdToDisplay(getVal(getCOLField(targetData, ['utilities', 'bills', 'utilitiesMonthly']), profileKey, scalar * 0.8));
  const livingVal = expenditureOverride !== null ? expenditureOverride : ((groceriesMonthly + utilitiesMonthly) * setupMultiplier);

  // 4. Transport
  const isDriving = transportMode === 'drive';
  const isTaxi = transportMode === 'taxi';
  
  const mapType = isDriving ? 'carHire' : 'publicTransport';
  const transportMap = targetData?.transport?.[mapType] || getCOLField(targetData, [mapType]) || targetData?.transport;
  const baseTransport = usdToDisplay(getVal(transportMap, profileKey, isDriving ? 1.0 : personCount));
  
  let transportVal = transportOverride !== null ? transportOverride : 0;
  if (transportOverride === null) {
    if (isDriving) {
      // If carHire is missing, we use a heuristic (e.g. 1.8x public transport)
      const finalBase = (targetData?.transport?.carHire || getCOLField(targetData, ['carHire'])) ? baseTransport : (usdToDisplay(getVal(targetData?.transport?.publicTransport || getCOLField(targetData, ['publicTransport']), profileKey, personCount)) * 1.8);
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
    isSubsidised: housingProv.includes('subsidised'),
    isHousingProvided: housingProv.includes('provided')
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
  rawScore = Math.min(9.9, rawScore);
  
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
    const profile = getProfileByLabel(familyStatusOrAdults);
    adults = profile.personCount - profile.childrenCount;
    children = profile.childrenCount;
    cityData = cityDataOrChildren;
    isHousingProvided = isHousingProvidedOrCityData === true;
  }

  const totalOut = calculateOutflows(adults, children, cityData, isHousingProvided);
  const rawSurplus = localNetUSD - totalOut;
  const isFamily = children > 0;
  const maxCap = isFamily ? 4400 : 5700;
  
  return Math.min(rawSurplus, maxCap);
}


export function calculateSchoolSavingsForStatus(
  salaryNum: number,
  familyStatus: string,
  colRecord: any,
  housingProvision: string = "",
  country: string = "",
  paidInUSD?: boolean
): number {
  const statusLower = (familyStatus || "").toLowerCase();
  const isDual = statusLower.includes("dual");
  const effectiveSalary = isDual ? Math.round(salaryNum * 1.85) : salaryNum;
  
  const housingLower = (housingProvision || "").toLowerCase();
  const isHousingProvided = housingLower.includes("provided");

  let surplus = calculateSurplus(effectiveSalary, familyStatus, colRecord, isHousingProvided);

  // Volatile market guardrail (e.g. Argentina in local currency)
  const isVolatile = (country || "").toLowerCase() === "argentina" || (country || "").toLowerCase() === "ars";
  if (isVolatile && !paidInUSD) {
    surplus *= 0.25;
  }

  return Math.max(0, Math.round(surplus));
}

export function calculateLocalSavingsScore(localNetUSD: number, familyStatus: string, cityData: any, isHousingProvided: boolean = false): number {
  const surplus = calculateSurplus(localNetUSD, familyStatus, cityData, isHousingProvided);
  let rawScore = 4.0 + (surplus / 960);
  rawScore = Math.min(9.9, rawScore);
  
  return Number(rawScore.toFixed(1));
}

export function matchesRegion(dbRegion: string, queryRegion: string, countryName?: string): boolean {
  const dbReg = dbRegion.toLowerCase().trim();
  const qReg = queryRegion.toLowerCase().trim();
  
  if (!qReg) return false;

  // Explicit Country-based Region Overrides/Checks
  if (countryName) {
    const cCanonical = canonicalCountry(countryName);
    
    // Southeast Asia canonical list
    const isSEAsiaQuery = qReg === 'southeast asia' || qReg === 'south east asia' || qReg === 'se asia' || qReg === 'se-asia';
    if (isSEAsiaQuery) {
      const seAsiaCountries = [
        'brunei', 'cambodia', 'indonesia', 'laos', 'malaysia', 
        'myanmar', 'burma', 'philippines', 'singapore', 'thailand', 
        'timor-leste', 'east timor', 'vietnam'
      ];
      if (seAsiaCountries.includes(cCanonical)) return true;
    }
    
    // East Asia canonical list
    const isEastAsiaQuery = qReg === 'east asia' || qReg === 'east-asia';
    if (isEastAsiaQuery) {
      const eastAsiaCountries = [
        'china', 'japan', 'mongolia', 'north korea', 'south korea', 'taiwan'
      ];
      if (eastAsiaCountries.includes(cCanonical)) return true;
    }
  }
  
  if (!dbReg) return false;
  if (dbReg === qReg) return true;
  
  const isSEAsiaDb = dbReg === 'southeast asia' || dbReg === 'south east asia' || dbReg === 'se asia';
  const isSEAsiaQuery = qReg === 'southeast asia' || qReg === 'south east asia' || qReg === 'se asia' || qReg === 'se-asia';
  if (isSEAsiaDb && isSEAsiaQuery) return true;
  
  const isAmericasDb = dbReg === 'americas' || dbReg === 'latin america' || dbReg === 'south america' || dbReg === 'north america';
  const isAmericasQuery = qReg === 'americas' || qReg === 'latin america' || qReg === 'south america' || qReg === 'north america' || qReg === 'latin-america';
  if (isAmericasDb && isAmericasQuery) return true;
  
  // Prevent "southeast asia" from matching "east asia"
  if (qReg === 'east asia' && dbReg.includes('southeast')) {
    return false;
  }
  
  return dbReg.includes(qReg);
}

/**
 * 💱 Savings stability checker for teachers
 * Helps teachers check how stable their savings will be over a three-year adventure abroad.
 * We group currencies into three categories:
 * - Tier 1: Standard floating currencies (like the Euro or Swiss Franc) that drift gently up and down.
 * - Tier 2: Rigid currencies (like the UAE Dirham or Saudi Riyal) pegged to the US Dollar, exposing your savings to US currency trends.
 * - Tier 3: Volatile currencies (like the Argentine Peso or Egyptian Pound) that can drop in value quickly, making local contracts riskier.
 */
export function getMacroRiskTier(currencyCode: string): 1 | 2 | 3 {
  const code = (currencyCode || '').toUpperCase().trim();
  
  // Checking for currencies pegged directly to another major currency
  if (['AED', 'SAR', 'QAR', 'BHD', 'KWD', 'JOD'].includes(code)) {
    return 2;
  }
  
  // Checking for currencies that suffer from high inflation or sudden devaluations
  if (['ARS', 'TRY', 'EGP'].includes(code)) {
    return 3;
  }
  
  // Standard free-floating global currencies
  return 1;
}

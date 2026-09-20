// ============================================================================
// LAYER 1: COST OF LIVING DATA (locations_costOfLiving)
// ============================================================================
export const NEW_LOCATIONS_COST_OF_LIVING = {
  taiwan: {
    countryKey: "taiwan",
    currencyCode: "TWD",
    monthlyRent1BR: 22000,
    monthlyRent2BR: 35000,
    monthlyRent3BR: 52000,
    utilitiesMonthly: 2800,
    internetMonthly: 850,
    mobileMonthly: 600,
    foodGroceries: 12000,
    diningSocial: 9000,
    averageMealCost: 200,
    transportPass: 1200,
    uncoveredMedical: 1500,
    childcareMonthly: 20000,
    localPurchasingPowerIndex: 72.5
  },
  turkey: {
    countryKey: "turkey",
    currencyCode: "TRY",
    monthlyRent1BR: 25000,
    monthlyRent2BR: 38000,
    monthlyRent3BR: 55000,
    utilitiesMonthly: 2500,
    internetMonthly: 450,
    mobileMonthly: 350,
    foodGroceries: 12000,
    diningSocial: 8000,
    averageMealCost: 350,
    transportPass: 1400,
    uncoveredMedical: 2000,
    childcareMonthly: 18000,
    localPurchasingPowerIndex: 45.0
  },
  kazakhstan: {
    countryKey: "kazakhstan",
    currencyCode: "KZT",
    monthlyRent1BR: 280000,
    monthlyRent2BR: 420000,
    monthlyRent3BR: 600000,
    utilitiesMonthly: 32000,
    internetMonthly: 6500,
    mobileMonthly: 4500,
    foodGroceries: 140000,
    diningSocial: 90000,
    averageMealCost: 4500,
    transportPass: 9500,
    uncoveredMedical: 25000,
    childcareMonthly: 180000,
    localPurchasingPowerIndex: 42.0
  },
  cambodia: {
    countryKey: "cambodia",
    currencyCode: "USD",
    monthlyRent1BR: 550,
    monthlyRent2BR: 950,
    monthlyRent3BR: 1400,
    utilitiesMonthly: 110,
    internetMonthly: 30,
    mobileMonthly: 12,
    foodGroceries: 320,
    diningSocial: 220,
    averageMealCost: 6,
    transportPass: 40,
    uncoveredMedical: 50,
    childcareMonthly: 400,
    localPurchasingPowerIndex: 35.0
  },
  ghana: {
    countryKey: "ghana",
    currencyCode: "GHS",
    monthlyRent1BR: 12000,
    monthlyRent2BR: 20000,
    monthlyRent3BR: 32000,
    utilitiesMonthly: 1200,
    internetMonthly: 600,
    mobileMonthly: 350,
    foodGroceries: 4500,
    diningSocial: 3200,
    averageMealCost: 120,
    transportPass: 500,
    uncoveredMedical: 800,
    childcareMonthly: 6000,
    localPurchasingPowerIndex: 28.0
  },
  nigeria: {
    countryKey: "nigeria",
    currencyCode: "NGN",
    monthlyRent1BR: 1200000,
    monthlyRent2BR: 2200000,
    monthlyRent3BR: 3500000,
    utilitiesMonthly: 150000,
    internetMonthly: 45000,
    mobileMonthly: 25000,
    foodGroceries: 350000,
    diningSocial: 250000,
    averageMealCost: 8000,
    transportPass: 40000,
    uncoveredMedical: 60000,
    childcareMonthly: 450000,
    localPurchasingPowerIndex: 22.0
  },
  ethiopia: {
    countryKey: "ethiopia",
    currencyCode: "ETB",
    monthlyRent1BR: 60000,
    monthlyRent2BR: 100000,
    monthlyRent3BR: 160000,
    utilitiesMonthly: 4000,
    internetMonthly: 2500,
    mobileMonthly: 1200,
    foodGroceries: 25000,
    diningSocial: 18000,
    averageMealCost: 500,
    transportPass: 2500,
    uncoveredMedical: 4500,
    childcareMonthly: 30000,
    localPurchasingPowerIndex: 20.0
  },
  morocco: {
    countryKey: "morocco",
    currencyCode: "MAD",
    monthlyRent1BR: 5500,
    monthlyRent2BR: 8500,
    monthlyRent3BR: 13000,
    utilitiesMonthly: 650,
    internetMonthly: 350,
    mobileMonthly: 200,
    foodGroceries: 2800,
    diningSocial: 2000,
    averageMealCost: 70,
    transportPass: 250,
    uncoveredMedical: 500,
    childcareMonthly: 3500,
    localPurchasingPowerIndex: 38.0
  },
  chile: {
    countryKey: "chile",
    currencyCode: "CLP",
    monthlyRent1BR: 520000,
    monthlyRent2BR: 850000,
    monthlyRent3BR: 1300000,
    utilitiesMonthly: 95000,
    internetMonthly: 26000,
    mobileMonthly: 18000,
    foodGroceries: 280000,
    diningSocial: 200000,
    averageMealCost: 10000,
    transportPass: 42000,
    uncoveredMedical: 45000,
    childcareMonthly: 380000,
    localPurchasingPowerIndex: 48.0
  },
  panama: {
    countryKey: "panama",
    currencyCode: "USD",
    monthlyRent1BR: 950,
    monthlyRent2BR: 1550,
    monthlyRent3BR: 2400,
    utilitiesMonthly: 140,
    internetMonthly: 45,
    mobileMonthly: 25,
    foodGroceries: 420,
    diningSocial: 300,
    averageMealCost: 12,
    transportPass: 35,
    uncoveredMedical: 65,
    childcareMonthly: 550,
    localPurchasingPowerIndex: 52.0
  }
};

// ============================================================================
// LAYER 2: FOREX RATES (Additions to RATES in calculations.ts - Base GBP)
// ============================================================================
export const NEW_CURRENCY_RATES = {
  TWD: 41.5,
  TRY: 44.0,
  KZT: 630.0,
  KHR: 5200.0,
  GHS: 19.2,
  NGN: 2050.0,
  ETB: 158.0,
  MAD: 12.8,
  CLP: 1220.0,
  PAB: 1.28
};

// ============================================================================
// LAYER 3: MACRO & STRATEGIC SCORES (INTELLIGENCE_TIERS)
// ============================================================================
export const NEW_INTELLIGENCE_TIERS = {
  taiwan: {
    adv: 2,
    cul: 3,
    risk: "Low",
    note: "High political and personal safety, National Health Insurance (NHI), and fast transit infrastructure."
  },
  turkey: {
    adv: 2,
    cul: 3,
    risk: "High",
    note: "High Lira inflation; contracts must be pegged to USD/EUR to preserve high purchasing power."
  },
  kazakhstan: {
    adv: 3,
    cul: 2,
    risk: "Low",
    note: "Premier Central Asian savings market; tax-free USD contracts with provided luxury compound housing."
  },
  cambodia: {
    adv: 3,
    cul: 3,
    risk: "Medium",
    note: "Dollarized expat economy with very low cost of living and simple independent visa extensions."
  },
  ghana: {
    adv: 2,
    cul: 3,
    risk: "Medium",
    note: "Stable West African hub with USD tax-equalized expat packages in secure gated compounds."
  },
  nigeria: {
    adv: 2,
    cul: 2,
    risk: "High",
    note: "High USD package savings potential; local currency volatility requires hard currency contracts."
  },
  ethiopia: {
    adv: 3,
    cul: 3,
    risk: "High",
    note: "Diplomatic capital with strong USD packages; local FX controls require offshore salary disbursement."
  },
  morocco: {
    adv: 2,
    cul: 3,
    risk: "Low",
    note: "Stable Mediterranean destination offering high cultural immersion and fast travel access to Europe."
  },
  chile: {
    adv: 3,
    cul: 2,
    risk: "Low",
    note: "Safest and most stable South American market with high OECD healthcare and living standards."
  },
  panama: {
    adv: 2,
    cul: 2,
    risk: "Low",
    note: "Dollarized economy, major international banking hub, and strategic Central American location."
  }
};

// ============================================================================
// LAYER 4: REGULATORY & VISA REQUIREMENTS (teacherRequirements)
// ============================================================================
export const NEW_TEACHER_REQUIREMENTS = {
  taiwan: {
    minExperienceYears: 2,
    licenseRequired: true,
    degreeLegalizationPath: "TECO Legalization (Non-Apostille: State + Dept of State + TECO Seal)",
    maxAgeLimit: 65,
    medicalClearanceRequired: true
  },
  turkey: {
    minExperienceYears: 2,
    licenseRequired: true,
    degreeLegalizationPath: "Apostille Convention (Ministry of Foreign Affairs / Legalization Stamp)",
    maxAgeLimit: 65,
    medicalClearanceRequired: true
  },
  kazakhstan: {
    minExperienceYears: 2,
    licenseRequired: true,
    degreeLegalizationPath: "Apostille Convention or Embassy Legalization",
    maxAgeLimit: 63,
    medicalClearanceRequired: true
  },
  cambodia: {
    minExperienceYears: 1,
    licenseRequired: false,
    degreeLegalizationPath: "Notarized & Ministry Legalized / Consular Authentication",
    maxAgeLimit: 65,
    medicalClearanceRequired: true
  },
  ghana: {
    minExperienceYears: 2,
    licenseRequired: true,
    degreeLegalizationPath: "Apostille or High Commission / Embassy Attestation",
    maxAgeLimit: 60,
    medicalClearanceRequired: true
  },
  nigeria: {
    minExperienceYears: 3,
    licenseRequired: true,
    degreeLegalizationPath: "Consular Legalization & Ministry Authentication",
    maxAgeLimit: 60,
    medicalClearanceRequired: true
  },
  ethiopia: {
    minExperienceYears: 2,
    licenseRequired: true,
    degreeLegalizationPath: "Ministry of Foreign Affairs & Ethiopian Embassy Legalization",
    maxAgeLimit: 60,
    medicalClearanceRequired: true
  },
  morocco: {
    minExperienceYears: 2,
    licenseRequired: true,
    degreeLegalizationPath: "Apostille Convention (or Consular Legalization)",
    maxAgeLimit: 60,
    medicalClearanceRequired: true
  },
  chile: {
    minExperienceYears: 2,
    licenseRequired: true,
    degreeLegalizationPath: "Apostille Convention (Direct Hague e-Apostille accepted)",
    maxAgeLimit: 65,
    medicalClearanceRequired: false
  },
  panama: {
    minExperienceYears: 2,
    licenseRequired: true,
    degreeLegalizationPath: "Apostille Convention",
    maxAgeLimit: 65,
    medicalClearanceRequired: true
  }
};

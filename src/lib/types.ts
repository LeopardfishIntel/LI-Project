
export type TeacherProfile = {
  id: string;
  fullName: string;
  avatarUrl: string;
  isVerifiedTeacher: boolean;
  familyStatus: string;
  ageGroup: string;
  memberSince: Date;
  yearsOfExperience: number;
  qualifications: string[];
  linkedInProfileUrl: string;
  preferredRegions: string[];
  preferredCountries: string[];
};

export type StabilityMetrics = {
  previousHeadcount: number; // Year T-1
  currentHeadcount: number;  // Year T
  totalVacancies: number;    // Unique subject vacancies
  adjustedChurnRate: number; // (Vacancies - Growth) / Prev Headcount
  stabilityTier: 'Fortress' | 'Stable' | 'Volatile' | 'High Risk';
  redFlagAlert: boolean;
  redFlagReasoning?: string;
  fiveYearAnchorRate?: number;
  leadershipTenure?: number;
};

export type School = {
  id: string;
  name: string;
  description: string;
  websiteUrl?: string;
  location: string;
  country: string;
  locationId: string; // The link to the locations_costOfLiving collection
  imageUrl: string;
  imageHint: string;
  videoUrl?: string;
  spotlight?: boolean;
  intel: {
    salary: { value: string; score: 'good' | 'neutral' | 'bad'; isTaxFree?: boolean; };
    housing: { value: string; provided: boolean };
    savingsPotential: { value: string; score: 'good' | 'neutral' | 'bad' };
    curriculum: string;
    studentTeacherRatio: string;
    classSize: number;
    healthInsurance: string;
    accreditation: string;
    jobsPortal?: string;
    minQualifications?: string;
    visaRestrictions?: string;
    benefitsSummary?: string;
    nonContactTime?: number;
    technologyEcosystem?: string;
  };
  // costOfLiving is now primarily managed in the LocationCostOfLiving collection,
  // but a local snapshot is kept here for performance.
  costOfLiving: {
    monthlyRent1BR?: number;
    monthlyRent2BR?: number;
    monthlyRent3BR?: number;
    food?: number;
    transport?: number;
    utilities?: number;
    internet?: number;
    mobile?: number;
    diningSocial?: number;
    vehicleInsuranceMaint?: number;
    uncoveredMedical?: number;
  };
  stabilityMetrics?: StabilityMetrics;
};

export type LocationCostOfLiving = {
  id: string;
  locationName: string;
  locationType: string;
  countryName: string;
  currencyCode: string;
  averageMealCost: number;
  monthlyRent1BR: number;
  monthlyRent2BR: number;
  monthlyRent3BR: number;
  transportPassCost: number;
  utilitiesMonthly: number;
  internetMonthly: number;
  childcareMonthly?: number;
  localPurchasingPowerIndex: number;
  groceriesIndex: number;
  restaurantPriceIndex: number;
  lastUpdated: any; // Firestore timestamp
};


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
  previousHeadcount: number;
  currentHeadcount: number;
  totalVacancies: number;
  adjustedChurnRate: number;
  stabilityTier: 'Fortress' | 'Stable' | 'Volatile' | 'High Risk';
  redFlagAlert: boolean;
  redFlagReasoning?: string;
  fiveYearAnchorRate?: number;
  leadershipTenure?: number;
};

export type School = {
  // Primary Keys
  id: string;
  name?: string;
  locationId?: string;
  
  // Flat Field Support (Matching your Google Sheet exactly)
  schoolname?: string;
  academicscore?: string | number;
  financescore?: string | number;
  worklifescore?: string | number;
  techscore?: string | number;
  totalscore?: string | number;
  score?: string | number;
  confidence?: string | number;
  summary?: string;
  description?: string;
  rating?: string;
  numericalrating?: string;
  website?: string;
  websiteUrl?: string;
  housingprovision?: string;
  healthcoverage?: string;
  country: string;
  city: string;
  techecosystem?: string;
  staffstudentratio?: string;
  noncontacttime?: string | number;
  numericalstaff?: string | number;
  curriculum?: string;
  approvals?: string;
  classsize?: string | number;
  staffcount?: string | number;

  // Analysis & Legacy Mapping
  academic?: string;
  finance?: string;
  ncCs?: string;
  tech?: string;

  // Assets & Media
  imageUrl: string;
  imageHint: string;
  videoUrl?: string;
  spotlight?: boolean;

  // Internal Logic compatibility (Nested objects)
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
  lastUpdated: any;
};


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
  // Primary Keys & Registry
  id: string; // Maps to 'ID'
  name: string; // Maps to 'School Name'
  locationId: string; // The link to the locations_costOfLiving collection
  
  // Tactical Analysis (User Google Sheet Fields)
  academic?: string; // Maps to 'Academic'
  finance?: string; // Maps to 'Finance'
  ncCs?: string; // Maps to 'NC CS'
  tech?: string; // Maps to 'Tech'
  score?: number; // Maps to 'Score'
  confidence?: number; // Maps to 'Confidence'
  summary?: string; // Maps to 'Summary' (description)
  numericalRating?: string; // Maps to 'Numerical Rating (G/B)'
  websiteUrl?: string; // Maps to 'Official Website'
  housingProvision?: string; // Maps to 'Housing Provision'
  healthCoverage?: string; // Maps to 'Health Coverage'
  country: string; // Maps to 'Country'
  city: string; // Maps to 'City'
  techEcosystem?: string; // Maps to 'Tech Ecosystem'
  ratio?: string; // Maps to 'Ratio' (student-teacher)
  ncTime?: string | number; // Maps to 'NC Time'
  numericalStaff?: number; // Maps to 'Numerical Staff'
  curriculum?: string; // Maps to 'Curriculum'
  approvals?: string; // Maps to 'Approvals' (accreditations)
  classSize?: number; // Maps to 'Class size'
  staffNo?: number; // Maps to 'Staff No'

  // Assets & Media
  imageUrl: string;
  imageHint: string;
  videoUrl?: string;
  spotlight?: boolean;

  // Legacy/Nested Compatibility (Maintained for logic)
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
  lastUpdated: any; // Firestore timestamp
};

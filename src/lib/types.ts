export type Rating = 'good' | 'neutral' | 'bad' | 'unknown';

export interface IntelMetric {
  value?: string | number | null;
  score?: Rating;
  isTaxFree?: boolean; 
}

export interface SchoolIntel {
  salary?: IntelMetric;
  savingsPotential?: IntelMetric;
  housing?: {
    provided?: boolean;
    value?: string | null;
  };
  healthInsurance?: string | null;
  curriculum?: string | null;
  classSize?: string | number | null;
  studentTeacherRatio?: string | null;
  benefitsSummary?: string | null;
  nonContactTime?: number | null;
  technologyEcosystem?: string | null;
  accreditation?: string | null;
  jobsPortal?: string; 
  minQualifications?: string;
  visaRestrictions?: string;
  max_age_notes?: string;
}

export interface LocationCostOfLiving {
  id?: string;
  locationName?: string;
  locationType?: string;
  countryName?: string;
  currencyCode?: string;
  monthlyRent1BR?: number | null;
  monthlyRent2BR?: number | null;
  monthlyRent3BR?: number | null;
  averageMealCost?: number | null;
  transportPassCost?: number | null;
  utilitiesMonthly?: number | null;
  internetMonthly?: number | null;
  groceriesIndex?: number | null;
  restaurantPriceIndex?: number | null; // 🛰️ ADDED TO MATCH MOCK DATA
  localPurchasingPowerIndex?: number | null;
  childcareMonthly?: number | null;
  food?: number | null; 
  mobile?: number | null;
  internet?: number | null;
  utilities?: number | null;
  transport?: number | null;
  entertainment?: number | null;
  diningSocial?: number | null;
  vehicleInsuranceMaint?: number | null;
  uncoveredMedical?: number | null;
  lastUpdated?: any;
}

export interface School {
  id: string;
  name: string;
  schoolname?: string; 
  city?: string;
  location?: string;   
  locationId?: string;
  country: string; 
  curriculum?: string;
  summary?: string;
  description?: string;
  imageUrl?: string | null;
  imageHint?: string | null;
  videoUrl?: string | null;
  websiteUrl?: string | null;
  website?: string | null;
  aliases?: string[];
  tesOrganizationId?: string;
  schroleAccountId?: string;
  tesEmployerSlug?: string;
  intel?: SchoolIntel;
  costOfLiving?: LocationCostOfLiving;
  rating?: Rating;
  totalscore?: string | number;
  score?: string | number;
  approvals?: string;
  numericalrating?: string | number;
  housingprovision?: string;
  healthcoverage?: string;
  staffstudentratio?: string;
  classsize?: string | number;
  techecosystem?: string;
  finance?: string;
  max_age_notes?: string;
  academic_Degree_req?: string;
  license_req?: string;
  noncontacttime?: string | number;
  cachedBriefing?: {
    briefing: string;
    currentHead: string;
    ownership: string;
    generatedAt: string;
  };
  cachedBriefings?: Record<string, {
    briefing: string;
    currentHead: string;
    ownership: string;
    generatedAt: string;
  }>;
}

export interface TeacherProfile {
  uid: string;
  email: string;
  id?: string; 
  displayName?: string;
  fullName?: string;
  avatarUrl?: string;
  isVerifiedTeacher?: boolean;
  qualifications?: string[];
  experience?: string;
  yearsOfExperience?: string | number; 
  subject?: string;
  preferredRegions?: string[];
  preferredCountries?: string[];
  goal?: "saving" | "adventure" | "growth" | "balanced";
  familyStatus?: string;
  linkedInProfileUrl?: string;
  ageGroup?: string;
  memberSince?: any;
  isUSCitizen?: boolean;
  claimsFEIE?: boolean; 
}

export interface AppMetrics {
  site_visits?: number;
  comparisons_made?: number;
  lastSync?: any;
}
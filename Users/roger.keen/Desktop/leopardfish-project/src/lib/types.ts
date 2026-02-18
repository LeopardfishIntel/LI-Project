
export type TeacherProfile = {
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

export type School = {
  id: string;
  name: string;
  description: string;
  websiteUrl?: string;
  location: string;
  country: string;
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
  costOfLiving: {
    apartment: number;
    food: number;
    transport: number;
    utilities: number;
    internet: number;
    mobile: number;
    diningSocial: number;
    vehicleInsuranceMaint: number;
    uncoveredMedical: number;
  };
};

export type School = {
  id: string;
  name: string;
  location: string;
  country: string;
  imageUrl: string;
  imageHint: string;
  videoUrl?: string;
  spotlight?: boolean;
  rating: number;
  reviewsCount: number;
  intel: {
    salary: { value: string; score: 'good' | 'neutral' | 'bad' };
    housing: { value: string; provided: boolean };
    savingsPotential: { value: string; score: 'good' | 'neutral' | 'bad' };
    curriculum: string;
    studentTeacherRatio: string;
    classSize: number;
    healthInsurance: string;
  };
  reviews: Review[];
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

export type Review = {
  id: string;
  author: string;
  isVerified: boolean;
  timestamp: string;
  rating: number;
  text: string;
};

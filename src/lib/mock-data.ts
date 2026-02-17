
import type { School, TeacherProfile } from './types';
import { PlaceHolderImages } from './placeholder-images';

const getImage = (id: string) => {
  const image = PlaceHolderImages.find(img => img.id === id);
  return {
    imageUrl: image?.imageUrl ?? "https://picsum.photos/seed/placeholder/600/400",
    imageHint: image?.imageHint ?? "school building"
  };
};

export const teacherProfile: TeacherProfile = {
  fullName: "Jane Doe",
  avatarUrl: "https://images.unsplash.com/photo-1580894908361-967195033215?q=80&w=2070&auto=format&fit=crop",
  isVerifiedTeacher: true,
  familyStatus: "Couple",
  ageGroup: "35-49",
  memberSince: new Date("2022-08-15"),
  yearsOfExperience: 12,
  qualifications: ["PGCE", "Master's in Education", "NPQSL"],
  linkedInProfileUrl: "https://www.linkedin.com/in/example",
  preferredRegions: ["Southeast Asia", "Middle East"],
  preferredCountries: ["Thailand", "UAE", "Singapore"],
};

export const schools: School[] = [
  {
    id: 'tokyo-international-school',
    name: 'Tokyo International School',
    location: 'Tokyo',
    country: 'Japan',
    ...getImage('tokyo-international-school'),
    videoUrl: 'https://www.youtube.com/embed/GZ4d3HEn93c',
    spotlight: true,
    intel: {
      salary: { value: '$55k - $75k', score: 'good' },
      housing: { value: '2-bed Apt', provided: true },
      savingsPotential: { value: 'High', score: 'good' },
      curriculum: 'IB',
      studentTeacherRatio: '8:1',
      classSize: 16,
      healthInsurance: 'Premium',
      accreditation: 'CIS, WASC',
      jobsPortal: 'TES, Search Associates',
      minQualifications: 'Teaching License + 2 Yrs Exp',
      visaRestrictions: 'None',
      benefitsSummary: 'Comprehensive health, travel insurance, relocation allowance.',
      nonContactTime: 20,
      technologyEcosystem: '1:1 iPads, Google Workspace, ManageBac'
    },
    costOfLiving: { apartment: 2000, food: 500, transport: 150, utilities: 200, internet: 50, mobile: 40, diningSocial: 300, vehicleInsuranceMaint: 0, uncoveredMedical: 100 },
  },
  {
    id: 'dubai-american-academy',
    name: 'Dubai American Academy',
    location: 'Dubai',
    country: 'UAE',
    ...getImage('dubai-american-academy'),
    videoUrl: 'https://www.youtube.com/embed/U2f8_L-5L_w',
    spotlight: true,
    intel: {
      salary: { value: '$60k - $80k', score: 'good', isTaxFree: true },
      housing: { value: 'Allowance', provided: false },
      savingsPotential: { value: 'V High', score: 'good' },
      curriculum: 'US',
      studentTeacherRatio: '12:1',
      classSize: 22,
      healthInsurance: 'Comp',
      accreditation: 'NEASC',
      jobsPortal: 'School Website, GRC',
      minQualifications: 'US State License + 2 Yrs Exp',
      visaRestrictions: 'Under 60',
      benefitsSummary: 'Full medical, annual flights, professional development fund.',
      nonContactTime: 15,
      technologyEcosystem: '1:1 MacBooks (Gr 6-12), iPads (K-5), PowerSchool'
    },
    costOfLiving: { apartment: 2500, food: 600, transport: 200, utilities: 300, internet: 80, mobile: 70, diningSocial: 500, vehicleInsuranceMaint: 150, uncoveredMedical: 50 },
  },
  {
    id: 'zurich-international-school',
    name: 'Zurich International School',
    location: 'Zurich',
    country: 'Switzerland',
    ...getImage('zurich-international-school'),
    videoUrl: 'https://www.youtube.com/embed/j1wB-G73b7A',
    spotlight: true,
    intel: {
      salary: { value: '$80k - $100k', score: 'good' },
      housing: { value: 'Not Provided', provided: false },
      savingsPotential: { value: 'Moderate', score: 'neutral' },
      curriculum: 'IB/AP',
      studentTeacherRatio: '10:1',
      classSize: 18,
      healthInsurance: 'Mandatory',
      accreditation: 'CIS, NEASC',
      jobsPortal: 'School Website',
      minQualifications: 'EU/EFTA Passport, Teaching License',
      visaRestrictions: 'Non-EU must be highly qualified',
      benefitsSummary: 'Generous pension, subsidized transport, lunch vouchers.',
      nonContactTime: 25,
      technologyEcosystem: 'Bring Your Own Device (BYOD), Canvas, Veracross'
    },
    costOfLiving: { apartment: 3500, food: 1000, transport: 250, utilities: 250, internet: 70, mobile: 60, diningSocial: 600, vehicleInsuranceMaint: 200, uncoveredMedical: 200 },
  },
  {
    id: 'singapore-american-school',
    name: 'Singapore American School',
    location: 'Singapore',
    country: 'Singapore',
    ...getImage('singapore-american-school'),
    intel: {
      salary: { value: '$70k - $90k', score: 'good' },
      housing: { value: 'Subsidised', provided: true },
      savingsPotential: { value: 'High', score: 'good' },
      curriculum: 'AP',
      studentTeacherRatio: '11:1',
      classSize: 20,
      healthInsurance: 'Premium',
      accreditation: 'WASC',
      jobsPortal: 'School Website, ISS',
      minQualifications: 'Teaching License + 3 Yrs Exp',
      visaRestrictions: 'Strict criteria',
      benefitsSummary: 'Full medical coverage, annual flights, relocation allowance.',
      nonContactTime: 20,
      technologyEcosystem: '1:1 MacBooks, Google Workspace, PowerSchool'
    },
    costOfLiving: { apartment: 3000, food: 700, transport: 100, utilities: 200, internet: 60, mobile: 50, diningSocial: 400, vehicleInsuranceMaint: 0, uncoveredMedical: 80 },
  },
  {
    id: 'seoul-foreign-school',
    name: 'Seoul Foreign School',
    location: 'Seoul',
    country: 'South Korea',
    ...getImage('seoul-foreign-school'),
    intel: {
      salary: { value: '$45k - $65k', score: 'neutral' },
      housing: { value: 'Furnished Apt', provided: true },
      savingsPotential: { value: 'Moderate', score: 'neutral' },
      curriculum: 'IB/British',
      studentTeacherRatio: '15:1',
      classSize: 24,
      healthInsurance: 'National',
      accreditation: 'WASC, CIS',
      jobsPortal: 'TES, School Website',
      minQualifications: 'Native English Speaker, License',
      visaRestrictions: 'E-2 Visa requirements apply',
      benefitsSummary: 'National health plan, severance pay, round-trip airfare.',
      nonContactTime: 18,
      technologyEcosystem: 'Google Workspace, Seesaw, limited 1:1 program'
    },
    costOfLiving: { apartment: 1500, food: 600, transport: 100, utilities: 150, internet: 40, mobile: 30, diningSocial: 250, vehicleInsuranceMaint: 0, uncoveredMedical: 70 },
  },
  {
    id: 'acs-cobham-international-school',
    name: 'ACS Cobham International School',
    location: 'Cobham',
    country: 'United Kingdom',
    ...getImage('acs-cobham-international-school'),
    spotlight: false,
    intel: {
      salary: { value: '$60k - $85k', score: 'good' },
      housing: { value: 'Allowance', provided: false },
      savingsPotential: { value: 'Moderate', score: 'neutral' },
      curriculum: 'IB & AP',
      studentTeacherRatio: '10:1',
      classSize: 20,
      healthInsurance: 'Private',
      accreditation: 'IBO, NEASC',
      jobsPortal: 'School Website, TES',
      minQualifications: 'QTS or equivalent',
      visaRestrictions: 'Right to work in UK required',
      benefitsSummary: 'Private medical, pension contribution, professional development allowance.',
      nonContactTime: 20,
      technologyEcosystem: 'Mixed environment (Windows/Mac), Veracross'
    },
    costOfLiving: { apartment: 2800, food: 800, transport: 300, utilities: 300, internet: 60, mobile: 50, diningSocial: 400, vehicleInsuranceMaint: 150, uncoveredMedical: 150 },
  },
  {
    id: 'amsterdam-international-school',
    name: 'Amsterdam International School',
    location: 'Amsterdam',
    country: 'Netherlands',
    ...getImage('amsterdam-international-school'),
    intel: {
      salary: { value: '$50k - $70k', score: 'neutral' },
      housing: { value: 'Allowance', provided: false },
      savingsPotential: { value: 'Low', score: 'bad' },
      curriculum: 'IB',
      studentTeacherRatio: '9:1',
      classSize: 18,
      healthInsurance: 'Private Required',
      accreditation: 'CIS, NEASC',
      jobsPortal: 'School Website',
      minQualifications: 'EU/EFTA Passport preferred',
      visaRestrictions: 'IND sponsorship required',
      benefitsSummary: 'Pension scheme, travel allowance. 30% tax ruling eligibility is key.',
      nonContactTime: 22,
      technologyEcosystem: 'Google Workspace, limited BYOD policy'
    },
    costOfLiving: { apartment: 2200, food: 600, transport: 150, utilities: 250, internet: 55, mobile: 45, diningSocial: 350, vehicleInsuranceMaint: 0, uncoveredMedical: 120 },
  }
];

export const spotlightSchools = schools.filter(school => school.spotlight);

export const getSchoolById = (id: string) => schools.find(school => school.id === id);

export const searchSchools = (query: string) => {
  if (!query) return schools;
  const lowerCaseQuery = query.toLowerCase();
  return schools.filter(school => 
    school.name.toLowerCase().includes(lowerCaseQuery) ||
    school.location.toLowerCase().includes(lowerCaseQuery) ||
    school.country.toLowerCase().includes(lowerCaseQuery)
  );
};

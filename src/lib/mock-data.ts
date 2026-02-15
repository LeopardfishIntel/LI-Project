
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
    rating: 4.8,
    reviewsCount: 124,
    intel: {
      salary: { value: '$55k - $75k', score: 'good' },
      housing: { value: '2-bed Apt Provided', provided: true },
      savingsPotential: { value: 'High', score: 'good' },
      curriculum: 'IB',
      studentTeacherRatio: '8:1',
      classSize: 16,
      healthInsurance: 'Premium',
    },
    reviews: [
      { id: 'r1', author: 'Jane D.', isVerified: true, timestamp: '2 weeks ago', rating: 5, text: 'Fantastic school with great resources and supportive admin. The students are wonderful.' },
      { id: 'r2', author: 'John S.', isVerified: false, timestamp: '1 month ago', rating: 4, text: 'Good salary and benefits, but the workload can be intense at times.' },
    ],
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
    rating: 4.5,
    reviewsCount: 210,
    intel: {
      salary: { value: '$60k - $80k (tax-free)', score: 'good' },
      housing: { value: 'Allowance', provided: false },
      savingsPotential: { value: 'Very High', score: 'good' },
      curriculum: 'US',
      studentTeacherRatio: '12:1',
      classSize: 22,
      healthInsurance: 'Comp',
    },
    reviews: [
      { id: 'r3', author: 'Emily R.', isVerified: true, timestamp: '3 days ago', rating: 5, text: 'The facilities are state-of-the-art and the community is very welcoming. Savings potential is unbeatable.' },
      { id: 'r4', author: 'Michael B.', isVerified: true, timestamp: '2 months ago', rating: 4, text: 'A fast-paced environment. Great for career growth but expect to work hard.' },
    ],
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
    rating: 4.2,
    reviewsCount: 88,
    intel: {
      salary: { value: '$80k - $100k', score: 'good' },
      housing: { value: 'Not Provided', provided: false },
      savingsPotential: { value: 'Moderate', score: 'neutral' },
      curriculum: 'IB/AP',
      studentTeacherRatio: '10:1',
      classSize: 18,
      healthInsurance: 'Mandatory',
    },
    reviews: [
      { id: 'r5', author: 'Sarah K.', isVerified: true, timestamp: '1 week ago', rating: 4, text: 'High salary is offset by the high cost of living, but the quality of life is amazing. Beautiful country.' },
      { id: 'r6', author: 'Tom H.', isVerified: false, timestamp: '3 months ago', rating: 3, text: 'Finding housing is a major challenge. The school is professional but can feel a bit formal.' },
    ],
    costOfLiving: { apartment: 3500, food: 1000, transport: 250, utilities: 250, internet: 70, mobile: 60, diningSocial: 600, vehicleInsuranceMaint: 200, uncoveredMedical: 200 },
  },
  {
    id: 'singapore-american-school',
    name: 'Singapore American School',
    location: 'Singapore',
    country: 'Singapore',
    ...getImage('singapore-american-school'),
    rating: 4.9,
    reviewsCount: 150,
    intel: {
      salary: { value: '$70k - $90k', score: 'good' },
      housing: { value: 'Subsidised', provided: true },
      savingsPotential: { value: 'High', score: 'good' },
      curriculum: 'AP',
      studentTeacherRatio: '11:1',
      classSize: 20,
      healthInsurance: 'Premium',
    },
    reviews: [],
    costOfLiving: { apartment: 3000, food: 700, transport: 100, utilities: 200, internet: 60, mobile: 50, diningSocial: 400, vehicleInsuranceMaint: 0, uncoveredMedical: 80 },
  },
  {
    id: 'seoul-foreign-school',
    name: 'Seoul Foreign School',
    location: 'Seoul',
    country: 'South Korea',
    ...getImage('seoul-foreign-school'),
    rating: 4.0,
    reviewsCount: 95,
    intel: {
      salary: { value: '$45k - $65k', score: 'neutral' },
      housing: { value: 'Furnished Apt Provided', provided: true },
      savingsPotential: { value: 'Moderate', score: 'neutral' },
      curriculum: 'IB/British',
      studentTeacherRatio: '15:1',
      classSize: 24,
      healthInsurance: 'National',
    },
    reviews: [],
    costOfLiving: { apartment: 1500, food: 600, transport: 100, utilities: 150, internet: 40, mobile: 30, diningSocial: 250, vehicleInsuranceMaint: 0, uncoveredMedical: 70 },
  },
  {
    id: 'acs-cobham-international-school',
    name: 'ACS Cobham International School',
    location: 'Cobham',
    country: 'United Kingdom',
    ...getImage('acs-cobham-international-school'),
    spotlight: false,
    rating: 4.4,
    reviewsCount: 85,
    intel: {
      salary: { value: '$60k - $85k', score: 'good' },
      housing: { value: 'Allowance', provided: false },
      savingsPotential: { value: 'Moderate', score: 'neutral' },
      curriculum: 'IB & AP',
      studentTeacherRatio: '10:1',
      classSize: 20,
      healthInsurance: 'Private',
    },
    reviews: [
      { id: 'r7', author: 'David L.', isVerified: true, timestamp: '1 month ago', rating: 5, text: 'Top-tier facilities and a strong academic program. The campus is beautiful, and it\'s a great place for families.' },
      { id: 'r8', author: 'Maria G.', isVerified: true, timestamp: '4 months ago', rating: 4, text: 'A very US-style school, which has its pros and cons. The pay is good for the UK, but the cost of living in Surrey is very high.' },
    ],
    costOfLiving: { apartment: 2800, food: 800, transport: 300, utilities: 300, internet: 60, mobile: 50, diningSocial: 400, vehicleInsuranceMaint: 150, uncoveredMedical: 150 },
  },
  {
    id: 'amsterdam-international-school',
    name: 'Amsterdam International School',
    location: 'Amsterdam',
    country: 'Netherlands',
    ...getImage('amsterdam-international-school'),
    rating: 4.3,
    reviewsCount: 72,
    intel: {
      salary: { value: '$50k - $70k', score: 'neutral' },
      housing: { value: 'Allowance', provided: false },
      savingsPotential: { value: 'Low', score: 'bad' },
      curriculum: 'IB',
      studentTeacherRatio: '9:1',
      classSize: 18,
      healthInsurance: 'Private Required',
    },
    reviews: [],
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

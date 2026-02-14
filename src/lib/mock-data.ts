import type { School } from './types';
import { PlaceHolderImages } from './placeholder-images';

const getImage = (id: string) => {
  const image = PlaceHolderImages.find(img => img.id === id);
  return {
    imageUrl: image?.imageUrl ?? "https://picsum.photos/seed/placeholder/600/400",
    imageHint: image?.imageHint ?? "school building"
  };
};

export const schools: School[] = [
  {
    id: 'tokyo-international-school',
    name: 'Tokyo International School',
    location: 'Tokyo',
    country: 'Japan',
    ...getImage('tokyo-international-school'),
    spotlight: true,
    rating: 4.8,
    reviewsCount: 124,
    intel: {
      salary: { value: '$55k - $75k', score: 'good' },
      housing: { value: '2-bed apartment provided', provided: true },
      savingsPotential: { value: 'High', score: 'good' },
      curriculum: 'IB',
      studentTeacherRatio: '8:1',
      classSize: 16,
      healthInsurance: 'Premium International Plan',
    },
    reviews: [
      { id: 'r1', author: 'Jane D.', isVerified: true, timestamp: '2 weeks ago', rating: 5, text: 'Fantastic school with great resources and supportive admin. The students are wonderful.' },
      { id: 'r2', author: 'John S.', isVerified: false, timestamp: '1 month ago', rating: 4, text: 'Good salary and benefits, but the workload can be intense at times.' },
    ],
    costOfLiving: { apartment: 2000, food: 500, transport: 150, utilities: 200, internet: 50 },
  },
  {
    id: 'dubai-american-academy',
    name: 'Dubai American Academy',
    location: 'Dubai',
    country: 'UAE',
    ...getImage('dubai-american-academy'),
    spotlight: true,
    rating: 4.5,
    reviewsCount: 210,
    intel: {
      salary: { value: '$60k - $80k (tax-free)', score: 'good' },
      housing: { value: 'Housing allowance provided', provided: false },
      savingsPotential: { value: 'Very High', score: 'good' },
      curriculum: 'American',
      studentTeacherRatio: '12:1',
      classSize: 22,
      healthInsurance: 'Comprehensive Local Plan',
    },
    reviews: [
      { id: 'r3', author: 'Emily R.', isVerified: true, timestamp: '3 days ago', rating: 5, text: 'The facilities are state-of-the-art and the community is very welcoming. Savings potential is unbeatable.' },
      { id: 'r4', author: 'Michael B.', isVerified: true, timestamp: '2 months ago', rating: 4, text: 'A fast-paced environment. Great for career growth but expect to work hard.' },
    ],
    costOfLiving: { apartment: 2500, food: 600, transport: 200, utilities: 300, internet: 80 },
  },
  {
    id: 'zurich-international-school',
    name: 'Zurich International School',
    location: 'Zurich',
    country: 'Switzerland',
    ...getImage('zurich-international-school'),
    spotlight: true,
    rating: 4.2,
    reviewsCount: 88,
    intel: {
      salary: { value: '$80k - $100k', score: 'good' },
      housing: { value: 'Not provided', provided: false },
      savingsPotential: { value: 'Moderate', score: 'neutral' },
      curriculum: 'IB/AP',
      studentTeacherRatio: '10:1',
      classSize: 18,
      healthInsurance: 'Mandatory Swiss Insurance',
    },
    reviews: [
      { id: 'r5', author: 'Sarah K.', isVerified: true, timestamp: '1 week ago', rating: 4, text: 'High salary is offset by the high cost of living, but the quality of life is amazing. Beautiful country.' },
      { id: 'r6', author: 'Tom H.', isVerified: false, timestamp: '3 months ago', rating: 3, text: 'Finding housing is a major challenge. The school is professional but can feel a bit formal.' },
    ],
    costOfLiving: { apartment: 3500, food: 1000, transport: 250, utilities: 250, internet: 70 },
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
      housing: { value: 'Subsidized housing available', provided: true },
      savingsPotential: { value: 'High', score: 'good' },
      curriculum: 'AP',
      studentTeacherRatio: '11:1',
      classSize: 20,
      healthInsurance: 'Full Coverage International Plan',
    },
    reviews: [],
    costOfLiving: { apartment: 3000, food: 700, transport: 100, utilities: 200, internet: 60 },
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
      housing: { value: 'Provided, furnished', provided: true },
      savingsPotential: { value: 'Moderate', score: 'neutral' },
      curriculum: 'IB/British',
      studentTeacherRatio: '15:1',
      classSize: 24,
      healthInsurance: 'National Health Insurance',
    },
    reviews: [],
    costOfLiving: { apartment: 1500, food: 600, transport: 100, utilities: 150, internet: 40 },
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
      housing: { value: 'Allowance / Support', provided: false },
      savingsPotential: { value: 'Low', score: 'bad' },
      curriculum: 'IB',
      studentTeacherRatio: '9:1',
      classSize: 18,
      healthInsurance: 'Private insurance required',
    },
    reviews: [],
    costOfLiving: { apartment: 2200, food: 600, transport: 150, utilities: 250, internet: 55 },
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

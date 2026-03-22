import { School, TeacherProfile } from "./types";

export const teacherProfile: TeacherProfile = {
  uid: "agent-001",
  email: "operative@leopardfish.intel",
  id: "agent-001",
  fullName: "Jane Doe",
  avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jane",
  isVerifiedTeacher: true,
  familyStatus: "single",
  ageGroup: "30-40",
  memberSince: new Date(),
  yearsOfExperience: 10,
  qualifications: ["PGCE", "M.Ed"],
  linkedInProfileUrl: "https://linkedin.com",
  preferredRegions: ["Europe", "Asia"],
  preferredCountries: ["Czech Republic", "Thailand"],
  goal: "balanced"
};

export const schools: School[] = [
  {
    id: "school-001",
    name: "Leopardfish Academy",
    city: "Prague",
    country: "Czech Republic",
    curriculum: "IB",
    imageUrl: "https://picsum.photos/seed/school1/600/400",
    intel: {
      salary: { value: "€45,000", score: "good", isTaxFree: false },
      housing: { provided: true, value: "Included" },
      curriculum: "IB",
      classSize: 18,
      visaRestrictions: "EU preferred"
    },
    costOfLiving: {
      monthlyRent1BR: 800,
      food: 400,
      childcareMonthly: 500
    }
  }
];
 "use server";
import { School, TeacherProfile } from "@/lib/types";

export async function generateComparisonIntel(schools: School[], teacherProfile: TeacherProfile) {
  return schools.map(school => ({
    name: school.name,
    // Protocol 2: Optional Chaining Guard
    baseSalaryRange: school.intel?.salary?.value || "N/A",
    taxFree: school.intel?.salary?.isTaxFree ? 'Yes' : 'No',
    housing: school.intel?.housing?.value || "N/A",
    savingsPotential: school.intel?.savingsPotential?.value || "N/A",
    curriculum: school.intel?.curriculum || school.curriculum || "N/A",
    studentTeacherRatio: school.intel?.studentTeacherRatio || "N/A",
    classSize: school.intel?.classSize || "N/A",
    benefitsSummary: school.intel?.benefitsSummary || "N/A",
    nonContactTime: school.intel?.nonContactTime ? `${school.intel.nonContactTime}%` : 'N/A',
    technologyEcosystem: school.intel?.technologyEcosystem || "N/A",
  }));
}
"use server";

import { School, TeacherProfile } from "@/lib/types";

/**
 * Tactical Generation of Comparison Intel
 * FIX: Cast 'school' as any to allow dynamic property access for 'salaryRange'
 */
export async function generateComparisonIntel(schools: School[], teacherProfile: TeacherProfile) {
  return schools.map(school => ({
    name: (school as any)?.schoolname || school?.name || "Unknown School",
    
    // 🛡️ THE FIX: (school as any) allows TypeScript to read the salaryRange property
    baseSalaryRange: (school as any)?.salaryRange || school?.intel?.salary?.value || "N/A",
    
    taxFree: school?.intel?.salary?.isTaxFree ? 'Yes' : 'No',
    housing: school?.intel?.housing?.value || school?.housingprovision || "N/A",
    savingsPotential: school?.intel?.savingsPotential?.value || "N/A",
    curriculum: school?.intel?.curriculum || school?.curriculum || "N/A",
    studentTeacherRatio: school?.intel?.studentTeacherRatio || "N/A",
    classSize: school?.intel?.classSize || "N/A",
    benefitsSummary: school?.intel?.benefitsSummary || "N/A",
    nonContactTime: school?.intel?.nonContactTime ? `${school.intel.nonContactTime}%` : 'N/A',
    technologyEcosystem: school?.intel?.technologyEcosystem || "N/A",
  }));
}
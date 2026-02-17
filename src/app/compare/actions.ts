
"use server";

import { aiSchoolComparison, AiSchoolComparisonInput } from '@/ai/flows/ai-school-comparison-flow';
import type { School } from '@/lib/types';
import { teacherProfile } from '@/lib/mock-data';

export async function getSchoolComparisonInsights(schools: School[]) {
    try {
        const schoolData = schools.map(school => {
            const coreSchoolData = JSON.stringify({
                salary: school.intel.salary.value,
                taxFree: school.intel.salary.isTaxFree ? 'Yes' : 'No',
                housing: school.intel.housing.value,
                savingsPotential: school.intel.savingsPotential.value,
                curriculum: school.intel.curriculum,
                studentTeacherRatio: school.intel.studentTeacherRatio,
                classSize: school.intel.classSize,
            });

            return { schoolName: school.name, coreSchoolData };
        });

        const teacherProfileSummary = `Family Status: ${teacherProfile.familyStatus}, Experience: ${teacherProfile.yearsOfExperience} years, Qualifications: ${teacherProfile.qualifications.join(', ')}, Prefers: ${[...teacherProfile.preferredRegions, ...teacherProfile.preferredCountries].join(', ')}.`;

        const input: AiSchoolComparisonInput = {
            schools: schoolData,
            teacherProfile: teacherProfileSummary
        };

        if (input.schools.length < 2) {
             return { comparison: null, error: "Please select at least two schools to generate a comparison." };
        }

        const comparison = await aiSchoolComparison(input);
        return { comparison };

    } catch (error) {
        console.error(error);
        const err = error as Error;
        return { comparison: null, error: err.message || 'Failed to generate comparison.' };
    }
}

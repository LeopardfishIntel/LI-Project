"use server";

import { aiSchoolInsightsSummary, AiSchoolInsightsSummaryInput } from '@/ai/flows/ai-school-insights-summary-flow';
import type { School } from '@/lib/types';

export async function getSchoolInsights(school: School) {
    try {
        const coreSchoolData = JSON.stringify({
            salary: school.intel.salary.value,
            housing: school.intel.housing.value,
            savingsPotential: school.intel.savingsPotential.value,
            curriculum: school.intel.curriculum,
            studentTeacherRatio: school.intel.studentTeacherRatio,
            classSize: school.intel.classSize,
        });

        const teacherReviews = school.reviews.map(r => `Review: ${r.text}`).join(' ');
        
        const input: AiSchoolInsightsSummaryInput = {
            schoolName: school.name,
            coreSchoolData,
            teacherReviews
        };
        
        if (!teacherReviews) {
            return { insights: {
                summary: "No reviews available to generate insights.",
                pros: [],
                cons: []
            }};
        }
        
        const insights = await aiSchoolInsightsSummary(input);

        return { insights };
    } catch (error) {
        console.error(error);
        const err = error as Error;
        return { insights: null, error: err.message || 'Failed to generate insights.' };
    }
}

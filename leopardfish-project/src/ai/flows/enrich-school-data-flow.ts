
'use server';
/**
 * @fileOverview An AI flow to enrich school data using its name and location.
 *
 * - enrichSchoolData - A function to get details about a school.
 * - EnrichSchoolDataInput - Input for the function.
 * - EnrichSchoolDataOutput - Output for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const EnrichSchoolDataInputSchema = z.object({
  name: z.string().describe('The name of the school.'),
  location: z.string().describe('The city where the school is located.'),
  country: z.string().describe('The country where the school is located.'),
});
type EnrichSchoolDataInput = z.infer<typeof EnrichSchoolDataInputSchema>;

const EnrichSchoolDataOutputSchema = z.object({
    description: z.string().describe("A brief, engaging description of the school, suitable for a directory listing."),
    websiteUrl: z.string().url().describe("The official website URL of the school."),
    imageUrl: z.string().url().describe("A high-quality, publicly available image URL for the school, preferably from a source like Unsplash. The image should be representative of the school or its location."),
    imageHint: z.string().max(40).describe("A two-word hint describing the image (e.g., 'modern campus', 'city skyline') for AI-powered image replacement later."),
    videoUrl: z.string().url().describe("A YouTube embed URL of a promotional or informational video about the school. e.g. https://youtube.com/embed/VIDEO_ID").optional(),
    curriculum: z.string().describe("The primary curriculum or curriculums offered. Should be a comma-separated list of values from: 'IB', 'AP', 'British', 'US', 'Other'."),
    accreditation: z.string().describe("Key accreditation bodies (e.g., 'CIS', 'WASC', 'NEASC')."),
    studentTeacherRatio: z.string().describe("The student-to-teacher ratio, if available (e.g., '10:1').").optional(),
    classSize: z.coerce.number().describe("The average class size.").optional(),
    technologyEcosystem: z.string().describe("A brief summary of the school's technology integration (e.g., '1:1 iPads K-12', 'Google Workspace for Education').").optional(),
    costOfLiving: z.object({
        monthlyRent1BR: z.coerce.number().describe("Estimated monthly rent for a 1-bedroom apartment in the city center, in USD."),
        monthlyRent2BR: z.coerce.number().describe("Estimated monthly rent for a 2-bedroom apartment in the city center, in USD."),
        monthlyRent3BR: z.coerce.number().describe("Estimated monthly rent for a 3-bedroom apartment in the city center, in USD."),
        food: z.coerce.number().describe("Estimated monthly grocery cost for a single person, in USD."),
        transport: z.coerce.number().describe("Estimated monthly cost for public transport, in USD."),
        utilities: z.coerce.number().describe("Estimated monthly cost for basic utilities (electricity, heating, cooling, water, garbage), in USD."),
        internet: z.coerce.number().describe("Estimated monthly cost for internet service, in USD."),
        mobile: z.coerce.number().describe("Estimated monthly cost for a mobile phone plan, in USD."),
        diningSocial: z.coerce.number().describe("Estimated monthly cost for dining out and social activities for a single person, in USD."),
        vehicleInsuranceMaint: z.coerce.number().describe("Estimated monthly cost for vehicle maintenance and insurance (if applicable), in USD.").optional(),
        uncoveredMedical: z.coerce.number().describe("Estimated monthly cost for uncovered medical expenses (e.g., dental), in USD.").optional(),
    }).describe("Estimated monthly cost of living data for the school's location, in USD."),
});
export type EnrichSchoolDataOutput = z.infer<typeof EnrichSchoolDataOutputSchema>;

export async function enrichSchoolData(
  input: EnrichSchoolDataInput
): Promise<EnrichSchoolDataOutput> {
  return enrichSchoolDataFlow(input);
}

const enrichSchoolDataPrompt = ai.definePrompt({
  name: 'enrichSchoolDataPrompt',
  input: {schema: EnrichSchoolDataInputSchema},
  output: {schema: EnrichSchoolDataOutputSchema},
  prompt: `You are an expert education researcher. Your task is to find publicly available information for the following school and its location, and return it in the specified format.

School Name: {{{name}}}
Location: {{{location}}}, {{{country}}}

Please research online and provide the following details. If a specific piece of information cannot be found, omit it from your response for optional fields.

School Details:
- A brief, engaging description of the school.
- The official website URL.
- A high-quality, publicly available image URL (e.g., from Unsplash, Pexels) that represents the school or its location.
- A two-word hint describing the image (e.g., 'modern campus', 'city skyline').
- A YouTube embed URL of a promotional video about the school (e.g., https://youtube.com/embed/VIDEO_ID).
- The primary curriculum (comma-separated list from 'IB', 'AP', 'British', 'US', 'Other').
- Key accreditations.
- Student-teacher ratio (if available).
- Average class size (if available).
- A summary of their technology ecosystem (if available).

Cost of Living Details (Monthly estimates in USD for {{{location}}}):
- Monthly rent for a 1-bedroom apartment.
- Monthly rent for a 2-bedroom apartment.
- Monthly rent for a 3-bedroom apartment.
- Monthly grocery cost for a single person.
- Monthly public transport pass cost.
- Monthly cost for basic utilities (electricity, water, etc.).
- Monthly internet cost.
- Monthly mobile plan cost.
- Monthly cost for dining out and social activities.
- Monthly vehicle maintenance/insurance (if applicable).
- Monthly uncovered medical expenses (e.g., dental).
`,
});

const enrichSchoolDataFlow = ai.defineFlow(
  {
    name: 'enrichSchoolDataFlow',
    inputSchema: EnrichSchoolDataInputSchema,
    outputSchema: EnrichSchoolDataOutputSchema,
  },
  async input => {
    const {output} = await enrichSchoolDataPrompt(input);
    return output!;
  }
);

    
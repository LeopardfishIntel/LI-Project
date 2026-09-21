import { z } from "zod";

export const SchoolRecordSchema = z.object({
  id: z.string().startsWith("FLIS"),
  schoolname: z.string(),
  name: z.string(),
  country: z.string(),
  city: z.string(),
  aliases: z.array(z.string()).default([]),
  group: z.string().default("Standalone"),
  profitStatus: z.union([
    z.enum(["For-Profit", "Non-Profit"]),
    z.string().transform(s => s.toLowerCase().includes("non-profit") ? "Non-Profit" : "For-Profit")
  ]).default("Non-Profit"),
  
  // Curriculum
  curriculum: z.string(),
  approvals: z.union([z.array(z.string()), z.string()]).transform(val => 
    Array.isArray(val) ? val : val.split(",").map(s => s.trim()).filter(Boolean)
  ),
  techecosystem: z.string().default("BYOD / Google Workspace"),
  
  // Financial Engine
  salaryRange: z.string(),
  savingspotentialsingle: z.coerce.number().nonnegative(),
  housingprovision: z.string(),
  healthcoverage: z.string(),
  paidInUSD: z.boolean().default(false),
  currency: z.string().length(3),
  
  // Working Conditions
  classsize: z.string().default("18-22 students"),
  staffstudentratio: z.string().default("1:8"),
  staffcount: z.coerce.number().int().positive().default(100),
  noncontacttime: z.string().default("20%"),
  summary: z.string(),
  
  // Recruitment & Crawlers
  website: z.string().url(),
  careersPageUrl: z.string().url(),
  agency: z.string().default("Direct"),
  tesEmployerSlug: z.string().optional(),
  tesOrganizationId: z.string().optional(),
  schroleAccountId: z.string().optional(),
  
  // Coerced Rating Scores (1.0 - 10.0)
  totalscore: z.coerce.number().min(1).max(10),
  financescore: z.coerce.number().min(1).max(10),
  academicscore: z.coerce.number().min(1).max(10),
  worklifescore: z.coerce.number().min(1).max(10),
  techscore: z.coerce.number().min(1).max(10),
  citySafety: z.coerce.number().min(1).max(10),
  confidence: z.coerce.number().min(1).max(10)
});

export type SchoolRecord = z.infer<typeof SchoolRecordSchema>;

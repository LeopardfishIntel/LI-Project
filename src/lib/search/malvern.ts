/**
 * 🏛️ MALVERN COLLEGE VACANCY ENGINE (DEPRECATED -> DELEGATED TO TES ADAPTOR)
 *
 * NOTE: The high-overhead Playwright nested iframe parser has been deprecated.
 * Malvern international campuses manage their live vacancies directly via official
 * TES Employer Hubs (tes.com), which are ingested natively by the primary TES adaptor
 * (`tes-adaptor.ts` / Pipeline 1) with structured JSON-LD parsing, concurrent closing date
 * resolution, deterministic fingerprinting, and automated stale vacancy purging.
 */

export interface MalvernJobMatch {
  jobId: string;
  title: string;
  applyUrl: string;
  schoolId: string;
  schoolName: string;
  city: string;
  country: string;
  source: string;
  datePosted?: string | null;
  closingDate?: string | null;
}

export async function searchMalvernDbSchools(_query: string = ""): Promise<MalvernJobMatch[]> {
  console.log("ℹ️ [MALVERN ENGINE] Standalone parser deprecated. Malvern vacancies are now natively discovered via primary TES employer pipelines.");
  return [];
}

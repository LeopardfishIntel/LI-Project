/**
 * 🛸 PIPELINE 2 — ENTITY & FINANCIAL ENRICHMENT
 *
 * Runs after Pipeline 1 has committed records to `featured_jobs_cache`.
 * Attaches pre-computed financial and search metadata to each cache document
 * so that `page.tsx` can operate as a pure read-only viewer with zero joins.
 *
 * Enrichment fields written to `featured_jobs_cache/{jobId}`:
 *   - savingsPotentialSingle  — USD/month savings baseline (Single teacher)
 *   - closingDateMillis       — epoch millis (already set by P1, confirmed here)
 *   - searchTokens            — lowercase text search array
 *   - department              — 'Primary' | 'Secondary' | 'Leadership'
 *   - curriculum              — from school record
 *   - schoolRating            — from school record (academicscore)
 *   - schoolWebsite           — from school record
 *   - isVolatileMarket        — e.g. Argentina ARS
 *   - paidInUSD               — school.paidInUSD flag
 *
 * Cost-of-living data is loaded once per invocation from the
 * `locations_costOfLiving` Firestore collection via Admin SDK.
 */

import type { CacheJobDocument } from './pipeline1-ingestion';
import { calculateSchoolSavingsForStatus } from '../calculations';

// ─── Savings Potential Calculation ────────────────────────────────────────────

const REGIONAL_SALARY_FALLBACK: Record<string, number> = {
  switzerland: 6500,
  'united arab emirates': 4800,
  qatar: 4600,
  'saudi arabia': 4500,
  kuwait: 4400,
  bahrain: 4200,
  oman: 4200,
  singapore: 5200,
  'hong kong': 5400,
  japan: 4200,
  china: 4500,
  'south korea': 4000,
  czechia: 2900,
  'czech republic': 2900,
  jordan: 3200,
  egypt: 1800,
  vietnam: 2200,
  thailand: 2500,
  indonesia: 2500,
  malaysia: 3000,
  'united kingdom': 3800,
  germany: 3800,
  netherlands: 4000,
  france: 3500,
  spain: 2800,
  austria: 3700,
};

const normalize = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();

/**
 * Looks up the best-matching cost-of-living record for a city/country pair.
 */
function matchCostOfLiving(
  city: string,
  country: string,
  colData: any[]
): any | null {
  if (!colData || colData.length === 0) return null;
  const normCity = normalize(city);
  const normCountry = normalize(country);
  return (
    colData.find(c => {
      const cCity = normalize(c.city || c.locationName || c.city_name || c.id || '');
      const cCountry = normalize(c.country || c.countryName || '');
      return cCity && normCity && (cCity.includes(normCity) || normCity.includes(cCity)) &&
             cCountry && normCountry && (cCountry.includes(normCountry) || normCountry.includes(cCountry));
    }) ||
    colData.find(c => {
      const cCountry = normalize(c.country || c.countryName || '');
      return cCountry && normCountry && (cCountry.includes(normCountry) || normCountry.includes(cCountry));
    }) ||
    null
  );
}

/**
 * Computes savingsPotentialSingle: the estimated USD/month savings for a
 * Single teacher with no dependants and housing NOT provided.
 */

function computeSavingsByStatus(
  schoolData: any,
  colRecord: any | null
): Record<string, number> {
  const country = (schoolData?.country || "").toLowerCase();
  const baseSalary =
    parseFloat(String(schoolData?.salaryRange || schoolData?.salary || schoolData?.netbase || "").replace(/[^0-9.]/g, "")) ||
    REGIONAL_SALARY_FALLBACK[country] ||
    3000;

  const housingProvision = schoolData?.housingprovision || (schoolData?.housingProvided ? "Provided" : "");
  const paidInUSD = schoolData?.paidInUSD === true;

  const statuses = [
    "Single",
    "Married (sole earner)",
    "Married (dual income)",
    "Family +1",
    "Family +2",
    "Family +3"
  ];

  const map: Record<string, number> = {};
  statuses.forEach(status => {
    map[status] = calculateSchoolSavingsForStatus(
      baseSalary,
      status,
      colRecord,
      housingProvision,
      country,
      paidInUSD
    );
  });

  return map;
}

function computeSavingsPotentialSingle(
  schoolData: any,
  colRecord: any | null
): number {
  const country = (schoolData?.country || '').toLowerCase();
  const baseSalary =
    parseFloat(String(schoolData?.salaryRange || schoolData?.salary || schoolData?.netbase || '').replace(/[^0-9.]/g, '')) ||
    REGIONAL_SALARY_FALLBACK[country] ||
    3000;

  if (!colRecord) return Math.max(0, Math.round(baseSalary));

  const isProvided =
    String(schoolData?.housingprovision || '').toLowerCase().includes('provided') ||
    schoolData?.housingProvided === true;

  const rent = isProvided ? 0 : (colRecord.monthlyRent1BR || colRecord.rent1br || 0);
  const other =
    (colRecord.groceries || 0) +
    (colRecord.utilities || 0) +
    (colRecord.mobilePhone || colRecord.mobile || 0) +
    (colRecord.internet || 0) +
    (colRecord.diningSocial || 0);

  const outgoings = rent + other;
  const isVolatile = country === 'argentina' || schoolData?.currency === 'ARS';
  const paidInUSD = schoolData?.paidInUSD === true;
  const volatileMultiplier = isVolatile && !paidInUSD ? 0.25 : 1.0;

  return Math.max(0, Math.round((baseSalary - outgoings) * volatileMultiplier));
}

// ─── Search Token Generation ──────────────────────────────────────────────────

/**
 * Builds a lowercase array of searchable tokens from job + school metadata.
 * Covers: title words, school name, city, country, curriculum, department.
 */
function buildSearchTokens(doc: CacheJobDocument, schoolData: any): string[] {
  const raw = [
    doc.title,
    doc.schoolName,
    doc.city,
    doc.country,
    doc.department || '',
    schoolData?.curriculum || '',
    ...(doc.title || '').split(/\s+/),
    ...(doc.schoolName || '').split(/\s+/),
  ];
  return Array.from(
    new Set(
      raw
        .map(s => (s || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').trim())
        .filter(s => s.length > 1)
    )
  );
}

// ─── Firestore Data Loaders ────────────────────────────────────────────────────

/**
 * Loads all `locations_costOfLiving` documents via Admin SDK.
 */
async function loadCostOfLivingData(): Promise<any[]> {
  try {
    const { getAdminDb } = await import('@/firebase/admin');
    const db = getAdminDb();
    if (typeof db.collection === 'function') {
      const snap = await db.collection('locations_costOfLiving').get();
      return snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
    }
  } catch (err) {
    console.warn('🛸 [PIPELINE 2] Could not load costOfLiving via Admin SDK:', err);
  }
  return [];
}

/**
 * Loads the school document for a given schoolId.
 */
async function loadSchoolData(schoolId: string): Promise<any | null> {
  try {
    const { getAdminDb } = await import('@/firebase/admin');
    const db = getAdminDb();
    if (typeof db.collection === 'function') {
      const snap = await db.collection('schools').doc(schoolId).get();
      return snap.exists ? snap.data() : null;
    }
  } catch (err) {
    console.warn(`🛸 [PIPELINE 2] Could not load school ${schoolId}:`, err);
  }
  return null;
}

/**
 * Loads all `featured_jobs_cache` documents for the given fingerprints.
 */
async function loadCacheDocs(fingerprints: string[]): Promise<Map<string, CacheJobDocument>> {
  const result = new Map<string, CacheJobDocument>();
  if (!fingerprints.length) return result;
  try {
    const { getAdminDb } = await import('@/firebase/admin');
    const db = getAdminDb();
    if (typeof db.collection === 'function') {
      // Batch into groups of 10 (Firestore 'in' limit)
      for (let i = 0; i < fingerprints.length; i += 10) {
        const batch = fingerprints.slice(i, i + 10);
        const snap = await db.collection('featured_jobs_cache')
          .where('id', 'in', batch)
          .get();
        snap.docs.forEach((d: any) => result.set(d.id, { id: d.id, ...d.data() } as CacheJobDocument));
      }
    }
  } catch (err) {
    console.warn('🛸 [PIPELINE 2] Cache document load failed:', err);
  }
  return result;
}

/**
 * Writes enrichment fields back to a `featured_jobs_cache` document.
 */
async function writeEnrichmentFields(docId: string, fields: Partial<CacheJobDocument>): Promise<void> {
  try {
    const { setDocument } = await import('@/firebase/admin');
    await setDocument('featured_jobs_cache', docId, fields, { merge: true });
  } catch (err) {
    console.warn(`🛸 [PIPELINE 2] Enrichment write failed for ${docId}:`, err);
  }
}

// ─── Public Interfaces ────────────────────────────────────────────────────────

export interface EnrichmentResult {
  enriched: number;
  skipped: number;
  errors: string[];
}

// ─── Main Entry-Point ─────────────────────────────────────────────────────────

/**
 * Enriches `featured_jobs_cache` documents after Pipeline 1 ingestion.
 *
 * @param schoolId     - The school whose jobs should be enriched.
 * @param fingerprints - The fingerprints of the accepted jobs from Pipeline 1.
 * @returns            - EnrichmentResult summary.
 */
export async function runEnrichmentPipeline(
  schoolId: string,
  fingerprints: string[]
): Promise<EnrichmentResult> {
  if (!fingerprints || fingerprints.length === 0) {
    return { enriched: 0, skipped: 0, errors: [] };
  }

  console.log(`🛸 [PIPELINE 2] Enriching ${fingerprints.length} job(s) for school ${schoolId}...`);

  // Load school + cost-of-living data concurrently
  const [schoolData, colData, cacheDocs] = await Promise.all([
    loadSchoolData(schoolId),
    loadCostOfLivingData(),
    loadCacheDocs(fingerprints),
  ]);

  const country = (schoolData?.country || '').toLowerCase();
  const isVolatile = country === 'argentina' || schoolData?.currency === 'ARS';
  const curriculum = schoolData?.curriculum || 'British';
  const schoolRating = parseFloat(
    String(schoolData?.academicscore || schoolData?.rating || '0')
  );
  const schoolWebsite = schoolData?.website || schoolData?.websiteUrl || '';
  const paidInUSD = schoolData?.paidInUSD === true;

  const colRecord = matchCostOfLiving(
    schoolData?.city || schoolData?.town || '',
    schoolData?.country || '',
    colData
  );

  const savingsByStatus = computeSavingsByStatus(schoolData, colRecord);
  const savingsPotentialSingle = savingsByStatus["Single"] || 0;

  const errors: string[] = [];
  let enriched = 0;
  let skipped = 0;

  await Promise.all(
    fingerprints.map(async fp => {
      const cacheDoc = cacheDocs.get(fp);
      if (!cacheDoc) {
        skipped++;
        return;
      }

      try {
        const department = cacheDoc.department || (() => {
          const lower = (cacheDoc.title || '').toLowerCase();
          if (lower.includes('primary') || lower.includes('prep') || lower.includes('early years') ||
              lower.includes('eyfs') || lower.includes('kindergarten') || lower.includes('ks1')) return 'Primary';
          if (lower.includes('head') || lower.includes('director') || lower.includes('principal') ||
              lower.includes('coordinator') || lower.includes('lead')) return 'Leadership';
          return 'Secondary';
        })();

        const enrichedDoc: Partial<CacheJobDocument> = {
          department,
          curriculum,
          schoolRating,
          schoolWebsite,
          isVolatileMarket: isVolatile,
          paidInUSD,
          savingsPotentialSingle,
          savingsByStatus,
          searchTokens: buildSearchTokens({ ...cacheDoc, department }, schoolData),
        };

        await writeEnrichmentFields(fp, enrichedDoc);
        enriched++;
      } catch (err: any) {
        errors.push(`fp=${fp}: ${err?.message || String(err)}`);
      }
    })
  );

  console.log(`🛸 [PIPELINE 2] Enrichment complete | enriched=${enriched} | skipped=${skipped} | errors=${errors.length}`);
  return { enriched, skipped, errors };
}

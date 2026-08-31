import { getAdminDb } from '../../firebase/admin';
import { runTesAdaptor } from '../../lib/crawler/adaptors/tes-adaptor';
import { runSchoolWebsiteAdaptor } from '../../lib/crawler/adaptors/school-website-adaptor';
import { runBoardHubAdaptor } from '../../lib/crawler/adaptors/board-hub-adaptor';
import { runCzechHubAdaptor } from '../../lib/crawler/adaptors/czech-hub-adaptor';
import { runIngestionPipeline } from '../../lib/pipelines/pipeline1-ingestion';
import { runEnrichmentPipeline } from '../../lib/pipelines/pipeline2-enrichment';
import { verifyJobUrlHttp } from '../../lib/crawler/urlResolver';
import { assertPageDisambiguation } from '../../lib/crawler/searchDisambiguation';
import { getInitialJobStatus } from '../../lib/crawler/allowedSourcesRegistry';
import type { RawJobRecord } from '../../lib/crawler/adaptors/raw-job.types';

export interface SearchVacanciesInput {
  schoolName: string;
  city?: string;
  country?: string;
}

export interface GroundedSchoolConfig {
  schoolId: string;
  schoolName: string;
  city: string;
  country: string;
  officialDomain?: string;
  careersPageUrl?: string;
  tesSlug?: string;
  tesOrgId?: string;
  groupDomain?: string;
  customVacancyDomains?: string[];
  aliases?: string[];
  siblingSchools?: Array<{ schoolId: string; schoolName: string; city: string }>;
}

export async function searchVacancies(input: SearchVacanciesInput): Promise<{
  scrapedJobsCount: number;
  scrapedJobsList: any[];
}> {
  console.log(`🛸 [ORCHESTRATOR] Starting database-grounded sequential sweep for ${input.schoolName}...`);
  const db = getAdminDb();

  // ── Step 1: Database Grounding Lookup ──────────────────────────────────────
  let grounded: GroundedSchoolConfig | null = null;
  const snap = await db.collection('schools').get();
  const cleanSearchName = input.schoolName.toLowerCase().trim();
  const cleanCity = (input.city || '').toLowerCase().trim();
  const cleanCountry = (input.country || '').toLowerCase().trim();

  for (const doc of snap.docs) {
    const data = doc.data();
    const sName = (data.schoolname || data.name || '').toLowerCase().trim();
    const sCity = (data.city || '').toLowerCase().trim();
    const sCountry = (data.country || '').toLowerCase().trim();

    const isNameMatch = sName.includes(cleanSearchName) || cleanSearchName.includes(sName);
    const isCityMatch = !cleanCity || !sCity || sCity === cleanCity;
    const isCountryMatch = !cleanCountry || !sCountry || sCountry === cleanCountry;

    if (isNameMatch && isCityMatch && isCountryMatch) {
      const aliasesList = Array.isArray(data.aliases)
        ? data.aliases
        : typeof data.aliases === 'string'
        ? data.aliases.split(/[,;]/).map((s: string) => s.trim()).filter(Boolean)
        : [];

      grounded = {
        schoolId: doc.id,
        schoolName: data.schoolname || data.name || input.schoolName,
        city: data.city || input.city || '',
        country: data.country || input.country || '',
        officialDomain: data.officialDomain,
        careersPageUrl: data.careersPageUrl,
        tesSlug: data.tesEmployerSlug || data.tesSlug,
        tesOrgId: data.tesOrganizationId || data.tesOrgId,
        groupDomain: data.groupDomain,
        customVacancyDomains: data.customVacancyDomains,
        aliases: aliasesList,
      };

      if (data.parentSchoolId) {
        const siblingDocs = snap.docs.filter(
          (d: any) => d.data().parentSchoolId === data.parentSchoolId && d.id !== doc.id
        );
        grounded.siblingSchools = siblingDocs.map((d: any) => ({
          schoolId: d.id,
          schoolName: d.data().schoolname || d.data().name || '',
          city: d.data().city || '',
        }));
      }
      break;
    }
  }

  if (!grounded) {
    console.warn(`⚠️ [ORCHESTRATOR] School "${input.schoolName}" not found in Firestore. Grounding with fallback.`);
    grounded = {
      schoolId: `custom_${input.schoolName.toLowerCase().replace(/\s+/g, '_')}`,
      schoolName: input.schoolName,
      city: input.city || '',
      country: input.country || '',
    };
  }

  console.log(
    `🛸 [GROUNDING] Grounded "${grounded.schoolName}" (ID: ${grounded.schoolId}) -> domain: ${grounded.officialDomain || 'none'} | TES slug: ${grounded.tesSlug || 'none'} | Group: ${grounded.groupDomain || 'none'}`
  );

  // ── Step 2: Sequential Multi-Source Extraction Pipeline ────────────────────
  const adaptorInput = {
    schoolId: grounded.schoolId,
    schoolName: grounded.schoolName,
    city: grounded.city,
    country: grounded.country,
    officialDomain: grounded.officialDomain,
    careersPageUrl: grounded.careersPageUrl,
    tesEmployerSlug: grounded.tesSlug,
    tesOrganizationId: grounded.tesOrgId,
    groupDomain: grounded.groupDomain,
    customVacancyDomains: grounded.customVacancyDomains,
    aliases: grounded.aliases,
  };

  const primaryRecords: RawJobRecord[] = [];

  // Source 1.1: Czech Hub Adaptor (if Czech Republic)
  if (grounded.country.toLowerCase().includes('czech')) {
    console.log(`🛸 [ORCHESTRATOR] [Tier 1] Running Czech Hub Adaptor...`);
    try {
      const czechRecs = await runCzechHubAdaptor(adaptorInput);
      primaryRecords.push(...czechRecs);
    } catch (err) {
      console.warn(`🛸 [ORCHESTRATOR] Czech Hub Adaptor failed:`, err);
    }
  }

  // Source 1.2: TES Direct Hub Adaptor (Pure Extraction - Zero Fussy Filters)
  if (grounded.tesSlug || grounded.tesOrgId) {
    console.log(`🛸 [ORCHESTRATOR] [Tier 1] Running TES Direct Hub Adaptor...`);
    try {
      const tesRecs = await runTesAdaptor(adaptorInput);
      primaryRecords.push(...tesRecs);
    } catch (err) {
      console.warn(`🛸 [ORCHESTRATOR] TES Adaptor failed:`, err);
    }
  }

  // Source 1.3: School Website & ATS Adaptor
  if (grounded.officialDomain || grounded.careersPageUrl) {
    console.log(`🛸 [ORCHESTRATOR] [Tier 1] Running School Website Adaptor...`);
    try {
      const webRecs = await runSchoolWebsiteAdaptor(adaptorInput, false, false);
      primaryRecords.push(...webRecs);
    } catch (err) {
      console.warn(`🛸 [ORCHESTRATOR] School Website Adaptor failed:`, err);
    }
  }

  let candidateRecords = [...primaryRecords];

  // ── Step 2.4: Tier 2 Secondary Regional Fallback Sweep (ONLY if 0 Primary Jobs Found)
  if (candidateRecords.length === 0) {
    console.log(`🛸 [ORCHESTRATOR] [Tier 2 Fallback] 0 primary jobs found. Running Board Hub secondary fallback sweep...`);
    try {
      const fallbackRecs = await runBoardHubAdaptor(adaptorInput);
      candidateRecords.push(...fallbackRecs);
    } catch (err) {
      console.warn(`🛸 [ORCHESTRATOR] Board Hub Secondary Fallback failed:`, err);
    }
  }

  console.log(`🛸 [ORCHESTRATOR] Extracted ${candidateRecords.length} raw candidate records across tiers.`);

  // ── Step 3: Direct Ingestion & Status Assignment ──────────────────────────
  const verifiedRecords: RawJobRecord[] = [];

  for (const record of candidateRecords) {
    if (!record.rawTitle) continue;

    if (record.applyUrl) {
      const check = await verifyJobUrlHttp(record.applyUrl);
      if (check.status === 'delisted') {
        console.log(`🛡️ [ORCHESTRATOR] Rejecting delisted link for "${record.rawTitle}": ${record.applyUrl}`);
        continue;
      }

      // Bypass disambiguation for direct Tier 1 sources
      const isDirectTier1Source =
        record.source === 'TES' ||
        record.source === 'School Web Landing Page' ||
        record.source === 'School ATS Portal' ||
        record.source === 'School Web';

      if (!isDirectTier1Source) {
        const isDisambiguated = assertPageDisambiguation(
          record.applyUrl,
          `${record.schoolName} ${record.rawTitle}`,
          { schoolName: grounded.schoolName, officialDomain: grounded.officialDomain, aliases: grounded.aliases }
        );
        if (!isDisambiguated) continue;
      }
    }

    // Assign initial lifecycle status based on source tier
    if (record.applyUrl) {
      record.status = getInitialJobStatus(
        record.applyUrl,
        grounded.officialDomain,
        grounded.groupDomain,
        grounded.customVacancyDomains
      );
    } else {
      record.status = 'approved';
    }

    verifiedRecords.push(record);
  }

  console.log(`🛸 [ORCHESTRATOR] Verified active records remaining post-verification: ${verifiedRecords.length}`);

  // ── Step 4: Clean Dual-Commit Ingestion ───────────────────────────────────
  if (verifiedRecords.length > 0) {
    console.log(`🛸 [ORCHESTRATOR] Executing clean dual-commit ingestion into schools/${grounded.schoolId}/jobs & featured_jobs_cache...`);
    const ingResult = await runIngestionPipeline(grounded.schoolId, verifiedRecords);
    if (ingResult.acceptedFingerprints.length > 0) {
      await runEnrichmentPipeline(grounded.schoolId, ingResult.acceptedFingerprints);
    }
  }

  // Fetch final active saved jobs from subcollection
  const jobsSnap = await db.collection('schools').doc(grounded.schoolId).collection('jobs').get();
  const scrapedJobsList = jobsSnap.docs.map((doc: any) => doc.data());

  console.log(`🛸 [ORCHESTRATOR] Completed sweep for ${grounded.schoolName}. Committed ${scrapedJobsList.length} verified live vacancies.\n`);

  return {
    scrapedJobsCount: scrapedJobsList.length,
    scrapedJobsList,
  };
}

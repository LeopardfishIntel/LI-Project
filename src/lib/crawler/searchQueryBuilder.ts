/**
 * 🛰️ SEARCH QUERY BUILDER (GOOGLE SEARCH GROUNDING OPTIMIZED)
 * Formats crawler search queries to comply strictly with Google Search Grounding API syntax.
 * Focuses exclusively on direct school websites and verified TES vacancy adverts.
 */

export interface FormattedSiteOperator {
  rawDomain: string;
  rootDomain: string;
  pathKeyword: string | null;
}

/**
 * Extracts root domain and splits any deep paths into quoted keywords.
 * Example: 'tes.com/jobs/vacancy' -> { rootDomain: 'tes.com', pathKeyword: 'jobs/vacancy' }
 */
export function formatSiteOperator(siteInput: string): FormattedSiteOperator {
  const cleanInput = siteInput.replace(/^https?:\/\//, "").replace(/^www\./, "");
  const slashIdx = cleanInput.indexOf("/");

  if (slashIdx === -1) {
    return {
      rawDomain: siteInput,
      rootDomain: cleanInput,
      pathKeyword: null,
    };
  }

  const rootDomain = cleanInput.substring(0, slashIdx);
  const path = cleanInput.substring(slashIdx + 1).replace(/\/$/, "");

  return {
    rawDomain: siteInput,
    rootDomain,
    pathKeyword: path ? path : null,
  };
}

/**
 * Builds a search string combining school name, root domain site operator, and optional path keyword.
 * Example: formatGroundingSiteQuery('Vienna International School', 'tes.com/jobs/vacancy')
 * -> '"Vienna International School" site:tes.com "jobs/vacancy"'
 */
export function formatGroundingSiteQuery(schoolName: string, siteInput: string, additionalKeyword?: string): string {
  const { rootDomain, pathKeyword } = formatSiteOperator(siteInput);
  let query = `"${schoolName}" site:${rootDomain}`;

  if (pathKeyword) {
    query += ` "${pathKeyword}"`;
  }

  if (additionalKeyword) {
    query += ` "${additionalKeyword}"`;
  }

  return query;
}

/**
 * Tier 1: School Web Primary Landing Page queries
 */
export function buildTier1Queries(schoolName: string, schoolDomain: string): string[] {
  const { rootDomain } = formatSiteOperator(schoolDomain);
  return [
    `"${schoolName}" vacancies`,
    `"${schoolName}" career`,
    `"${schoolName}" jobs`,
    `site:${rootDomain} vacancies`,
    `site:${rootDomain} jobs`,
  ];
}

/**
 * Tier 2: Dedicated TES Vacancy & Official School Portal queries
 */
export function buildTier2Queries(
  schoolName: string, 
  options: { aliases?: string[]; tesEmployerSlug?: string; tesOrganizationId?: string } = {}
): string[] {
  const queries: string[] = [];

  // Direct platform ID / slug query if available
  if (options.tesEmployerSlug) {
    queries.push(`site:tes.com "${options.tesEmployerSlug}"`);
  }
  if (options.tesOrganizationId) {
    queries.push(`site:tes.com "${options.tesOrganizationId}"`);
  }

  // Canonical name portal queries (Focused on TES & Guardian Jobs verified adverts)
  queries.push(
    formatGroundingSiteQuery(schoolName, "tes.com/jobs/vacancy"),
    formatGroundingSiteQuery(schoolName, "tes.com/jobs/employer"),
    formatGroundingSiteQuery(schoolName, "jobs.theguardian.com")
  );

  // Alias queries
  const aliases = options.aliases || [];
  for (const alias of aliases) {
    queries.push(
      formatGroundingSiteQuery(alias, "tes.com/jobs/vacancy"),
      formatGroundingSiteQuery(alias, "tes.com/jobs/employer")
    );
  }

  return queries;
}

/**
 * Tier 3 / Subject-Specific Deep Sweep queries
 */
export function buildTier3SubjectQueries(schoolName: string, subjects: string[] = ["Mathematics", "English", "SENCO", "Science", "Physical Education"]): string[] {
  return subjects.map(subject => `"${schoolName}" "${subject}"`);
}

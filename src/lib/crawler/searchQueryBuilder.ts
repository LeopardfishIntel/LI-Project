/**
 * 🛰️ SEARCH QUERY BUILDER (EXACT-MATCH OPTIMIZED)
 *
 * Formats crawler search queries to enforce strict exact-match double-quoting
 * on all school names and site operators, preventing search engine fuzzy
 * broadening and off-target cross-contamination.
 */

export interface FormattedSiteOperator {
  rawDomain: string;
  rootDomain: string;
  pathKeyword: string | null;
}

/**
 * Logs a generated search query for audit precision.
 */
export function logSearchQueryFired(query: string): void {
  console.log(`[SEARCH_QUERY_FIRED] Query: "${query}"`);
}

/**
 * Extracts root domain and splits any deep paths into quoted keywords.
 * Example: "tes.com/jobs/vacancy" -> { rootDomain: "tes.com", pathKeyword: "jobs/vacancy" }
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
 * Builds an exact-match search query string combining double-quoted school name,
 * root domain site operator, and optional path keyword.
 * Example: formatGroundingSiteQuery("K. International School Tokyo", "tes.com/jobs/vacancy")
 * -> '"K. International School Tokyo" site:tes.com "jobs/vacancy"'
 */
export function formatGroundingSiteQuery(schoolName: string, siteInput: string, additionalKeyword?: string): string {
  const { rootDomain, pathKeyword } = formatSiteOperator(siteInput);
  const cleanSchoolName = schoolName.replace(/^["']|["']$/g, "").trim();
  let query = `"\${cleanSchoolName}" site:\${rootDomain}`;

  if (pathKeyword) {
    query += ` "\${pathKeyword}"`;
  }

  if (additionalKeyword) {
    query += ` "\${additionalKeyword}"`;
  }

  logSearchQueryFired(query);
  return query;
}

/**
 * Tier 1: Direct School Website Primary Careers Pages (strictly site-constrained & double-quoted)
 */
export function buildTier1Queries(schoolName: string, schoolDomain: string): string[] {
  const cleanSchoolName = schoolName.replace(/^["']|["']$/g, "").trim();
  const { rootDomain } = formatSiteOperator(schoolDomain);
  const queries = [
    `site:\${rootDomain} "vacancies" OR "jobs" OR "careers"`,
    `site:\${rootDomain} "\${cleanSchoolName}"`,
    `"\${cleanSchoolName}" vacancies`,
    `"\${cleanSchoolName}" jobs`,
  ];
  queries.forEach(q => logSearchQueryFired(q));
  return queries;
}

/**
 * Tier 2: Dedicated Primary Job Boards (TES & Guardian Jobs)
 */
export function buildTier2JobBoardQueries(
  schoolName: string,
  options: { aliases?: string[]; tesEmployerSlug?: string; tesOrganizationId?: string } = {}
): string[] {
  const queries: string[] = [];
  const cleanSchoolName = schoolName.replace(/^["']|["']$/g, "").trim();

  // Direct platform ID / slug query if available
  if (options.tesEmployerSlug) {
    queries.push(`site:tes.com "\${options.tesEmployerSlug}"`);
  }
  if (options.tesOrganizationId) {
    queries.push(`site:tes.com "\${options.tesOrganizationId}"`);
  }

  // Strictly quoted school name job board queries
  queries.push(
    formatGroundingSiteQuery(cleanSchoolName, "tes.com/jobs/vacancy"),
    formatGroundingSiteQuery(cleanSchoolName, "tes.com/jobs/employer"),
    formatGroundingSiteQuery(cleanSchoolName, "jobs.theguardian.com")
  );

  // Alias queries
  const aliases = options.aliases || [];
  for (const alias of aliases) {
    const cleanAlias = alias.replace(/^["']|["']$/g, "").trim();
    if (cleanAlias.length > 2) {
      queries.push(
        formatGroundingSiteQuery(cleanAlias, "tes.com/jobs/vacancy"),
        formatGroundingSiteQuery(cleanAlias, "tes.com/jobs/employer")
      );
    }
  }

  queries.forEach(q => logSearchQueryFired(q));
  return queries;
}

/**
 * Tier 3: Approved School Agents & International Recruitment Consultancies
 */
export function buildTier3SchoolAgentQueries(schoolName: string): string[] {
  const cleanSchoolName = schoolName.replace(/^["']|["']$/g, "").trim();
  return [
    formatGroundingSiteQuery(cleanSchoolName, "edvectus.com"),
    formatGroundingSiteQuery(cleanSchoolName, "schrole.com"),
    formatGroundingSiteQuery(cleanSchoolName, "searchassociates.com"),
    formatGroundingSiteQuery(cleanSchoolName, "teacherhorizons.com"),
    formatGroundingSiteQuery(cleanSchoolName, "iss.edu"),
    formatGroundingSiteQuery(cleanSchoolName, "iscresearch.com")
  ];
}

// Backward compatibility alias
export const buildTier2Queries = buildTier2JobBoardQueries;

/**
 * Tier 4 / Subject-Specific Deep Sweep queries (strictly double-quoted school name)
 */
export function buildTier4SubjectQueries(schoolName: string, subjects: string[] = ["Mathematics", "English", "SENCO", "Science", "Physical Education"]): string[] {
  const cleanSchoolName = schoolName.replace(/^["']|["']$/g, "").trim();
  const queries = subjects.map(subject => `"\${cleanSchoolName}" "\${subject}"`);
  queries.forEach(q => logSearchQueryFired(q));
  return queries;
}
export const buildTier3SubjectQueries = buildTier4SubjectQueries;

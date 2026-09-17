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

export function logSearchQueryFired(query: string): void {
  console.log(`[SEARCH_QUERY_FIRED] Query: \"${query}\"`);
}

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

export function formatGroundingSiteQuery(schoolName: string, siteInput: string, additionalKeyword?: string): string {
  const { rootDomain, pathKeyword } = formatSiteOperator(siteInput);
  const cleanSchoolName = schoolName.replace(/^["\']|["\']$/g, "").trim();
  let query = `\"${cleanSchoolName}\" site:${rootDomain}`;

  if (pathKeyword) {
    query += ` \"${pathKeyword}\"`;
  }

  if (additionalKeyword) {
    query += ` \"${additionalKeyword}\"`;
  }

  logSearchQueryFired(query);
  return query;
}

export function buildTier1Queries(schoolName: string, schoolDomain: string): string[] {
  const cleanSchoolName = schoolName.replace(/^["\']|["\']$/g, "").trim();
  const { rootDomain } = formatSiteOperator(schoolDomain);
  const queries = [
    `\"${cleanSchoolName}\" vacancies`,
    `\"${cleanSchoolName}\" career`,
    `\"${cleanSchoolName}\" jobs`,
    `site:${rootDomain} vacancies`,
    `site:${rootDomain} jobs`,
  ];
  queries.forEach(q => logSearchQueryFired(q));
  return queries;
}

export function buildTier2JobBoardQueries(
  schoolName: string,
  options: {
    aliases?: string[];
    tesEmployerSlug?: string;
    tesOrganizationId?: string;
    city?: string;
    country?: string;
    isPeakHiringSweep?: boolean;
  } = {}
): string[] {
  const queries: string[] = [];
  const cleanSchoolName = schoolName.replace(/^["\']|["\']$/g, "").trim();
  const location = options.city || options.country || "";

  if (options.tesEmployerSlug) {
    queries.push(`site:tes.com \"${options.tesEmployerSlug}\"`);
  }
  if (options.tesOrganizationId) {
    queries.push(`site:tes.com \"${options.tesOrganizationId}\"`);
  }

  queries.push(
    formatGroundingSiteQuery(cleanSchoolName, "tes.com/jobs/vacancy"),
    formatGroundingSiteQuery(cleanSchoolName, "tes.com/jobs/employer"),
    formatGroundingSiteQuery(cleanSchoolName, "schrole.com")
  );

  if (location) {
    queries.push(`\"${cleanSchoolName}\" \"${location}\" site:jobs.theguardian.com`);
  } else {
    queries.push(formatGroundingSiteQuery(cleanSchoolName, "jobs.theguardian.com"));
  }

  if (options.isPeakHiringSweep) {
    queries.push(
      `\"${cleanSchoolName}\" \"Primary\" site:jobs.theguardian.com`,
      `\"${cleanSchoolName}\" \"Secondary\" site:jobs.theguardian.com`
    );
  }

  const aliases = options.aliases || [];
  for (const alias of aliases) {
    const cleanAlias = alias.replace(/^["\']|["\']$/g, "").trim();
    if (cleanAlias.length > 2) {
      queries.push(
        formatGroundingSiteQuery(cleanAlias, "tes.com/jobs/vacancy"),
        formatGroundingSiteQuery(cleanAlias, "tes.com/jobs/employer")
      );
      if (location) {
        queries.push(`\"${cleanAlias}\" \"${location}\" site:jobs.theguardian.com`);
      }
    }
  }

  queries.forEach(q => logSearchQueryFired(q));
  return queries;
}

export function buildTier3SchoolAgentQueries(schoolName: string): string[] {
  const cleanSchoolName = schoolName.replace(/^["\']|["\']$/g, "").trim();
  return [
    formatGroundingSiteQuery(cleanSchoolName, "edvectus.com"),
    formatGroundingSiteQuery(cleanSchoolName, "schrole.com"),
    formatGroundingSiteQuery(cleanSchoolName, "teacherhorizons.com"),
    formatGroundingSiteQuery(cleanSchoolName, "iss.edu"),
    formatGroundingSiteQuery(cleanSchoolName, "iscresearch.com")
  ];
}

export const buildTier2Queries = buildTier2JobBoardQueries;

export function buildTier4SubjectQueries(schoolName: string, subjects: string[] = ["Mathematics", "English", "SENCO", "Science", "Physical Education"]): string[] {
  const cleanSchoolName = schoolName.replace(/^["\']|["\']$/g, "").trim();
  const queries = subjects.map(subject => `\"${cleanSchoolName}\" \"${subject}\"`);
  queries.forEach(q => logSearchQueryFired(q));
  return queries;
}
export const buildTier3SubjectQueries = buildTier4SubjectQueries;

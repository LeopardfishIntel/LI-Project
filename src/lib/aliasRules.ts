/**
 * Alias validation and generic group/brand rule definitions.
 * Plain module without 'use server' so it can be imported by client, server, and crawler scripts.
 */

export const GENERIC_GROUP_BRANDS = new Set([
  'isp', 'tenby', 'cognita', 'nord anglia', 'nordanglia', 'gems', 'gems education',
  'qsi', 'esol', 'taaleem', 'dulwich', 'harrow', 'shrewsbury', 'brighton', 'kellett',
  'tanglin', 'uwc', 'united world college', 'repton', 'malvern', 'nlcs', 'kings',
  'inspire', 'beacon', 'searches', 'search associates', 'schrole', 'tes', 'iss', 'isb'
]);

export interface RejectedAlias {
  alias: string;
  reason: string;
}

export interface AliasValidationResult {
  validAliases: string[];
  rejected: RejectedAlias[];
  error?: string;
}

/**
 * Validates and cleans school aliases.
 * Keeps valid aliases even if some are rejected, and returns a detailed list of rejected aliases with reasons.
 */
export function validateAndCleanAliases(rawAliases: string[] | string | undefined | null): AliasValidationResult {
  if (!rawAliases) {
    return { validAliases: [], rejected: [] };
  }

  const list = typeof rawAliases === 'string'
    ? rawAliases.split(/[,;\n]/).map(a => a.trim().replace(/^["']|["']$/g, '')).filter(Boolean)
    : Array.isArray(rawAliases)
      ? rawAliases.map(a => String(a).trim().replace(/^["']|["']$/g, '')).filter(Boolean)
      : [];

  const validSet = new Set<string>();
  const rejected: RejectedAlias[] = [];

  for (const alias of list) {
    const lower = alias.toLowerCase();
    if (alias.length < 4) {
      rejected.push({
        alias,
        reason: `Alias "${alias}" is under 4 characters (min 4 characters required).`
      });
    } else if (GENERIC_GROUP_BRANDS.has(lower)) {
      rejected.push({
        alias,
        reason: `Alias "${alias}" is a generic group or brand name.`
      });
    } else {
      validSet.add(alias);
    }
  }

  const validAliases = Array.from(validSet);
  const error = rejected.length > 0
    ? `Rejected ${rejected.length} invalid alias(es): ${rejected.map(r => r.reason).join(' ')}`
    : undefined;

  return {
    validAliases,
    rejected,
    error
  };
}

/**
 * Convenience filter returning only the valid aliases.
 */
export function filterSchoolAliases(rawList: string[] | string | undefined | null): string[] {
  return validateAndCleanAliases(rawList).validAliases;
}

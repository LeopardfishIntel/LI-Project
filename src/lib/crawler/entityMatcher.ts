/**
 * 🛰️ SCHOOL ENTITY MATCHER & GEOGRAPHIC DISAMBIGUATION
 * Replaces brittle exact-string matching with fuzzy entity resolution, alias mapping, and city-leak prevention.
 */

export interface SchoolEntity {
  id?: string;
  name: string;
  schoolname?: string;
  city?: string;
  country?: string;
  aliases?: string[];
  tesOrganizationId?: string;
  schroleAccountId?: string;
  tesEmployerSlug?: string;
  isSecondaryOnly?: boolean;
  isPrimaryOnly?: boolean;
}

export interface EntityMatchResult {
  isMatch: boolean;
  score: number;
  matchType: 'platform_id' | 'exact' | 'alias' | 'fuzzy' | 'acronym' | 'none';
  matchedText?: string;
  confidence: 'high' | 'medium' | 'low';
  reason?: string;
}

const COMMON_ABBREVIATIONS: Record<string, string> = {
  "int'l": 'international',
  'intl': 'international',
  'is': 'international school',
  'st.': 'saint',
  'st': 'saint',
  'co-ed': 'coeducational',
  'sch': 'school',
  'acad': 'academy',
  'coll': 'college',
  'univ': 'university',
  'pyp': 'primary years programme',
  'myp': 'middle years programme',
  'dp': 'diploma programme',
  'eyfs': 'early years foundation stage',
  'kg': 'kindergarten',
};

/**
 * Normalizes entity strings for comparison.
 */
export function normalizeEntityString(str: string): string {
  if (!str) return '';
  let normalized = str.toLowerCase().replace(/['"`]/g, '').trim();
  
  // Expand common educational abbreviations
  const tokens = normalized.split(/[^a-z0-9]+/);
  const expandedTokens = tokens.map(t => COMMON_ABBREVIATIONS[t] || t).filter(Boolean);
  return expandedTokens.join(' ');
}

/**
 * Generates an acronym from a school name (e.g., "Vienna International School" -> "VIS").
 */
export function extractAcronym(name: string): string {
  if (!name) return '';
  const clean = name.replace(/['"`]/g, '').trim();
  const words = clean.split(/\s+/).filter(w => !['of', 'the', 'and', '&', 'in', 'at', 'for'].includes(w.toLowerCase()));
  if (words.length <= 1) return '';
  return words.map(w => w[0].toUpperCase()).join('');
}

/**
 * Calculates Jaro-Winkler similarity score (0.0 to 1.0) between two strings.
 */
export function calculateJaroWinkler(s1: string, s2: string): number {
  const str1 = normalizeEntityString(s1);
  const str2 = normalizeEntityString(s2);

  if (str1 === str2) return 1.0;
  if (!str1 || !str2) return 0.0;

  const len1 = str1.length;
  const len2 = str2.length;
  const matchDistance = Math.floor(Math.max(len1, len2) / 2) - 1;

  const str1Matches = new Array(len1).fill(false);
  const str2Matches = new Array(len2).fill(false);

  let matches = 0;
  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, len2);

    for (let j = start; j < end; j++) {
      if (str2Matches[j] || str1[i] !== str2[j]) continue;
      str1Matches[i] = true;
      str2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0.0;

  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!str1Matches[i]) continue;
    while (!str2Matches[k]) k++;
    if (str1[i] !== str2[k]) transpositions++;
    k++;
  }

  const jaro = (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;

  // Winkler prefix scaling (up to 4 chars)
  let prefix = 0;
  for (let i = 0; i < Math.min(4, len1, len2); i++) {
    if (str1[i] === str2[i]) prefix++;
    else break;
  }

  return Math.min(1.0, jaro + prefix * 0.1 * (1 - jaro));
}

/**
 * Calculates Token Set overlap similarity between two strings.
 */
export function calculateTokenSetSimilarity(s1: string, s2: string): number {
  const tokens1 = new Set(normalizeEntityString(s1).split(' '));
  const tokens2 = new Set(normalizeEntityString(s2).split(' '));

  if (tokens1.size === 0 || tokens2.size === 0) return 0;

  let intersection = 0;
  tokens1.forEach(t => {
    if (tokens2.has(t)) intersection++;
  });

  const union = new Set([...tokens1, ...tokens2]).size;
  return union === 0 ? 0 : intersection / union;
}

export interface MatchCandidateOptions {
  candidateText: string;
  sourceUrl?: string;
  candidateCity?: string;
  candidateCountry?: string;
  similarityThreshold?: number; // default 0.85
}

/**
 * Evaluates whether a candidate vacancy snippet/payload matches the target school entity.
 */
export function matchSchoolEntity(
  school: SchoolEntity, 
  options: MatchCandidateOptions
): EntityMatchResult {
  const threshold = options.similarityThreshold ?? 0.85;
  const canonicalName = school.schoolname || school.name;
  const candidate = options.candidateText || '';
  const sourceUrl = options.sourceUrl || '';

  // 1. Direct Platform ID / Slug match in URL (Tier 2 High Confidence)
  if (sourceUrl) {
    if (school.tesEmployerSlug && sourceUrl.toLowerCase().includes(school.tesEmployerSlug.toLowerCase())) {
      return {
        isMatch: true,
        score: 1.0,
        matchType: 'platform_id',
        matchedText: school.tesEmployerSlug,
        confidence: 'high',
        reason: 'Direct TES Employer Slug match in URL'
      };
    }
    if (school.tesOrganizationId && sourceUrl.includes(school.tesOrganizationId)) {
      return {
        isMatch: true,
        score: 1.0,
        matchType: 'platform_id',
        matchedText: school.tesOrganizationId,
        confidence: 'high',
        reason: 'Direct TES Organization ID match in URL'
      };
    }
    if (school.schroleAccountId && sourceUrl.includes(school.schroleAccountId)) {
      return {
        isMatch: true,
        score: 1.0,
        matchType: 'platform_id',
        matchedText: school.schroleAccountId,
        confidence: 'high',
        reason: 'Direct Schrole Account ID match in URL'
      };
    }
  }

  // 2. Exact match against canonical name
  const normCandidate = normalizeEntityString(candidate);
  const normCanonical = normalizeEntityString(canonicalName);

  if (candidate.toLowerCase().includes(canonicalName.toLowerCase()) || normCandidate === normCanonical) {
    return {
      isMatch: true,
      score: 1.0,
      matchType: 'exact',
      matchedText: canonicalName,
      confidence: 'high',
      reason: 'Exact canonical name match'
    };
  }

  // 3. Alias Array match
  const aliases = school.aliases || [];
  for (const alias of aliases) {
    const normAlias = normalizeEntityString(alias);
    if (normCandidate.includes(normAlias) || candidate.toLowerCase().includes(alias.toLowerCase())) {
      return {
        isMatch: true,
        score: 0.98,
        matchType: 'alias',
        matchedText: alias,
        confidence: 'high',
        reason: `Direct match with configured alias "${alias}"`
      };
    }
  }

  if (normCandidate.includes(normCanonical) || normCanonical.includes(normCandidate)) {
    return {
      isMatch: true,
      score: 1.0,
      matchType: 'exact',
      matchedText: canonicalName,
      confidence: 'high',
      reason: 'Exact canonical name match'
    };
  }

  // 4. Acronym Matching (e.g. "VIS" for "Vienna International School")
  const acronym = extractAcronym(canonicalName);
  if (acronym && acronym.length >= 3) {
    const acronymRegex = new RegExp(`\\b${acronym}\\b`, 'i');
    if (acronymRegex.test(candidate)) {
      // Validate geographic context if acronym matches to prevent cross-city false positives
      const cityMatches = school.city && new RegExp(`\\b${school.city}\\b`, 'i').test(candidate);
      const countryMatches = school.country && new RegExp(`\\b${school.country}\\b`, 'i').test(candidate);

      if (cityMatches || countryMatches || !school.city) {
        return {
          isMatch: true,
          score: 0.92,
          matchType: 'acronym',
          matchedText: acronym,
          confidence: 'high',
          reason: `Acronym "${acronym}" matched with verified geographic context`
        };
      }
    }
  }

  // 5. Fuzzy String Similarity (Jaro-Winkler + Token Set)
  const jaroScore = calculateJaroWinkler(canonicalName, candidate);
  const tokenScore = calculateTokenSetSimilarity(canonicalName, candidate);
  const compositeScore = Math.max(jaroScore, (jaroScore * 0.6) + (tokenScore * 0.4));

  if (compositeScore >= threshold) {
    return {
      isMatch: true,
      score: parseFloat(compositeScore.toFixed(3)),
      matchType: 'fuzzy',
      matchedText: canonicalName,
      confidence: compositeScore >= 0.92 ? 'high' : 'medium',
      reason: `Fuzzy similarity score ${compositeScore.toFixed(3)} exceeds threshold ${threshold}`
    };
  }

  // 6. Near-match rejection (prevent city-leak false positives)
  return {
    isMatch: false,
    score: parseFloat(compositeScore.toFixed(3)),
    matchType: 'none',
    confidence: 'low',
    reason: `Similarity score ${compositeScore.toFixed(3)} is below threshold ${threshold}`
  };
}

/**
 * Validates educational phase matching to prevent cross-phase leak (Primary vs Secondary).
 */
export function validatePhaseMatching(
  school: { isSecondaryOnly?: boolean; isPrimaryOnly?: boolean },
  jobTitle: string
): { isPhaseValid: boolean; reason?: string } {
  const lowerTitle = (jobTitle || '').toLowerCase();
  const isPrimaryRole = /\b(primary|prep|early years|eyfs|preschool|kindergarten|ks1|nursery|reception|class teacher)\b/i.test(lowerTitle);
  const isSecondaryRole = /\b(secondary|high school|college|sixth form|middle school|myp|dp|ib dp|ks3|ks4|ks5|gcse|a level)\b/i.test(lowerTitle);

  if (school.isSecondaryOnly && isPrimaryRole && !isSecondaryRole) {
    return {
      isPhaseValid: false,
      reason: 'Rejected primary school vacancy for secondary-only institution'
    };
  }

  if (school.isPrimaryOnly && isSecondaryRole && !isPrimaryRole) {
    return {
      isPhaseValid: false,
      reason: 'Rejected secondary school vacancy for primary-only institution'
    };
  }

  return { isPhaseValid: true };
}

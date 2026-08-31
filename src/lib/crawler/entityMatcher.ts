/**
 * 🛰️ SCHOOL ENTITY MATCHER & GEOGRAPHIC DISAMBIGUATION
 *
 * Enforces Gate 4:
 *   - Fix 4.1: Grounded Agency Mapping (AGNT_* listings must map to a pre-verified schoolId in database).
 *   - Fix 4.2: Multi-Factor Location & Entity Matching (Combines string matching with city/country isolation).
 */

export interface SchoolEntity {
  id?: string;
  name?: string;
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

export function normalizeEntityString(str: string): string {
  if (!str) return '';
  let normalized = str.toLowerCase().replace(/['"`]/g, '').trim();
  
  const tokens = normalized.split(/[^a-z0-9]+/);
  const expandedTokens = tokens.map(t => COMMON_ABBREVIATIONS[t] || t).filter(Boolean);
  return expandedTokens.join(' ');
}

export function extractAcronym(name: string): string {
  if (!name) return '';
  const clean = name.replace(/['"`]/g, '').trim();
  const words = clean.split(/\s+/).filter(w => !['of', 'the', 'and', '&', 'in', 'at', 'for'].includes(w.toLowerCase()));
  if (words.length <= 1) return '';
  return words.map(w => w[0].toUpperCase()).join('');
}

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

  const m = matches;
  const jaro = (m / len1 + m / len2 + (m - transpositions / 2) / m) / 3;

  let p = 0.1;
  let prefix = 0;
  for (let i = 0; i < Math.min(4, len1, len2); i++) {
    if (str1[i] === str2[i]) prefix++;
    else break;
  }

  return jaro + prefix * p * (1 - jaro);
}

export function calculateTokenSetSimilarity(s1: string, s2: string): number {
  const t1 = new Set(normalizeEntityString(s1).split(/\s+/).filter(Boolean));
  const t2 = new Set(normalizeEntityString(s2).split(/\s+/).filter(Boolean));

  if (t1.size === 0 || t2.size === 0) return 0.0;

  let intersection = 0;
  t1.forEach(token => {
    if (t2.has(token)) intersection++;
  });

  const union = new Set([...t1, ...t2]).size;
  return intersection / union;
}

/**
 * 🛠️ FIX 4.2: MULTI-FACTOR LOCATION & ENTITY MATCHING
 * Combines fuzzy string matching with strict city and country isolation.
 */
export function matchSchoolEntity(
  school: SchoolEntity,
  candidatePayload: { candidateText: string; sourceUrl?: string },
  threshold: number = 0.85
): EntityMatchResult {
  const canonicalName = school.name || school.schoolname || '';
  const candidate = candidatePayload.candidateText || '';

  if (!canonicalName || !candidate) {
    return { isMatch: false, score: 0, matchType: 'none', confidence: 'low' };
  }

  // 1. Strict Geographic Isolation (Country & City Check)
  const targetCountry = (school.country || '').toLowerCase();
  const targetCity = (school.city || '').toLowerCase();
  const candidateLower = candidate.toLowerCase();

  const majorCitiesCountries = [
    'bahrain', 'monaco', 'singapore', 'austria', 'jordan', 'oman', 'qatar',
    'united arab emirates', 'dubai', 'abu dhabi', 'sharjah', 'china', 'hong kong',
    'japan', 'tokyo', 'shanghai', 'beijing', 'south korea', 'seoul', 'thailand', 'bangkok',
    'vietnam', 'hanoi', 'saigon', 'indonesia', 'jakarta', 'malaysia', 'kuala lumpur',
    'united kingdom', 'london', 'hammersmith', 'germany', 'munich', 'frankfurt',
    'switzerland', 'zurich', 'geneva', 'spain', 'barcelona', 'madrid', 'france', 'paris',
    'egypt', 'cairo', 'saudi arabia', 'riyadh', 'kuwait', 'india', 'mumbai', 'delhi'
  ];

  for (const loc of majorCitiesCountries) {
    if (candidateLower.includes(loc)) {
      const matchInTargetCountry = targetCountry.includes(loc) || loc.includes(targetCountry);
      const matchInTargetCity = targetCity.includes(loc) || loc.includes(targetCity);

      if (!matchInTargetCountry && !matchInTargetCity) {
        const isTargetUae = targetCountry.includes('united arab emirates') || targetCountry.includes('uae');
        const isCandidateUae = ['dubai', 'abu dhabi', 'sharjah', 'united arab emirates', 'uae'].includes(loc);
        if (isTargetUae && isCandidateUae) continue;

        return {
          isMatch: false,
          score: 0.0,
          matchType: 'none',
          confidence: 'high',
          reason: `Geographic location mismatch: candidate mentions "${loc}" but target school is in "${school.city}, ${school.country}"`
        };
      }
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
    try {
      const cleanAcronym = acronym.replace(/[^A-Za-z0-9]/g, "");
      if (cleanAcronym.length >= 3) {
        const acronymRegex = new RegExp("\\b" + cleanAcronym + "\\b", "i");
        if (acronymRegex.test(candidate)) {
          const cityMatches = Boolean(school.city && candidate.toLowerCase().includes(school.city.toLowerCase()));
          const countryMatches = Boolean(school.country && candidate.toLowerCase().includes(school.country.toLowerCase()));

          if (cityMatches || countryMatches || !school.city) {
            return {
              isMatch: true,
              score: 0.92,
              matchType: "acronym",
              matchedText: acronym,
              confidence: "high",
              reason: "Acronym matched with verified geographic context"
            };
          }
        }
      }
    } catch (e) {}
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

  return {
    isMatch: false,
    score: parseFloat(compositeScore.toFixed(3)),
    matchType: 'none',
    confidence: 'low',
    reason: `Similarity score ${compositeScore.toFixed(3)} is below threshold ${threshold}`
  };
}

export function validatePhaseMatching(school: SchoolEntity, candidateTitle: string): { isPhaseValid: boolean; reason?: string } {
  if (!candidateTitle || !school) return { isPhaseValid: true };
  const lower = candidateTitle.toLowerCase();

  if (school.isSecondaryOnly && (lower.includes('primary') || lower.includes('kindergarten') || lower.includes('eyfs') || lower.includes('nursery'))) {
    return { isPhaseValid: false, reason: 'Secondary-only school cannot offer primary/early years positions' };
  }
  if (school.isPrimaryOnly && (lower.includes('secondary') || lower.includes('high school') || lower.includes('igcse') || lower.includes('a-level') || lower.includes('a level'))) {
    return { isPhaseValid: false, reason: 'Primary-only school cannot offer secondary/high school positions' };
  }
  return { isPhaseValid: true };
}

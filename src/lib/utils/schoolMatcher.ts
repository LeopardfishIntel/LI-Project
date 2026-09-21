import { SCHOOLS, SchoolData } from '@/data/schools';
import rawGlobalSchools from '@/data/global_schools_registry.json';

export interface MatchResult {
  isExactMatch: boolean;
  isVerifiable: boolean;
  canonicalName: string;
  city: string;
  country: string;
  location: string;
  curriculum?: string;
  message: string;
  schoolId?: string;
  suggestions: SchoolData[];
}

const COMMON_STOPWORDS = new Set(['the', 'of', 'in', 'and', '&', 'at', 'for', 'a', 'an']);
const INSTITUTION_KEYWORDS = [
  'school', 'academy', 'college', 'lycée', 'lycee', 'schule', 'gymnasium', 
  'institute', 'trust', 'internacional', 'collegiate', 'prep', 'foundation', 
  'center', 'centre', 'seminary', 'kindergarten', 'schulen'
];

const normalizeCountry = (country: string): string => {
  const c = country?.trim() || '';
  if (c.toUpperCase() === 'UAE' || c.toLowerCase() === 'united arab emirates') {
    return 'United Arab Emirates';
  }
  return c;
};

// Convert global registry entries to SchoolData interface
const GLOBAL_SCHOOLS: SchoolData[] = (rawGlobalSchools as Array<{ name: string; city: string; country: string; curriculum?: string }>).map((s, idx) => ({
  id: `global_${idx}`,
  name: s.name,
  city: s.city,
  country: normalizeCountry(s.country),
  curriculum: s.curriculum || 'IB / International'
}));

// Pre-index cities for fast word-level extraction
const CITY_LOOKUP = new Map<string, { city: string; country: string }>();

// 1. Index from SCHOOLS database
for (const s of SCHOOLS) {
  if (s.city && s.city.trim()) {
    const key = s.city.trim().toLowerCase();
    if (!CITY_LOOKUP.has(key)) {
      CITY_LOOKUP.set(key, {
        city: s.city.trim(),
        country: normalizeCountry(s.country?.trim() || '')
      });
    }
  }
}

// 2. Index from GLOBAL_SCHOOLS database
for (const s of GLOBAL_SCHOOLS) {
  if (s.city && s.city.trim()) {
    const key = s.city.trim().toLowerCase();
    if (!CITY_LOOKUP.has(key)) {
      CITY_LOOKUP.set(key, {
        city: s.city.trim(),
        country: normalizeCountry(s.country?.trim() || '')
      });
    }
  }
}

/**
 * Helper to auto-extract city/country from a school name (e.g. "BASIS Prague" -> "Prague, Czechia")
 */
function extractCityFromText(text: string): { city: string; country: string; location: string } | null {
  const cleanTokens = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 3 && !COMMON_STOPWORDS.has(t));

  for (const token of cleanTokens) {
    if (CITY_LOOKUP.has(token)) {
      const matched = CITY_LOOKUP.get(token)!;
      const loc = [matched.city, matched.country].filter(Boolean).join(', ');
      return {
        city: matched.city,
        country: matched.country,
        location: loc
      };
    }
  }

  // Check multi-word cities (e.g. "abu dhabi", "ho chi minh", "hong kong", "san francisco")
  const lowerText = text.toLowerCase();
  for (const [key, data] of CITY_LOOKUP.entries()) {
    if (key.includes(' ') && lowerText.includes(key)) {
      const loc = [data.city, data.country].filter(Boolean).join(', ');
      return {
        city: data.city,
        country: data.country,
        location: loc
      };
    }
  }

  return null;
}

/**
 * ⚡ INSTANT 0MS MATCHER ACROSS CORE 492 SCHOOLS & 10,000+ GLOBAL REGISTRY
 * Strict word prefix matching prevents false positives (e.g. 'basis' vs 'basel').
 * Automatically filters out legacy truncated/shortened abbreviations (e.g. 'British Milan' -> 'The British School of Milan').
 */
export function matchInternationalSchool(userInput: string, existingCity = ''): MatchResult {
  const query = userInput.trim().toLowerCase();
  if (!query || query.length < 2) {
    return {
      isExactMatch: false,
      isVerifiable: false,
      canonicalName: userInput,
      city: '',
      country: '',
      location: '',
      message: '',
      suggestions: []
    };
  }

  // 1. Obvious spam filter
  const obviousSpam = ['asdf', 'test', 'fake', 'none', 'n/a', 'cool', '123', 'qwerty', 'my school', 'school', 'home'];
  if (obviousSpam.includes(query)) {
    return {
      isExactMatch: false,
      isVerifiable: false,
      canonicalName: userInput,
      city: '',
      country: '',
      location: '',
      message: '✕ Please enter a genuine international school name.',
      suggestions: []
    };
  }

  const queryTokens = query
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 0 && !COMMON_STOPWORDS.has(t));

  const rawSuggestions: SchoolData[] = [];
  const seenNames = new Set<string>();
  let exactMatch: SchoolData | null = null;

  // Search Priority 1: Core 492 FLIS schools
  for (const s of SCHOOLS) {
    const sName = (s.name || '').toLowerCase();
    const sCity = (s.city || '').toLowerCase();
    const sCountry = (s.country || '').toLowerCase();
    const countryAliases = (sCountry.includes('united arab emirates') || sCountry === 'uae') ? 'uae emirates dubai abu dhabi sharjah' : '';
    
    const schoolWords = `${sName} ${sCity} ${sCountry} ${countryAliases}`
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 0 && !COMMON_STOPWORDS.has(w));

    if (sName === query) {
      exactMatch = s;
      if (!seenNames.has(s.name.toLowerCase())) {
        rawSuggestions.unshift(s);
        seenNames.add(s.name.toLowerCase());
      }
      continue;
    }

    const matchesAllTokens = queryTokens.length > 0 && queryTokens.every(token => 
      schoolWords.some(word => word.startsWith(token) || (token.length >= 4 && word.includes(token)))
    );

    if (matchesAllTokens && !seenNames.has(s.name.toLowerCase())) {
      rawSuggestions.push(s);
      seenNames.add(s.name.toLowerCase());
      if (rawSuggestions.length >= 12) break;
    }
  }

  // Search Priority 2: Standalone Global 10,000+ Registry
  if (rawSuggestions.length < 12) {
    for (const s of GLOBAL_SCHOOLS) {
      const sName = (s.name || '').toLowerCase();
      const sCity = (s.city || '').toLowerCase();
      const sCountry = (s.country || '').toLowerCase();
      const countryAliases = (sCountry.includes('united arab emirates') || sCountry === 'uae') ? 'uae emirates dubai abu dhabi sharjah' : '';

      if (sName === query && !exactMatch) {
        exactMatch = s;
        if (!seenNames.has(s.name.toLowerCase())) {
          rawSuggestions.unshift(s);
          seenNames.add(s.name.toLowerCase());
        }
        continue;
      }

      if (seenNames.has(s.name.toLowerCase())) continue;

      const schoolWords = `${sName} ${sCity} ${sCountry} ${countryAliases}`
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 0 && !COMMON_STOPWORDS.has(w));

      const matchesAllTokens = queryTokens.length > 0 && queryTokens.every(token => 
        schoolWords.some(word => word.startsWith(token) || (token.length >= 4 && word.includes(token)))
      );

      if (matchesAllTokens) {
        rawSuggestions.push(s);
        seenNames.add(s.name.toLowerCase());
        if (rawSuggestions.length >= 12) break;
      }
    }
  }

  // 🧹 Filter out truncated / shortened nicknames when full formal versions exist
  const suggestions = rawSuggestions.filter(s => {
    const sLower = s.name.toLowerCase().trim();
    const hasInstKeyword = INSTITUTION_KEYWORDS.some(kw => sLower.includes(kw));
    
    // If the name lacks formal institution keywords (e.g. 'British Milan' or 'IS Prague')
    if (!hasInstKeyword) {
      const sTokens = sLower.replace(/[^\w\s]/g, ' ').split(/\s+/).filter(t => t.length > 1 && !COMMON_STOPWORDS.has(t));
      const hasBetterAlternative = rawSuggestions.some(other => {
        if (other === s) return false;
        const otherLower = other.name.toLowerCase().trim();
        const hasAllTokens = sTokens.every(t => otherLower.includes(t));
        return otherLower.length > sLower.length && hasAllTokens && INSTITUTION_KEYWORDS.some(kw => otherLower.includes(kw));
      });
      if (hasBetterAlternative) return false;
    }
    return true;
  });

  // 1. If user typed the exact full name of a verified school
  if (exactMatch) {
    const loc = [exactMatch.city, exactMatch.country].filter(Boolean).join(', ');
    return {
      isExactMatch: true,
      isVerifiable: true,
      canonicalName: exactMatch.name,
      city: exactMatch.city || '',
      country: exactMatch.country || '',
      location: loc,
      curriculum: exactMatch.curriculum || 'IB / CIS',
      message: `✓ Confirmed: ${exactMatch.name} (${loc})`,
      schoolId: exactMatch.id,
      suggestions: suggestions.slice(0, 6)
    };
  }

  // 2. If suggestions exist, prompt user to select from dropdown
  if (suggestions.length > 0) {
    const count = suggestions.length;
    return {
      isExactMatch: false,
      isVerifiable: true,
      canonicalName: userInput,
      city: suggestions[0]?.city || '',
      country: suggestions[0]?.country || '',
      location: [suggestions[0]?.city, suggestions[0]?.country].filter(Boolean).join(', '),
      message: `👉 ${count} matching verified school${count > 1 ? 's' : ''} found — select an option or keep typing:`,
      suggestions: suggestions.slice(0, 6)
    };
  }

  // 3. Auto-detect city from input (e.g. "BASIS Prague" -> Prague, Czechia)
  const extractedCity = extractCityFromText(userInput);

  // 4. Not in database yet -> New school registration
  const intlKeywords = [
    'international', 'british', 'american', 'academy', 'college', 'grammar', 
    'lycée', 'lycee', 'schule', 'bilingual', 'world school', 'st.', 'saint',
    'prep', 'cambridge', 'ib', 'anglo', 'school', 'basis', 'collegiate',
    'nord anglia', 'dulwich', 'harrow', 'shrewsbury', 'wellington', 'tas', 'asf'
  ];
  
  const hasIntlKeyword = intlKeywords.some(kw => query.includes(kw)) || Boolean(extractedCity) || query.length >= 8;

  if (hasIntlKeyword) {
    const resolvedCity = extractedCity?.city || existingCity;
    const resolvedCountry = extractedCity?.country || '';
    const resolvedLocation = extractedCity?.location || existingCity;

    return {
      isExactMatch: false,
      isVerifiable: true,
      canonicalName: userInput.trim(),
      city: resolvedCity,
      country: resolvedCountry,
      location: resolvedLocation,
      message: `📌 New School: Please confirm City & Country to add to our verified registry.`,
      suggestions: []
    };
  }

  return {
    isExactMatch: false,
    isVerifiable: false,
    canonicalName: userInput,
    city: '',
    country: '',
    location: '',
    message: '✕ Please enter an international or private K-12 school.',
    suggestions: []
  };
}

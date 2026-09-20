import cityCurriculumData from './cityCurriculumData.json';

export interface CityCurriculumValidation {
  isKnownCity: boolean;
  isMismatch: boolean;
  cityName?: string;
  availableFrameworks: string[];
  rawCurricula: string[];
  note?: string;
}

const CITY_DATABASE: Record<string, { name: string; rawCurricula: string[]; frameworks: string[] }> = cityCurriculumData as any;

/**
 * Validates whether a selected curriculum framework matches the verified schools in the given city.
 */
export function verifyCityCurriculum(cityRaw: string, curriculumKey: string): CityCurriculumValidation {
  const query = cityRaw.toLowerCase().trim();
  if (!query) {
    return {
      isKnownCity: false,
      isMismatch: false,
      availableFrameworks: [],
      rawCurricula: []
    };
  }

  // Exact or partial city matching
  let matchedCityKey = Object.keys(CITY_DATABASE).find(k => k === query || k.includes(query) || query.includes(k));

  if (!matchedCityKey) {
    return {
      isKnownCity: false,
      isMismatch: false,
      availableFrameworks: [],
      rawCurricula: []
    };
  }

  const cityData = CITY_DATABASE[matchedCityKey];
  const frameworks = cityData.frameworks || [];
  const rawList = cityData.rawCurricula || [];

  // Check if selected curriculum is supported in this city
  const isMatch = frameworks.includes(curriculumKey);

  if (!isMatch && frameworks.length > 0) {
    const frameworkLabels: Record<string, string> = {
      ib: "IB",
      british: "British (IGCSE / A-Levels)",
      american: "American (AP / Common Core)",
      australian: "Australian",
      tefl: "TEFL / Language"
    };

    const availableNames = frameworks.map(f => frameworkLabels[f] || f.toUpperCase()).join(", ");
    const chosenName = frameworkLabels[curriculumKey] || curriculumKey.toUpperCase();

    return {
      isKnownCity: true,
      isMismatch: true,
      cityName: cityData.name,
      availableFrameworks: frameworks,
      rawCurricula: rawList,
      note: `International schools in ${cityData.name} predominantly offer ${availableNames}. As you selected ${chosenName}, please confirm your specific school below.`
    };
  }

  return {
    isKnownCity: true,
    isMismatch: false,
    cityName: cityData.name,
    availableFrameworks: frameworks,
    rawCurricula: rawList
  };
}

export const KNOWN_CITIES = Object.values(CITY_DATABASE).map(c => c.name).sort();

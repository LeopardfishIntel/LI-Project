/**
 * Inflation figures sourced from the IMF CPI database (monthly, year-on-year).
 * Stored by the monthly cron in Firestore at system/inflation_rates.
 */

export interface InflationEntry {
  rate: number;   // year-on-year %, e.g. 2.8
  period: string; // 'YYYY-MM' the figure covers
}

export interface InflationTable {
  lastUpdated?: string;
  byIso3?: Record<string, InflationEntry>;
}

/** Figures older than this are shown as "not reported". */
export const INFLATION_MAX_AGE_MONTHS = 12;

/** Country name (lowercase, as used on school records) -> IMF ISO3 code. */
export const COUNTRY_TO_ISO3: Record<string, string> = {
  'hong kong': 'HKG', 'hong kong sar': 'HKG', 'japan': 'JPN', 'singapore': 'SGP', 'jordan': 'JOR',
  'china': 'CHN', 'india': 'IND', 'azerbaijan': 'AZE', 'qatar': 'QAT', 'united arab emirates': 'ARE',
  'uae': 'ARE', 'czechia': 'CZE', 'czech republic': 'CZE', 'france': 'FRA', 'greece': 'GRC',
  'monaco': 'FRA', 'italy': 'ITA', 'oman': 'OMN', 'switzerland': 'CHE', 'bahrain': 'BHR',
  'germany': 'DEU', 'spain': 'ESP', 'portugal': 'PRT', 'belgium': 'BEL', 'netherlands': 'NLD',
  'austria': 'AUT', 'denmark': 'DNK', 'norway': 'NOR', 'hungary': 'HUN', 'saudi arabia': 'SAU',
  'kuwait': 'KWT', 'egypt': 'EGY', 'kenya': 'KEN', 'south africa': 'ZAF', 'vietnam': 'VNM',
  'malaysia': 'MYS', 'thailand': 'THA', 'indonesia': 'IDN', 'philippines': 'PHL', 'south korea': 'KOR',
  'poland': 'POL', 'romania': 'ROU', 'finland': 'FIN', 'sweden': 'SWE', 'uk': 'GBR',
  'united kingdom': 'GBR', 'luxembourg': 'LUX', 'brazil': 'BRA', 'argentina': 'ARG', 'peru': 'PER',
  'costa rica': 'CRI', 'cyprus': 'CYP', 'tanzania': 'TZA', 'bulgaria': 'BGR', 'taiwan': 'TWN',
  'serbia': 'SRB', 'slovakia': 'SVK', 'latvia': 'LVA', 'mexico': 'MEX', 'kazakhstan': 'KAZ',
  'colombia': 'COL', 'turkey': 'TUR', 'lebanon': 'LBN', 'uzbekistan': 'UZB', 'brunei': 'BRN',
  'chile': 'CHL', 'uruguay': 'URY', 'venezuela': 'VEN', 'georgia': 'GEO', 'nigeria': 'NGA',
  'united states': 'USA', 'usa': 'USA', 'ireland': 'IRL', 'malta': 'MLT', 'croatia': 'HRV',
  'lithuania': 'LTU', 'estonia': 'EST', 'slovenia': 'SVN', 'new zealand': 'NZL', 'australia': 'AUS',
  'canada': 'CAN', 'cambodia': 'KHM', 'nepal': 'NPL', 'sri lanka': 'LKA', 'morocco': 'MAR',
  'ghana': 'GHA', 'ethiopia': 'ETH', 'panama': 'PAN', 'ecuador': 'ECU',
};

export const ALL_ISO3 = Array.from(new Set(Object.values(COUNTRY_TO_ISO3)));

/**
 * Returns e.g. "2.8%" for a country, or "not reported" when we have no
 * figure or the latest one is older than 12 months.
 */
export function formatInflation(country: any, table?: InflationTable | null, now: Date = new Date()): string {
  const name = String(typeof country === 'string' ? country : (country?.country || '')).toLowerCase().trim();
  const iso = COUNTRY_TO_ISO3[name];
  const entry = iso ? table?.byIso3?.[iso] : undefined;
  if (!entry || typeof entry.rate !== 'number' || !/^\d{4}-\d{2}$/.test(entry.period || '')) return 'not reported';

  const [y, m] = entry.period.split('-').map(Number);
  const ageMonths = (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m);
  if (ageMonths > INFLATION_MAX_AGE_MONTHS) return 'not reported';

  return `${entry.rate.toFixed(1)}%`;
}

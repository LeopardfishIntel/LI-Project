import rawSchools from '../../complete_school_fields_export.json';

export interface SchoolData {
  id: string;
  name: string;
  city: string;
  country: string;
  curriculum: string;
  salaryRange?: string;
  summary?: string;
  financescore?: string;
  totalscore?: string;
  housingprovision?: string;
  healthcoverage?: string;
}

const normalizeCountry = (country: string): string => {
  const c = country?.trim() || '';
  if (c.toUpperCase() === 'UAE' || c.toLowerCase() === 'united arab emirates') {
    return 'United Arab Emirates';
  }
  return c;
};

const normalizeCurriculum = (raw: any): string => {
  if (!raw) return 'IB / K-12';
  if (Array.isArray(raw)) return raw.filter(Boolean).join(' / ');
  if (typeof raw === 'string') return raw;
  return String(raw);
};

export const SCHOOLS: SchoolData[] = (rawSchools as any[])
  .filter((s) => Boolean(s.id))
  .map((s) => ({
    id: String(s.id),
    name: String(s.name || s.schoolname || s.schoolName || 'International School'),
    city: String(s.city || ''),
    country: normalizeCountry(String(s.country || '')),
    curriculum: normalizeCurriculum(s.curriculum || s.intel?.curriculum),
    salaryRange: s.salaryRange || s.salary_range || undefined,
    summary: s.summary || undefined,
    financescore: s.financescore || undefined,
    totalscore: s.totalscore || undefined,
    housingprovision: s.housingprovision || undefined,
    healthcoverage: s.healthcoverage || undefined,
  }));

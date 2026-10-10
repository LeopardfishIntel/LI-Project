export function getAcademicYear(
  date: Date,
  country?: string
): { label: string; startYear: number } {
  const normalizedCountry = country ? country.trim().toLowerCase() : '';

  let startMonth: number;
  switch (normalizedCountry) {
    case 'brazil':
    case 'argentina':
    case 'south africa':
    case 'chile':
      startMonth = 1;
      break;
    case 'south korea':
      startMonth = 3;
      break;
    case 'japan':
    case 'india':
      startMonth = 4;
      break;
    default:
      startMonth = 9;
      break;
  }

  const utcYear = date.getUTCFullYear();
  const utcMonth = date.getUTCMonth() + 1;

  if (startMonth === 1) {
    const startYear = utcYear;
    return {
      label: String(startYear),
      startYear,
    };
  }

  const startYear = utcMonth >= startMonth ? utcYear : utcYear - 1;
  const nextYearTwoDigits = String(startYear + 1).slice(-2);

  return {
    label: `${startYear}/${nextYearTwoDigits}`,
    startYear,
  };
}

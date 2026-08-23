/**
 * 🛰️ ROLE CLASSIFIER & ACADEMIC TEACHING FILTER
 * Filters out non-teaching operational, administrative, medical, and facility support roles.
 */

const NON_TEACHING_SUPPORT_PATTERNS: RegExp[] = [
  // Medical / Nursing
  /\b(nurse|nursing|clinic|doctor)\b/i,
  
  // Admissions / Marketing / PR
  /\badmission(s)?\b.*\b(officer|executive|assistant|associate|coordinator|lead|manager|specialist)\b/i,
  /\b(executive|assistant|officer)\b.*\badmission(s)?\b/i,
  /\bmarketing\b.*\b(officer|executive|assistant|associate|coordinator|lead|manager|specialist)\b/i,
  /\bcommunications\b.*\b(officer|executive|assistant|associate|coordinator)\b/i,
  /\bpublic\s+relations\b/i,
  
  // Administration / Secretarial / Office
  /\badmin(istrative)?\b.*\b(exec|executive|assistant|officer|associate|clerk|coordinator)\b/i,
  /\boffice\b.*\b(administrator|manager|assistant|clerk|executive)\b/i,
  /\breceptionist\b/i,
  /\bsecretary\b/i,
  /\bclerk\b/i,
  /\bdata\s+entry\b/i,
  
  // HR / Finance / Operations
  /\b(hr|human\s+resources)\b.*\b(officer|executive|assistant|associate|coordinator|manager)\b/i,
  /\b(finance|accounting|accounts|payroll|bursar)\b.*\b(officer|executive|assistant|associate|clerk|manager)\b/i,
  /\boperations\b.*\b(officer|executive|assistant|associate|coordinator)\b/i,
  
  // IT Technician / Facilities / Transport / Security
  /\b(it|ict)\s+(technician|support|helpdesk|administrator|network\s+engineer)\b/i,
  /\b(bus\s+)?driver\b/i,
  /\bsecurity\s+(guard|officer)\b/i,
  /\bguard\b/i,
  /\bcleaner\b/i,
  /\bcaretaker\b/i,
  /\bjanitor\b/i,
  /\bmaintenance\b.*\b(technician|worker|assistant|officer|staff)\b/i,
  /\bgardener\b/i,
  
  // Sports-only auxiliary (non-teaching)
  /\b(swimming|football|basketball|tennis)\s+coach\b/i,
  /\blifeguard\b/i
];

/**
 * Returns true if a job title represents a non-academic/support role that should be excluded.
 */
export function isSupportOrNonTeachingRole(title: string | null | undefined): boolean {
  if (!title) return false;
  const cleanTitle = title.trim();
  return NON_TEACHING_SUPPORT_PATTERNS.some(pattern => pattern.test(cleanTitle));
}

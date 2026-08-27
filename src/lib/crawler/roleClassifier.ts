/**
 * 🛰️ ROLE CLASSIFIER & ACADEMIC TEACHING FILTER
 * Filters out non-teaching operational, administrative, medical, executive corporate, and facility support roles.
 */

const NON_TEACHING_SUPPORT_PATTERNS: RegExp[] = [
  // Medical / Nursing
  /\b(nurse|nursing|clinic|doctor)\b/i,
  
  // Executive / Corporate Leadership (Non-Academic)
  /\b(cfo|chief\s+financial\s+officer|coo|chief\s+operating\s+officer|cio|chief\s+information\s+officer|chief\s+commercial\s+officer)\b/i,
  /\b(financial\s+analyst|business\s+analyst|data\s+analyst|systems?\s+analyst)\b/i,
  
  // Finance / Accounting / Bursary / Audit
  /\b(finance|financial|accounting|accounts|payroll|bursar|bursary|treasury|auditor?)\b.*\b(officer|executive|assistant|associate|clerk|manager|controller|director|lead|analyst)\b/i,
  /\b(director|head|lead|manager|officer|executive|assistant|clerk)\b.*\b(finance|financial|accounting|accounts|payroll|bursary)\b/i,
  
  // Admissions / Marketing / PR
  /\badmission(s)?\b.*\b(officer|executive|assistant|associate|coordinator|lead|manager|specialist|director|head)\b/i,
  /\b(executive|assistant|officer|director|head|manager)\b.*\badmission(s)?\b/i,
  /\bmarketing\b.*\b(officer|executive|assistant|associate|coordinator|lead|manager|specialist|director|head)\b/i,
  /\bcommunications\b.*\b(officer|executive|assistant|associate|coordinator|director|head|manager)\b/i,
  /\bpublic\s+relations\b/i,
  
  // Administration / Secretarial / Office / Housekeeping
  /\badmin(istrative)?\b.*\b(exec|executive|assistant|officer|associate|clerk|coordinator|manager)\b/i,
  /\boffice\b.*\b(administrator|manager|assistant|clerk|executive)\b/i,
  /\b(housekeeping|hospitality)\b.*\b(manager|supervisor|staff|assistant)\b/i,
  /\breceptionist\b/i,
  /\bsecretary\b/i,
  /\bclerk\b/i,
  /\bdata\s+entry\b/i,
  
  // HR / Operations
  /\b(hr|human\s+resources)\b.*\b(officer|executive|assistant|associate|coordinator|manager|director|lead)\b/i,
  /\boperations\b.*\b(officer|executive|assistant|associate|coordinator|manager|director|lead)\b/i,
  
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
  
  // Development / Alumni / Fundraising
  /\b(director|manager|lead|officer)\s+of\s+development\b/i,
  /\bdevelopment\s+(director|manager|officer|associate|lead)\b/i,
  /\balumni\b.*\b(officer|coordinator|director|manager|relations)\b/i,
  /\bfundraising\b/i,

  // Cover Supervisors & Auxiliary Classroom Aides / Assistants
  /\bcover\s+supervisor\b/i,
  /\b(teaching|learning|classroom|educational|specialist|1:1|preschool)\s+assistant\b/i,
  /\bassistant\s+teacher\b/i,
  /\bpersonal\s+assistant\b/i,
  /\bpa\s+to\b/i,
  
  // Clinical / Auxiliary Therapists
  /\b(speech|language|occupational|physical)\s+therapist\b/i,

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
  
  // Whitelist explicit academic leadership & classroom teacher exceptions that might have conflicting words
  if (/\b(head\s+of\s+(school|secondary|primary|academics|curriculum|department|sixth\s+form|lower|middle|upper|eyfs|ks[1-5]|early\s+years))\b/i.test(cleanTitle)) {
    return false;
  }
  if (/\b(principal|vice\s+principal|assistant\s+principal|deputy\s+head|director\s+of\s+studies|academic\s+director)\b/i.test(cleanTitle)) {
    return false;
  }
  if (/\b(teacher|educator|instructor|lecturer|professor|faculty)\b/i.test(cleanTitle) && !/\b(assistant\s+teacher|teaching\s+assistant)\b/i.test(cleanTitle)) {
    return false;
  }

  return NON_TEACHING_SUPPORT_PATTERNS.some(pattern => pattern.test(cleanTitle));
}

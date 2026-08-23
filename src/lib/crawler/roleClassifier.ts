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
  
  // Explicit safeguard: Never exclude Academic Teachers or Academic Heads even if they teach Economics / Business / Accounting
  if (/\b(teacher|educator|instructor|lecturer|professor|faculty|head\s+of\s+department|hod|principal|head\s+of\s+school|headteacher|senco)\b/i.test(cleanTitle) &&
      !/\b(assistant\s+teacher|teaching\s+assistant|substitute|admissions|secretary|receptionist|nurse|driver|cleaner)\b/i.test(cleanTitle)) {
    // If it is explicitly a Teacher of Business/Economics/Accounting, allow it
    if (/\bteacher\b/i.test(cleanTitle)) return false;
  }

  return NON_TEACHING_SUPPORT_PATTERNS.some(pattern => pattern.test(cleanTitle));
}

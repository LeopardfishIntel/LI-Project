/**
 * 🛰️ ROLE CLASSIFIER & K-12 ACADEMIC TEACHING FILTER
 *
 * Enforces strict Gate 2 role classification:
 *   - Fix 2.1: Enforce K-12 Academic Roles (Early Years, Primary, Secondary, Subject Specialists, Leadership)
 *   - Fix 2.2: Block Non-K-12 Institutions (University Faculty, Commercial Tutoring, Adult ESL, Corporate Training)
 *   - Blocks Teaching Assistants (TA), Relief/Supply/Substitute Teachers, PTA, support staff & non-job titles.
 */

const NON_TEACHING_SUPPORT_PATTERNS: RegExp[] = [
  // Procurement / Facilities / Health & Safety / Corporate Analytics / Leadership Development
  /\b(procurement|facilities|facility|safety|health\s*&\s*safety|analytics|insights|leadership\s+development|community\s+service)\b/i,
  
  // House Parent / Residential / Boarding Staff
  /\b(house\s+parent|boarding\s+parent|residence\s+staff|residential\s+assistant)\b/i,

  // Medical / Nursing (Multilingual)
  /\b(enfermera|nurse|nursing|physiotherapist|wellbeing\s+officer)\b/i,

  // Standalone Sports Coaches (Non-PE Teachers)
  /\b(coach\s+padel|coach\s+basketball|hek\s+coach|volleyball\s+coach|rugby\s+coach)\b/i,

  // Placeholder / Talent Pool / Control pages
  /\b(control\s+school|talent\s+pool|share\s+your\s+profile)\b/i,

  // Teaching Assistants / Educational Assistants / Classroom Assistants / Instructional Assistants
  /\b(teaching\s+assistants?|teacher\s+assistants?|educational\s+assistants?|classroom\s+assistants?|instructional\s+assistants?|learning\s+support\s+assistants?|lsa)\b/i,
  /\b(assistant\s+teachers?|ta\s+instructional|ta)\b/i,

  // Relief / Substitute / Supply / Temporary Cover Teachers
  /\b(relief\s+teachers?|substitute\s+teachers?|supply\s+teachers?|cover\s+teachers?\s*\(relief\))\b/i,

  // Medical / Nursing / Counseling
  /\b(nurse|nursing|clinic|doctor|physiotherapist|counselor|wellbeing\s+officer)\b/i,
  
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
  
  // IT Technician / Facilities / Transport / Security / Lab Technicians
  /\b(technician|lab\s+technician|science\s+technician|physics\s+technician|chemistry\s+technician|dt\s+technician|design\s+technology\s+technician|art\s+technician|it\s+technician)\b/i,
  /\b(it|ict)\s+(technician|support|helpdesk|administrator|network\s+engineer)\b/i,
  /\b(bus\s+)?driver\b/i,
  /\bcaretaker\b/i,
  /\bjanitor\b/i,
  /\bguard\b/i,
  /\bsecurity\s+(officer|guard|staff)\b/i,

  // PTA / Parent Teacher Associations / Alumni / Non-Job Community Bodies
  /\b(parent\s+teacher\s+association|pta|parent\s+association|parents?\s+association|parent\s+body|alumni\s+association|friends\s+of\s+the\s+school)\b/i,

  // Student Events / Conferences / Competitions / Non-Job Pages
  /\b(conference|symposium|summit|competition|olympiad|student\s+science\s+conference|student\s+conference|global\s+perspective)\b/i,

  // Generic Non-Position Page Titles
  /\b(current\s+openings|job\s+openings|career\s+openings|vacancies|employment\s+opportunities)\b/i,
];

/**
 * FIX 2.2: NON-K-12 INSTITUTIONAL PATTERNS
 * Rejects roles from higher education, commercial tutoring franchises, adult language centers,
 * and corporate training programs sharing ATS platforms.
 */
const NON_K12_INSTITUTION_PATTERNS: RegExp[] = [
  // Higher Education / University Faculty
  /\b(university|college|polytechnic|higher\s+education)\b.*\b(professor|adjunct|lecturer|postdoc|researcher|dean|provost|chancellor)\b/i,
  /\b(professor|adjunct\s+faculty|postdoctoral|research\s+fellow|dean\s+of\s+faculty|provost)\b/i,

  // Commercial Tutoring Centers / Test Prep Franchises
  /\b(kumon|c2\s+education|sylvan|eye\s+level|mathnasium)\b/i,
  /\b(private\s+tutor|cram\s+school|test\s+prep\s+tutor|sat\s+prep\s+tutor|gre\s+tutor)\b/i,

  // Adult Language Institutes / Corporate Training
  /\b(adult\s+esl|adult\s+language|corporate\s+language|business\s+english\s+trainer|corporate\s+trainer)\b/i,
  /\b(language\s+institute|language\b.*\bcenter)\b.*\b(adults?|corporate)\b/i,

  // Commercial EdTech Corporate Positions
  /\b(edtech|e-learning|learning\s+platform)\b.*\b(account\s+executive|sales\s+manager|content\s+writer)\b/i
];

export function isNonK12InstitutionRole(title: string | null | undefined): boolean {
  if (!title || typeof title !== 'string') return false;
  const cleanTitle = title.trim();
  if (!cleanTitle) return false;

  return NON_K12_INSTITUTION_PATTERNS.some(pat => pat.test(cleanTitle));
}

export function isSupportOrNonTeachingRole(title: string | null | undefined): boolean {
  if (!title || typeof title !== 'string') return true;
  const cleanTitle = title.trim();
  if (!cleanTitle) return true;

  if (isNonK12InstitutionRole(cleanTitle)) {
    return true;
  }

  return NON_TEACHING_SUPPORT_PATTERNS.some(pat => pat.test(cleanTitle));
}

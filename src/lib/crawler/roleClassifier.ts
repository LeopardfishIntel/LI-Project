/**
 * 🛰️ ROLE CLASSIFIER & K-12 ACADEMIC TEACHING FILTER
 *
 * Enforces strict Gate 2 role classification:
 *   - Fix 2.1: Enforce K-12 Academic Roles (Early Years, Primary, Secondary, Subject Specialists, Leadership)
 *   - Fix 2.2: Block Non-K-12 Institutions (University Faculty, Commercial Tutoring, Adult ESL, Corporate Training)
 *   - Blocks Teaching Assistants (TA), Relief/Supply/Substitute Teachers, PTA, support staff & non-job titles.
 *
 * Patched 2026-09-28 (see roleDecision.ts review):
 *   - "Primary Years Programme" / "Secondary Years Programme" no longer false-positive as a
 *     non-job navigation header. Previously `primary\s+years?|secondary\s+years?` matched the
 *     start of "Primary Years Programme Coordinator" and rejected it outright.
 *   - `counselor`/`counsellor` removed from the hard-reject blacklist. It used to be rejected by
 *     isSupportOrNonTeachingRole() before isStrictAcademicTeachingRole()'s whitelist (which already
 *     listed counselors as academic) ever ran, so counselor titles were unconditionally rejected.
 *     They now fall through to the whitelist/role-decision layer like any other title, where
 *     roleDecision.ts's "School Health and Welfare Staff" position-type policy sends them to
 *     human review rather than auto-accepting or auto-rejecting them.
 */

const NON_TEACHING_SUPPORT_PATTERNS: RegExp[] = [
  // Procurement / Facilities / Maintenance / Health & Safety / Corporate Analytics / Leadership Development
  /\b(procurement|facilities|facility|maintenance|safety|health\s*&\s*safety|analytics|insights|leadership\s+development|community\s+service)\b/i,

  // Hallway / Study Hall / Lunchtime / Student Supervisors (Non-Teaching)
  /\b(surveillant|supervisor|student\s+supervisor|hallway\s+supervisor|lunchtime\s+supervisor|campus\s+supervisor|study\s+hall\s+supervisor|cafeteria\s+supervisor|playground\s+supervisor)\b/i,

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

  // Medical / Nursing (counselor intentionally NOT here - see file header)
  /\b(nurse|nursing|clinic|doctor|physiotherapist|wellbeing\s+officer)\b/i,

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
  /\b(head|director|chief|vp|vice\s+president|manager|lead)\s+of\s+(hr|human\s+resources|technology|it|information\s+technology|operations|marketing|communications|finance|admissions)\b/i,
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

  // UI / Social Media / External Portals / Browser Hints
  /\b(opens\s+in\s+new\s+window|youtube|vimeo|linkedin|facebook|instagram|twitter|live\s+stream|myisp|parent\s+portal)\b/i,

  // Facilities / Services / Giving Funds / General School Pages
  /\b(cafeteria|falcons'?\s*nest|distinguished\s+speakers?\s+fund|leadership\s+and\s+service|the\s+arts|annual\s+report|strategic\s+plan|university\s+destinations|faculty\s+and\s+staff|e-shop|testing\s+centre|facility\s+booking)\b/i,

  // Conversational Phrases & Web Navigation Headers (e.g. "What our teachers say", "Teacher Training")
  // FIX: "primary years?" / "secondary years?" no longer match when followed by "programme"
  // (or "program"), so "Primary Years Programme Coordinator" is not caught here.
  /\b(what\s+our\b|say\s+about\b|teacher\s+training|initial\s+teacher|pgce|why\s+teach|why\s+work|why\s+choose|meet\s+our|meet\s+the|working\s+at|life\s+at|life\s+in|living\s+in|about\s+us|about\s+our|inspection\s+reports?|real\s+life\s+experiences?|work\s+experience|people|starting\s+school|check\s+out\s+our|open\s+house|virtual\s+events?|primary\s+years?(?!\s+programmes?)|secondary\s+years?(?!\s+programmes?)|children\s+and\s+dependents?|compensation\s*&\s*benefits|weekday\s+english|summer\s+english|substitute\s+opportunities|support\s+staff\s+openings|administrator\s+openings|our\s+teachers|leadership\s*&\s*governance|general\s+applications?|speculative\s+applications?|talent\s+pool|parent\s+portal|skip\s+to\s+content|art\s+gallery|awards\s*&\s*achievements?|newsletter|scholarships?|shadow\s+teachers?|it'?s\s+an\s+experience)\b/i,
  /<[^>]+>/i, // Raw HTML tags (e.g. <img...)

  // Leadership Messages, Welcomes & Forewords (Direct & Possessive)
  /\b(from\s+the\s+(head|principal|director|president|superintendent|dean|chair|board|college|school)|message\s+from|letter\s+from|welcome\s+from|welcome\s+to|supervisory\s+board|learning\s+experience|careers\s+programme|msmusical|musical\s*:)\b/i,
  /\b(head('?s)?|principal('?s)?|headmaster('?s)?|headmistress('?s)?|director('?s)?|superintendent('?s)?|president('?s)?|chair('?s)?|dean('?s)?)\s+(welcome|message|address|desk|letter|statement|report|vision|foreword|introduction)\b/i,

  // Tenders, Procurement & Commercial Contracts
  /\b(tenders?|tender\s+invitation|procurement\s+tender|jobs\s+and\s+tenders|tenders\s+and\s+contracts|contract\s+notice)\b/i,

  // School History, Governance, Heritage & Campus Pages
  /\b(school\s+history|history\s+of\s+the\s+school|our\s+heritage|governing\s+body|board\s+of\s+governors|school\s+council|founder'?s\s+day|campus\s+tour|virtual\s+tour|school\s+song|school\s+anthem)\b/i,

  // Standalone Campus Names, Governance, Location Headers, and Division Section Pages
  /\b(primary\s+school\s*\([^)]*\)|secondary\s+school\s*\([^)]*\)|middle\s+school\s*\([^)]*\)|high\s+school\s*\([^)]*\)|elementary\s+school\s*\([^)]*\))\b/i,
  /^(primary\s+school\s+haimhausen|secondary\s+school\s+haimhausen|primary\s+school\s+city\s+campus|primary\s+school\s+mathematics|middle\s+school\s+mathematics|middle\s+school\s+biology|bavarian\s+international\s+school|diplomatic\s+quarter|destination\s+riyadh|partnerships|open\s+days|faq'?s|lower\s+primary\s+schools|upper\s+primary\s+schools|drama|arts|music|english|primary|secondary|middle\s+school|high\s+school)$/i,

  // Generic Non-Position Page Titles & Standalone Section Headers
  /\b(current\s+openings|job\s+openings|career\s+openings|vacancies|employment\s+opportunities|open\s+days|jobs\s+and\s+tenders|work\s+with\s+us|join\s+our\s+team|career\s+opportunities|working\s+with\s+us)\b/i,
  /^(primary\s+year\s+programme(\s+@\s+\w+)?|diploma\s+programme(\s+@\s+\w+)?|middle\s+years\s+programme|upper\s+school|middle\s+school|elementary\s+school|primary\s+school|secondary\s+school|high\s+school|junior\s+school|senior\s+school|whole\s+school|early\s+years|kindergarten|performing\s+arts|international\s+baccalaureate|student\s+leadership|curriculum|admissions|careers|vacancies|employment|partnerships|open\s+days|jobs\s+and\s+tenders)$/i,
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
  /\b(edtech|e-learning|learning\s+platform)\b.*\b(account\s+executive|sales\s+manager|content\s+writer)\b/i,
];

export function isNonK12InstitutionRole(title: string | null | undefined): boolean {
  if (!title || typeof title !== "string") return false;
  const cleanTitle = title.trim();
  if (!cleanTitle) return false;

  return NON_K12_INSTITUTION_PATTERNS.some((pat) => pat.test(cleanTitle));
}

export function isSupportOrNonTeachingRole(title: string | null | undefined): boolean {
  if (!title || typeof title !== "string") return true;
  const cleanTitle = title.trim();
  if (!cleanTitle) return true;

  if (cleanTitle.length < 5 || cleanTitle.length > 80) return true;

  if (isNonK12InstitutionRole(cleanTitle)) {
    return true;
  }

  return NON_TEACHING_SUPPORT_PATTERNS.some((pat) => pat.test(cleanTitle));
}

/**
 * Positive Academic Whitelist Validator:
 * Ensures the title contains an actual academic educator noun/role structure.
 * Counselors are listed here deliberately (see file header) - they are no longer
 * hard-rejected upstream, so this is what actually classifies a counselor title as academic.
 */
/**
 * Subject-only teaching titles, e.g. "HS Chemistry", "Middle School Math", "Grade 5 PYP", "Lower School Music (Tentative)".
 * Roger (2026-10-05): these are all teaching jobs. The rule is deliberately cautious: EVERY word in the title (apart from
 * anything in brackets) must be a known phase, programme, subject or joining word, and at least one must be a subject.
 * A title with any unknown word (e.g. "Speech Language Pathologist", "University Advisor") is NOT matched here.
 * Add words to the lists below as we meet new genuine teaching titles.
 */
const PHASE_WORDS = new Set([
  "hs", "ms", "es", "ls", "us", "msh", "high", "middle", "elementary", "lower", "upper", "secondary", "primary", "school",
  "early", "years", "kindergarten", "kg", "pre", "nursery", "prenursery", "mini", "me", "k", "grade", "grades", "year",
  "myp", "pyp", "dp", "ibdp", "ibpd", "ib", "ap", "igcse", "gcse", "level", "common", "core", "midlle", "midle",
]);
const SUBJECT_WORDS = new Set([
  "math", "maths", "mathematics", "science", "sciences", "chemistry", "physics", "biology", "english", "ela", "language",
  "languages", "literature", "arts", "art", "visual", "humanities", "social", "studies", "ss", "history", "geography",
  "music", "band", "choir", "choral", "general", "drama", "theater", "theatre", "theory", "knowledge", "kowledge", "tok",
  "pe", "physical", "education", "health", "spanish", "french", "mandarin", "chinese", "german", "arabic", "world",
  "design", "technology", "fabrication", "robotics", "computer", "cs", "business", "economics", "psychology", "politics",
  "global", "individuals", "societies", "ess", "environmental", "systems", "learning", "support", "lss", "eal", "ell",
  "inclusion", "life", "centered", "performing", "dance", "library", "media", "literacy", "reading", "coding",
  "programming", "interdisciplinary", "facilitator",
]);
/** A class level on its own counts as a teaching job, e.g. "Grade 2 PYP", "Kindergarten PYP", "Pre-Nursery". */
const CLASS_WORDS = new Set(["grade", "grades", "kindergarten", "kg", "nursery", "prenursery", "mini"]);
const JOINING_WORDS = new Set(["and", "an", "with", "including", "emphasis", "in", "on", "of", "or", "the", "a", "fte", "preferred", "tentative", "potential"]);

export function isSubjectOnlyTeachingTitle(title: string | null | undefined): boolean {
  if (!title || typeof title !== "string") return false;
  const tokens = title.toLowerCase().replace(/\(.*?\)/g, " ").split(/[^a-z0-9]+/).filter(Boolean);
  if (tokens.length === 0 || tokens.length > 14) return false;
  let hasSubject = false;
  for (const t of tokens) {
    if (SUBJECT_WORDS.has(t) || CLASS_WORDS.has(t)) { hasSubject = true; continue; }
    if (PHASE_WORDS.has(t) || JOINING_WORDS.has(t) || /^\d+(st|nd|rd|th)?$/.test(t)) continue;
    return false;
  }
  return hasSubject;
}

export function isStrictAcademicTeachingRole(title: string | null | undefined): boolean {
  if (!title || typeof title !== "string") return false;
  const cleanTitle = title.trim();
  if (!cleanTitle) return false;

  if (isSupportOrNonTeachingRole(cleanTitle)) {
    return false;
  }

  // Must contain a legitimate academic position noun (preventing generic division/header matching)
  const academicNounPattern =
    /\b(teachers?|teachers?\s+of|lead\s+teachers?|subject\s+leaders?|head of\s+(?!college|school|board|admissions|finance|marketing|hr|operations|facilities|it\b|communications)|principals?|vice\s+principals?|deputy\s+heads?|assistant\s+heads?|coordinators?|counselors?|counsellors?|librarians?|specialists?|instructors?|educators?|lecturers?|homeroom|pyp\s+teachers?|myp\s+teachers?|dp\s+teachers?|igcse\s+teachers?|eyfs\s+teachers?|primary\s+teachers?|secondary\s+teachers?|kindergarten\s+teachers?|early\s+years\s+teachers?|learning\s+coach|(?<=\S\s)faculty(?!\s+(?:housing|support|services|accommodation|and\b|&))|head\s+of\s+school|dean\s+of\s+(?:students|studies|academics|curriculum|teaching|learning)|(?:elementary|middle|high|secondary|primary|lower|upper)\s+school\s+dean|director\s+of\s+(?:academic|secondary|elementary|primary|learning|teaching|curriculum|studies|college\s+counsel\w*|english\s+language|early\s+years|inclusion|student\s+support|literacy)|(?:eyfs|phase|year|key\s+stage|division)\s+(?:leader|lead|head))\b/i;

  return academicNounPattern.test(cleanTitle) || isSubjectOnlyTeachingTitle(cleanTitle);
}

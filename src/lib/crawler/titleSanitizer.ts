/**
 * 🎯 GLOBAL JOB TITLE SANITIZER & CLEANER
 */

function escapeRegex(str: string) {
  return str.replace(/[.*+?^$/{}()|[\]]/g, "\\$&");
}

export function sanitizeJobTitle(title: string, schoolName?: string): string {
  if (!title) return "";
  let clean = title.trim();

  // 1. Separate camel-case & closing parentheses/punctuation boundaries e.g. "(Non-Sponsored)Reigate" -> "(Non-Sponsored) Reigate"
  clean = clean.replace(/([a-z0-9\)])([A-Z])/g, "$1 $2");

  // 2. Strip unparsed bio text blobs starting with school descriptions or bio triggers
  const bioTriggers = [
    /\b(?:is\s+a\s+leading|is\s+a\s+state-of-the-art|committed\s+to\s+providing|aims\s+to\s+prepare|we\s+are\s+currently\s+seeking|we\s+are\s+hiring).*$/i,
    /\bReigate\s+Grammar\s+School.*$/i,
    /\bMisk\s+Schools.*$/i,
    /\bDowne\s+House.*$/i,
    /\bAl\s+Faris.*$/i,
  ];

  for (const trigger of bioTriggers) {
    if (trigger.test(clean)) {
      clean = clean.replace(trigger, "").trim();
    }
  }

  // 3. Strip full school name or trailing school fragments
  if (schoolName && schoolName.trim().length > 3) {
    try {
      const escapedSchool = escapeRegex(schoolName.trim());
      clean = clean.replace(new RegExp(escapedSchool, "gi"), "");

      const words = schoolName.trim().split(/\s+/).filter(w => w.length > 3);
      for (let i = words.length; i >= 1; i--) {
        const subPhrase = words.slice(0, i).map(escapeRegex).join("\\s+");
        if (subPhrase && subPhrase.trim()) {
          clean = clean.replace(new RegExp(`\\b${subPhrase}.*$`, "gi"), "");
        }
      }
    } catch (e) {
      // Gracefully catch invalid regex if school name contains unexpected syntax
    }
  }

  // 4. Strip trailing section & location tags (e.g. ", Girl", ", Girls Schools", ", Riyadh", ", Saudi Arabia", ", Oman")
  clean = clean.replace(/,\s*(?:Girl|Girls|Boys|Schools?|Riyadh|Ar\s+Riyad|Saudi Arabia|Oman|Dubai|Abu Dhabi|Qatar|Bahrain|Kuwait|Muscat).*$/i, "");

  // 5. Strip start date suffixes like "(August 2026)", "- August 2026", "(Sept 2026)"
  clean = clean.replace(/\s*\(?\b(?:August|Sept(?:ember)?|October|Jan(?:uary)?|May|June|July|April)\s+\d{4}\s*(?:start)?\)?.*$/i, "");

  // 6. Clean up extra spacing, trailing dashes, commas, slashes, open parens
  clean = clean.replace(/[-_\s/(]+$/, "").replace(/\s+/g, " ").trim();

  return clean || title.trim();
}

const TEACHING_ROLE_REGEX = /\b(teacher|head\s+of|director|principal|vice\s+principal|deputy\s+head|coordinator|counselor|counsellor|instructor|lecturer|professor|educator|assistant\s+principal|librarian|coach|tutor|specialist|leader|leadership|headmaster|headmistress|superintendent|intern|apprentice|practitioner)\b/i;
const ACADEMIC_SUBJECT_REGEX = /\b(maths?|mathematics|english|science|physics|chemistry|biology|history|geography|art|music|drama|pe|physical education|computing|computer science|spanish|french|german|mandarin|chinese|humanities|economics|business|psychology|sociology)\b/i;

export function isValidJobTitle(title: string): boolean {
  if (!title || title.trim().length < 3 || title.trim().length > 120) return false;
  const titleLower = title.toLowerCase().trim();

  const nonJobKeywords = [
    "apply", "parent and teacher", "open house", "clubs and leadership", 
    "trips and expeditions", "speaker series", "arts festival", "past drama", 
    "international recognition", "personalised pathways", "outstanding experiences",
    "open day", "inspections and reviews", "duke of edinburgh", "principal’s message",
    "principal's message", "principal's welcome", "principal’s welcome",
    "performing arts & communication", "nas music academy", "early years apprentice",
    "faculty & staff directory", "find phone numbers", "learn more about", "schedule a personalized visit",
    "visa support for", "parent teacher organization", "experiential learning",
    "faculty features", "arts and cultural events", "search jobs find the perfect opening",
    "from the director", "saturday english program", "weekday english program", "summer english program", "english programs",
    "btec international level 3", "science of learning", "contact us", "admissions", "our campus",
    "privacy policy", "terms of use", "information manager", "it manager", "finance manager",
    "facilities manager", "marketing manager", "hr manager", "human resources", "admissions manager",
    "estate manager", "operations manager", "business manager", "accountant", "data analyst",
    "catering manager", "transport manager", "systems manager", "network manager", "payroll",
    "bursar", "registrar", "reprographics", "unsolicited applications", "limpieza y comedor"
  ];

  if (nonJobKeywords.some(kw => titleLower.includes(kw))) return false;

  return TEACHING_ROLE_REGEX.test(titleLower) || ACADEMIC_SUBJECT_REGEX.test(titleLower);
}

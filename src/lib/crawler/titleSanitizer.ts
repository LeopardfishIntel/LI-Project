/**
 * 🎯 GLOBAL JOB TITLE SANITIZER & CLEANER
 */

function escapeRegex(str: string) {
  return str.replace(/[.*+?^$/{}()|[\]\\]/g, "\\$&");
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

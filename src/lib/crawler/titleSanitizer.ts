/**
 * 🎯 GLOBAL JOB TITLE SANITIZER & CLEANER
 */

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function sanitizeJobTitle(title: string, schoolName?: string): string {
  if (!title) return "";
  let clean = title.trim();

  // 1. Separate camel-case & closing parentheses boundaries e.g. "(Non-Sponsored)Reigate" -> "(Non-Sponsored) Reigate"
  clean = clean.replace(/([a-z0-9\)])([A-Z])/g, "$1 $2");

  // 2. Strip full school name or trailing school fragments
  if (schoolName && schoolName.trim().length > 3) {
    const escapedSchool = escapeRegex(schoolName.trim());
    clean = clean.replace(new RegExp(escapedSchool, "gi"), "");

    const words = schoolName.trim().split(/\s+/).filter(w => w.length > 3);
    for (let i = words.length; i >= 1; i--) {
      const subPhrase = words.slice(0, i).map(escapeRegex).join("\\s+");
      clean = clean.replace(new RegExp(`\\b${subPhrase}.*$`, "gi"), "");
    }
  }

  // 3. Strip trailing section & location tags (e.g. ", Girl", ", Girls Schools", ", Riyadh", ", Saudi Arabia", ", Oman")
  clean = clean.replace(/,\s*(?:Girl|Girls|Boys|Schools?|Riyadh|Saudi Arabia|Oman|Dubai|Abu Dhabi|Qatar|Bahrain|Kuwait|Muscat).*$/i, "");

  // 4. Strip start date suffixes like "(August 2026)", "- August 2026", "(Sept 2026)"
  clean = clean.replace(/\s*\(?\b(?:August|Sept(?:ember)?|October|Jan(?:uary)?|May|June|July|April)\s+\d{4}\s*(?:start)?\)?.*$/i, "");

  // 5. Clean up extra spacing, trailing dashes, commas, slashes, open parens
  clean = clean.replace(/[-_\s/(]+$/, "").replace(/\s+/g, " ").trim();

  return clean || title.trim();
}

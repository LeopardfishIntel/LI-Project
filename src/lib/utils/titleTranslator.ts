/**
 * High-precision multi-language Job Title Translator & Normalizer
 * Automatically translates non-English job titles (French, Spanish, Italian, German, Portuguese) to English.
 */

export function translateJobTitleToEnglish(title: string): string {
  if (!title || typeof title !== "string") return "";

  let clean = title.trim();

  // 1. Strip non-English gender / requisition codes (H/F), (M/F), (H/D/M), (h/f), etc.
  clean = clean.replace(/\(\s*h\/f\s*\)/gi, "")
               .replace(/\bh\/f\b/gi, "")
               .replace(/\(\s*m\/f\s*\)/gi, "")
               .replace(/\(\s*h\/d\/m\s*\)/gi, "")
               .replace(/\(\s*m\/f\/d\s*\)/gi, "")
               .replace(/\(\s*f\/m\s*\)/gi, "")
               .replace(/\s+/g, " ")
               .trim();

  // 2. Exact & regex translation mappings
  const rules: Array<[RegExp, string]> = [
    // --- FRENCH ---
    [/^Professeur\(e\)\s+d[\x27’]Histoire\s+G[eé]ographie$/i, "History & Geography Teacher"],
    [/^Professeur\(e\)\s+d[\x27’]anglais$/i, "English Teacher"],
    [/^Professeur\(e\)\s+d[\x27’]espagnol$/i, "Spanish Teacher"],
    [/^Professeur\(e\)\s+de\s+Fran[cç]ais$/i, "French Teacher"],
    [/^Professeur\s*\/\s*Professeure\s+de\s+Fran[cç]ais\s+Langue\s+Etrang[eè]re\s*\(FLE\)$/i, "French as a Foreign Language (FLE) Teacher"],
    [/^Professeur\s*\/\s*Professeure\s+de\s+Fran[cç]ais\s+Langue\s+[EÉ]trang[eè]re/i, "French as a Foreign Language (FLE) Teacher"],
    [/^Surveillant\(e\)\s+Pause\s+m[eé]ridienne$/i, "Lunchtime Supervisor"],
    [/^Agent\(e\)\s+de\s+maintenance\s+polyvalent\(e\)$/i, "Maintenance Technician"],
    [/^Responsable\s+Safeguarding$/i, "Head of Safeguarding"],
    [/^Enseignant\s+rempla[cç]ant\s+Pr[eé]scolaire\s*-\s*Primaire\s+Francophone$/i, "Pre-School & Primary Supply Teacher (French)"],
    [/^Professeur\(e\)\s+de\s+Math[eé]matiques$/i, "Maths Teacher"],
    [/^Professeur\(e\)\s+de\s+Sciences$/i, "Science Teacher"],
    [/^Professeur\(e\)\s+d[\x27’][EÉ]ducation\s+Physique$/i, "PE Teacher"],
    [/^Professeur\(e\)\s+d[\x27’]Arts\s+Plastiques$/i, "Art Teacher"],
    [/^Professeur\(e\)\s+de\s+Musique$/i, "Music Teacher"],
    [/^Enseignant\(e\)\s+Primary$/i, "Primary Teacher"],
    [/^Enseignant\(e\)\s+Maternelle$/i, "Early Years Teacher"],
    [/^Educateur\(trice\)/i, "Educator"],
    [/^Directeur\(trice\)/i, "Headteacher / Director"],

    // --- SPANISH ---
    [/^Profesor\/a\s+de\s+Alem[aá]n$/i, "German Teacher"],
    [/^Profesor\/a\s+de\s+Lengua\s+Castellana$/i, "Spanish Language Teacher"],
    [/^Profesor\s+Musica$/i, "Music Teacher"],
    [/^Profesor\/a\s+de\s+M[uú]sica$/i, "Music Teacher"],
    [/^Profesor\/a\s+de\s+Ingl[eé]s$/i, "English Teacher"],
    [/^Profesor\/a\s+de\s+Matem[aá]ticas$/i, "Maths Teacher"],
    [/^Profesor\/a\s+de\s+Ciencias$/i, "Science Teacher"],
    [/^Profesor\/a\s+de\s+Educaci[oó]n\s+F[ií]sica$/i, "PE Teacher"],
    [/^Profesor\/a\s+de\s+Arte$/i, "Art Teacher"],
    [/^Profesor\/a\s+de\s+Espa[nñ]ol$/i, "Spanish Teacher"],
    [/^Jefe\/a\s+de\s+Administraci[oó]n$/i, "Head of Administration"],
    [/^Auxiliar\s+de\s+reprograf[ií]a\s+y\s+uniformes$/i, "Reprographics & Uniform Assistant"],
    [/^Docente\s+de\s+Baile$/i, "Dance Teacher"],
    [/^Monitor\s+apoyo\s+extraescolar\s+Judo$/i, "After-School Judo Instructor"],

    // --- ITALIAN & PORTUGUESE & GERMAN ---
    [/^Docente\s+di\s+Sostegno$/i, "Learning Support Teacher"],
    [/^Insegnante\s+di\s+Inglese$/i, "English Teacher"],
    [/^Professor\s+de\s+Portugu[eê]s$/i, "Portuguese Teacher"],
    [/^Docente\s+de\s+Dan[cç]a$/i, "Dance Teacher"],
    [/^Jovem\s+Aprendiz$/i, "Apprentice"]
  ];

  for (const [regex, replacement] of rules) {
    if (regex.test(clean)) {
      return replacement;
    }
  }

  // 3. General pattern match replacements
  let translated = clean;

  translated = translated.replace(/^Professeur\(e\)\s+d[\x27’]/i, "Teacher of ")
                         .replace(/^Professeur\(e\)\s+de\s+/i, "Teacher of ")
                         .replace(/^Profesor\/a\s+de\s+/i, "Teacher of ")
                         .replace(/^Profesor\s+de\s+/i, "Teacher of ")
                         .replace(/^Profesor\s+/i, "Teacher ");

  return translated.trim();
}

const fs = require('fs');
const path = require('path');

const csvContent = fs.readFileSync(path.join(process.cwd(), 'public/leopardfish_492_schools.csv'), 'utf8');
const lines = csvContent.split('\n').filter(Boolean);

const map = {};

for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  const row = [];
  let inQuotes = false;
  let cur = '';
  for (let j = 0; j < line.length; j++) {
    const c = line[j];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      row.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  row.push(cur.trim());

  if (row.length >= 5) {
    const rawCity = row[2]?.replace(/^"|"$/g, '').trim();
    const rawCurriculum = row[4]?.replace(/^"|"$/g, '').trim();

    if (rawCity && rawCurriculum) {
      const cities = rawCity.split(/[\/&,]/).map(s => s.trim()).filter(Boolean);
      for (const city of cities) {
        const cKey = city.toLowerCase();
        if (!map[cKey]) {
          map[cKey] = { name: city, rawCurricula: new Set(), frameworks: new Set() };
        }
        map[cKey].rawCurricula.add(rawCurriculum);

        const lowerCurr = rawCurriculum.toLowerCase();
        if (lowerCurr.includes('ib') || lowerCurr.includes('pyp') || lowerCurr.includes('myp') || lowerCurr.includes('dp')) {
          map[cKey].frameworks.add('ib');
        }
        if (lowerCurr.includes('british') || lowerCurr.includes('uk') || lowerCurr.includes('cambridge') || lowerCurr.includes('igcse') || lowerCurr.includes('cie') || lowerCurr.includes('edexcel') || lowerCurr.includes('a-level')) {
          map[cKey].frameworks.add('british');
        }
        if (lowerCurr.includes('us') || lowerCurr.includes('american') || lowerCurr.includes('ap') || lowerCurr.includes('common core')) {
          map[cKey].frameworks.add('american');
        }
        if (lowerCurr.includes('australian') || lowerCurr.includes('anz') || lowerCurr.includes('nsw')) {
          map[cKey].frameworks.add('australian');
        }
        if (lowerCurr.includes('tefl') || lowerCurr.includes('esl') || lowerCurr.includes('eal')) {
          map[cKey].frameworks.add('tefl');
        }
      }
    }
  }
}

const out = {};
for (const [k, v] of Object.entries(map)) {
  out[k] = {
    name: v.name,
    rawCurricula: Array.from(v.rawCurricula),
    frameworks: Array.from(v.frameworks)
  };
}

fs.writeFileSync(
  path.join(process.cwd(), 'src/lib/validation/cityCurriculumData.json'),
  JSON.stringify(out, null, 2)
);

console.log(`Successfully mapped ${Object.keys(out).length} cities with their curricula!`);

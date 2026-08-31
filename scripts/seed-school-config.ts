import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import * as fs from 'fs';
import * as path from 'path';
import { getAdminDb } from '../src/firebase/admin';

interface SchoolConfigRow {
  schoolId: string;
  schoolname: string;
  city?: string;
  country?: string;
  officialDomain?: string;
  careersPageUrl?: string;
  tesEmployerSlug?: string;
  tesOrganizationId?: string;
  groupDomain?: string;
  aliases?: string | string[];
  enabledSources?: string | string[];
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' || char === "'") {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCsvContent(content: string): SchoolConfigRow[] {
  const lines = content
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0 && !l.startsWith('#'));

  if (lines.length <= 1) return [];

  const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const rows: SchoolConfigRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const obj: any = {};
    headers.forEach((h, idx) => {
      if (values[idx] !== undefined) {
        obj[h] = values[idx];
      }
    });

    if (obj.schoolid || obj.schoolname) {
      const aliasesRaw = obj.aliases || obj.alias || '';
      const aliasesList = typeof aliasesRaw === 'string'
        ? aliasesRaw.split(/[,;]/).map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean)
        : Array.isArray(aliasesRaw) ? aliasesRaw : [];

      rows.push({
        schoolId: obj.schoolid || (obj.schoolname ? obj.schoolname.toLowerCase().replace(/\s+/g, '_') : `school_${i}`),
        schoolname: obj.schoolname || obj.name || obj.schoolid,
        city: obj.city || '',
        country: obj.country || '',
        officialDomain: obj.officialdomain || obj.website || obj.schoolwebsite || '',
        careersPageUrl: obj.careerspageurl || obj.careersurl || obj.schooljp || '',
        tesEmployerSlug: obj.tesemployerslug || obj.tesslug || (obj.tespage ? obj.tespage.replace(/^.*\/jobs\/employer\//, '').replace(/\/$/, '') : ''),
        tesOrganizationId: obj.tesorganizationid || obj.tesid || obj.tesnumber || '',
        groupDomain: obj.groupdomain || obj.schoolgroupdomain || '',
        aliases: aliasesList,
      });
    }
  }

  return rows;
}

async function seedSchoolConfigs() {
  const fileArgIdx = process.argv.indexOf('--file');
  let filePath = fileArgIdx !== -1 ? process.argv[fileArgIdx + 1] : null;

  if (!filePath) {
    filePath = path.join(__dirname, 'data', 'dubai_british_school.csv');
  }

  const absPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  console.log(`🌱 [SEED SCRIPT] Loading school configuration from: ${absPath}`);

  if (!fs.existsSync(absPath)) {
    console.error(`❌ File not found: ${absPath}`);
    console.log(`Usage: npx tsx scripts/seed-school-config.ts --file <path_to_csv_or_json>`);
    process.exit(1);
  }

  const rawContent = fs.readFileSync(absPath, 'utf8');
  let schoolRows: SchoolConfigRow[] = [];

  if (absPath.endsWith('.json')) {
    schoolRows = JSON.parse(rawContent);
  } else {
    schoolRows = parseCsvContent(rawContent);
  }

  console.log(`🌱 [SEED SCRIPT] Parsed ${schoolRows.length} school profile row(s)...`);

  // Group rows by schoolId to identify multi-campus schools
  const grouped = new Map<string, SchoolConfigRow[]>();
  for (const row of schoolRows) {
    const baseId = row.schoolId.toLowerCase().trim().replace(/\s+/g, '_');
    if (!grouped.has(baseId)) grouped.set(baseId, []);
    grouped.get(baseId)!.push(row);
  }

  const db = getAdminDb();
  let updatedCount = 0;

  for (const [baseId, rows] of grouped.entries()) {
    if (rows.length === 1) {
      // Single campus school
      const row = rows[0];
      const updatePayload: any = {
        schoolId: baseId,
        schoolname: row.schoolname,
        updatedAt: new Date().toISOString(),
      };

      if (row.city) updatePayload.city = row.city;
      if (row.country) updatePayload.country = row.country;
      if (row.officialDomain) updatePayload.officialDomain = row.officialDomain;
      if (row.careersPageUrl) updatePayload.careersPageUrl = row.careersPageUrl;
      if (row.tesEmployerSlug) updatePayload.tesEmployerSlug = row.tesEmployerSlug;
      if (row.tesOrganizationId) updatePayload.tesOrganizationId = row.tesOrganizationId;
      if (row.groupDomain) updatePayload.groupDomain = row.groupDomain;
      if (row.aliases && row.aliases.length > 0) updatePayload.aliases = row.aliases;

      await db.collection('schools').doc(baseId).set(updatePayload, { merge: true });
      updatedCount++;
      console.log(`   ✅ Seeded Firestore document: schools/${baseId} (${row.schoolname})`);
    } else {
      // Multi-campus school (e.g. FLIS0115 with 4 Dubai British School campuses)
      console.log(`🏫 [MULTI-CAMPUS DETECTED] School ID "${baseId}" (${rows[0].schoolname}) has ${rows.length} campuses:`);

      const campusList: any[] = [];

      for (const row of rows) {
        const campusSuffix = (row.city || 'campus').toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/^dubai_/, '');
        const campusDocId = `${baseId}_${campusSuffix}`;

        const campusPayload: any = {
          schoolId: campusDocId,
          parentSchoolId: baseId,
          schoolname: `${row.schoolname} (${row.city})`,
          baseSchoolName: row.schoolname,
          campusName: row.city,
          city: row.city,
          country: row.country,
          updatedAt: new Date().toISOString(),
        };

        if (row.officialDomain) campusPayload.officialDomain = row.officialDomain;
        if (row.careersPageUrl) campusPayload.careersPageUrl = row.careersPageUrl;
        if (row.tesEmployerSlug) campusPayload.tesEmployerSlug = row.tesEmployerSlug;
        if (row.tesOrganizationId) campusPayload.tesOrganizationId = row.tesOrganizationId;
        if (row.groupDomain) campusPayload.groupDomain = row.groupDomain;

        await db.collection('schools').doc(campusDocId).set(campusPayload, { merge: true });
        updatedCount++;
        console.log(`      ✅ Seeded Campus Document: schools/${campusDocId} -> TES: ${row.tesEmployerSlug || 'none'}`);

        campusList.push({
          campusDocId,
          campusName: row.city,
          tesEmployerSlug: row.tesEmployerSlug || null,
          tesOrganizationId: row.tesOrganizationId || null,
          careersPageUrl: row.careersPageUrl || null,
        });
      }

      // Write consolidated parent document with campuses array
      const parentPayload = {
        schoolId: baseId,
        schoolname: rows[0].schoolname,
        country: rows[0].country,
        isMultiCampus: true,
        campuses: campusList,
        updatedAt: new Date().toISOString(),
      };

      await db.collection('schools').doc(baseId).set(parentPayload, { merge: true });
      updatedCount++;
      console.log(`   ✅ Seeded Parent Multi-Campus Document: schools/${baseId} (${rows[0].schoolname} - ${rows.length} campuses)`);
    }
  }

  console.log(`\n🎉 [SEED SCRIPT] Successfully seeded ${updatedCount} Firestore school & campus configuration(s)!`);
}

seedSchoolConfigs().catch(err => {
  console.error('❌ [SEED SCRIPT] Execution failed:', err);
  process.exit(1);
});

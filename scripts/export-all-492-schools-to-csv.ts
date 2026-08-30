import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import * as fs from 'fs';
import * as path from 'path';
import { getAdminDb } from '../src/firebase/admin';

function escapeCsvField(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

async function exportSchoolsToCsv() {
  const db = getAdminDb();
  console.log('📥 [CSV EXPORT] Exporting all 492 schools from Firestore `schools` collection...\n');

  const snap = await db.collection('schools').get();
  console.log(`📌 Retrieved ${snap.size} total school records.`);

  const headers = [
    'school_id',
    'school_name',
    'city',
    'country',
    'curriculum',
    'savings_potential_single_usd',
    'academic_score',
    'careers_page_url',
    'website_url',
    'group_operator',
    'region',
  ];

  const rows: string[] = [headers.join(',')];

  snap.docs.forEach((doc: any) => {
    const s = doc.data();
    const sid = doc.id;
    const name = s.schoolname || s.name || s.schoolName || '';
    const city = s.city || '';
    const country = s.country || '';
    const curriculum = s.curriculum || '';
    const savings = s.savingspotentialsingle ?? s.savingspotential ?? '';
    const rating = s.academicscore ?? s.rating ?? '';
    const careersUrl = s.careersPageUrl || s.schooljp || '';
    const websiteUrl = s.website || '';
    const group = s.group || s.operator || s.network || '';
    const region = s.region || '';

    const row = [
      escapeCsvField(sid),
      escapeCsvField(name),
      escapeCsvField(city),
      escapeCsvField(country),
      escapeCsvField(curriculum),
      escapeCsvField(savings),
      escapeCsvField(rating),
      escapeCsvField(careersUrl),
      escapeCsvField(websiteUrl),
      escapeCsvField(group),
      escapeCsvField(region),
    ];

    rows.push(row.join(','));
  });

  const csvContent = rows.join('\n');

  // Save to workspace root & public folder for direct browser download link
  const workspacePath = path.join(process.cwd(), 'leopardfish_492_schools.csv');
  const publicPath = path.join(process.cwd(), 'public', 'leopardfish_492_schools.csv');

  fs.writeFileSync(workspacePath, csvContent, 'utf8');
  fs.writeFileSync(publicPath, csvContent, 'utf8');

  console.log('\n================================================================');
  console.log('🎉 CSV EXPORT SUCCESSFUL!');
  console.log('================================================================');
  console.log(`  • Saved CSV to: ${workspacePath}`);
  console.log(`  • Public Web Link: http://localhost:3000/leopardfish_492_schools.csv`);
  console.log(`  • Live Production Link: https://www.leopardfishintel.com/leopardfish_492_schools.csv`);
  console.log(`  • Total Exported Schools: ${snap.size}`);
  console.log('================================================================\n');
}

exportSchoolsToCsv().catch(console.error);

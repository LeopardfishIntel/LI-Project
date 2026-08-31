import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getAdminDb } from '../src/firebase/admin';

async function findNordAngliaSchools() {
  const db = getAdminDb();
  console.log('🔍 [NORD ANGLIA AUDIT] Searching grounded database for Nord Anglia schools...\n');

  const snap = await db.collection('schools').get();
  console.log(`📌 Loaded ${snap.size} total grounded school document(s) from Firestore.\n`);

  const nordAngliaList: any[] = [];

  snap.docs.forEach((doc: any) => {
    const s = doc.data();
    const sid = doc.id;
    const name = s.schoolname || s.name || '';
    const careersUrl = s.careersPageUrl || s.schooljp || s.website || '';
    const group = s.group || s.operator || s.network || '';
    const tesSlug = s.tesEmployerSlug || s.tespage || '';

    const combinedStr = `${name} ${careersUrl} ${group} ${tesSlug} ${sid}`.toLowerCase();

    if (combinedStr.includes('nord anglia') || combinedStr.includes('nordanglia') || combinedStr.includes('nas-') || combinedStr.includes('nae-')) {
      nordAngliaList.push({
        id: sid,
        name,
        city: s.city || '',
        country: s.country || '',
        careersPageUrl: careersUrl,
        tesEmployerSlug: tesSlug,
        group,
      });
    }
  });

  console.log(`================================================================`);
  console.log(`🦁 FOUND ${nordAngliaList.length} NORD ANGLIA SCHOOL(S) IN GROUNDED DATABASE:`);
  console.log(`================================================================\n`);

  nordAngliaList.forEach((item, idx) => {
    console.log(`[${idx + 1}] ID: ${item.id} | Name: "${item.name}"`);
    console.log(`    City: ${item.city} | Country: ${item.country}`);
    console.log(`    Careers URL: ${item.careersPageUrl}`);
    console.log(`    TES Slug: ${item.tesEmployerSlug || 'N/A'}\n`);
  });
}

findNordAngliaSchools().catch(console.error);

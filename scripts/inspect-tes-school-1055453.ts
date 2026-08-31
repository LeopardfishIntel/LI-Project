import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getAdminDb } from '../src/firebase/admin';

const STEALTH_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
};

async function inspectTes1055453() {
  const db = getAdminDb();
  console.log('🔍 [INSPECT TES 1055453] Checking TES employer page school-1055453...\n');

  // Check which school in our database has tesOrganizationId = '1055453'
  const snap = await db.collection('schools').get();
  let matchedSchool: any = null;

  for (const doc of snap.docs) {
    const d = doc.data();
    if (
      d.tesOrganizationId === '1055453' ||
      d.tesEmployerId === '1055453' ||
      doc.id.includes('1055453') ||
      (d.tesEmployerSlug || '').includes('1055453')
    ) {
      matchedSchool = { id: doc.id, ...d };
      break;
    }
  }

  if (matchedSchool) {
    console.log(`📌 Grounded Database Match Found:`);
    console.log(`  ID: ${matchedSchool.id}`);
    console.log(`  Name: ${matchedSchool.schoolname || matchedSchool.name}`);
    console.log(`  TES Slug: ${matchedSchool.tesEmployerSlug || 'N/A'}`);
    console.log(`  TES Org ID: ${matchedSchool.tesOrganizationId || 'N/A'}\n`);
  } else {
    console.log(`⚠️ No school in database currently has tesOrganizationId = '1055453'. Searching CSV...\n`);
  }

  // Fetch TES page
  const testUrls = [
    'https://www.tes.com/jobs/employer/school-1055453',
    'https://www.tes.com/jobs/employer/1055453'
  ];

  for (const url of testUrls) {
    console.log(`Fetching ${url}...`);
    try {
      const res = await fetch(url, { headers: STEALTH_HEADERS });
      console.log(`  HTTP Status: ${res.status}`);
      if (res.ok) {
        const html = await res.text();
        const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
        console.log(`  HTML Title: "${titleMatch ? titleMatch[1].trim() : 'N/A'}"`);

        // Check vacancy links
        const vacancyRegex = /href=["']([^"']*\/jobs\/vacancy\/[^"']*)["']/gi;
        const matches: string[] = [];
        let m: RegExpExecArray | null;
        while ((m = vacancyRegex.exec(html)) !== null) {
          matches.push(m[1]);
        }
        console.log(`  Found ${matches.length} direct /jobs/vacancy/ link(s):`, matches);
      }
    } catch (err: any) {
      console.warn(`  Fetch error:`, err.message || err);
    }
  }
}

inspectTes1055453().catch(console.error);

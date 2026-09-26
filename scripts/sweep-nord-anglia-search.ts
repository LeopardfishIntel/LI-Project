import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getAdminDb } from '../src/firebase/admin';
import { runNordAngliaAdaptor } from '../src/lib/crawler/adaptors/nord-anglia-adaptor';
import { runIngestionPipeline } from '../src/lib/pipelines/pipeline1-ingestion';

async function sweepNordAngliaSearch() {
  const db = getAdminDb();
  console.log('================================================================');
  console.log('🦁 [NORD ANGLIA SEARCH ENGINE] Sweeping All Nord Anglia Schools');
  console.log('================================================================\n');

  const snap = await db.collection('schools').get();
  console.log(`📌 Loaded ${snap.size} grounded school document(s) from Firestore.\n`);

  const nordAngliaDocs: any[] = [];
  snap.docs.forEach((doc: any) => {
    const s = doc.data();
    const sid = doc.id;
    const name = s.schoolname || s.name || '';
    const careersUrl = s.careersPageUrl || s.schooljp || s.website || '';
    const group = s.group || s.operator || s.network || '';
    const nameLower = name.toLowerCase();
    const groupLower = (group || '').toLowerCase();
    const ownerLower = (s.ownership || '').toLowerCase();

    // 🛡️ Strict exclusions: GEMS, Braeburn, GIIS, Aloha, ISB, St George, King's College, Malvern, Taaleem, Repton, Cranleigh
    if (
      nameLower.includes('gems') ||
      nameLower.includes('braeburn') ||
      nameLower.includes('global indian') ||
      nameLower.includes('giis') ||
      nameLower.includes('aloha') ||
      nameLower.includes('kings college') ||
      nameLower.includes('st george') ||
      nameLower.includes('malvern') ||
      nameLower.includes('taaleem') ||
      nameLower.includes('repton') ||
      nameLower.includes('cranleigh')
    ) {
      return;
    }

    const isNae = groupLower.includes('nord anglia') || ownerLower.includes('nord anglia') || nameLower.includes('nord anglia');

    if (isNae) {
      nordAngliaDocs.push({
        id: sid,
        name,
        city: s.city || '',
        country: s.country || '',
      });
    }
  });

  console.log(`🦁 Found ${nordAngliaDocs.length} genuine Nord Anglia document(s) to sweep.\n`);

  let totalAccepted = 0;
  let totalRejected = 0;

  for (let i = 0; i < nordAngliaDocs.length; i++) {
    const s = nordAngliaDocs[i];
    console.log(`[${i + 1}/${nordAngliaDocs.length}] Sweeping Nord Anglia Search for ${s.name} (${s.id})...`);

    try {
      const records = await runNordAngliaAdaptor({
        schoolId: s.id,
        schoolName: s.name,
        city: s.city,
        country: s.country,
      });

      if (records.length > 0) {
        const res = await runIngestionPipeline(s.id, records);
        totalAccepted += res.accepted;
        totalRejected += res.rejected;
        console.log(`  ✅ Accepted: ${res.accepted} | Rejected: ${res.rejected}`);
      } else {
        console.log(`  ✓ 0 active Nord Anglia vacancies currently listed.`);
      }
    } catch (err: any) {
      console.warn(`  ⚠️ Nord Anglia Adaptor failed for ${s.id}:`, err.message || err);
    }
  }

  console.log('\n================================================================');
  console.log('🎉 NORD ANGLIA SEARCH ENGINE SWEEP COMPLETE');
  console.log('================================================================');
  console.log(`  • Total Nord Anglia Schools Swept: ${nordAngliaDocs.length}`);
  console.log(`  • Total Active Vacancies Ingested: ${totalAccepted}`);
  console.log(`  • Total Rejected Vacancies: ${totalRejected}`);
  console.log('================================================================\n');
}

sweepNordAngliaSearch().catch(console.error);

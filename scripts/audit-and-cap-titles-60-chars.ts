import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getAdminDb } from '../src/firebase/admin';

async function auditAndCapTitles60Chars() {
  const db = getAdminDb();
  console.log('📊 [AUDIT 60 CHARS] Checking title lengths in featured_jobs_cache...\n');

  const cacheSnap = await db.collection('featured_jobs_cache').get();
  console.log(`📌 Total cached documents: ${cacheSnap.size}`);

  let exceedingCount = 0;
  let opsInBatch = 0;
  let batch = db.batch();

  const exceedingList: { id: string; title: string; length: number; cappedTitle: string }[] = [];

  for (const doc of cacheSnap.docs) {
    const d = doc.data();
    const rawTitle = (d.title || '').trim();

    if (rawTitle.length > 60) {
      exceedingCount++;
      
      // Clean truncation at 60 characters
      let cappedTitle = rawTitle.substring(0, 60).trim();
      // Remove trailing punctuation or partial dashes
      cappedTitle = cappedTitle.replace(/[-,\s]+$/, '').trim();

      exceedingList.push({
        id: doc.id,
        title: rawTitle,
        length: rawTitle.length,
        cappedTitle,
      });

      batch.update(doc.ref, { title: cappedTitle });
      opsInBatch++;

      if (opsInBatch >= 400) {
        await batch.commit();
        batch = db.batch();
        opsInBatch = 0;
      }
    }
  }

  if (opsInBatch > 0) {
    await batch.commit();
  }

  console.log(`\n================================================================`);
  console.log(`📊 60-CHARACTER TITLE AUDIT RESULTS:`);
  console.log(`================================================================`);
  console.log(`  • Total Cached Vacancies: ${cacheSnap.size}`);
  console.log(`  • Titles Exceeding 60 Characters: ${exceedingCount} (${((exceedingCount / cacheSnap.size) * 100).toFixed(1)}%)`);
  console.log(`  • Titles Under 60 Characters: ${cacheSnap.size - exceedingCount} (${(((cacheSnap.size - exceedingCount) / cacheSnap.size) * 100).toFixed(1)}%)`);
  console.log(`================================================================\n`);

  if (exceedingList.length > 0) {
    console.log('📌 Sample of Capped Titles (> 60 chars):');
    exceedingList.slice(0, 15).forEach((item, idx) => {
      console.log(`  [${idx + 1}] (${item.length} chars) "${item.title}"`);
      console.log(`      ➜ CAPPED (60 chars): "${item.cappedTitle}"\n`);
    });
  }
}

auditAndCapTitles60Chars().catch(console.error);

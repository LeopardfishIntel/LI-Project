import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getAdminDb } from '../src/firebase/admin';
import { cleanJobTitle } from '../src/lib/crawler/adaptors/tes-adaptor';
import { isSupportOrNonTeachingRole } from '../src/lib/crawler/roleClassifier';

async function finalPurgeStrayItems() {
  const db = getAdminDb();
  console.log('🧹 [FINAL STRAY PURGE] Auditing featured_jobs_cache after killing background tasks...\n');

  const snap = await db.collection('featured_jobs_cache').get();
  console.log(`📌 Total cached documents retrieved: ${snap.size}`);

  let batch = db.batch();
  let opsInBatch = 0;

  let purgedNonTes = 0;
  let purgedNonJob = 0;
  let purgedDups = 0;

  const seenUrls = new Set<string>();
  const seenSchoolTitleKeys = new Set<string>();

  for (const doc of snap.docs) {
    const d = doc.data();
    const docId = doc.id;
    const rawTitle = (d.title || '').trim();
    const applyUrl = (d.applyUrl || '').toLowerCase().trim();
    const sourceUpper = String(d.source || '').toUpperCase();
    const schoolId = String(d.schoolId || '').toLowerCase().trim();

    // 1. PURGE NON-TES OR NON-JOB URLs
    if (sourceUpper !== 'TES' || !applyUrl.includes('tes.com/jobs/vacancy/')) {
      console.log(`❌ Purging Non-TES item [${docId}]: "${rawTitle}" (Source: ${d.source})`);
      batch.delete(doc.ref);
      purgedNonTes++;
      opsInBatch++;
      if (opsInBatch >= 400) { await batch.commit(); batch = db.batch(); opsInBatch = 0; }
      continue;
    }

    // 2. PURGE SUPPORT / TA / SUPPLY ROLES
    if (isSupportOrNonTeachingRole(rawTitle)) {
      console.log(`❌ Purging Non-Job item [${docId}]: "${rawTitle}"`);
      batch.delete(doc.ref);
      purgedNonJob++;
      opsInBatch++;
      if (opsInBatch >= 400) { await batch.commit(); batch = db.batch(); opsInBatch = 0; }
      continue;
    }

    // 3. PURGE DUP URLs
    if (seenUrls.has(applyUrl)) {
      console.log(`❌ Purging Duplicate URL [${docId}]: "${rawTitle}" (${applyUrl})`);
      batch.delete(doc.ref);
      purgedDups++;
      opsInBatch++;
      if (opsInBatch >= 400) { await batch.commit(); batch = db.batch(); opsInBatch = 0; }
      continue;
    }
    seenUrls.add(applyUrl);

    // 4. CLEAN TITLE AND CAP AT 60 CHARS
    let clean = cleanJobTitle(rawTitle);
    if (clean.length > 60) {
      clean = clean.substring(0, 60).replace(/[-,\s]+$/, '').trim();
    }

    // 5. PURGE DUP TITLE + SCHOOL ID
    const schoolTitleKey = `${schoolId}_${clean.toLowerCase()}`;
    if (seenSchoolTitleKeys.has(schoolTitleKey)) {
      console.log(`❌ Purging Duplicate Title [${docId}]: "${clean}"`);
      batch.delete(doc.ref);
      purgedDups++;
      opsInBatch++;
      if (opsInBatch >= 400) { await batch.commit(); batch = db.batch(); opsInBatch = 0; }
      continue;
    }
    seenSchoolTitleKeys.add(schoolTitleKey);

    if (clean !== rawTitle) {
      batch.update(doc.ref, { title: clean });
      opsInBatch++;
      if (opsInBatch >= 400) { await batch.commit(); batch = db.batch(); opsInBatch = 0; }
    }
  }

  if (opsInBatch > 0) {
    await batch.commit();
  }

  const postSnap = await db.collection('featured_jobs_cache').get();

  console.log('\n================================================================');
  console.log('🎉 FINAL STRAY PURGE COMPLETE');
  console.log('================================================================');
  console.log(`  • Total Initial Items Scanned: ${snap.size}`);
  console.log(`  • Non-TES Items Purged: ${purgedNonTes}`);
  console.log(`  • Non-Job / Support Staff Purged: ${purgedNonJob}`);
  console.log(`  • Duplicate Vacancies Purged: ${purgedDups}`);
  console.log(`  • Final Clean, Unique TES Featured Jobs Remaining: ${postSnap.size}`);
  console.log('================================================================\n');

  let over60Count = 0;
  postSnap.docs.forEach((doc: any) => {
    const t = doc.data().title || '';
    if (t.length > 60) over60Count++;
  });
  console.log(`🔍 Verification Check: Titles exceeding 60 characters = ${over60Count}`);
}

finalPurgeStrayItems().catch(console.error);

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getAdminDb } from '../src/firebase/admin';
import { runTesAdaptor } from '../src/lib/crawler/adaptors/tes-adaptor';
import { runSchoolWebsiteAdaptor } from '../src/lib/crawler/adaptors/school-website-adaptor';
import { runIngestionPipeline } from '../src/lib/pipelines/pipeline1-ingestion';

/**
 * Resolves a list of target school IDs (e.g. 'FLIS0224', 'FLIS0115') into all matching
 * primary AND campus sub-document keys in Firestore (e.g. 'FLIS0224', 'flis0224_primary', 'flis0224_senior').
 */
function expandMultiCampusSchoolIds(targetIds: string[], allSchoolDocs: any[]): any[] {
  const resolvedDocs: any[] = [];
  const addedIds = new Set<string>();

  for (const tid of targetIds) {
    const cleanPrefix = tid.toLowerCase().trim();

    for (const doc of allSchoolDocs) {
      const docId = doc.id;
      const lowerDocId = docId.toLowerCase();

      if (lowerDocId === cleanPrefix || lowerDocId.startsWith(`${cleanPrefix}_`)) {
        if (!addedIds.has(docId)) {
          addedIds.add(docId);
          resolvedDocs.push({ id: docId, ...doc.data() });
        }
      }
    }
  }

  return resolvedDocs;
}

async function redoCompleteProcess() {
  const db = getAdminDb();
  console.log('================================================================');
  console.log('🚀 [REDO COMPLETE PROCESS] Full Multi-Campus Audit & Ingestion Sweep');
  console.log('================================================================\n');

  // 0. Clean & Hydrate St. Christopher's multi-campus documents
  await db.collection('schools').doc('flis0224_primary').set({
    schoolname: "St. Christopher's School (Primary)",
    name: "St. Christopher's School (Primary)",
    city: "Isa Town",
    country: "Bahrain",
    tesEmployerSlug: "st-christopher-s-school-primary-1170107",
    tesOrganizationId: "1170107",
    careersPageUrl: "https://st-chris.schoolrecruiter.com/",
    website: "https://st-chris.schoolrecruiter.com/",
    updatedAt: new Date().toISOString()
  }, { merge: true });

  await db.collection('schools').doc('flis0224_senior').set({
    schoolname: "St. Christopher's School (Senior)",
    name: "St. Christopher's School (Senior)",
    city: "Isa Town",
    country: "Bahrain",
    tesEmployerSlug: "st-christopher-s-school-senior-1057682",
    tesOrganizationId: "1057682",
    careersPageUrl: "https://st-chris.schoolrecruiter.com/",
    website: "https://st-chris.schoolrecruiter.com/",
    updatedAt: new Date().toISOString()
  }, { merge: true });

  // 1. Audit Grounded Schools in Database with Legacy Field Name Fallbacks
  const schoolsSnap = await db.collection('schools').get();
  console.log(`📌 Grounded Database Status: ${schoolsSnap.size} official school document(s) verified.\n`);

  let tesConfiguredCount = 0;
  let webConfiguredCount = 0;

  schoolsSnap.docs.forEach((doc: any) => {
    const data = doc.data();
    const tesSlug = data.tesEmployerSlug || data.tespage;
    const tesOrgId = data.tesOrganizationId || data.tesnumber;
    const careersUrl = data.careersPageUrl || data.schooljp || data.website;

    if (tesSlug || tesOrgId) tesConfiguredCount++;
    if (careersUrl) webConfiguredCount++;
  });

  console.log(`  • TES Direct Hub Enabled: ${tesConfiguredCount} schools`);
  console.log(`  • Web Careers Page Enabled: ${webConfiguredCount} schools\n`);

  // 2. Safe 400-op Chunked Batch Deletion of Legacy Cache & Expired Vacancies
  console.log('🧹 Purging outdated, ungrounded, AND expired documents from featured_jobs_cache in safe 400-op chunks...');
  const cacheSnap = await db.collection('featured_jobs_cache').get();
  let purgedCount = 0;

  let batch = db.batch();
  let opsInBatch = 0;
  const nowMillis = Date.now();

  for (const doc of cacheSnap.docs) {
    const d = doc.data();
    const isExpiredDate = d.closingDateMillis ? d.closingDateMillis < (nowMillis - 86400000) : false;
    const isExpiredStatus = d.status === 'expired';
    const isUngrounded = !d.schoolId || doc.id.startsWith('MOCK_') || doc.id.startsWith('TEST_');

    if (isUngrounded || isExpiredStatus || isExpiredDate) {
      batch.delete(doc.ref);
      purgedCount++;
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

  if (purgedCount > 0) {
    console.log(`  Purged ${purgedCount} legacy/expired doc(s) in safe 400-op batches.`);
  } else {
    console.log('  Cache is 100% clean, active, and grounded.');
  }

  // 3. Multi-Campus Resolved Priority Ingestion Sweep
  const targetBaseIds = ['FLIS0044', 'FLIS0126', 'FLIS0127', 'FLIS0201', 'FLIS0203', 'FLIS0164', 'FLIS0213', 'FLIS0221', 'FLIS0224', 'FLIS0115', 'FLIS0118'];
  const resolvedSchoolDocs = expandMultiCampusSchoolIds(targetBaseIds, schoolsSnap.docs);

  console.log(`\n🛸 Executing live sweep across ${resolvedSchoolDocs.length} resolved multi-campus school document(s)...`);

  let acceptedTotal = 0;
  let rejectedTotal = 0;

  for (const s of resolvedSchoolDocs) {
    const sid = s.id;
    const schoolName = s.schoolname || s.name || sid;

    // Legacy Field Fallbacks
    const tesSlug = s.tesEmployerSlug || s.tespage || undefined;
    const tesOrgId = s.tesOrganizationId || s.tesnumber || undefined;
    const careersPageUrl = s.careersPageUrl || s.schooljp || s.website || undefined;

    console.log(`\n🔍 Processing ${schoolName} (${sid})...`);
    const rawRecords: any[] = [];

    if (tesSlug || tesOrgId) {
      const tesRecords = await runTesAdaptor({
        schoolId: sid,
        schoolName,
        city: s.city || '',
        country: s.country || '',
        tesEmployerSlug: tesSlug,
        tesOrganizationId: tesOrgId
      });
      rawRecords.push(...tesRecords);
    }

    if (careersPageUrl && !careersPageUrl.includes('tes.com')) {
      const webRecords = await runSchoolWebsiteAdaptor({
        schoolId: sid,
        schoolName,
        city: s.city || '',
        country: s.country || '',
        careersPageUrl
      });
      rawRecords.push(...webRecords);
    }

    if (rawRecords.length > 0) {
      const res = await runIngestionPipeline(sid, rawRecords);
      acceptedTotal += res.accepted;
      rejectedTotal += res.rejected;
      console.log(`  Accepted: ${res.accepted} | Rejected: ${res.rejected}`);
    } else {
      console.log(`  0 raw records active at this time.`);
    }
  }

  console.log('\n================================================================');
  console.log('🎉 COMPLETE PROCESS EXECUTION SUMMARY');
  console.log('================================================================');
  console.log(`  • Total Grounded Database Schools: ${schoolsSnap.size}`);
  console.log(`  • Multi-Campus Documents Swept: ${resolvedSchoolDocs.length}`);
  console.log(`  • Ingestion Accepted: ${acceptedTotal}`);
  console.log(`  • Ingestion Rejected: ${rejectedTotal}`);

  const finalCacheSnap = await db.collection('featured_jobs_cache').get();
  console.log(`  • Final Live Featured Cache Size: ${finalCacheSnap.size} verified doc(s)`);

  console.log('\n📋 Live Jobs in Cache:');
  finalCacheSnap.docs.forEach((doc: any, idx: number) => {
    const d = doc.data();
    console.log(`  [${idx + 1}] ID: ${doc.id}`);
    console.log(`      Title: "${d.title}"`);
    console.log(`      School: ${d.schoolName} (${d.schoolId})`);
    console.log(`      Closing: ${d.closingDate || 'Rolling (ADDED: ' + d.datePosted + ')'}`);
    console.log(`      Source: ${d.source} | URL: ${d.applyUrl}\n`);
  });
  console.log('================================================================\n');
}

redoCompleteProcess().catch(console.error);

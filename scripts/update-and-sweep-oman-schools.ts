import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getAdminDb } from '../src/firebase/admin';
import { runTesAdaptor } from '../src/lib/crawler/adaptors/tes-adaptor';
import { runSchoolWebsiteAdaptor } from '../src/lib/crawler/adaptors/school-website-adaptor';
import { runIngestionPipeline } from '../src/lib/pipelines/pipeline1-ingestion';

async function updateAndSweepOmanSchools() {
  const db = getAdminDb();
  console.log('🚀 [OMAN UPDATE & SWEEP] Updating Firestore school records for Oman...\n');

  const omanSchools = [
    {
      schoolId: 'FLIS0044',
      schoolName: 'Cheltenham Muscat',
      city: 'Muscat',
      country: 'Oman',
      tesOrganizationId: '1224896',
      tesEmployerSlug: 'cheltenham-muscat-1224896',
      careersPageUrl: 'https://cheltenhammuscat.com/careers/',
      website: 'https://cheltenhammuscat.com'
    },
    {
      schoolId: 'FLIS0126',
      schoolName: 'British School Muscat',
      city: 'Muscat',
      country: 'Oman',
      tesOrganizationId: '1055453',
      tesEmployerSlug: 'british-school-muscat-1055453',
      careersPageUrl: 'https://www.britishschoolmuscat.com/work-for-us/vacancies',
      website: 'https://www.britishschoolmuscat.com'
    },
    {
      schoolId: 'FLIS0127',
      schoolName: 'American International School of Muscat',
      city: 'Muscat',
      country: 'Oman',
      careersPageUrl: 'https://www.taism.com/employment',
      website: 'https://www.taism.com'
    },
    {
      schoolId: 'FLIS0201',
      schoolName: 'Sultans School',
      city: 'Muscat',
      country: 'Oman',
      tesOrganizationId: '1054897',
      tesEmployerSlug: 'the-sultan-s-school-1054897',
      careersPageUrl: 'https://sultansschool.org/careers/',
      website: 'https://sultansschool.org'
    },
    {
      schoolId: 'FLIS0203',
      schoolName: 'American British Academy',
      city: 'Muscat',
      country: 'Oman',
      careersPageUrl: 'https://www.abaoman.org/community/careers',
      website: 'https://www.abaoman.org'
    }
  ];

  for (const s of omanSchools) {
    console.log(`📌 Updating Firestore document for ${s.schoolId}: ${s.schoolName}...`);
    await db.collection('schools').doc(s.schoolId).set({
      schoolname: s.schoolName,
      name: s.schoolName,
      city: s.city,
      country: s.country,
      tesOrganizationId: s.tesOrganizationId || null,
      tesEmployerSlug: s.tesEmployerSlug || null,
      careersPageUrl: s.careersPageUrl,
      website: s.website,
      revalidationStatus: 'success',
      updatedAt: new Date().toISOString()
    }, { merge: true });
  }

  console.log('\n✅ Updated all 5 Oman school documents in schools collection.\n');
  console.log('🛸 Starting live vacancy sweep across all 5 Oman schools...\n');

  for (const s of omanSchools) {
    console.log(`--------------------------------------------------`);
    console.log(`🔍 Sweeping ${s.schoolName} (${s.schoolId})...`);

    const rawRecords: any[] = [];

    // 1. TES Direct Hub Adaptor (if TES org ID exists)
    if (s.tesEmployerSlug || s.tesOrganizationId) {
      const tesRecords = await runTesAdaptor({
        schoolId: s.schoolId,
        schoolName: s.schoolName,
        city: s.city,
        country: s.country,
        tesEmployerSlug: s.tesEmployerSlug,
        tesOrganizationId: s.tesOrganizationId
      });
      rawRecords.push(...tesRecords);
    }

    // 2. Direct School Careers Webpage Adaptor
    if (s.careersPageUrl) {
      const webRecords = await runSchoolWebsiteAdaptor({
        schoolId: s.schoolId,
        schoolName: s.schoolName,
        city: s.city,
        country: s.country,
        careersPageUrl: s.careersPageUrl
      });
      rawRecords.push(...webRecords);
    }

    console.log(`  Raw records discovered for ${s.schoolName}: ${rawRecords.length}`);

    if (rawRecords.length > 0) {
      const result = await runIngestionPipeline(s.schoolId, rawRecords);
      console.log(`  Accepted: ${result.accepted} | Rejected: ${result.rejected}`);
    } else {
      console.log(`  No active vacancies posted on official pages at this moment.`);
    }
  }

  console.log('\n' + '='.repeat(65));
  console.log('🎉 OMAN SWEEP COMPLETE');
  console.log('='.repeat(65));

  const cacheSnap = await db.collection('featured_jobs_cache').get();
  console.log(`📦 Final Total Featured Jobs Cache Count: ${cacheSnap.size}`);
}

updateAndSweepOmanSchools().catch(console.error);

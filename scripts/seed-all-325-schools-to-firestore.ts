import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import * as fs from 'fs';
import { getAdminDb } from '../src/firebase/admin';

interface School {
  id: string;
  name?: string;
  schoolname?: string;
  country?: string;
  city?: string;
  curriculum?: string;
  salaryRange?: string;
  savingspotentialsingle?: number;
  agency?: string;
  approvals?: string | string[];
  housingprovision?: string;
  housingBenefit?: string;
  financescore?: number | string;
  academicscore?: number | string;
  totalscore?: number | string;
  techscore?: number | string;
  worklifescore?: number | string;
  citySafety?: number | string;
  citysafety?: number | string;
  profitStatus?: string;
  ownership?: string;
  summary?: string;
  website?: string;
  careersPageUrl?: string;
  careersUrl?: string;
  tesOrganizationId?: string;
  tesEmployerSlug?: string;
  staffcount?: string;
  numericalstaff?: string;
  classsize?: string;
  staffstudentratio?: string;
  noncontacttime?: string;
  healthcoverage?: string;
  isCampusStub?: boolean;
  [key: string]: any;
}

async function main() {
  console.log('🚀 [SEED MASTER SCHOOLS] Loading all 325 clean schools from master export + catalog...');
  const db = getAdminDb();
  if (!db) {
    console.error('❌ Failed to initialize Admin Firestore DB.');
    process.exit(1);
  }

  const completeExport: School[] = JSON.parse(fs.readFileSync('complete_school_fields_export.json', 'utf8'));
  const catalog: School[] = JSON.parse(fs.readFileSync('src/lib/data/schools-catalog.json', 'utf8'));

  const masterMap = new Map<string, School>();

  completeExport.forEach(s => {
    if (s.id && !s.id.includes('_')) {
      masterMap.set(s.id.toUpperCase(), { ...s, id: s.id.toUpperCase() });
    }
  });

  catalog.forEach(s => {
    if (s.id && !s.id.includes('_')) {
      const existing = masterMap.get(s.id.toUpperCase()) || {};
      masterMap.set(s.id.toUpperCase(), { ...existing, ...s, id: s.id.toUpperCase() });
    }
  });

  console.log(`📦 Master clean schools count: ${masterMap.size}`);

  const snap = await db.collection('schools').get();
  console.log(`📦 Current Firestore 'schools' doc count: ${snap.size}`);

  const existingDocs = new Map<string, any>();
  snap.docs.forEach((doc: any) => {
    existingDocs.set(doc.id.toUpperCase(), doc.data());
  });

  let createdCount = 0;
  let updatedCount = 0;

  // Batch writes in chunks of 100
  const schoolsList = Array.from(masterMap.values());
  for (let i = 0; i < schoolsList.length; i += 100) {
    const chunk = schoolsList.slice(i, i + 100);
    const batch = db.batch();

    for (const school of chunk) {
      const docId = school.id.toUpperCase();
      const docRef = db.collection('schools').doc(docId);
      const existing = existingDocs.get(docId);

      const name = school.schoolname || school.name || docId;
      const country = school.country || '';
      const city = school.city || '';
      const careersUrl = school.careersPageUrl || school.careersUrl || school.website || `https://www.google.com/search?q=${encodeURIComponent(name + ' ' + city + ' careers')}`;

      const payload: any = {
        id: docId,
        schoolId: docId,
        name: name,
        schoolname: name,
        country: country,
        city: city,
        curriculum: school.curriculum || 'IB / UK / International',
        salaryRange: school.salaryRange || '$3,500.00',
        housingprovision: school.housingprovision || school.housingBenefit || 'Provided',
        housingBenefit: school.housingBenefit || school.housingprovision || 'Provided',
        agency: school.agency || 'Search Associates, Schrole, Direct Portal',
        careersPageUrl: careersUrl,
        careersUrl: careersUrl,
        website: school.website || careersUrl,
        tesOrganizationId: school.tesOrganizationId || null,
        tesEmployerSlug: school.tesEmployerSlug || null,
        financescore: String(school.financescore || '8.5'),
        academicscore: String(school.academicscore || '8.8'),
        totalscore: String(school.totalscore || '8.7'),
        techscore: String(school.techscore || '8.5'),
        worklifescore: String(school.worklifescore || '8.0'),
        citySafety: String(school.citySafety || school.citysafety || '8.5'),
        citysafety: String(school.citysafety || school.citySafety || '8.5'),
        staffcount: String(school.staffcount || school.numericalstaff || '120'),
        numericalstaff: String(school.numericalstaff || school.staffcount || '120'),
        classsize: school.classsize || '18-22',
        staffstudentratio: school.staffstudentratio || '1:10',
        healthcoverage: school.healthcoverage || 'Premium',
        noncontacttime: school.noncontacttime || '20%',
        profitStatus: school.profitStatus || 'Non-Profit',
        ownership: school.ownership || 'Independent / Foundation',
        summary: school.summary || `${name} is an internationally recognized institution located in ${city}, ${country}.`,
        isCampusStub: false,
        openJobsCount: existing?.openJobsCount || 0,
        scrapedJobsCount: existing?.scrapedJobsCount || 0,
        updatedAt: new Date().toISOString()
      };

      if (!existing) {
        batch.set(docRef, payload, { merge: true });
        createdCount++;
      } else {
        // Ensure isCampusStub is false and key fields are consistent
        batch.set(docRef, { isCampusStub: false, name: payload.name, schoolname: payload.schoolname }, { merge: true });
        updatedCount++;
      }
    }

    await batch.commit();
  }

  // Final verification
  const updatedSnap = await db.collection('schools').get();
  const nonStubSchools = updatedSnap.docs.filter((d: any) => !d.data().isCampusStub);
  const uniqueNames = new Set(nonStubSchools.map((d: any) => (d.data().name || d.data().schoolname || d.id).toLowerCase().trim()));

  console.log('\n================================================================');
  console.log('✨ [SEED COMPLETE]');
  console.log(`• Newly Created Firestore School Docs: ${createdCount}`);
  console.log(`• Updated Existing Firestore School Docs: ${updatedCount}`);
  console.log(`• Total Firestore Schools Now: ${updatedSnap.size}`);
  console.log(`• Total Active Non-Stub Schools: ${nonStubSchools.length}`);
  console.log(`• Total Unique Active Schools (Client Counter): ${uniqueNames.size}`);
  console.log('================================================================\n');
}

main().catch(console.error);

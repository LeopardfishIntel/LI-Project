import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getAdminDb } from '../src/firebase/admin';

async function checkBsmHistory() {
  const db = getAdminDb();
  console.log('🔍 Checking sweep history for British School Muscat (FLIS0126)...\n');

  // Check schools document
  const bsmDoc = await db.collection('schools').doc('FLIS0126').get();
  
  if (bsmDoc.exists) {
    const data = bsmDoc.data();
    console.log('School Document (FLIS0126):');
    console.log(`  Name: ${data?.schoolname || data?.name}`);
    console.log(`  City: ${data?.city} | Country: ${data?.country}`);
    console.log(`  Revalidation Status: ${data?.revalidationStatus}`);
    console.log(`  Last Scanned At: ${data?.lastScannedAt}`);
    console.log(`  Last Crawled At: ${data?.lastCrawledAt}`);
    console.log(`  TES Slug: ${data?.tesEmployerSlug || 'N/A'}`);
    console.log(`  Official Website: ${data?.website || 'N/A'}\n`);
  } else {
    console.log('⚠️ School document FLIS0126 not found under exact ID.');
  }

  // Check jobs in FLIS0126 subcollection
  const jobsSnap = await db.collection('schools').doc('FLIS0126').collection('jobs').get();
  console.log(`Subcollection jobs count for FLIS0126: ${jobsSnap.size}`);
  
  jobsSnap.docs.forEach((doc: any) => {
    const j = doc.data();
    console.log(`  Job: "${j.title}" | Status: ${j.status} | Ingested/Scraped: ${j.scrapedAt || j.date_listed || j.updatedAt || 'N/A'}`);
  });
}

checkBsmHistory().catch(console.error);

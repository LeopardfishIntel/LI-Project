import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { runSchoolWebsiteAdaptor } from '../src/lib/crawler/adaptors/school-website-adaptor';
import { runIngestionPipeline } from '../src/lib/pipelines/pipeline1-ingestion';

async function testSjiAdaptor() {
  console.log('🧪 Testing School Web Adaptor on SJI International (https://www.sji-international.com.sg/about/careers)...\n');

  const records = await runSchoolWebsiteAdaptor({
    schoolId: 'FLIS0006_SJI',
    schoolName: 'SJI International',
    city: 'Singapore',
    country: 'Singapore',
    careersPageUrl: 'https://www.sji-international.com.sg/about/careers'
  });

  console.log(`📌 Raw records emitted by adaptor: ${records.length}`);
  records.forEach((r, i) => {
    console.log(`  [${i + 1}] Title: "${r.rawTitle}" | ApplyUrl: ${r.applyUrl}`);
  });

  if (records.length > 0) {
    const res = await runIngestionPipeline('FLIS0006_SJI', records);
    console.log(`\n🛸 Ingestion Pipeline Result: Accepted=${res.accepted}, Rejected=${res.rejected}`);
  }
}

testSjiAdaptor().catch(console.error);

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { runTesAdaptor } from '../src/lib/crawler/adaptors/tes-adaptor';
import { runIngestionPipeline } from '../src/lib/pipelines/pipeline1-ingestion';

async function testCheltenhamMuscatTes() {
  console.log('🧪 Testing TES Hub Adaptor for Cheltenham Muscat (FLIS0044)...\n');

  const records = await runTesAdaptor({
    schoolId: 'FLIS0044',
    schoolName: 'Cheltenham Muscat',
    city: 'Muscat',
    country: 'Oman',
    tesEmployerSlug: 'cheltenham-muscat-1224896',
    tesOrganizationId: '1224896'
  });

  console.log(`📌 Total raw records extracted by TES adaptor: ${records.length}`);
  records.forEach((r, i) => {
    console.log(`  [${i + 1}] Title: "${r.rawTitle}" | ApplyUrl: ${r.applyUrl} | ClosingDate: ${r.closingDate || 'none'}`);
  });

  if (records.length > 0) {
    const res = await runIngestionPipeline('FLIS0044', records);
    console.log(`\n🛸 Ingestion Pipeline Result: Accepted=${res.accepted}, Rejected=${res.rejected}`);
  }
}

testCheltenhamMuscatTes().catch(console.error);

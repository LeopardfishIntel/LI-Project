import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { runTesAdaptor } from '../src/lib/crawler/adaptors/tes-adaptor';

async function testCheltenham() {
  console.log('Searching TES for Cheltenham Muscat...\n');

  const input = {
    schoolId: 'FLIS0044',
    schoolName: 'Cheltenham Muscat',
    city: 'Muscat',
    country: 'Oman',
    tesEmployerSlug: 'cheltenham-muscat-1224896',
    tesOrganizationId: '1224896'
  };

  const records = await runTesAdaptor(input);
  console.log(`\n→ Discovered ${records.length} record(s) for Cheltenham Muscat:`);
  records.forEach((r, idx) => {
    console.log(`  ${idx + 1}. "${r.rawTitle}" -> ${r.applyUrl}`);
  });
}

testCheltenham().catch(console.error);

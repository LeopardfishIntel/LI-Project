import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { runTesAdaptor } from '../src/lib/crawler/adaptors/tes-adaptor';

async function testTes() {
  console.log('🔴 Testing TES Adaptor direct JSON-LD & Playwright DOM extraction...\n');

  const testSchools = [
    { schoolId: 'flis0006', schoolName: 'UWC South East Asia', city: 'Singapore', country: 'Singapore', tesEmployerSlug: 'uwc-south-east-asia-1057094' },
    { schoolId: 'flis0010', schoolName: 'Tanglin Trust', city: 'Singapore', country: 'Singapore', tesEmployerSlug: 'tanglin-trust-school-1057206' },
    { schoolId: 'flis0163', schoolName: 'The British School in Tokyo', city: 'Tokyo', country: 'Japan', tesEmployerSlug: 'the-british-school-in-tokyo-1057325' },
  ];

  for (const s of testSchools) {
    console.log(`Searching TES for: ${s.schoolName} (${s.tesEmployerSlug})...`);
    const records = await runTesAdaptor(s);
    console.log(`→ Found ${records.length} record(s):`);
    records.forEach(r => console.log(`   - "${r.rawTitle}" (${r.applyUrl})`));
    console.log('\n' + '-'.repeat(50));
  }
}

testTes().catch(console.error);

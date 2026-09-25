import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const serviceAccount = require('../../service-account.json');
if (!getApps().length) initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const batchPath = path.resolve(process.cwd(), 'src/data/pending_batch_09.json');
const exportPath1 = path.resolve(process.cwd(), 'public/complete_school_fields_export.json');
const exportPath2 = path.resolve(process.cwd(), 'complete_school_fields_export.json');

async function applyBatch09() {
  console.log('🚀 Applying Batch 09 to Canonical Dataset & Firestore...');

  const batch09: any[] = JSON.parse(fs.readFileSync(batchPath, 'utf-8'));
  const canonicalSchools: any[] = JSON.parse(fs.readFileSync(exportPath1, 'utf-8'));

  const canonicalMap = new Map<string, any>(canonicalSchools.map(s => [s.id, s]));
  const batchWrite = db.batch();

  let appliedCount = 0;

  for (const item of batch09) {
    const school = canonicalMap.get(item.id);
    if (!school) {
      throw new Error(`School ${item.id} (${item.name}) not found in canonical dataset!`);
    }

    school.salary_scale_5yr_net = item.salary_scale_5yr_net;
    school.net_salary = item.salary_scale_5yr_net;
    school.salary_benchmark_category = item.salary_benchmark_category;
    school.salary_confidence = (item.salary_benchmark_category === 'VERIFIED_SCALE' || item.salary_benchmark_category === 'STRONG_MARKET_EVIDENCE') ? 'High' : 'Medium';
    school.salary_source_year = '2025/2026';
    school.last_benchmark_update = new Date().toISOString();

    const docRef = db.collection('schools').doc(school.id);
    batchWrite.set(docRef, {
      salary_scale_5yr_net: school.salary_scale_5yr_net,
      net_salary: school.net_salary,
      salary_benchmark_category: school.salary_benchmark_category,
      salary_confidence: school.salary_confidence,
      salary_source_year: school.salary_source_year,
      last_benchmark_update: school.last_benchmark_update
    }, { merge: true });

    appliedCount++;
  }

  await batchWrite.commit();
  console.log(`📡 Successfully updated ${appliedCount} records in Firestore.`);

  // Write updated canonical files
  const updatedList = Array.from(canonicalMap.values());
  fs.writeFileSync(exportPath1, JSON.stringify(updatedList, null, 2));
  fs.writeFileSync(exportPath2, JSON.stringify(updatedList, null, 2));

  console.log(`📁 Saved updated canonical exports (Total: ${updatedList.length} schools).`);

  // Count remaining PENDING
  const remainingPending = updatedList.filter(s => s.salary_benchmark_category === 'PENDING').length;
  const totalPopulated = updatedList.filter(s => s.salary_benchmark_category !== 'PENDING').length;

  console.log(`\n================ BATCH 09 APPLIED ================`);
  console.log(`Records Applied: ${appliedCount}`);
  console.log(`Total Populated Benchmarks: ${totalPopulated}`);
  console.log(`Remaining PENDING Schools: ${remainingPending}`);
  console.log(`==================================================\n`);
}

applyBatch09().catch(err => {
  console.error('❌ Failed to apply batch 09:', err);
  process.exit(1);
});

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const serviceAccount = require('../../service-account.json');
if (!getApps().length) initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function runReadOnlyProductionAudit() {
  console.log('🔍 Starting Read-Only Production Audit...');

  // 1. Fetch live Firestore records
  const snap = await db.collection('schools').get();
  const firestoreDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log(`📡 Live Firestore 'schools' collection document count: ${firestoreDocs.length}`);

  // 2. Load public export
  const exportPath = path.resolve(process.cwd(), 'public/complete_school_fields_export.json');
  const exportData: any[] = JSON.parse(fs.readFileSync(exportPath, 'utf-8'));
  console.log(`📁 Local export 'complete_school_fields_export.json' count: ${exportData.length}`);

  // 3. Diff Firestore vs Export
  const exportMap = new Map<string, any>(exportData.map(s => [s.id, s]));
  const firestoreMap = new Map<string, any>(firestoreDocs.map(s => [s.id, s]));

  const inFirestoreNotExport: string[] = [];
  const inExportNotFirestore: string[] = [];
  const discrepancies: any[] = [];

  for (const [id, fDoc] of firestoreMap.entries()) {
    const exp = exportMap.get(id);
    if (!exp) {
      inFirestoreNotExport.push(id);
    } else {
      // Check field parity
      const diff: any = {};
      if (fDoc.name !== exp.name) diff.name = { firestore: fDoc.name, export: exp.name };
      if (fDoc.country !== exp.country) diff.country = { firestore: fDoc.country, export: exp.country };
      if (fDoc.currency !== exp.currency) diff.currency = { firestore: fDoc.currency, export: exp.currency };
      if ((fDoc.salary_scale_5yr_net ?? null) !== (exp.salary_scale_5yr_net ?? null)) {
        diff.salary = { firestore: fDoc.salary_scale_5yr_net, export: exp.salary_scale_5yr_net };
      }
      if ((fDoc.salary_benchmark_category || 'PENDING') !== (exp.salary_benchmark_category || 'PENDING')) {
        diff.category = { firestore: fDoc.salary_benchmark_category, export: exp.salary_benchmark_category };
      }

      if (Object.keys(diff).length > 0) {
        discrepancies.push({ id, diff });
      }
    }
  }

  for (const [id] of exportMap.entries()) {
    if (!firestoreMap.has(id)) {
      inExportNotFirestore.push(id);
    }
  }

  console.log(`\n--- Firestore ↔ Export Parity Report ---`);
  console.log(`In Firestore but not Export: ${inFirestoreNotExport.length} -> [${inFirestoreNotExport.join(', ')}]`);
  console.log(`In Export but not Firestore: ${inExportNotFirestore.length} -> [${inExportNotFirestore.join(', ')}]`);
  console.log(`Field-level Discrepancies: ${discrepancies.length}`);

  if (discrepancies.length > 0) {
    console.log('Discrepancy Samples:', JSON.stringify(discrepancies.slice(0, 10), null, 2));
  }

  // 4. Check PENDING schools
  let pendingWithSalary = 0;
  let populatedBenchmarks = 0;
  let pendingSchools = 0;

  for (const s of exportData) {
    if (s.salary_benchmark_category === 'PENDING') {
      pendingSchools++;
      if (s.salary_scale_5yr_net) pendingWithSalary++;
    } else {
      populatedBenchmarks++;
    }
  }

  console.log(`\n--- Benchmark Status in 459 Canonical Schools ---`);
  console.log(`Populated Benchmarks (VERIFIED/STRONG/MODELLED): ${populatedBenchmarks}`);
  console.log(`Pending Benchmark Schools: ${pendingSchools}`);
  console.log(`Pending Schools with unverified salary numbers: ${pendingWithSalary}`);
}

runReadOnlyProductionAudit().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});

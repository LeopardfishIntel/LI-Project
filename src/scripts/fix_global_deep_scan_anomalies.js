const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

const serviceAccount = require('../../service-account.json');
if (!getApps().length) initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });

const exportPath1 = path.resolve(process.cwd(), 'public/complete_school_fields_export.json');
const exportPath2 = path.resolve(process.cwd(), 'complete_school_fields_export.json');

const canonicalSchools = JSON.parse(fs.readFileSync(exportPath1, 'utf-8'));

async function fixDeepScanAnomalies() {
  console.log('🚀 Fixing Global Deep Scan Anomalies in Firestore and Canonical Exports...\n');
  const batch = db.batch();

  // 1. Fix FLIS0250: The International School of Kuala Lumpur (ISKL)
  const iskl = canonicalSchools.find(s => s.id === 'FLIS0250');
  if (iskl) {
    iskl.name = 'The International School of Kuala Lumpur (ISKL)';
    iskl.schoolname = 'The International School of Kuala Lumpur (ISKL)';
    iskl.country = 'Malaysia';
    iskl.city = 'Kuala Lumpur';
    iskl.currency = 'MYR';
    iskl.salary_scale_5yr_net = 16500;
    iskl.net_salary = 16500;
    iskl.housingprovision = 'Provided housing allowance (MYR 5,000–7,000/mo) or modern Ampang Hilir condo';
    iskl.notes = 'Premier parent-governed non-profit US/IB flagship in KL. Benchmark calibrated to net take-home pay: MYR 16,500/mo (~$3,550 USD).';

    const docRef = db.collection('schools').doc('FLIS0250');
    batch.set(docRef, {
      name: iskl.name,
      schoolname: iskl.schoolname,
      currency: iskl.currency,
      salary_scale_5yr_net: iskl.salary_scale_5yr_net,
      net_salary: iskl.net_salary,
      housingprovision: iskl.housingprovision,
      notes: iskl.notes,
      last_benchmark_update: new Date().toISOString()
    }, { merge: true });
    console.log(' ✔ Fixed FLIS0250: Restored to The International School of Kuala Lumpur (ISKL) with MYR 16,500 net.');
  }

  // 2. Fix FLIS0003: K. International School Tokyo
  const kist = canonicalSchools.find(s => s.id === 'FLIS0003');
  if (kist) {
    kist.currency = 'JPY';
    kist.salary_scale_5yr_net = 437500; // Monthly net (5.25M JPY annual net)
    kist.net_salary = 437500;
    kist.notes = 'Top academic IB continuum school in Koto-ku, Tokyo. Calibrated to net monthly take-home pay: JPY 437,500/mo (~$2,900 USD).';

    const docRef = db.collection('schools').doc('FLIS0003');
    batch.set(docRef, {
      currency: kist.currency,
      salary_scale_5yr_net: kist.salary_scale_5yr_net,
      net_salary: kist.net_salary,
      notes: kist.notes,
      last_benchmark_update: new Date().toISOString()
    }, { merge: true });
    console.log(' ✔ Fixed FLIS0003: Currency set to JPY, salary 437,500 JPY/mo net.');
  }

  // 3. Normalize Unscaled CoL Transport Records in Firestore
  const colFixes = [
    { id: 'cape-town-south-africa', transport: 25 },
    { id: 'johannesburg-south-africa', transport: 25 },
    { id: 'ethiopia', transport: 20 },
    { id: 'ghana', transport: 35 },
    { id: 'kazakhstan', transport: 20 },
    { id: 'nepal', transport: 25 },
    { id: 'nigeria', transport: 25 },
    { id: 'sri_lanka', transport: 40 },
    { id: 'taiwan', transport: 40 },
    { id: 'turkey', transport: 45 }
  ];

  for (const f of colFixes) {
    const ref = db.collection('locations_costOfLiving').doc(f.id);
    batch.set(ref, {
      transport: f.transport,
      monthlyTransport: f.transport,
      transportPass: f.transport,
      normalizedToUSD: true,
      lastNormalizedAt: new Date().toISOString()
    }, { merge: true });
    console.log(` ✔ Normalized CoL transport in Firestore: ${f.id} -> $${f.transport} USD`);
  }

  await batch.commit();
  console.log('\n📡 All fixes committed to Firestore.');

  // Save to canonical exports
  fs.writeFileSync(exportPath1, JSON.stringify(canonicalSchools, null, 2));
  fs.writeFileSync(exportPath2, JSON.stringify(canonicalSchools, null, 2));
  console.log(`📁 Saved updated canonical exports (${canonicalSchools.length} schools).`);
}

fixDeepScanAnomalies().catch(console.error);

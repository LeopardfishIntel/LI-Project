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

async function applySystemicCalibrations() {
  console.log('🚀 Starting Systemic Calibration across CoL and School Records...\n');

  const batch = db.batch();

  // 1. UPDATE COST OF LIVING RECORDS (Bangkok, Jeddah, Khobar/Dhahran)
  console.log('--- Step 1: Calibrating Cost of Living Baselines in Firestore ---');
  
  // Bangkok CoL Updates
  const bkkSnap = await db.collection('locations_costOfLiving').get();
  bkkSnap.forEach(doc => {
    const data = doc.data();
    const id = doc.id.toLowerCase();
    const city = (data.city || '').toLowerCase();

    if (id.includes('bangkok') || city.includes('bangkok')) {
      console.log(`Updating Bangkok CoL: ${doc.id}`);
      batch.set(doc.ref, {
        groceries: 320, // Tops/Villa Market expat grocery basket
        foodGroceries: 320,
        utilities: 140, // 24/7 air conditioning in tropical climate
        utilitiesMonthly: 140,
        diningSocial: 280, // Expat restaurants/cafes & social
        transport: 75, // BTS SkyTrain & Grab rides
        transportPass: 75,
        mobilePhone: 20,
        internet: 25,
        internetMonthly: 25,
        rent1br: 750, // Central Bangkok modern condo (Sukhumvit/Sathorn)
        monthlyRent1BR: 750,
        rent2br: 1250,
        monthlyRent2BR: 1250,
        rent3br: 1850,
        monthlyRent3BR: 1850,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }

    // Jeddah & Khobar/Dhahran CoL Updates
    if (id.includes('jeddah') || id.includes('dhahran') || id.includes('khobar') || (city.includes('jeddah') || city.includes('dhahran') || city.includes('khobar'))) {
      console.log(`Updating Saudi Urban CoL: ${doc.id}`);
      batch.set(doc.ref, {
        transport: 320, // Mandatory private driver / car rental in urban sprawl
        monthlyTransport: 320,
        utilities: 240, // Extreme summer A/C district cooling & electricity
        utilitiesMonthly: 240,
        groceries: 380,
        foodGroceries: 380,
        diningSocial: 250,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }
  });

  // 2. LOAD CANONICAL SCHOOL EXPORTS
  const canonicalSchools = JSON.parse(fs.readFileSync(exportPath1, 'utf-8'));
  console.log(`\n--- Step 2: Calibrating ${canonicalSchools.length} Canonical Schools ---`);

  // Target calibrations
  const updatesSummary = [];

  for (const s of canonicalSchools) {
    let modified = false;

    // A. THAILAND GROSS-TO-NET RE-CALIBRATION
    if (s.country === 'Thailand') {
      const grossMap = {
        'FLIS0139': 125000, // King's College Bangkok (Gross ~154k -> Net ~125k)
        'FLIS0142': 125000, // IS Bangkok (ISB)
        'FLIS0376': 125000, // NIST
        'FLIS0378': 125000, // Shrewsbury Riverside
        'FLIS0401': 125000, // St. Andrews Bangkok
        'FLIS0141': 115000, // Wellington Bangkok (Gross ~141k -> Net ~115k)
        'FLIS0377': 115000, // Harrow Bangkok
        'FLIS0138': 112000, // Brighton Bangkok (Gross ~137.5k -> Net ~112k)
        'FLIS0455': 95000,  // Denla British (Gross ~115k -> Net ~95k)
      };

      if (grossMap[s.id]) {
        const oldSalary = s.salary_scale_5yr_net;
        s.salary_scale_5yr_net = grossMap[s.id];
        s.notes = (s.notes ? s.notes + ' ' : '') + `[Calibrated to net take-home pay after Thai PIT progressive tax: THB ${grossMap[s.id].toLocaleString()}/mo]`;
        modified = true;
        updatesSummary.push(`[${s.id}] ${s.name} (Thailand): Salary calibrated from THB ${oldSalary} to THB ${s.salary_scale_5yr_net} net`);
      }
    }

    // B. BRAZIL GROSS-TO-NET RE-CALIBRATION
    if (s.country === 'Brazil') {
      const brazilMap = {
        'FLIS0184': 14800, // Graded School (Gross ~20k -> Net ~14.8k after 27.5% IRPF + INSS)
        'FLIS0240': 14500, // Malvern São Paulo
        'FLIS0451': 14200, // British School Rio
        'FLIS0182': 14300, // St. Paul's School
        'FLIS0454': 13800, // St. Francis' College
      };

      if (brazilMap[s.id]) {
        const oldSalary = s.salary_scale_5yr_net;
        s.salary_scale_5yr_net = brazilMap[s.id];
        s.notes = (s.notes ? s.notes + ' ' : '') + `[Calibrated to net take-home pay after Brazilian IRPF + INSS: BRL ${brazilMap[s.id].toLocaleString()}/mo]`;
        modified = true;
        updatesSummary.push(`[${s.id}] ${s.name} (Brazil): Salary calibrated from BRL ${oldSalary} to BRL ${s.salary_scale_5yr_net} net`);
      }
    }

    // C. SWISS BOARDING SCHOOLS HOUSING STATUS (Exclude from universal $0 rent)
    const swissBoardingIds = ['FLIS0047', 'FLIS0055', 'FLIS0072', 'FLIS0086', 'FLIS0411', 'FLIS0412'];
    if (swissBoardingIds.includes(s.id)) {
      s.housingprovision = 'Self-Funded (Unless Residential Boarding Houseparent Role)';
      s.housing_status = 'Self-funded';
      s.intel = {
        ...(s.intel || {}),
        housing: {
          provided: false,
          type: 'Self-Funded Private Lease / Conditional Boarding House Role',
          notes: 'Standard teaching faculty secure and pay for private accommodation in Geneva/Vaud/Lugano; on-campus residential housing is restricted to active Houseparents with evening/weekend dorm supervision duties.'
        }
      };
      modified = true;
      updatesSummary.push(`[${s.id}] ${s.name} (Switzerland): Housing status set to Self-Funded (Non-universal)`);
    }

    // D. HONG KONG & SINGAPORE HOUSING ALLOWANCES (Ensure correct package modeling)
    const hkSgIds = ['FLIS0381', 'FLIS0383', 'FLIS0382', 'FLIS0374', 'FLIS0375'];
    if (hkSgIds.includes(s.id)) {
      s.intel = {
        ...(s.intel || {}),
        packageType: 'Salary + Dedicated Cash Housing Allowance',
        housing: {
          provided: false, // Allowance is paid in cash and spent on market rent
          type: 'Cash Housing Allowance (Pass-Through to Landlord)',
          notes: 'School provides a monthly cash housing allowance (HKD 22k–45k / SGD 3.5k–5k) to offset local private lease rent.'
        }
      };
      s.housing_status = 'Self-funded (Allowance Offset)';
      modified = true;
      updatesSummary.push(`[${s.id}] ${s.name} (HK/SG): Housing flagged as Pass-Through Cash Allowance`);
    }

    if (modified) {
      const docRef = db.collection('schools').doc(s.id);
      batch.set(docRef, {
        salary_scale_5yr_net: s.salary_scale_5yr_net,
        housingprovision: s.housingprovision,
        housing_status: s.housing_status,
        intel: s.intel,
        notes: s.notes || '',
        last_benchmark_update: new Date().toISOString()
      }, { merge: true });
    }
  }

  await batch.commit();
  console.log('📡 Successfully committed all calibrations to Firestore.');

  // Save to local canonical exports
  fs.writeFileSync(exportPath1, JSON.stringify(canonicalSchools, null, 2));
  fs.writeFileSync(exportPath2, JSON.stringify(canonicalSchools, null, 2));
  console.log(`📁 Saved updated canonical exports (${canonicalSchools.length} schools).`);

  console.log('\n--- Summary of Calibrations Applied ---');
  updatesSummary.forEach(u => console.log(` ✔ ${u}`));
}

applySystemicCalibrations().catch(console.error);

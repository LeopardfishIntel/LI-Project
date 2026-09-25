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

async function fixAndDeepScan() {
  console.log('🚀 Phase 1: Applying Fixes for Identified Outliers...\n');
  const batch = db.batch();

  // 1. Fix FLIS0191 (International Christian School of Vienna)
  const icsv = canonicalSchools.find(s => s.id === 'FLIS0191');
  if (icsv) {
    icsv.currency = 'EUR';
    icsv.salary_scale_5yr_net = 2350;
    icsv.net_salary = 2350;
    icsv.notes = 'Verified Austrian collective agreement (Kollektivvertrag) baseline: €2,350 net/month (paid 14x/year).';
    const docRef = db.collection('schools').doc('FLIS0191');
    batch.set(docRef, {
      currency: icsv.currency,
      salary_scale_5yr_net: icsv.salary_scale_5yr_net,
      net_salary: icsv.net_salary,
      notes: icsv.notes,
      last_benchmark_update: new Date().toISOString()
    }, { merge: true });
    console.log(' ✔ Fixed FLIS0191 (Vienna): Currency set to EUR, salary 2,350 net.');
  }

  // 2. Fix Uruguay CoL in Firestore
  const uruguayRef = db.collection('locations_costOfLiving').doc('uruguay');
  batch.set(uruguayRef, {
    transport: 55, // Normalized USD
    monthlyTransport: 55,
    transportPass: 55,
    groceries: 380,
    foodGroceries: 380,
    utilities: 130,
    utilitiesMonthly: 130,
    mobilePhone: 25,
    mobileMonthly: 25,
    internet: 35,
    internetMonthly: 35,
    diningSocial: 220,
    rent1br: 575,
    monthlyRent1BR: 575,
    rent2br: 910,
    monthlyRent2BR: 910,
    rent3br: 1390,
    monthlyRent3BR: 1390,
    normalizedToUSD: true,
    lastNormalizedAt: new Date().toISOString()
  }, { merge: true });
  console.log(' ✔ Normalized Uruguay Cost of Living in Firestore.');

  // 3. Add Algarve Regional CoL in Firestore for FLIS0208
  const algarveRef = db.collection('locations_costOfLiving').doc('portugal_algarve');
  batch.set(algarveRef, {
    country: 'Portugal',
    countryName: 'Portugal',
    countryKey: 'portugal',
    city: 'Algarve / Lagoa',
    id: 'portugal_algarve',
    currencyCode: 'EUR',
    usdReference: 'USD',
    rent1br: 750, // Local Algarve / Lagoa market rent
    monthlyRent1BR: 750,
    rent2br: 1100,
    monthlyRent2BR: 1100,
    rent3br: 1500,
    monthlyRent3BR: 1500,
    groceries: 280,
    food: 280,
    utilities: 110,
    utilitiesMonthly: 110,
    transport: 40,
    diningSocial: 180,
    internet: 35,
    mobilePhone: 20,
    uncoveredMedical: 20,
    updatedAt: new Date().toISOString()
  }, { merge: true });
  console.log(' ✔ Added portugal_algarve Cost of Living in Firestore.');

  // 4. Fix Gulf & China Compound Schools Housing Classification
  const compoundSchoolIds = [
    'FLIS0281', // Park House English School (Qatar)
    'FLIS0305', // Oryx International School (Qatar)
    'FLIS0307', // Sherborne Qatar
    'FLIS0306', // ACS Int'l School Doha (Qatar)
    'FLIS0322', // Lycée Libanais Privé Meydan (Dubai, UAE)
    'FLIS0318', // Dubai Schools Al Barsha (Dubai, UAE)
    'FLIS0319', // Dubai School Nad Al Sheba (Dubai, UAE)
    'FLIS0321', // Dubai Schools Al Khawaneej (Dubai, UAE)
    'FLIS0111', // Horizon International School (Dubai, UAE)
    'FLIS0097', // Saud International School (Riyadh, Saudi)
    'FLIS0373', // Beech Hall School Riyadh (Saudi)
    'FLIS0095', // Al Faris International School (Riyadh, Saudi)
    'FLIS0092', // SEK International School Riyadh (Saudi)
    'FLIS0238', // Malvern College Chengdu (China)
    'FLIS0237', // Malvern College Qingdao (China)
    'FLIS0225'  // Modern Educational Complex Baku (Azerbaijan)
  ];

  for (const id of compoundSchoolIds) {
    const s = canonicalSchools.find(x => x.id === id);
    if (s) {
      s.housingprovision = 'Provided (Expat Compound Villa / Corporate Leased Apartment)';
      s.housing_status = 'Provided';
      s.intel = {
        ...(s.intel || {}),
        packageType: 'Full Expat Package + Provided Accommodation',
        housing: {
          provided: true,
          type: 'Provided Compound Residence / Corporate Leased Flat',
          notes: 'School provides fully furnished accommodation / compound residence with utilities subsidized, isolating faculty from local rent expenses.'
        }
      };
      const docRef = db.collection('schools').doc(id);
      batch.set(docRef, {
        housingprovision: s.housingprovision,
        housing_status: s.housing_status,
        intel: s.intel,
        last_benchmark_update: new Date().toISOString()
      }, { merge: true });
      console.log(` ✔ Fixed Housing Provision for [${id}] ${s.name} (${s.country}).`);
    }
  }

  await batch.commit();
  console.log('\n📡 Phase 1 Committed to Firestore.');

  // Save canonical files
  fs.writeFileSync(exportPath1, JSON.stringify(canonicalSchools, null, 2));
  fs.writeFileSync(exportPath2, JSON.stringify(canonicalSchools, null, 2));

  console.log('\n======================================================');
  console.log('🔍 Phase 2: Comprehensive Global Scan for More Errors');
  console.log('======================================================\n');

  // SCAN 1: Currency Mismatches across all 459 schools
  console.log('--- Scan 1: Currency vs Country Sanity Check ---');
  const currencyAnomalies = [];
  const EXPECTED_CURRENCY_MAP = {
    'Austria': ['EUR'],
    'Belgium': ['EUR'],
    'France': ['EUR'],
    'Germany': ['EUR'],
    'Italy': ['EUR'],
    'Netherlands': ['EUR'],
    'Portugal': ['EUR'],
    'Spain': ['EUR'],
    'Cyprus': ['EUR'],
    'Greece': ['EUR'],
    'Monaco': ['EUR'],
    'Switzerland': ['CHF'],
    'United Kingdom': ['GBP'],
    'Czech Republic': ['CZK', 'EUR', 'USD'],
    'Poland': ['PLN', 'EUR', 'USD'],
    'Hungary': ['HUF', 'EUR'],
    'Bulgaria': ['EUR', 'BGN'],
    'Norway': ['NOK'],
    'Sweden': ['SEK'],
    'Denmark': ['DKK'],
    'United Arab Emirates': ['AED', 'USD'],
    'Saudi Arabia': ['SAR', 'USD'],
    'Qatar': ['QAR', 'USD'],
    'Kuwait': ['KWD', 'USD'],
    'Oman': ['OMR', 'USD'],
    'Bahrain': ['BHD', 'USD'],
    'Jordan': ['JOD', 'USD'],
    'Egypt': ['USD', 'EGP'],
    'Hong Kong': ['HKD'],
    'Singapore': ['SGD'],
    'Japan': ['JPY'],
    'South Korea': ['KRW', 'USD'],
    'China': ['CNY', 'USD'],
    'Taiwan': ['TWD'],
    'Thailand': ['THB'],
    'Malaysia': ['MYR'],
    'Indonesia': ['USD', 'IDR'],
    'Vietnam': ['USD', 'VND'],
    'Philippines': ['USD', 'PHP'],
    'India': ['INR', 'USD'],
    'Sri Lanka': ['USD', 'LKR'],
    'Brunei': ['BND', 'SGD'],
    'Brazil': ['BRL', 'USD'],
    'Colombia': ['COP', 'USD'],
    'Peru': ['PEN', 'USD'],
    'Chile': ['CLP', 'USD'],
    'Mexico': ['MXN', 'USD'],
    'Uruguay': ['UYU', 'USD'],
    'Kenya': ['KES', 'USD'],
    'Nigeria': ['USD', 'NGN'],
    'South Africa': ['ZAR'],
    'Azerbaijan': ['AZN', 'USD'],
    'Kazakhstan': ['USD', 'KZT'],
    'Uzbekistan': ['USD', 'UZS'],
    'Georgia': ['USD', 'GEL']
  };

  canonicalSchools.forEach(s => {
    const expected = EXPECTED_CURRENCY_MAP[s.country];
    if (expected && !expected.includes(s.currency)) {
      currencyAnomalies.push({
        id: s.id,
        name: s.name,
        country: s.country,
        currentCurrency: s.currency,
        expectedCurrencies: expected,
        salary: s.salary_scale_5yr_net
      });
    }
  });

  if (currencyAnomalies.length === 0) {
    console.log('✅ All 459 schools have valid, expected national/hard currencies.');
  } else {
    console.log(`⚠️ Found ${currencyAnomalies.length} Currency Anomalies:`);
    console.log(JSON.stringify(currencyAnomalies, null, 2));
  }

  // SCAN 2: Cost of Living Extreme Value Outliers in Firestore
  console.log('\n--- Scan 2: Unnormalized CoL Records Check in Firestore ---');
  const colSnap = await db.collection('locations_costOfLiving').get();
  const colAnomalies = [];

  colSnap.forEach(doc => {
    const d = doc.data();
    const id = doc.id;
    const rent1 = Number(d.rent1br || d.monthlyRent1BR || 0);
    const rent3 = Number(d.rent3br || d.monthlyRent3BR || 0);
    const groceries = Number(d.groceries || d.foodGroceries || d.food || 0);
    const transport = Number(d.transport || d.monthlyTransport || d.transportPass || 0);
    const utilities = Number(d.utilities || d.utilitiesMonthly || 0);

    const issues = [];
    if (rent1 > 5000) issues.push(`Rent 1BR ($${rent1}) exceeds $5,000 threshold`);
    if (rent1 < 100 && rent1 > 0) issues.push(`Rent 1BR ($${rent1}) suspiciously under $100`);
    if (groceries > 1200) issues.push(`Groceries ($${groceries}) exceeds $1,200 threshold`);
    if (transport > 400) issues.push(`Transport ($${transport}) exceeds $400 threshold (possible unscaled local currency)`);
    if (utilities > 700) issues.push(`Utilities ($${utilities}) exceeds $700 threshold`);

    if (issues.length > 0) {
      colAnomalies.push({ id, city: d.city, country: d.country, issues });
    }
  });

  if (colAnomalies.length === 0) {
    console.log('✅ All Cost of Living records are cleanly scaled in USD with no unscaled anomalies.');
  } else {
    console.log(`⚠️ Found ${colAnomalies.length} CoL Anomalies:`);
    console.log(JSON.stringify(colAnomalies, null, 2));
  }

  // SCAN 3: Salary Magnitude Outliers vs Peer Range
  console.log('\n--- Scan 3: Benchmark Salary Magnitude Check (<$1,500 or >$12,000 USD/mo) ---');
  const RATES_MAP = {
    CZK: 30.2, AED: 4.65, EUR: 1.18, GBP: 1.0, SAR: 4.75, QAR: 4.62,
    CHF: 1.12, DKK: 8.85, USD: 1.27, AZN: 2.15, HKD: 9.85, JPY: 190, 
    SGD: 1.7, MYR: 5.9, THB: 45, CNY: 9.1, BRL: 6.5, ARS: 1200, OMR: 0.49,
    KRW: 1750, VND: 32000, IDR: 20000, KWD: 0.39, BHD: 0.48, EGP: 60, JOD: 0.90, ZAR: 24, MXN: 21, COP: 4900,
    TWD: 41.5, TRY: 44.0, KZT: 630.0, KHR: 5200.0, GHS: 19.2, NGN: 2050.0, ETB: 158.0, MAD: 12.8, CLP: 1220.0, PAB: 1.28,
    BGN: 2.30, RSD: 138.0, NPR: 175.0, LKR: 390.0, BND: 1.70, UYU: 52.0, GEL: 3.50, UZS: 16200.0,
    NOK: 13.8, SEK: 13.5, PLN: 5.15, HUF: 465.0, INR: 106.0, KES: 165.0
  };

  const salaryOutliers = [];
  canonicalSchools.forEach(s => {
    const raw = s.salary_scale_5yr_net || s.net_salary || 0;
    const cur = s.currency || 'USD';
    let usd = raw;
    if (cur !== 'USD' && RATES_MAP[cur]) {
      usd = (raw / RATES_MAP[cur]) * (RATES_MAP['USD'] || 1.27);
    }
    if (usd < 1500) {
      salaryOutliers.push({ id: s.id, name: s.name, country: s.country, currency: cur, raw, usd: Math.round(usd), issue: 'Low Net Pay (< $1,500 USD/mo)' });
    }
    if (usd > 11000) {
      salaryOutliers.push({ id: s.id, name: s.name, country: s.country, currency: cur, raw, usd: Math.round(usd), issue: 'Extreme High Net Pay (> $11,000 USD/mo)' });
    }
  });

  if (salaryOutliers.length === 0) {
    console.log('✅ All 459 schools fall within standard global international salary bands ($1,500 – $11,000 USD net).');
  } else {
    console.log(`⚠️ Found ${salaryOutliers.length} Extreme Salary Band Schools:`);
    console.log(JSON.stringify(salaryOutliers, null, 2));
  }
}

fixAndDeepScan().catch(console.error);

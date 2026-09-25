const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

const serviceAccount = require('../../service-account.json');
if (!getApps().length) initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const exportPath = path.resolve(process.cwd(), 'public/complete_school_fields_export.json');
const schools = JSON.parse(fs.readFileSync(exportPath, 'utf-8'));

const RATES = {
  GBP: 1.0,
  USD: 1.27,
  EUR: 1.17,
  AED: 4.66,
  SAR: 4.76,
  QAR: 4.62,
  OMR: 0.49,
  KWD: 0.39,
  BHD: 0.48,
  JOD: 0.90,
  SGD: 1.70,
  HKD: 9.87,
  MYR: 5.68,
  THB: 43.5,
  CNY: 9.15,
  JPY: 195.0,
  KRW: 1720.0,
  INR: 106.0,
  VND: 31500.0,
  IDR: 20500.0,
  PHP: 72.0,
  BRL: 6.85,
  MXN: 25.5,
  CLP: 1220.0,
  COP: 5200.0,
  PEN: 4.75,
  CHF: 1.12,
  CZK: 29.5,
  PLN: 5.15,
  HUF: 465.0,
  TRY: 42.0,
  EGP: 62.0,
  KES: 165.0,
  AZN: 2.16,
  KZT: 630.0,
  UZS: 16200.0,
  GEL: 3.45,
  TWD: 40.5,
  BND: 1.70
};

const canonicalCountry = (c) => {
  if (!c) return '';
  const s = c.toLowerCase().trim();
  if (s.includes('chile')) return 'chile';
  if (s.includes('vietnam') || s.includes('viet nam')) return 'vietnam';
  if (s.includes('argentina')) return 'argentina';
  if (s.includes('france')) return 'france';
  if (s.includes('japan')) return 'japan';
  if (s.includes('china')) return 'china';
  if (s.includes('emirates') || s.includes('uae') || s.includes('dubai') || s.includes('abu dhabi')) return 'united-arab-emirates';
  if (s.includes('qatar')) return 'qatar';
  if (s.includes('saudi')) return 'saudi-arabia';
  if (s.includes('spain')) return 'spain';
  if (s.includes('italy')) return 'italy';
  if (s.includes('germany')) return 'germany';
  if (s.includes('singapore')) return 'singapore';
  if (s.includes('hong kong')) return 'hong-kong';
  if (s.includes('thailand')) return 'thailand';
  if (s.includes('malaysia')) return 'malaysia';
  if (s.includes('indonesia')) return 'indonesia';
  if (s.includes('korea')) return 'south-korea';
  if (s.includes('brazil')) return 'brazil';
  if (s.includes('colombia')) return 'colombia';
  if (s.includes('peru')) return 'peru';
  if (s.includes('mexico')) return 'mexico';
  if (s.includes('egypt')) return 'egypt';
  if (s.includes('kenya')) return 'kenya';
  if (s.includes('turkey') || s.includes('turkiye')) return 'turkey';
  if (s.includes('russia')) return 'russia';
  if (s.includes('switzerland')) return 'switzerland';
  if (s.includes('netherlands')) return 'netherlands';
  if (s.includes('czech')) return 'czech-republic';
  if (s.includes('hungary')) return 'hungary';
  if (s.includes('poland')) return 'poland';
  if (s.includes('austria')) return 'austria';
  if (s.includes('belgium')) return 'belgium';
  if (s.includes('portugal')) return 'portugal';
  if (s.includes('greece')) return 'greece';
  if (s.includes('cyprus')) return 'cyprus';
  if (s.includes('azerbaijan')) return 'azerbaijan';
  if (s.includes('kazakhstan')) return 'kazakhstan';
  if (s.includes('uzbekistan')) return 'uzbekistan';
  if (s.includes('georgia')) return 'georgia';
  if (s.includes('taiwan')) return 'taiwan';
  if (s.includes('philippines')) return 'philippines';
  if (s.includes('india')) return 'india';
  if (s.includes('sri lanka')) return 'sri-lanka';
  return s.replace(/[^a-z0-9]+/g, '-');
};

const isHousingProvided = (statusRaw, explicitProvided) => {
  if (explicitProvided === true) return true;
  if (explicitProvided === false) return false;
  if (!statusRaw) return false;
  const s = String(statusRaw).toLowerCase();
  if (s.includes('provided') || s.includes('furnished') || s.includes('free accommodation') || s.includes('on-campus') || s.includes('school housing')) {
    if (s.includes('not provided') || s.includes('unprovided') || s.includes('no accommodation')) return false;
    return true;
  }
  return false;
};

function calculateEngineOutflows(adults, children, col, isProv, school) {
  const safeVal = (v) => parseFloat(String(v)) || 0;

  // Food
  const food = (safeVal(col.groceries) || safeVal(col.food) || 350) * adults + 
               (safeVal(col.groceries) || safeVal(col.food) || 350) * 0.5 * children;

  // Transport: if col.transport is an object or number
  let trans = 45;
  if (typeof col.transport === 'number') trans = col.transport;
  else if (col.transport && typeof col.transport === 'object') {
    trans = safeVal(col.transport.publicTransport || col.transport.transitMonthlyUSD || 45);
  } else if (col.monthlyTransport) trans = safeVal(col.monthlyTransport);
  else if (col.publicTransport && typeof col.publicTransport === 'number') trans = col.publicTransport;
  else if (col.publicTransport && typeof col.publicTransport === 'object') {
    trans = safeVal(col.publicTransport.single || 45);
    // If transport is annual (> 300), divide by 12
    if (trans > 300) trans = Math.round(trans / 12);
  }

  const transport = trans * adults + trans * 0.3 * children;
  const mobile = (safeVal(col.mobilePhone) || safeVal(col.mobileMonthly) || safeVal(col.mobile) || 22) * adults;
  const dining = (safeVal(col.diningSocial) || safeVal(col.socialMonthly) || 195) * adults;
  const medical = (safeVal(col.uncoveredMedical) || 20) * adults + (safeVal(col.uncoveredMedical) || 20) * 0.5 * children;
  const utilities = safeVal(col.utilities) || safeVal(col.utilitiesMonthly) || 150;
  const internet = safeVal(col.internet) || safeVal(col.internetMonthly) || 50;

  let rent = 0;
  const provStr = String(school?.housingprovision || school?.housing || '').toLowerCase();
  const explicitSubsidy = safeVal(school?.housing_subsidy_rate);
  let subsidyRate = 0;
  if (explicitSubsidy > 0 && explicitSubsidy <= 1) subsidyRate = explicitSubsidy;
  else if (/(\d+)\s*%/i.test(provStr)) subsidyRate = parseInt(provStr.match(/(\d+)\s*%/i)[1], 10) / 100;
  else if (provStr.includes('subsid')) subsidyRate = 0.5;

  if (!isProv || subsidyRate > 0) {
    let rent1BR = Number(col.monthlyRent1BR ?? col.rent1br ?? col.rent ?? 1200);
    // If col is in local currency (e.g. AED 6500 or BRL 4000), check if currencyCode is not USD and convert to USD
    if (col.currencyCode && col.currencyCode !== 'USD' && col.monthlyRent1BR && Number(col.monthlyRent1BR) > 2500) {
      const cRate = RATES[col.currencyCode] || 1.0;
      const uRate = RATES['USD'] || 1.27;
      rent1BR = Math.round((rent1BR / cRate) * uRate);
    }
    rent = rent1BR;
    if (subsidyRate > 0) rent = rent * (1 - subsidyRate);
  }

  return Math.round(food + transport + mobile + dining + medical + utilities + internet + rent);
}

async function runTrueEngineAudit() {
  const colSnap = await db.collection('locations_costOfLiving').get();
  const colMap = new Map();
  colSnap.forEach(d => colMap.set(d.id.toLowerCase(), d.data()));

  const ratesSnap = await db.collection('system_config').doc('exchange_rates').get();
  const liveRates = ratesSnap.exists ? (ratesSnap.data()?.rates || {}) : {};
  const currentRates = { ...RATES, ...liveRates };

  const results = [];

  for (const s of schools) {
    const sCountry = canonicalCountry(s.country || s.region || '');
    const sCity = (s.city || s.location || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
    
    let activeCOL = colMap.get(`${sCountry}-${sCity}`) || colMap.get(sCountry) || colMap.get(sCity) || null;
    if (!activeCOL) {
      for (const [k, v] of colMap.entries()) {
        if (k.startsWith(sCountry) || k.includes(sCountry)) {
          activeCOL = v;
          break;
        }
      }
    }

    const currency = s.currency || activeCOL?.currency || 'USD';
    const localSalary = s.salary_scale_5yr_net || s.net_salary || 0;

    // Convert local monthly net salary to USD
    let netUSD = localSalary;
    if (currency !== 'USD' && currentRates[currency]) {
      const usdRate = currentRates['USD'] || 1.27;
      const localRate = currentRates[currency] || 1.0;
      netUSD = (localSalary / localRate) * usdRate;
    }

    const housingStatusRaw = String(s.housingprovision || s.housing || s.accommodation || s.housing_status || '');
    const explicitProvided = s.intel?.housing?.provided;
    const isProvided = isHousingProvided(housingStatusRaw, explicitProvided);

    const outgoingsUSD = calculateEngineOutflows(1, 0, activeCOL || {}, isProvided, s);
    const surplusUSD = Math.round(netUSD - outgoingsUSD);
    const surplusPercent = netUSD > 0 ? parseFloat(((surplusUSD / netUSD) * 100).toFixed(1)) : -100;

    results.push({
      id: s.id,
      name: s.name,
      country: s.country,
      city: s.city,
      currency,
      localSalary,
      netUSD: Math.round(netUSD),
      outgoingsUSD,
      surplusUSD,
      surplusPercent,
      isProvided,
      housingStatusRaw,
      salary_benchmark_category: s.salary_benchmark_category
    });
  }

  const lowSurplus = results.filter(r => r.surplusPercent < 5.0);

  console.log(`\n================ LOW SURPLUS (< 5%) TRUE ENGINE AUDIT ================`);
  console.log(`Total Schools: ${results.length}`);
  console.log(`Schools with < 5% Surplus: ${lowSurplus.length} (${((lowSurplus.length / results.length) * 100).toFixed(1)}%)\n`);

  // Group by country
  const byCountry = {};
  for (const item of lowSurplus) {
    if (!byCountry[item.country]) byCountry[item.country] = [];
    byCountry[item.country].push(item);
  }

  for (const [c, list] of Object.entries(byCountry)) {
    console.log(`\n========================================`);
    console.log(`COUNTRY: ${c} (${list.length} schools)`);
    console.log(`========================================`);
    for (const item of list) {
      console.log(`[${item.id}] ${item.name} (${item.city || 'N/A'})`);
      console.log(`   Net Salary: ${item.currency} ${item.localSalary.toLocaleString()} (~$${item.netUSD} USD/mo)`);
      console.log(`   Outflows: ~$${item.outgoingsUSD} USD/mo | Surplus: ~$${item.surplusUSD} USD/mo (${item.surplusPercent}%)`);
      console.log(`   Housing: ${item.isProvided ? 'Provided' : 'Self-Pay'} ("${item.housingStatusRaw}") | Category: ${item.salary_benchmark_category}`);
    }
  }

  fs.writeFileSync('src/data/low_surplus_schools.json', JSON.stringify(lowSurplus, null, 2));
}

runTrueEngineAudit().catch(console.error);

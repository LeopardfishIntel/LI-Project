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

const safeParse = (v) => {
  if (typeof v === 'number') return isNaN(v) ? 0 : v;
  if (!v) return 0;
  const cleaned = String(v).replace(/[^0-9.-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
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
  if (s.includes('monaco')) return 'monaco';
  if (s.includes('nigeria')) return 'nigeria';
  return s.replace(/[^a-z0-9]+/g, '-');
};

const isHousingProvided = (statusRaw, explicitProvided) => {
  if (explicitProvided === true) return true;
  if (explicitProvided === false) return false;
  if (!statusRaw) return false;
  const s = String(statusRaw).toLowerCase();
  if (s.includes('provided') || s.includes('furnished') || s.includes('free accommodation') || s.includes('on-campus') || s.includes('school housing')) {
    if (s.includes('not provided') || s.includes('unprovided') || s.includes('no accommodation') || s.includes('none')) return false;
    return true;
  }
  return false;
};

// 14-month statutory cycle countries
const has14MonthCycle = (countryName) => {
  const c = canonicalCountry(countryName);
  return ['spain', 'portugal', 'italy', 'austria', 'greece'].includes(c);
};

async function runRefinedAnalysis() {
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
    
    // 1. Monaco Cross-Border living fix: map Monaco to French cross-border baseline (France)
    let activeCOL = null;
    if (sCountry === 'monaco' || sCity === 'monaco' || s.id === 'FLIS0039') {
      activeCOL = colMap.get('france') || colMap.get('mougins') || colMap.get('nice');
    } else {
      activeCOL = colMap.get(`${sCountry}-${sCity}`) || colMap.get(sCountry) || colMap.get(sCity) || null;
      if (!activeCOL) {
        for (const [k, v] of colMap.entries()) {
          if (k.startsWith(sCountry) || k.includes(sCountry)) {
            activeCOL = v;
            break;
          }
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
    const isProv = isHousingProvided(housingStatusRaw, explicitProvided);

    // 2. Subsidies calculation (using the implemented 90% or parsed % or allowance method)
    let subsidyRate = 0;
    const explicitSubsidy = safeParse(s.housing_subsidy_rate);
    if (explicitSubsidy > 0 && explicitSubsidy <= 1) {
      subsidyRate = explicitSubsidy;
    } else if (/(\d+)\s*%/i.test(housingStatusRaw)) {
      subsidyRate = parseInt(housingStatusRaw.match(/(\d+)\s*%/i)[1], 10) / 100;
    } else if (housingStatusRaw.toLowerCase().includes('subsid')) {
      subsidyRate = 0.90; // Standard 90% subsidy heuristic from codebase
    } else if (housingStatusRaw.toLowerCase().includes('allowance') && !housingStatusRaw.toLowerCase().includes('not included')) {
      // If allowance amount is stated, e.g. €700-1,000/mo allowance against €1,200 rent -> ~65-75% subsidy
      const euroMatch = housingStatusRaw.match(/[€$](\d+[\d,]*)/);
      if (euroMatch) {
        const allowanceVal = parseInt(euroMatch[1].replace(/,/g, ''), 10);
        if (allowanceVal > 400 && allowanceVal < 1500) {
          subsidyRate = Math.min(0.85, allowanceVal / 1200);
        }
      } else {
        subsidyRate = 0.50; // default 50% allowance support
      }
    }

    const safeVal = (v) => parseFloat(String(v)) || 0;
    const food = safeVal(activeCOL?.groceries || activeCOL?.foodGroceries || 350);
    const trans = safeVal(activeCOL?.transport || activeCOL?.monthlyTransport || 45);
    const mobile = safeVal(activeCOL?.mobilePhone || activeCOL?.mobileMonthly || 22);
    const dining = safeVal(activeCOL?.diningSocial || activeCOL?.socialMonthly || 195);
    const medical = safeVal(activeCOL?.uncoveredMedical || 20);
    const utilities = safeVal(activeCOL?.utilities || activeCOL?.utilitiesMonthly || 120);
    const internet = safeVal(activeCOL?.internet || activeCOL?.internetMonthly || 45);

    let rent = 0;
    if (!isProv || subsidyRate > 0) {
      let baseRent = safeVal(activeCOL?.monthlyRent1BR ?? activeCOL?.rent1br ?? 800);
      if (subsidyRate > 0) {
        rent = baseRent * (1 - subsidyRate);
      } else {
        rent = baseRent;
      }
    }

    const outgoingsUSD = Math.round(food + trans + mobile + dining + medical + utilities + internet + rent);
    const surplusUSD = Math.round(netUSD - outgoingsUSD);
    const surplusPercent = netUSD > 0 ? parseFloat(((surplusUSD / netUSD) * 100).toFixed(1)) : -100;

    const is14Mo = has14MonthCycle(s.country);
    const annualized14MoNetUSD = is14Mo ? Math.round(netUSD * (14 / 12)) : netUSD;
    const surplusUSD14Mo = Math.round(annualized14MoNetUSD - outgoingsUSD);
    const surplusPercent14Mo = is14Mo ? parseFloat(((surplusUSD14Mo / annualized14MoNetUSD) * 100).toFixed(1)) : surplusPercent;

    results.push({
      id: s.id,
      name: s.name,
      country: s.country,
      city: s.city,
      currency,
      localSalary,
      netUSD: Math.round(netUSD),
      outgoingsUSD,
      rentUSD: Math.round(rent),
      surplusUSD,
      surplusPercent,
      is14Mo,
      annualized14MoNetUSD,
      surplusPercent14Mo,
      isProv,
      subsidyRate,
      housingStatusRaw,
      salary_benchmark_category: s.salary_benchmark_category
    });
  }

  const deficitOrLow = results.filter(r => r.surplusPercent < 5.0);

  console.log(`\n================ REFINED AUDIT SUMMARY ================`);
  console.log(`Total Schools Audited: ${results.length}`);
  console.log(`Schools with < 5% Base Surplus: ${deficitOrLow.length} (${((deficitOrLow.length / results.length) * 100).toFixed(1)}%)\n`);

  fs.writeFileSync('src/data/refined_low_surplus_schools.json', JSON.stringify(deficitOrLow, null, 2));

  console.log(JSON.stringify(deficitOrLow.map(x => ({
    id: x.id,
    name: x.name,
    country: x.country,
    city: x.city,
    currency: x.currency,
    localSalary: x.localSalary,
    netUSD: x.netUSD,
    outgoingsUSD: x.outgoingsUSD,
    surplusUSD: x.surplusUSD,
    surplusPercent: x.surplusPercent,
    is14Mo: x.is14Mo,
    surplusPercent14Mo: x.surplusPercent14Mo,
    subsidyRate: x.subsidyRate,
    housingStatusRaw: x.housingStatusRaw
  })), null, 2));
}

runRefinedAnalysis().catch(console.error);

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

// Import directly from calculations logic or emulate exact findCostOfLiving and calculateOutflows
async function verifyIntegratedCalculations() {
  const colSnap = await db.collection('locations_costOfLiving').get();
  const costOfLivingList = [];
  colSnap.forEach(d => costOfLivingList.push({ id: d.id, ...d.data() }));

  const cleanStr = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "").trim();
  const canonicalCountry = (c) => {
    if (!c) return '';
    const s = c.toLowerCase().trim();
    if (s.includes('chile')) return 'chile';
    if (s.includes('vietnam') || s.includes('viet nam')) return 'vietnam';
    if (s.includes('argentina')) return 'argentina';
    if (s.includes('france')) return 'france';
    if (s.includes('japan')) return 'japan';
    if (s.includes('china')) return 'china';
    if (s.includes('emirates') || s.includes('uae') || s.includes('dubai') || s.includes('abu dhabi')) return 'unitedarabemirates';
    if (s.includes('qatar')) return 'qatar';
    if (s.includes('saudi')) return 'saudiarabia';
    if (s.includes('spain')) return 'spain';
    if (s.includes('italy')) return 'italy';
    if (s.includes('germany')) return 'germany';
    if (s.includes('singapore')) return 'singapore';
    if (s.includes('hong kong')) return 'hongkong';
    if (s.includes('thailand')) return 'thailand';
    if (s.includes('malaysia')) return 'malaysia';
    if (s.includes('indonesia')) return 'indonesia';
    if (s.includes('korea')) return 'southkorea';
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
    if (s.includes('czech')) return 'czechrepublic';
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
    if (s.includes('sri lanka')) return 'srilanka';
    if (s.includes('monaco')) return 'monaco';
    if (s.includes('nigeria')) return 'nigeria';
    return s.replace(/[^a-z0-9]+/g, '');
  };

  function findCoL(city, country) {
    const sCity = cleanStr(city);
    const sCountry = cleanStr(canonicalCountry(country));

    if (sCountry === "monaco" || sCity === "monaco") {
      const borderCol = costOfLivingList.find(c =>
        cleanStr(c.id || "").includes("frenchborder") ||
        cleanStr(c.id || "").includes("mougins") ||
        cleanStr(c.city || "").includes("nice") ||
        cleanStr(c.id || "").includes("france")
      );
      if (borderCol) return borderCol;
    }

    const countryMatches = costOfLivingList.filter(c => {
      const cCountry = cleanStr(canonicalCountry(c.country || c.country_name || c.countryName || ""));
      const cCity = cleanStr(c.city || c.city_name || c.cityName || "");
      const cId = cleanStr(c.id || c._id || "");
      return cCountry === sCountry || cId === sCountry || cId.includes(sCountry);
    });

    if (sCountry === "germany") {
      if (sCity.includes("frankfurt")) {
        const doc = countryMatches.find(c => cleanStr(c.id).includes("frankfurt"));
        if (doc) return doc;
      }
      if (sCity.includes("munich") || sCity.includes("munchen")) {
        const doc = countryMatches.find(c => cleanStr(c.id).includes("munich"));
        if (doc) return doc;
      }
      if (sCity.includes("cologne") || sCity.includes("koln") || sCity.includes("dusseldorf") || sCity.includes("duisburg")) {
        const doc = countryMatches.find(c => cleanStr(c.id).includes("cologne") || cleanStr(c.id).includes("nrw"));
        if (doc) return doc;
      }
      if (sCity.includes("heidelberg") || sCity.includes("mannheim") || sCity.includes("stuttgart")) {
        const doc = countryMatches.find(c => cleanStr(c.id).includes("heidelberg"));
        if (doc) return doc;
      }
      if (sCity.includes("berlin") || sCity.includes("potsdam")) {
        const doc = countryMatches.find(c => cleanStr(c.id).includes("berlin"));
        if (doc) return doc;
      }
    }

    if (sCountry === "france") {
      if (sCity.includes("mougins") || sCity.includes("cannes") || sCity.includes("nice") || sCity.includes("grasse") || sCity.includes("antibes") || sCity.includes("valbonne") || sCity.includes("cotedazur")) {
        const doc = countryMatches.find(c => cleanStr(c.id).includes("mougins") || cleanStr(c.id).includes("cotedazur") || cleanStr(c.id).includes("nice"));
        if (doc) return doc;
      }
      if (sCity.includes("paris") || sCity.includes("boulogne") || sCity.includes("issy") || sCity.includes("versailles") || sCity.includes("saintcloud") || sCity.includes("saintgermain")) {
        const doc = countryMatches.find(c => cleanStr(c.id).includes("paris"));
        if (doc) return doc;
      }
    }

    return countryMatches.find(c => cleanStr(c.city || "").includes(sCity) || cleanStr(c.id || "").includes(sCity)) || countryMatches[0] || costOfLivingList[0];
  }

  function calcOutflows(col, isHousingProvided, school) {
    const safeVal = (v) => parseFloat(String(v)) || 0;
    const countryKey = canonicalCountry(school?.country || col.country || '');

    let baseFood = safeVal(col.groceries || col.food || 350);
    if (countryKey === 'france') {
      baseFood = Math.max(180, baseFood - 110);
    }
    const foodCost = baseFood;

    let baseTransport = safeVal(col.transport || col.monthlyTransport || 45);
    if (countryKey === 'france') {
      baseTransport = Math.round(baseTransport * 0.5);
    } else if (countryKey === 'germany') {
      baseTransport = Math.min(baseTransport, 30);
    }
    const transportCost = baseTransport;

    const mobileCost = safeVal(col.mobilePhone || col.mobileMonthly || 22);
    const diningSocialCost = safeVal(col.diningSocial || col.socialMonthly || 195);

    let baseMedical = safeVal(col.uncoveredMedical || 20);
    if (countryKey === 'france') {
      baseMedical = 0;
    }
    const uncoveredMedicalCost = baseMedical;

    let rentCost = 0;
    const provStr = String(school?.housingprovision || school?.housing || '').toLowerCase();
    const explicitSubsidy = safeVal(school?.housing_subsidy_rate);
    let subsidyRate = 0;

    if (explicitSubsidy > 0 && explicitSubsidy <= 1) {
      subsidyRate = explicitSubsidy;
    } else if (/(\d+)\s*%/i.test(provStr)) {
      subsidyRate = parseInt(provStr.match(/(\d+)\s*%/i)[1], 10) / 100;
    } else if (provStr.includes('subsid')) {
      subsidyRate = 0.90;
    } else if (provStr.includes('allowance') && !provStr.includes('not included') && !provStr.includes('no allowance')) {
      const euroMatch = provStr.match(/[€$](\d+[\d,]*)/);
      if (euroMatch) {
        const allowanceVal = parseInt(euroMatch[1].replace(/,/g, ''), 10);
        if (allowanceVal > 400 && allowanceVal < 1600) {
          subsidyRate = Math.min(0.85, allowanceVal / 1200);
        } else {
          subsidyRate = 0.50;
        }
      } else {
        subsidyRate = 0.50;
      }
    }

    if (!isHousingProvided || subsidyRate > 0) {
      const rent1BR = Number(col.monthlyRent1BR ?? col.rent1br ?? 1200);
      rentCost = subsidyRate > 0 ? rent1BR * (1 - subsidyRate) : rent1BR;
    }

    return Math.round(foodCost + transportCost + mobileCost + diningSocialCost + uncoveredMedicalCost + (safeVal(col.utilities) || 150) + (safeVal(col.internet) || 50) + rentCost);
  }

  const results = [];

  for (const s of schools) {
    const col = findCoL(s.city, s.country);
    const currency = s.currency || col.currencyCode || 'USD';
    const localSalary = s.salary_scale_5yr_net || s.net_salary || 0;

    let netUSD = localSalary;
    if (currency !== 'USD' && RATES[currency]) {
      const usdRate = RATES['USD'] || 1.27;
      const localRate = RATES[currency] || 1.0;
      netUSD = (localSalary / localRate) * usdRate;
    }

    const housingStatusRaw = String(s.housingprovision || s.housing || '').toLowerCase();
    const explicitProvided = s.intel?.housing?.provided;
    const isProv = (explicitProvided === true) || (housingStatusRaw.includes('provided') || housingStatusRaw.includes('furnished')) && !housingStatusRaw.includes('not provided') && !housingStatusRaw.includes('none');

    const outgoingsUSD = calcOutflows(col, isProv, s);
    const surplusUSD = Math.round(netUSD - outgoingsUSD);
    const surplusPercent = netUSD > 0 ? parseFloat(((surplusUSD / netUSD) * 100).toFixed(1)) : -100;

    const is14Mo = ['spain', 'portugal', 'italy', 'austria', 'greece'].includes(canonicalCountry(s.country));
    const annualized14MoNetUSD = is14Mo ? Math.round(netUSD * (14 / 12)) : netUSD;
    const surplusUSD14Mo = Math.round(annualized14MoNetUSD - outgoingsUSD);
    const surplusPercent14Mo = is14Mo ? parseFloat(((surplusUSD14Mo / annualized14MoNetUSD) * 100).toFixed(1)) : surplusPercent;

    results.push({
      id: s.id,
      name: s.name,
      country: s.country,
      city: s.city,
      colMatched: col.id,
      currency,
      localSalary,
      netUSD: Math.round(netUSD),
      outgoingsUSD,
      surplusUSD,
      surplusPercent,
      is14Mo,
      surplusPercent14Mo
    });
  }

  const lowSurplus = results.filter(r => r.surplusPercent < 5.0 && (!r.is14Mo || r.surplusPercent14Mo < 5.0));

  console.log(`================ FINAL AUDIT AFTER COMPLETE INTEGRATION ================`);
  console.log(`Total Canonical Schools: ${results.length}`);
  console.log(`Schools with < 5% Total Surplus (after 14-Mo Bonus & Subsidies): ${lowSurplus.length} (${((lowSurplus.length / results.length) * 100).toFixed(1)}%)\n`);

  for (const s of lowSurplus) {
    console.log(`[${s.id}] ${s.name} (${s.country}, ${s.city})`);
    console.log(`   Net: ${s.currency} ${s.localSalary} (~$${s.netUSD} USD) | CoL Doc: ${s.colMatched} | Outflows: ~$${s.outgoingsUSD} USD`);
    console.log(`   Surplus: ~$${s.surplusUSD} (${s.surplusPercent}%) | 14-Mo Surplus: ${s.is14Mo ? `${s.surplusPercent14Mo}%` : 'N/A'}`);
  }
}

verifyIntegratedCalculations().catch(console.error);

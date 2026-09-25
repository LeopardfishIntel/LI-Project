import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

const serviceAccount = require('../../service-account.json');
if (!getApps().length) initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const schools = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'public/complete_school_fields_export.json'), 'utf8'));

const safeParse = (v: any) => {
  if (typeof v === 'number') return isNaN(v) ? 0 : v;
  if (!v) return 0;
  const cleaned = String(v).replace(/[^0-9.-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

const canonicalCountry = (c: string) => {
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

const isHousingProvided = (statusRaw: string, explicitProvided?: boolean) => {
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

async function runAudit() {
  const colSnap = await db.collection('locations_costOfLiving').get();
  const colMap = new Map();
  colSnap.forEach(d => colMap.set(d.id.toLowerCase(), d.data()));

  const ratesSnap = await db.collection('system_config').doc('exchange_rates').get();
  const currentRates: Record<string, number> = ratesSnap.exists ? (ratesSnap.data()?.rates || {}) : {};
  if (!currentRates['GBP']) currentRates['GBP'] = 1.0;
  if (!currentRates['USD']) currentRates['USD'] = 1.27;
  if (!currentRates['EUR']) currentRates['EUR'] = 1.17;
  if (!currentRates['AED']) currentRates['AED'] = 4.66;
  if (!currentRates['HKD']) currentRates['HKD'] = 9.87;

  const results = [];

  for (const school of schools) {
    const sCountry = canonicalCountry(school.country || school.region || '');
    const sCity = (school.city || school.location || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
    
    let activeCOL = colMap.get(`${sCountry}-${sCity}`) || colMap.get(sCountry) || colMap.get(sCity) || null;
    if (!activeCOL) {
      for (const [k, v] of colMap.entries()) {
        if (k.startsWith(sCountry) || k.includes(sCountry)) {
          activeCOL = v;
          break;
        }
      }
    }

    const currency = school.currency || activeCOL?.currency || 'USD';
    const gbpRate = currentRates[currency] || (currency === 'GBP' ? 1.0 : (currency === 'USD' ? 1.27 : (currency === 'EUR' ? 1.17 : (currency === 'AED' ? 4.66 : (currency === 'HKD' ? 9.87 : 1.0)))));

    let rawNetInput = safeParse(school.net_salary || school.netSalary || school.salary_benchmark || school.benchmark_5yr_net || school.salary_5yr_net || school.salary || school.salary_min || 3000);
    if (school.salary_scale_5yr_net) rawNetInput = safeParse(school.salary_scale_5yr_net);
    
    const rawNetInGBP = rawNetInput / gbpRate;
    const isConvertedFromAnnual = rawNetInGBP >= 18000;
    const baseNet = isConvertedFromAnnual ? Math.round(rawNetInput / 12) : rawNetInput;

    const housingStatusRaw = String(school.housingprovision || school.housing || school.accommodation || school.housing_status || '');
    const explicitProvided = school.intel?.housing?.provided;
    const isProvided = isHousingProvided(housingStatusRaw, explicitProvided);

    let housingSubsidyRate = 0;
    if (school.housing_subsidy_rate) housingSubsidyRate = safeParse(school.housing_subsidy_rate);
    else if (/(\d+)\s*%/i.test(housingStatusRaw)) {
      const match = housingStatusRaw.match(/(\d+)\s*%/i);
      if (match) housingSubsidyRate = parseInt(match[1], 10) / 100;
    } else if (housingStatusRaw.toLowerCase().includes('subsid')) {
      housingSubsidyRate = 0.90;
    }

    const getF = (data: any, keys: string[]) => {
      if (!data) return null;
      const targetKeys = keys.map(k => k.toLowerCase().replace(/\s+/g, ''));
      const foundKey = Object.keys(data).find(k => targetKeys.includes(k.toLowerCase().replace(/\s+/g, '')));
      return foundKey ? data[foundKey] : null;
    };

    const getVal = (data: any, mult = 1.0) => {
      if (!data) return 0;
      if (typeof data === 'object') {
        return safeParse(data.single || data.base || Object.values(data)[0] || 0) * mult;
      }
      return safeParse(data) * mult;
    };

    const usdToLocal = (usdVal: number) => {
      if (currency === 'USD') return usdVal;
      const targetRate = currentRates[currency];
      const usdBase = currentRates['USD'] || 1.27;
      if (targetRate && usdBase) return usdVal * (targetRate / usdBase);
      return usdVal;
    };

    let baseRentUSD = 0;
    if (!isProvided) {
      baseRentUSD = safeParse(getF(activeCOL, ['rent1br']) || getF(activeCOL, ['rent_1br']) || getF(activeCOL, ['rent']) || 800);
      if (housingSubsidyRate > 0 && housingSubsidyRate < 1) baseRentUSD *= (1 - housingSubsidyRate);
    }
    const rentCost = usdToLocal(baseRentUSD);
    const groceriesCost = usdToLocal(getVal(getF(activeCOL, ['groceries', 'food']) || 350));
    const utilitiesCost = usdToLocal(getVal(getF(activeCOL, ['utilities', 'bills']) || 120));
    const internetUSD = getVal(getF(activeCOL, ['internet', 'connectivity']) || 40);
    const mobileUSD = getVal(getF(activeCOL, ['mobile', 'phone']) || 25);
    const connectivityCost = usdToLocal(internetUSD + mobileUSD);

    const tbStr = `${school.transportBenefit || ''} ${school.transport || ''}`.toLowerCase();
    let subsidyMultiplier = 1.0;
    if (school.commuteReimbursed === true || tbStr.includes('100%') || tbStr.includes('fully reimbursed') || (tbStr.includes('reimburse') && !tbStr.includes('50%') && !tbStr.includes('partial') && !tbStr.includes('subsid'))) {
      subsidyMultiplier = 0.0;
    } else {
      const percentMatch = tbStr.match(/(\d+)%/);
      if (percentMatch) {
        const pct = parseInt(percentMatch[1], 10);
        if (!isNaN(pct) && pct > 0 && pct <= 100) subsidyMultiplier = Math.max(0, (100 - pct) / 100);
      } else if (tbStr.includes('partial') || tbStr.includes('subsid')) {
        subsidyMultiplier = 0.5;
      }
    }
    const transportCost = usdToLocal(getVal(getF(activeCOL, ['publicTransport', 'transport']) || 60) * subsidyMultiplier);
    const socialCost = usdToLocal(getVal(getF(activeCOL, ['social', 'dining', 'diningsocial']) || 250));
    const medicalCost = usdToLocal(safeParse(getF(activeCOL, ['uncoveredMedical', 'uncoveredmedical']) || 40));

    const totalOutLocal = Math.round(rentCost) + Math.round(groceriesCost) + Math.round(utilitiesCost) + Math.round(connectivityCost) + Math.round(transportCost) + Math.round(socialCost) + Math.round(medicalCost);
    const surplusLocal = baseNet - totalOutLocal;
    const surplusGBP = Math.round(surplusLocal / gbpRate);
    const baseNetGBP = Math.round(baseNet / gbpRate);
    const totalOutGBP = Math.round(totalOutLocal / gbpRate);

    results.push({
      id: school.id,
      name: school.name,
      country: school.country,
      city: school.city,
      currency,
      baseNetLocal: baseNet,
      baseNetGBP,
      totalOutLocal,
      totalOutGBP,
      rentCostLocal: Math.round(rentCost),
      rentCostGBP: Math.round(rentCost / gbpRate),
      surplusLocal,
      surplusGBP,
      isProvided,
      housingStatusRaw,
      hasExplicitSalary: !!(school.net_salary || school.salary_scale_5yr_net || school.salary_benchmark || school.benchmark_5yr_net)
    });
  }

  const deficitSchools = results.filter(r => r.surplusGBP < 105);
  const byCountry: Record<string, any[]> = {};
  for (const d of deficitSchools) {
    const c = d.country || 'Unknown';
    if (!byCountry[c]) byCountry[c] = [];
    byCountry[c].push(d);
  }

  console.log(`=== AUDIT SUMMARY ===`);
  console.log(`Total Schools Audited: ${results.length}`);
  console.log(`Deficit or <£105 Surplus Schools: ${deficitSchools.length}\n`);

  for (const [c, list] of Object.entries(byCountry)) {
    console.log(`\n========================================`);
    console.log(`COUNTRY: ${c} (${list.length} schools)`);
    console.log(`========================================`);
    for (const s of list) {
      console.log(`[${s.id}] ${s.name} (${s.city || 'N/A'})`);
      console.log(`  - Curr: ${s.currency} | Net: ${s.baseNetLocal} (£${s.baseNetGBP}) | Total Out: ${s.totalOutLocal} (£${s.totalOutGBP})`);
      console.log(`  - Rent: £${s.rentCostGBP} | Housing: ${s.isProvided ? 'Provided' : 'Self-Pay'} (${s.housingStatusRaw})`);
      console.log(`  - TRUE SURPLUS: £${s.surplusGBP} | ExplicitSalary: ${s.hasExplicitSalary}`);
    }
  }
}

runAudit();

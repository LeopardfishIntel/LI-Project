import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const serviceAccount = require('../../service-account.json');
if (!getApps().length) initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const exportPath = path.resolve(process.cwd(), 'public/complete_school_fields_export.json');
const schools: any[] = JSON.parse(fs.readFileSync(exportPath, 'utf-8'));

import {
  calculateOutflows,
  calculateSurplus,
  canonicalCountry,
  RATES
} from '../lib/calculations';

async function auditLowSurplus() {
  const colSnap = await db.collection('locations_costOfLiving').get();
  const colMap = new Map();
  colSnap.forEach(d => colMap.set(d.id.toLowerCase(), d.data()));

  const ratesSnap = await db.collection('system_config').doc('exchange_rates').get();
  const liveRates: Record<string, number> = ratesSnap.exists ? (ratesSnap.data()?.rates || {}) : {};
  const currentRates = { ...RATES, ...liveRates };

  console.log(`Auditing ${schools.length} canonical schools for surplus margin (< 5%)...\n`);

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
    const isProvided = !!(s.intel?.housing?.provided || housingStatusRaw.toLowerCase().includes('provided') || housingStatusRaw.toLowerCase().includes('furnished'));

    const outgoingsUSD = calculateOutflows(1, 0, activeCOL || {}, isProvided, s);
    const surplusUSD = netUSD - outgoingsUSD;
    const surplusRatio = netUSD > 0 ? (surplusUSD / netUSD) : -1;
    const surplusPercent = surplusRatio * 100;

    results.push({
      id: s.id,
      name: s.name,
      country: s.country,
      city: s.city,
      currency,
      localSalary,
      netUSD: Math.round(netUSD),
      outgoingsUSD: Math.round(outgoingsUSD),
      surplusUSD: Math.round(surplusUSD),
      surplusPercent: parseFloat(surplusPercent.toFixed(1)),
      isProvided,
      benchmarkCategory: s.salary_benchmark_category
    });
  }

  // Filter for schools with < 5% surplus margin
  const lowSurplus = results.filter(r => r.surplusPercent < 5);

  console.log(`================ LOW SURPLUS REPORT (< 5%) ================`);
  console.log(`Total Schools: ${results.length}`);
  console.log(`Schools with < 5% Surplus: ${lowSurplus.length} (${((lowSurplus.length / results.length) * 100).toFixed(1)}%)\n`);

  // Group by country
  const byCountry: Record<string, typeof lowSurplus> = {};
  for (const item of lowSurplus) {
    if (!byCountry[item.country]) byCountry[item.country] = [];
    byCountry[item.country].push(item);
  }

  for (const [country, list] of Object.entries(byCountry)) {
    console.log(`\n--- ${country} (${list.length} schools) ---`);
    for (const item of list) {
      console.log(`[${item.id}] ${item.name} (${item.city || 'N/A'})`);
      console.log(`   Salary: ${item.currency} ${item.localSalary.toLocaleString()} (~$${item.netUSD}) | Outflows: ~$${item.outgoingsUSD} | Surplus: ~$${item.surplusUSD} (${item.surplusPercent}%) | Housing: ${item.isProvided ? 'Provided' : 'Self-Pay'}`);
    }
  }

  return lowSurplus;
}

auditLowSurplus().catch(console.error);

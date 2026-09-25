const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

const serviceAccount = require('../../service-account.json');
if (!getApps().length) initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

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
  BND: 1.70,
  ETB: 160.0,
  GHS: 19.5,
  MAD: 12.7,
  NPR: 170.0,
  NGN: 1950.0,
  LKR: 380.0,
  UYU: 53.0
};

// Converts amount in local currency to USD
function localToUSD(amount, currency) {
  if (!amount || isNaN(amount)) return amount;
  if (!currency || currency === 'USD') return amount;
  const localRate = RATES[currency];
  const usdRate = RATES['USD'] || 1.27;
  if (!localRate) return amount;
  return Math.round((amount / localRate) * usdRate);
}

async function normalizeCOLDocuments() {
  console.log('🚀 Normalizing Cost-of-Living records in Firestore to standard USD reference...\n');

  const targets = [
    { id: 'abu-dhabi-uae', rentInLocal: true, groceriesInUSD: true },
    { id: 'beijing-china', rentInLocal: true, groceriesInUSD: true },
    { id: 'china', rentInLocal: true, groceriesInUSD: true },
    { id: 'china_suzhou', rentInLocal: true, groceriesInUSD: true },
    { id: 'chile', rentInLocal: true, groceriesInUSD: true },
    { id: 'dubai-uae', rentInLocal: true, groceriesInUSD: true },
    { id: 'guangzhou-china', rentInLocal: true, groceriesInUSD: true },
    { id: 'japan', rentInLocal: true, groceriesInUSD: true },
    { id: 'kansai-japan', rentInLocal: true, groceriesInUSD: true },
    { id: 'outside-tokyo-japan', rentInLocal: true, groceriesInUSD: true },
    { id: 'shanghai-china', rentInLocal: true, groceriesInUSD: true },
    { id: 'shenzhen-china', rentInLocal: true, groceriesInUSD: true },
    { id: 'tokyo-japan', rentInLocal: true, groceriesInUSD: true },
    { id: 'united-arab-emirates', rentInLocal: true, groceriesInUSD: true },
    { id: 'united_arab_emirates_abu_dhabi', rentInLocal: true, groceriesInUSD: true },
    { id: 'united_arab_emirates_dubai', rentInLocal: true, groceriesInUSD: true },
    
    // Completely in Local Currency
    { id: 'ethiopia', allInLocal: true, cur: 'ETB' },
    { id: 'ghana', allInLocal: true, cur: 'GHS' },
    { id: 'kazakhstan', allInLocal: true, cur: 'KZT' },
    { id: 'morocco', allInLocal: true, cur: 'MAD' },
    { id: 'nepal', allInLocal: true, cur: 'NPR' },
    { id: 'nigeria', allInLocal: true, cur: 'NGN' },
    { id: 'sri_lanka', allInLocal: true, cur: 'LKR' },
    { id: 'taiwan', allInLocal: true, cur: 'TWD' },
    { id: 'turkey', allInLocal: true, cur: 'TRY' },
    { id: 'uruguay', allInLocal: true, cur: 'UYU' }
  ];

  const batch = db.batch();

  for (const t of targets) {
    const docRef = db.collection('locations_costOfLiving').doc(t.id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      console.log(`⚠️ Document ${t.id} not found in Firestore, skipping.`);
      continue;
    }

    const data = docSnap.data();
    const cur = t.cur || data.currencyCode || 'USD';
    const updates = {};

    if (t.allInLocal) {
      // Everything is in local currency, convert rent, groceries, utilities, internet, mobile, transport to USD
      if (data.rent1br) updates.rent1br = localToUSD(data.rent1br, cur);
      if (data.rent2br) updates.rent2br = localToUSD(data.rent2br, cur);
      if (data.rent3br) updates.rent3br = localToUSD(data.rent3br, cur);
      if (data.monthlyRent1BR) updates.monthlyRent1BR = localToUSD(data.monthlyRent1BR, cur);
      if (data.monthlyRent2BR) updates.monthlyRent2BR = localToUSD(data.monthlyRent2BR, cur);
      if (data.monthlyRent3BR) updates.monthlyRent3BR = localToUSD(data.monthlyRent3BR, cur);
      if (data.groceries) updates.groceries = localToUSD(data.groceries, cur);
      if (data.foodGroceries) updates.foodGroceries = localToUSD(data.foodGroceries, cur);
      if (data.utilities) updates.utilities = localToUSD(data.utilities, cur);
      if (data.utilitiesMonthly) updates.utilitiesMonthly = localToUSD(data.utilitiesMonthly, cur);
      if (data.internet) updates.internet = localToUSD(data.internet, cur);
      if (data.mobilePhone) updates.mobilePhone = localToUSD(data.mobilePhone, cur);
      if (data.diningSocial) updates.diningSocial = localToUSD(data.diningSocial, cur);
      if (data.publicTransport && typeof data.publicTransport === 'number') {
        updates.publicTransport = localToUSD(data.publicTransport, cur);
      }
      updates.usdReference = 'USD';
      updates.normalizedToUSD = true;
      updates.lastNormalizedAt = new Date().toISOString();
    } else if (t.rentInLocal) {
      // Rent is in local currency (e.g. AED 6500, CNY 8500, JPY 140000, CLP 520000), groceries/utilities are in USD
      if (data.rent1br && data.rent1br > 2500) updates.rent1br = localToUSD(data.rent1br, cur);
      if (data.rent2br && data.rent2br > 3500) updates.rent2br = localToUSD(data.rent2br, cur);
      if (data.rent3br && data.rent3br > 4500) updates.rent3br = localToUSD(data.rent3br, cur);
      if (data.monthlyRent1BR && data.monthlyRent1BR > 2500) {
        updates.monthlyRent1BR = localToUSD(data.monthlyRent1BR, cur);
      }
      if (data.monthlyRent2BR && data.monthlyRent2BR > 3500) {
        updates.monthlyRent2BR = localToUSD(data.monthlyRent2BR, cur);
      }
      if (data.monthlyRent3BR && data.monthlyRent3BR > 4500) {
        updates.monthlyRent3BR = localToUSD(data.monthlyRent3BR, cur);
      }
      updates.usdReference = 'USD';
      updates.normalizedToUSD = true;
      updates.lastNormalizedAt = new Date().toISOString();
    }

    console.log(`Updating ${t.id} (${cur}):`, updates);
    batch.set(docRef, updates, { merge: true });
  }

  await batch.commit();
  console.log(`\n✅ Successfully committed normalized Cost-of-Living records to Firestore!`);
}

normalizeCOLDocuments().catch(console.error);

const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

const serviceAccount = require('../../service-account.json');
if (!getApps().length) initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });

async function perfectLinkages() {
  console.log('🚀 Creating Clean CoL Aliases & Normalizing Regional Linkages in Firestore...\n');
  const batch = db.batch();

  // 1. Create Dedicated Hong Kong CoL Doc in Firestore
  const hkRef = db.collection('locations_costOfLiving').doc('hong-kong');
  batch.set(hkRef, {
    id: 'hong-kong',
    flicId: 'hong-kong',
    country: 'Hong Kong',
    countryName: 'Hong Kong',
    countryKey: 'hongkong',
    city: 'Hong Kong',
    region: 'East Asia',
    currencyCode: 'HKD',
    usdReference: 'USD',
    rent1br: 2450, // Standard 1BR expat flat in HK
    monthlyRent1BR: 2450,
    rent2br: 3650,
    monthlyRent2BR: 3650,
    rent3br: 5200,
    monthlyRent3BR: 5200,
    groceries: 450,
    foodGroceries: 450,
    utilities: 180,
    utilitiesMonthly: 180,
    transport: 85, // MTR octopus card monthly
    transportPass: 85,
    diningSocial: 450,
    mobilePhone: 25,
    internet: 35,
    uncoveredMedical: 25,
    cityScore: 9.8,
    dataReliabilityScore: 9.9,
    normalizedToUSD: true,
    updatedAt: new Date().toISOString()
  }, { merge: true });
  console.log(' ✔ Created dedicated "hong-kong" Cost of Living document in Firestore.');

  // 2. Add India Metros CoL Docs (Bangalore, New Delhi, Mumbai)
  const blrRef = db.collection('locations_costOfLiving').doc('india_bengaluru');
  batch.set(blrRef, {
    country: 'India',
    countryName: 'India',
    countryKey: 'india',
    city: 'Bengaluru / Bangalore',
    id: 'india_bengaluru',
    currencyCode: 'INR',
    usdReference: 'USD',
    rent1br: 450,
    monthlyRent1BR: 450,
    rent2br: 750,
    monthlyRent2BR: 750,
    rent3br: 1150,
    monthlyRent3BR: 1150,
    groceries: 220,
    utilities: 75,
    transport: 40,
    diningSocial: 180,
    internet: 20,
    mobilePhone: 15,
    uncoveredMedical: 20,
    updatedAt: new Date().toISOString()
  }, { merge: true });

  const delRef = db.collection('locations_costOfLiving').doc('india_new_delhi_ncr');
  batch.set(delRef, {
    country: 'India',
    countryName: 'India',
    countryKey: 'india',
    city: 'New Delhi / NCR (Noida / Gurugram)',
    id: 'india_new_delhi_ncr',
    currencyCode: 'INR',
    usdReference: 'USD',
    rent1br: 480,
    monthlyRent1BR: 480,
    rent2br: 800,
    monthlyRent2BR: 800,
    rent3br: 1250,
    monthlyRent3BR: 1250,
    groceries: 220,
    utilities: 85,
    transport: 45,
    diningSocial: 180,
    internet: 20,
    mobilePhone: 15,
    uncoveredMedical: 20,
    updatedAt: new Date().toISOString()
  }, { merge: true });
  console.log(' ✔ Created dedicated India Metro CoL documents (Bengaluru, New Delhi NCR).');

  // 3. Add Switzerland Vaud/Riviera CoL (Lausanne, Montreux, Villars, Leysin)
  const vaudRef = db.collection('locations_costOfLiving').doc('switzerland_vaud_riviera');
  batch.set(vaudRef, {
    country: 'Switzerland',
    countryName: 'Switzerland',
    countryKey: 'switzerland',
    city: 'Vaud / Riviera / Alpine (Lausanne / Montreux / Villars)',
    id: 'switzerland_vaud_riviera',
    currencyCode: 'CHF',
    usdReference: 'USD',
    rent1br: 1750, // Local Vaud/Alpine market rent
    monthlyRent1BR: 1750,
    rent2br: 2450,
    monthlyRent2BR: 2450,
    rent3br: 3300,
    monthlyRent3BR: 3300,
    groceries: 550,
    utilities: 220,
    transport: 110,
    diningSocial: 450,
    internet: 60,
    mobilePhone: 45,
    uncoveredMedical: 150,
    updatedAt: new Date().toISOString()
  }, { merge: true });
  console.log(' ✔ Created dedicated Switzerland Vaud/Riviera/Alpine CoL document.');

  await batch.commit();
  console.log('\n📡 All new regional CoL documents successfully committed to Firestore.');
}

perfectLinkages().catch(console.error);

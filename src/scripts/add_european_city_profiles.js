const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('../../service-account.json');
if (!getApps().length) initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function addEuropeanCityProfiles() {
  console.log('🚀 Adding precise local Cost-of-Living city profiles to Firestore...\n');

  const batch = db.batch();

  // 1. Cologne, Germany (NRW Metropolitan)
  const cologneRef = db.collection('locations_costOfLiving').doc('cologne-germany');
  batch.set(cologneRef, {
    id: 'cologne-germany',
    flicId: 'cologne-germany',
    country: 'Germany',
    countryName: 'Germany',
    city: 'Cologne',
    currencyCode: 'EUR',
    usdReference: 'USD',
    monthlyRent1BR: 1100,
    monthlyRent2BR: 1600,
    monthlyRent3BR: 2100,
    rent1br: 1100,
    rent2br: 1600,
    rent3br: 2100,
    groceries: 410,
    foodGroceries: 410,
    transport: 30, // With JobTicket / Deutschlandticket subsidy
    monthlyTransport: 30,
    utilities: 260,
    utilitiesMonthly: 260,
    mobilePhone: 25,
    internet: 45,
    diningSocial: 340,
    uncoveredMedical: 20,
    studentLoans: 250,
    cityScore: 8.8,
    dataReliabilityScore: 9.5,
    region: 'Western Europe',
    updatedAt: new Date().toISOString()
  }, { merge: true });

  // 2. Heidelberg, Germany (Baden-Württemberg)
  const heidelbergRef = db.collection('locations_costOfLiving').doc('heidelberg-germany');
  batch.set(heidelbergRef, {
    id: 'heidelberg-germany',
    flicId: 'heidelberg-germany',
    country: 'Germany',
    countryName: 'Germany',
    city: 'Heidelberg',
    currencyCode: 'EUR',
    usdReference: 'USD',
    monthlyRent1BR: 1050,
    monthlyRent2BR: 1550,
    monthlyRent3BR: 2050,
    rent1br: 1050,
    rent2br: 1550,
    rent3br: 2050,
    groceries: 400,
    foodGroceries: 400,
    transport: 30,
    monthlyTransport: 30,
    utilities: 250,
    utilitiesMonthly: 250,
    mobilePhone: 25,
    internet: 45,
    diningSocial: 320,
    uncoveredMedical: 20,
    studentLoans: 250,
    cityScore: 9.0,
    dataReliabilityScore: 9.4,
    region: 'Western Europe',
    updatedAt: new Date().toISOString()
  }, { merge: true });

  // 3. Mougins / Côte d'Azur, France (Alpes-Maritimes Suburban)
  const mouginsRef = db.collection('locations_costOfLiving').doc('mougins-france');
  batch.set(mouginsRef, {
    id: 'mougins-france',
    flicId: 'mougins-france',
    country: 'France',
    countryName: 'France',
    city: 'Mougins',
    currencyCode: 'EUR',
    usdReference: 'USD',
    monthlyRent1BR: 1050,
    monthlyRent2BR: 1550,
    monthlyRent3BR: 2100,
    rent1br: 1050,
    rent2br: 1550,
    rent3br: 2100,
    groceries: 420,
    foodGroceries: 420,
    transport: 45, // 50% regional transit pass
    monthlyTransport: 45,
    utilities: 220,
    utilitiesMonthly: 220,
    mobilePhone: 25,
    internet: 40,
    diningSocial: 360,
    uncoveredMedical: 10,
    studentLoans: 250,
    cityScore: 8.7,
    dataReliabilityScore: 9.5,
    region: 'Western Europe',
    updatedAt: new Date().toISOString()
  }, { merge: true });

  // 4. French Cross-Border Living (Nice / Menton / Beausoleil for Monaco Faculty)
  const borderRef = db.collection('locations_costOfLiving').doc('french-border-monaco');
  batch.set(borderRef, {
    id: 'french-border-monaco',
    flicId: 'french-border-monaco',
    country: 'France',
    countryName: 'France',
    city: 'French Riviera / Monaco Border (Nice / Menton / Beausoleil)',
    currencyCode: 'EUR',
    usdReference: 'USD',
    monthlyRent1BR: 1150,
    monthlyRent2BR: 1650,
    monthlyRent3BR: 2250,
    rent1br: 1150,
    rent2br: 1650,
    rent3br: 2250,
    groceries: 440,
    foodGroceries: 440,
    transport: 45, // TER cross-border rail pass
    monthlyTransport: 45,
    utilities: 230,
    utilitiesMonthly: 230,
    mobilePhone: 25,
    internet: 40,
    diningSocial: 380,
    uncoveredMedical: 10,
    studentLoans: 250,
    cityScore: 9.1,
    dataReliabilityScore: 9.6,
    region: 'Western Europe',
    updatedAt: new Date().toISOString()
  }, { merge: true });

  await batch.commit();
  console.log('✅ Successfully added local city profiles for Cologne, Heidelberg, Mougins, and French Monaco Border in Firestore!');
}

addEuropeanCityProfiles().catch(console.error);

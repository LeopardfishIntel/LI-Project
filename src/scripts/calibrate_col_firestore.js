const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('../../service-account.json');
if (!getApps().length) initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function checkAndCalibrateCOL() {
  const snap = await db.collection('locations_costOfLiving').get();
  console.log(`Checking all ${snap.size} CoL documents for field reasonableness in USD...\n`);

  const batch = db.batch();
  let fixCount = 0;

  snap.forEach(doc => {
    const d = doc.data();
    const updates = {};

    // 1. Groceries: should be between $150 and $650 USD
    let food = d.foodGroceries || d.groceries || 350;
    if (food < 120) updates.groceries = 250;
    else if (food > 800) updates.groceries = 450;

    // 2. Dining / Social: should be between $150 and $550 USD
    let dining = d.diningSocial || d.socialMonthly || 200;
    if (dining < 100) updates.diningSocial = 220;
    else if (dining > 750) updates.diningSocial = 400;

    // 3. Utilities: should be between $50 and $300 USD
    let utils = d.utilitiesMonthly || d.utilities || 120;
    if (utils < 30) updates.utilities = 80;
    else if (utils > 400) updates.utilities = 200;

    // 4. Internet: should be between $25 and $90 USD
    let internet = d.internetMonthly || d.internet || 45;
    if (internet < 15) updates.internet = 35;
    else if (internet > 150) updates.internet = 60;

    // 5. Mobile: should be between $15 and $60 USD
    let mobile = d.mobileMonthly || d.mobilePhone || d.mobile || 25;
    if (mobile < 10) updates.mobilePhone = 20;
    else if (mobile > 100) updates.mobilePhone = 35;

    // 6. Medical: should be between $15 and $60 USD
    let med = d.uncoveredMedical || 25;
    if (med < 10) updates.uncoveredMedical = 20;
    else if (med > 100) updates.uncoveredMedical = 35;

    // 7. Rent 1BR: should be between $250 and $2500 USD (except Monaco ~$5000-$7000)
    let rent = d.monthlyRent1BR || d.rent1br || 800;
    if (rent < 150) updates.monthlyRent1BR = 450;
    else if (rent > 3000 && doc.id !== 'monaco' && doc.id !== 'monaco-monaco') updates.monthlyRent1BR = 1800;

    if (Object.keys(updates).length > 0) {
      batch.set(doc.ref, updates, { merge: true });
      fixCount++;
    }
  });

  if (fixCount > 0) {
    await batch.commit();
    console.log(`✅ Calibrated baseline fields across ${fixCount} CoL documents in Firestore!`);
  } else {
    console.log(`✅ All CoL documents already conform to standard USD bounds.`);
  }
}

checkAndCalibrateCOL().catch(console.error);

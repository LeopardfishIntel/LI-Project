const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('../../service-account.json');
if (!getApps().length) initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function scanAllCOLDocs() {
  const snap = await db.collection('locations_costOfLiving').get();
  console.log(`Scanning all ${snap.size} documents in locations_costOfLiving...\n`);

  const localCurrencyDocs = [];
  const validUsdDocs = [];

  snap.forEach(doc => {
    const d = doc.data();
    const cur = d.currencyCode || d.currency || 'USD';
    const rent = d.monthlyRent1BR || d.rent1br || d.rent || 0;
    const food = d.groceries || d.foodGroceries || d.food || 0;
    const utils = d.utilities || d.utilitiesMonthly || 0;

    // If groceries > 1500 or rent > 6000 (and not Monaco or Zurich) or cur != USD and values clearly local
    const isSuspicious = (food > 1500 || utils > 800 || (rent > 5000 && doc.id !== 'monaco' && doc.id !== 'singapore' && doc.id !== 'hong-kong'));

    if (isSuspicious || (cur !== 'USD' && (food > 1000 || rent > 4000))) {
      localCurrencyDocs.push({
        id: doc.id,
        country: d.country || d.countryName,
        city: d.city,
        currencyCode: cur,
        usdReference: d.usdReference,
        rent1br: rent,
        groceries: food,
        utilities: utils
      });
    } else {
      validUsdDocs.push({
        id: doc.id,
        country: d.country || d.countryName,
        currencyCode: cur,
        rent1br: rent,
        groceries: food
      });
    }
  });

  console.log(`=== LOCAL CURRENCY UNCONVERTED DOCUMENTS (${localCurrencyDocs.length}) ===`);
  console.log(JSON.stringify(localCurrencyDocs, null, 2));
}

scanAllCOLDocs().catch(console.error);

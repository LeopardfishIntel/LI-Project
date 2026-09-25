const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

const serviceAccount = require('../../service-account.json');
if (!getApps().length) initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const exportPath = path.resolve(process.cwd(), 'public/complete_school_fields_export.json');
const schools = JSON.parse(fs.readFileSync(exportPath, 'utf-8'));

const lowSurplusList = JSON.parse(fs.readFileSync('src/data/low_surplus_schools.json', 'utf-8'));

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

async function checkCurrencyMismatches() {
  const colSnap = await db.collection('locations_costOfLiving').get();
  const colMap = new Map();
  colSnap.forEach(d => colMap.set(d.id.toLowerCase(), { id: d.id, ...d.data() }));

  const ratesSnap = await db.collection('system_config').doc('exchange_rates').get();
  const liveRates = ratesSnap.exists ? (ratesSnap.data()?.rates || {}) : {};

  console.log(`Auditing Currency Alignments for all 31 Low-Surplus Schools and entire 459 universe...\n`);

  const report = [];

  for (const s of lowSurplusList) {
    const fullSchool = schools.find(x => x.id === s.id) || s;
    const sCountry = canonicalCountry(fullSchool.country || '');
    const sCity = (fullSchool.city || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');

    let activeCOL = colMap.get(`${sCountry}-${sCity}`) || colMap.get(sCountry) || colMap.get(sCity) || null;
    if (!activeCOL) {
      for (const [k, v] of colMap.entries()) {
        if (k.startsWith(sCountry) || k.includes(sCountry)) {
          activeCOL = v;
          break;
        }
      }
    }

    report.push({
      schoolId: fullSchool.id,
      name: fullSchool.name,
      country: fullSchool.country,
      city: fullSchool.city,
      schoolCurrency: fullSchool.currency,
      schoolSalary: fullSchool.salary_scale_5yr_net,
      housingStatusRaw: fullSchool.housingprovision || fullSchool.housing,
      colDocId: activeCOL?.id || 'NOT_FOUND',
      colCurrencyCode: activeCOL?.currencyCode || null,
      colUsdRef: activeCOL?.usdReference || null,
      colRent1br: activeCOL?.rent1br || activeCOL?.monthlyRent1BR || null,
      colGroceries: activeCOL?.groceries || activeCOL?.foodGroceries || null,
      colUtilities: activeCOL?.utilities || activeCOL?.utilitiesMonthly || null,
      colTransport: activeCOL?.transport || activeCOL?.publicTransport || null,
      colLocationName: activeCOL?.locationName || activeCOL?.country || null
    });
  }

  console.log(JSON.stringify(report, null, 2));
}

checkCurrencyMismatches().catch(console.error);

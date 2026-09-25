const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');
const path = require('path');

const serviceAccount = require('../../service-account.json');
if (!getApps().length) initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const exportPath1 = path.resolve(process.cwd(), 'public/complete_school_fields_export.json');
const exportPath2 = path.resolve(process.cwd(), 'complete_school_fields_export.json');

async function updateParisSchoolsAndCOL() {
  console.log('🚀 Updating Paris Cost of Living & School Benefit Packages in Firestore & Canonical Exports...\n');

  // 1. Update Paris Cost-of-Living in Firestore
  const parisColSnap = await db.collection('locations_costOfLiving').where('city', '==', 'Paris').get();
  const batch = db.batch();

  parisColSnap.forEach(doc => {
    console.log(`Updating CoL Doc: ${doc.id}`);
    batch.set(doc.ref, {
      monthlyRent1BR: 1250, // Strategy 1: Petite Couronne commuter benchmark (~€1,150 / $1,250 USD)
      rent1br: 1250,
      monthlyRent2BR: 1850,
      rent2br: 1850,
      monthlyRent3BR: 2550,
      rent3br: 2550,
      housingContext: 'Benchmark reflects standard international faculty residence in Paris Petite Couronne (Boulogne-Billancourt, Issy-les-Moulineaux, Levallois, Saint-Cloud at €1,050–€1,250/mo) with 50% Navigo transit access to central campus.',
      updatedAt: new Date().toISOString()
    }, { merge: true });
  });

  // 2. Update Schools FLIS0037, FLIS0227, FLIS0228
  const canonicalSchools = JSON.parse(fs.readFileSync(exportPath1, 'utf-8'));
  const targetIds = ['FLIS0037', 'FLIS0227', 'FLIS0228'];

  for (const s of canonicalSchools) {
    if (!targetIds.includes(s.id)) continue;

    console.log(`Enriching ${s.id} (${s.name})...`);

    s.housingprovision = 'Self-Funded (Petite Couronne Commuter Benchmark: €1,150/mo; Boulogne/Issy/Levallois via direct Metro/RER. Garantie Visale institutional guarantor support provided)';
    s.housing_status = 'Self-funded (Commuter Benchmark)';
    s.transportBenefit = '50% Monthly Paris Navigo Pass Reimbursed (~€43.20/mo statutory subsidy)';
    s.flightBenefit = 'Initial arrival and end-of-contract relocation flights / baggage allowance';
    
    s.intel = {
      ...(s.intel || {}),
      packageType: 'Destination-Led / Local-Plus Package',
      housing: {
        provided: false,
        type: 'Self-funded Petite Couronne commute',
        benchmarkMonthlyEUR: 1150,
        notes: 'Faculty typically lease in the Petite Couronne (Boulogne-Billancourt, Issy-les-Moulineaux, Levallois-Perret, Saint-Cloud at €1,050–€1,250/mo) with direct Metro/RER access to campus. School provides corporate dossier backing & Garantie Visale guarantor enrollment.'
      },
      transport: {
        subsidyPercent: 50,
        monthlyValueEUR: 43.20,
        notes: 'Mandatory 50% statutory Navigo pass reimbursement (~€43.20/month / €518/year tax-free).'
      },
      meals: {
        provided: true,
        type: 'Titres-Restaurant (Meal Vouchers)',
        monthlyValueEUR: 120,
        notes: 'Daily meal vouchers (Titres-Restaurant) with 50–60% employer co-funding (~€110–€130/mo in tax-free food purchasing power).'
      },
      health: {
        provided: true,
        type: 'State Social Security + Co-funded Mutuelle',
        notes: 'Full French Sécurité Sociale plus comprehensive top-tier complementary health/dental/optical (Mutuelle) co-funded by school.'
      },
      tax: {
        impatriateSchemeEligible: true,
        article: 'Article 155 B du CGI',
        notes: 'Qualifying international recruits benefit from the French Impatriate Tax Shield (up to 30% of remuneration exempt from French income tax for up to 8 years).'
      },
      tuition: {
        provided: true,
        remissionPercent: 100,
        notes: 'Full 100% staff tuition waiver for enrolled dependent children (worth €22,000–€34,000/yr tax-free per child).'
      },
      vacation: {
        weeksPerYear: 16,
        notes: '16 weeks fully paid school vacations per French national academic calendar (Toussaint, Christmas, Winter, Spring, Summer).'
      },
      relocation: {
        provided: true,
        type: 'Initial Relocation & Settling-in Support',
        notes: 'Flight reimbursement / baggage allowance plus initial settling-in stipend (€1,500–€3,000).'
      }
    };

    // Update in Firestore batch
    const docRef = db.collection('schools').doc(s.id);
    batch.set(docRef, {
      housingprovision: s.housingprovision,
      housing_status: s.housing_status,
      transportBenefit: s.transportBenefit,
      flightBenefit: s.flightBenefit,
      intel: s.intel,
      last_benchmark_update: new Date().toISOString()
    }, { merge: true });
  }

  await batch.commit();
  console.log('📡 Successfully committed updates to Firestore.');

  // Write updated canonical files
  fs.writeFileSync(exportPath1, JSON.stringify(canonicalSchools, null, 2));
  fs.writeFileSync(exportPath2, JSON.stringify(canonicalSchools, null, 2));
  console.log(`📁 Saved updated canonical exports (${canonicalSchools.length} schools).`);
}

updateParisSchoolsAndCOL().catch(console.error);

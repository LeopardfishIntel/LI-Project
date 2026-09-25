import fs from 'fs';
import path from 'path';
import { getAdminDb } from '../firebase/admin';

async function updateJeannineManuel() {
  const db = getAdminDb();
  console.log(`\n=============================================================`);
  console.log(`🇫🇷 UPDATING ECOLE JEANNINE MANUEL (FLIS0037) BENEFITS & DOSSIER`);
  console.log(`=============================================================\n`);

  const updates = {
    id: 'FLIS0037',
    schoolId: 'FLIS0037',
    name: 'Ecole Jeannine Manuel',
    schoolname: 'Ecole Jeannine Manuel',
    city: 'Paris',
    country: 'France',
    region: 'europe',
    curriculum: 'French Ministry of Education / IB Continuum (PYP / MYP / DP)',
    ownership: 'Non-Profit Foundation',
    profitStatus: 'Non-Profit',
    'profit status': 'Non-Profit',
    salaryRange: 'EUR 26,000 - 38,000 / year (Net ~€2,075 - €2,850/mo)',
    salary_range: 'EUR 26,000 - 38,000 / year (Net ~€2,075 - €2,850/mo)',
    currency: 'EUR',
    isTaxFree: false,
    housingprovision: 'Not Included (Self-Funded Private Paris Market)',
    housingBenefit: 'Not Included',
    healthcoverage: 'Comprehensive (State Sécurité Sociale + Co-funded Mutuelle)',
    flightAllowance: 'Not Included',
    tuitionBenefit: 'Subsidized (Means-tested bursaries & staff tuition discounts)',
    pensionBenefit: 'French National Pension (Retraite Générale) + Agirc-Arrco Supplementary',
    transportBenefit: '50% Monthly Paris Navigo Pass Reimbursed (~€43/mo subsidy)',
    packageType: 'Destination-Led Package',
    contractStructure: "Contrat d'association avec l'État (French Ministry of Education Pay Scale)",
    summary: "Prestigious Paris bilingual institution operating under a contrat d'association with the French state. Compensation follows official French Ministry scales with mandatory 50% Navigo transit subsidies and full French social security, while housing is self-funded.",
    intel: {
      packageType: 'Destination-Led Package',
      contractType: "Contrat d'Association",
      housing: {
        provided: false,
        type: 'Self-funded private market',
        notes: 'Teachers must secure and pay for their own housing on the local Paris private market.'
      },
      flights: {
        provided: false,
        notes: 'Annual flights are not provided.'
      },
      health: {
        provided: true,
        type: 'State + Co-funded Mutuelle',
        notes: 'Full French Sécurité Sociale plus supplemental private health insurance (Mutuelle) co-funded by the school.'
      },
      transport: {
        subsidyPercent: 50,
        notes: '50% Navigo pass reimbursement by French statutory labor law (~€43/month).'
      },
      tuition: {
        provided: false,
        subsidized: true,
        notes: 'Means-tested bursaries and discounts available for enrolled children of staff.'
      },
      pension: {
        provided: true,
        notes: 'Contributions to French national pension system (Retraite générale).'
      }
    },
    updatedAt: new Date().toISOString()
  };

  // 1. Update Firestore
  const docRef = db.collection('schools').doc('FLIS0037');
  await docRef.set(updates, { merge: true });
  console.log(`✅ Firestore document schools/FLIS0037 updated successfully.`);

  // 2. Update complete_school_fields_export.json
  const exportPaths = [
    path.resolve(process.cwd(), 'complete_school_fields_export.json'),
    path.resolve(process.cwd(), 'public', 'complete_school_fields_export.json'),
  ];

  for (const expPath of exportPaths) {
    if (fs.existsSync(expPath)) {
      const data: any[] = JSON.parse(fs.readFileSync(expPath, 'utf8'));
      const idx = data.findIndex(s => s.id === 'FLIS0037');
      if (idx !== -1) {
        data[idx] = { ...data[idx], ...updates };
        fs.writeFileSync(expPath, JSON.stringify(data, null, 2), 'utf8');
        console.log(`✅ Updated ${expPath}`);
      }
    }
  }

  console.log(`\n🎉 Ecole Jeannine Manuel (FLIS0037) benefits review completed and saved!`);
}

updateJeannineManuel();

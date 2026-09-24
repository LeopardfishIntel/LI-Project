import admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';

const saPath = path.resolve(process.cwd(), 'service-account.json');
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(saPath),
    projectId: 'studio-2840117705-12faa'
  });
}
const db = admin.firestore();

async function updateBstData() {
  const bstData = {
    id: 'FLIS0150',
    schoolId: 'FLIS0150',
    schoolname: 'British School in Tokyo',
    name: 'British School in Tokyo',
    country: 'Japan',
    city: 'Tokyo',
    curriculum: 'UK Curriculum (IGCSE, A-Levels)',
    housingprovision: 'Subsidised (90%)',
    housing_status: 'subsidized',
    housing_subsidy_rate: 0.90,
    housingBenefit: 'Subsidised (90%)',
    housing_details: '90% school-subsidized accommodation directly provided to overseas-recruited teachers in expat-friendly Tokyo districts (Shibuya, Minato, Setagaya).',
    commuteReimbursed: true,
    transportBenefit: '100% reimbursement for daily public transportation (train/subway pass) between home and campus',
    pensionBenefit: '5% school contribution toward pension plan + participation in Japan PMAC (Private School Mutual Aid) system',
    travelBenefit: 'Annual return economy flight for teacher and dependent family members; appointment/completion flights + dedicated shipping allowance',
    tuitionBenefit: 'Subsidized tuition places at BST for dependent children of teaching staff',
    healthcoverage: 'Comprehensive Japanese PMAC health coverage provided for staff and dependent family members',
    deviceBenefit: 'Dedicated PC purchase allowance or device allocation + funded PD across BSME/FOBISIA networks',
    package_descriptor: 'Tier-1 Tokyo Flagship Expat Package: 90% Subsidized Housing, 100% Commute Pass Reimbursement & 5% Pension Top-Up',
    summary: 'The British School in Tokyo (BST) offers a Tier-1 flagship package with 90% subsidized accommodation in central Tokyo, 100% public transit reimbursement, 5% pension top-up + PMAC, annual return flights for family, and subsidized dependent tuition.',
    financescore: '8.8',
    totalscore: '8.8',
    rating: '8.8',
    ownership: 'Non-Profit',
    updatedAt: new Date().toISOString()
  };

  await db.collection('schools').doc('FLIS0150').set(bstData, { merge: true });
  console.log('✅ Updated FLIS0150 (British School in Tokyo) in Firestore');

  for (const filePath of ['complete_school_fields_export.json', 'public/complete_school_fields_export.json']) {
    if (fs.existsSync(filePath)) {
      const list = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      let count = 0;
      list.forEach((item: any) => {
        if (item.id === 'FLIS0150' || item.schoolId === 'FLIS0150' || (item.schoolname || item.name || '').toLowerCase().includes('british school in tokyo')) {
          Object.assign(item, bstData);
          count++;
        }
      });
      fs.writeFileSync(filePath, JSON.stringify(list, null, 2), 'utf8');
      console.log(`✅ Updated ${count} records in ${filePath}`);
    }
  }
}

updateBstData();

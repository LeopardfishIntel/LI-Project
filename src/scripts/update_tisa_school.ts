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

async function updateTisaData() {
  const tisaData = {
    id: 'FLIS0226',
    schoolId: 'FLIS0226',
    schoolname: 'The International School of Azerbaijan',
    name: 'The International School of Azerbaijan',
    country: 'Azerbaijan',
    city: 'Baku',
    curriculum: 'IB (PYP, MYP, DP)',
    housingprovision: 'Provided',
    housing_status: 'provided',
    housingBenefit: 'Yes',
    housingProvided: true,
    housing_details: '100% school-provided furnished expat housing and covered utilities as standard',
    salaryRange: '$42,000 - $54,000 / year (Tax-Free USD)',
    startingSalary: '$38,000',
    expectedSalary5Years: '$42,000',
    salary5YearsExp: '$42,000',
    salary: '$3,500 / month',
    salary_yearly: '$42,000',
    base_salary_usd: 42000,
    startingSalaryUsd: 38000,
    expectedSalaryNetUsd: 42000,
    salaryCurrency: 'USD',
    travelBenefit: 'Annual round-trip flights for teacher and family dependents + relocation allowance',
    healthcoverage: 'Worldwide International Comprehensive Health Cover',
    tuitionBenefit: '100% Free Tuition at TISA for dependent children',
    package_descriptor: 'Premier Diplomatic/BP School Expat Package with 100% Provided Housing, Utilities & High Net Savings (~71%)',
    summary: 'The International School of Azerbaijan (TISA) provides a premier diplomatic/oil-sector expat package with 100% school-provided furnished housing, covered utilities, international health coverage, and an outstanding ~71% net savings margin in Baku.',
    financescore: '8.8',
    totalscore: '8.4',
    rating: '8.4',
    updatedAt: new Date().toISOString()
  };

  await db.collection('schools').doc('FLIS0226').set(tisaData, { merge: true });
  console.log('✅ Updated FLIS0226 (TISA) in Firestore');

  for (const filePath of ['complete_school_fields_export.json', 'public/complete_school_fields_export.json']) {
    if (fs.existsSync(filePath)) {
      const list = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      let count = 0;
      list.forEach((item: any) => {
        if (item.id === 'FLIS0226' || item.schoolId === 'FLIS0226' || (item.schoolname || item.name || '').toLowerCase().includes('international school of azerbaijan')) {
          Object.assign(item, tisaData);
          count++;
        }
      });
      fs.writeFileSync(filePath, JSON.stringify(list, null, 2), 'utf8');
      console.log(`✅ Updated ${count} records in ${filePath}`);
    }
  }
}

updateTisaData();

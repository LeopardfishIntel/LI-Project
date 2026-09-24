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

async function fixBakuData() {
  const bisData = {
    id: 'FLIS0222',
    schoolId: 'FLIS0222',
    schoolname: 'Baku International School',
    name: 'Baku International School',
    country: 'Azerbaijan',
    city: 'Baku',
    salaryRange: '$39,000 - $49,000 / year (Tax-Free USD)',
    startingSalary: '$39,000',
    expectedSalary5Years: '$47,200',
    salary5YearsExp: '$47,200',
    salary: '$3,933 / month',
    salary_yearly: '$47,200',
    base_salary_usd: 47200,
    startingSalaryUsd: 39000,
    expectedSalaryNetUsd: 47200,
    salaryCurrency: 'USD',
    summary: 'Baku International School (QSI) offers a premier USD-denominated net compensation package ($39,000–$49,000 USD tax-free) with provided housing, utility coverage, 100% dependent tuition remission, and 30%–50% annual savings potential in Baku, Azerbaijan.',
    savingspotential: '30% - 50% ($14,000 - $24,000 USD / yr)',
    housingprovision: 'Provided',
    housing_status: 'provided',
    housingBenefit: 'Yes',
    contractDays: 187,
    overseasAllowance: 4500,
    completionBonus: 2000,
    retentionBonus: 3500,
    tuitionBenefit: '100% Free Tuition for Dependent Children',
    travelBenefit: 'Annual Return Airfare for Teacher & Minor Dependents',
    healthcoverage: 'Worldwide Health Insurance (Full Premium Paid by QSI for Teacher & Dependents)',
    ownership: 'Non-Profit',
    totalscore: '8.2',
    financescore: '8.4',
    rating: '8.2',
    updatedAt: new Date().toISOString()
  };

  await db.collection('schools').doc('FLIS0222').set(bisData, { merge: true });
  console.log('✅ Updated FLIS0222 in Firestore with clean $ signs');

  for (const filePath of ['complete_school_fields_export.json', 'public/complete_school_fields_export.json']) {
    if (fs.existsSync(filePath)) {
      const list = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      let count = 0;
      list.forEach((item: any) => {
        if (item.id === 'FLIS0222' || item.schoolId === 'FLIS0222' || (item.schoolname || item.name || '').includes('Baku International School')) {
          Object.assign(item, bisData);
          count++;
        }
      });
      fs.writeFileSync(filePath, JSON.stringify(list, null, 2), 'utf8');
      console.log(`✅ Updated ${count} records in ${filePath}`);
    }
  }
}

fixBakuData();

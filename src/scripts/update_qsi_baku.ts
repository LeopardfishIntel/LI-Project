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

async function updateQsiBakuData() {
  const bisData = {
    id: 'FLIS0222',
    schoolId: 'FLIS0222',
    schoolname: 'Baku International School',
    name: 'Baku International School',
    country: 'Azerbaijan',
    city: 'Baku',
    curriculum: 'US Curriculum, Advanced Placement (AP)',
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
    housingprovision: 'Provided',
    housing_status: 'provided',
    housingBenefit: 'Yes',
    housing_details: 'Fully furnished, school-provided accommodation or monthly housing stipend; utilities covered by QSI for costs exceeding $1,000/year.',
    overseasAllowance: 4500,
    completionBonus: 2000,
    commitmentBonus: 3500,
    retentionBonus: 3500,
    contractDays: 187,
    travelBenefit: 'Annual round-trip flight stipend or economy flight tickets for teacher and minor dependents + relocation/settling-in allowance',
    healthcoverage: 'Worldwide International Health Insurance (Full premium paid by QSI for teacher and minor dependents)',
    tuitionBenefit: '100% Free Tuition at QSI Baku for school-aged dependent children',
    visaSupport: 'Full sponsorship and administrative handling of Azerbaijani work visas and residency permits by QSI',
    package_descriptor: 'QSI Global Expat Package: Tax-Free USD salary, provided furnished housing & utility subsidy, worldwide medical, 100% dependent tuition, and annual bonuses',
    summary: 'Baku International School (QSI) offers a premier USD-denominated tax-free package ($39,000–$49,000 USD net/yr) with fully furnished school-provided accommodation, utility coverage, $4,500 annual overseas allowance, $2,000 completion bonus, worldwide health cover, and 100% dependent tuition remission.',
    financescore: '8.4',
    totalscore: '8.2',
    rating: '8.2',
    ownership: 'Non-Profit',
    updatedAt: new Date().toISOString()
  };

  await db.collection('schools').doc('FLIS0222').set(bisData, { merge: true });
  console.log('✅ Updated FLIS0222 (Baku International School / QSI Baku) in Firestore');

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

updateQsiBakuData();

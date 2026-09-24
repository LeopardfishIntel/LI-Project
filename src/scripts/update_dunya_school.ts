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

async function updateDunyaData() {
  const dunyaData = {
    id: 'FLIS0224',
    schoolId: 'FLIS0224',
    schoolname: 'Khazar University Dunya IB School',
    name: 'Khazar University Dunya IB School',
    country: 'Azerbaijan',
    city: 'Baku',
    curriculum: 'IB (PYP, MYP, DP)',
    salaryRange: '$22,000 - $32,000 / year (USD Pegged)',
    startingSalary: '$22,000',
    expectedSalary5Years: '$27,000',
    salary5YearsExp: '$27,000',
    salary: '$2,250 / month',
    salary_yearly: '$27,000',
    base_salary_usd: 27000,
    startingSalaryUsd: 22000,
    expectedSalaryNetUsd: 27000,
    salaryCurrency: 'USD',
    housingprovision: 'Provided',
    housing_status: 'provided',
    housingBenefit: 'Yes',
    housing_details: 'School-managed apartment in Baku or monthly housing allowance (600–900 AZN/month)',
    travelBenefit: 'Annual round-trip economy flight ticket home per academic year for primary contract holder',
    healthcoverage: 'Local Private Medical Insurance across Baku clinics',
    tuitionBenefit: 'Subsidized or fully covered tuition for dependent children enrolled at Dunya School (subject to seat availability)',
    professionalDevelopment: 'Sponsored/subsidized official IB training workshops and certifications via Dunya IB Professional Learning Hub',
    visaSupport: 'Full sponsorship and administrative handling of work permits & residency visas via Khazar University HR',
    package_descriptor: 'University-affiliated hybrid international contract with provided housing, local private medical, and sponsored IB certification',
    summary: 'Khazar University Dunya IB School offers a hybrid university-affiliated compensation package ($22,000–$32,000 USD net/yr) with provided Baku apartment housing/allowance, annual round-trip flight, local private medical cover, and sponsored IB training workshops.',
    financescore: '7.0',
    totalscore: '7.2',
    rating: '7.2',
    updatedAt: new Date().toISOString()
  };

  await db.collection('schools').doc('FLIS0224').set(dunyaData, { merge: true });
  console.log('✅ Updated FLIS0224 in Firestore');

  for (const filePath of ['complete_school_fields_export.json', 'public/complete_school_fields_export.json']) {
    if (fs.existsSync(filePath)) {
      const list = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      let count = 0;
      list.forEach((item: any) => {
        if (item.id === 'FLIS0224' || item.schoolId === 'FLIS0224' || (item.schoolname || item.name || '').toLowerCase().includes('dunya')) {
          Object.assign(item, dunyaData);
          count++;
        }
      });
      fs.writeFileSync(filePath, JSON.stringify(list, null, 2), 'utf8');
      console.log(`✅ Updated ${count} records in ${filePath}`);
    }
  }
}

updateDunyaData();

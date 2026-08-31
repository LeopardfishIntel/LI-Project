import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getAdminDb } from '../src/firebase/admin';

const rawSchools = [
  {
    "id": "FLIS0204",
    "schoolname": "St. Gilgen International School",
    "country": "Austria",
    "city": "St. Gilgen",
    "tespage": "https://www.tes.com/jobs/employer/st-gilgen-international-school-1057170",
    "tesnumber": "1057170",
    "agency": "Search Associates, Schrole, LinkedIn, Karriere.at"
  },
  {
    "id": "FLIS0205",
    "schoolname": "International Christian School of Vienna",
    "country": "Austria",
    "city": "Vienna",
    "schooljp": "https://www.icsv.at/vacancies",
    "agency": "Schrole, Teacher Horizons, LinkedIn, ACSI Jobs"
  },
  {
    "id": "FLIS0206",
    "schoolname": "International School Carinthia",
    "country": "Austria",
    "city": "Velden",
    "schooljp": "https://isc.ac.at/we-are-isc/career/",
    "agency": "Karriere.at, LinkedIn, Search Associates"
  },
  {
    "id": "FLIS0207",
    "schoolname": "International School Innsbruck",
    "country": "Austria",
    "city": "Innsbruck",
    "agency": "Karriere.at, Tirol.gv.at Job Portal, LinkedIn"
  },
  {
    "id": "FLIS0208",
    "schoolname": "Lower Austrian International School",
    "country": "Austria",
    "city": "St. Pölten",
    "agency": "Karriere.at, LinkedIn"
  },
  {
    "id": "FLIS0209",
    "schoolname": "Linz International School Auhof (LISA)",
    "country": "Austria",
    "city": "Linz",
    "schooljp": "https://lisa.europagym.at/careers-lisa/",
    "agency": "Karriere.at, Oberösterreich Bildungsdirektion Portal"
  },
  {
    "id": "FLIS0210",
    "schoolname": "SALIS - Salzburg International School",
    "country": "Austria",
    "city": "Salzburg",
    "agency": "Karriere.at, LinkedIn"
  },
  {
    "id": "FLIS0211",
    "schoolname": "The American International School Vienna",
    "country": "Austria",
    "city": "Vienna",
    "schooljp": "https://www.ais.at/employment/faculty-openings",
    "agency": "Search Associates, ISS, Schrole, LinkedIn"
  },
  {
    "id": "FLIS0212",
    "schoolname": "Schloss Krumbach International School",
    "country": "Austria",
    "city": "Krumbach",
    "schooljp": "https://join.com/companies/krumbach",
    "agency": "Join.com, Karriere.at, LinkedIn"
  },
  {
    "id": "FLIS0213",
    "schoolname": "Vienna International School",
    "country": "Austria",
    "city": "Vienna",
    "tespage": "https://www.tes.com/jobs/employer/vienna-international-school-1270224",
    "tesnumber": "1270224",
    "schooljp": "https://www.vis.ac.at/work-at-vis/current-vacancies",
    "agency": "Search Associates, Schrole, UN Job List, LinkedIn"
  },
  {
    "id": "FLIS0214",
    "schoolname": "Arabian Pearl Gulf School",
    "country": "Bahrain",
    "city": "Manama",
    "agency": "LinkedIn, Gulf Talent"
  },
  {
    "id": "FLIS0215",
    "schoolname": "American School of Bahrain",
    "country": "Bahrain",
    "city": "Manama",
    "agency": "Emerge Education Portal, Search Associates, LinkedIn, Gulf Talent"
  },
  {
    "id": "FLIS0216",
    "schoolname": "Bahrain Bayan School",
    "country": "Bahrain",
    "city": "Juffair",
    "tespage": "https://www.tes.com/jobs/employer/bahrain-bayan-school-1075886",
    "tesnumber": "1075886",
    "schooljp": "https://www.bayanschool.edu.bh/page/view/92",
    "agency": "Search Associates, Schrole, LinkedIn, Gulf Talent"
  },
  {
    "id": "FLIS0217",
    "schoolname": "Riffa Views International School",
    "country": "Bahrain",
    "city": "Riffa",
    "tespage": "https://www.tes.com/jobs/employer/riffa-views-international-school-1075656",
    "tesnumber": "1075656",
    "schooljp": "https://www.rvis.edu.bh/careers",
    "agency": "Search Associates, Schrole, ISS, LinkedIn"
  },
  {
    "id": "FLIS0218",
    "schoolname": "Naseem International School",
    "country": "Bahrain",
    "city": "Riffa",
    "agency": "Teacher Horizons, LinkedIn, Gulf Talent"
  },
  {
    "id": "FLIS0219",
    "schoolname": "Britus International School",
    "country": "Bahrain",
    "city": "Salmabad",
    "agency": "Britus Educational Portal, Gulf Talent, LinkedIn"
  },
  {
    "id": "FLIS0220",
    "schoolname": "Multinational School Bahrain",
    "country": "Bahrain",
    "city": "Manama",
    "tespage": "https://www.tes.com/jobs/employer/multinational-school-bahrain-1178513",
    "tesnumber": "1178513",
    "schooljp": "https://mns-bahrain.com/career.php",
    "agency": "Teach Away, LinkedIn, Gulf Talent"
  },
  {
    "id": "FLIS0221",
    "schoolname": "Nadeen School",
    "country": "Bahrain",
    "city": "Manama",
    "tespage": "https://www.tes.com/jobs/employer/nadeen-school-1062752",
    "tesnumber": "1062752",
    "schooljp": "https://nadeenschool.com/join-our-family/#join_team",
    "agency": "Teacher Horizons, LinkedIn, Gulf Talent"
  },
  {
    "id": "FLIS0222",
    "schoolname": "New Generation Private School",
    "country": "Bahrain",
    "city": "Juffair",
    "agency": "Gulf Talent, LinkedIn"
  },
  {
    "id": "FLIS0223",
    "schoolname": "Shaikha Hessa Girls' School",
    "country": "Bahrain",
    "city": "Riffa",
    "agency": "LinkedIn, Gulf Talent"
  },
  {
    "id": "FLIS0224",
    "schoolname": "St Christopher's School",
    "country": "Bahrain",
    "city": "Isa Town",
    "tespage": "https://www.tes.com/jobs/employer/st-christopher-s-school-primary-1170107",
    "tesnumber": "1170107",
    "schooljp": "https://st-chris.schoolrecruiter.com/",
    "agency": "SchoolRecruiter Portal, Search Associates, LinkedIn"
  },
  {
    "id": "FLIS0225",
    "schoolname": "Antwerp International School",
    "country": "Belgium",
    "city": "Ekeren",
    "agency": "Search Associates, Schrole, LinkedIn"
  },
  {
    "id": "FLIS0226",
    "schoolname": "BEPS International School",
    "country": "Belgium",
    "city": "Brussels",
    "agency": "Search Associates, LinkedIn"
  },
  {
    "id": "FLIS0227",
    "schoolname": "Bogaerts International School",
    "country": "Belgium",
    "city": "Brussels",
    "agency": "LinkedIn, Teacher Horizons"
  },
  {
    "id": "FLIS0228",
    "schoolname": "British International School of Brussels",
    "country": "Belgium",
    "city": "Brussels",
    "agency": "LinkedIn, Teacher Horizons"
  },
  {
    "id": "FLIS0229",
    "schoolname": "British Junior Academy of Brussels",
    "country": "Belgium",
    "city": "Brussels",
    "tespage": "https://www.tes.com/jobs/employer/british-junior-academy-of-brussels-1057697",
    "tesnumber": "1057697",
    "schooljp": "https://www.bjab.org/our-community/work-with-us#vacancies",
    "agency": "Teacher Horizons, LinkedIn"
  },
  {
    "id": "FLIS0230",
    "schoolname": "European School of Bruxelles-Argenteuil",
    "country": "Belgium",
    "city": "Waterloo",
    "agency": "LinkedIn, Euraxess"
  },
  {
    "id": "FLIS0231",
    "schoolname": "International Montessori School",
    "country": "Belgium",
    "city": "Tervuren",
    "agency": "AMI (Association Montessori Internationale) Jobs, LinkedIn"
  },
  {
    "id": "FLIS0232",
    "schoolname": "International School Ghent vzw",
    "country": "Belgium",
    "city": "Ghent",
    "agency": "VDAB Belgium, LinkedIn"
  },
  {
    "id": "FLIS0233",
    "schoolname": "International School of Belgium",
    "country": "Belgium",
    "city": "Antwerp",
    "tespage": "https://www.tes.com/jobs/employer/international-school-of-belgium-1074131",
    "tesnumber": "1074131",
    "agency": "Search Associates, Schrole, ISS, LinkedIn"
  },
  {
    "id": "FLIS0234",
    "schoolname": "International School of Flanders Waterloo",
    "country": "Belgium",
    "city": "Waterloo",
    "schooljp": "https://www.isfwaterloo.org/302/job-opportunities",
    "agency": "ISF Group Portal, LinkedIn"
  },
  {
    "id": "FLIS0235",
    "schoolname": "International School of Flanders RHSG",
    "country": "Belgium",
    "city": "Rhode-Saint-Genèse",
    "agency": "ISF Group Portal, LinkedIn"
  },
  {
    "id": "FLIS0236",
    "schoolname": "Montgomery International School",
    "country": "Belgium",
    "city": "Brussels",
    "schooljp": "https://www.mischool.be/nav-footer-links/career",
    "agency": "LinkedIn, Teacher Horizons"
  },
  {
    "id": "FLIS0237",
    "schoolname": "Azerbaijan British College",
    "country": "Azerbaijan",
    "city": "Baku",
    "tespage": "https://www.tes.com/jobs/employer/azerbaijan-british-college-1064480",
    "tesnumber": "1064480",
    "agency": "Teacher Horizons, Teach Away, LinkedIn"
  },
  {
    "id": "FLIS0238",
    "schoolname": "Baku International School",
    "country": "Azerbaijan",
    "city": "Baku",
    "schooljp": "https://www.qsi.org/careers",
    "agency": "QSI Portal, Search Associates"
  },
  {
    "id": "FLIS0239",
    "schoolname": "Baku Oxford School",
    "country": "Azerbaijan",
    "city": "Baku",
    "tespage": "https://www.tes.com/jobs/employer/baku-oxford-school-1076164",
    "tesnumber": "1076164",
    "schooljp": "https://www.bakuoxfordschool.com/employment",
    "agency": "Teacher Horizons, LinkedIn"
  },
  {
    "id": "FLIS0240",
    "schoolname": "Khazar University Dunya IB School",
    "country": "Azerbaijan",
    "city": "Baku",
    "agency": "Khazar University Portal, IB World Schools Board, LinkedIn"
  },
  {
    "id": "FLIS0241",
    "schoolname": "Modern Educational Complex Named in Honor of Heydar Aliyev",
    "country": "Azerbaijan",
    "city": "Baku",
    "schooljp": "https://mtk.edu.az/az/vacancies",
    "agency": "JobSearch.az, LinkedIn"
  },
  {
    "id": "FLIS0242",
    "schoolname": "The International School of Azerbaijan",
    "country": "Azerbaijan",
    "city": "Baku",
    "schooljp": "https://www.tisa.az/about-us/working-at-tisa/",
    "agency": "Search Associates, ISS, Schrole, LinkedIn"
  }
];

function extractTesSlug(tespage?: string): string | null {
  if (!tespage) return null;
  const match = tespage.match(/\/jobs\/employer\/([^/?#]+)/i);
  return match ? match[1] : null;
}

async function bulkUpdateFlis0204To0242() {
  const db = getAdminDb();
  console.log(`🚀 [BULK UPDATE FLIS0204-FLIS0242] Updating ${rawSchools.length} school records in Firestore...\n`);

  let count = 0;
  let batch = db.batch();

  for (const s of rawSchools) {
    const tesSlug = extractTesSlug(s.tespage);
    const docRef = db.collection('schools').doc(s.id);

    const payload: any = {
      schoolname: s.schoolname,
      name: s.schoolname,
      country: s.country,
      city: s.city,
      tesOrganizationId: s.tesnumber || null,
      tesEmployerSlug: tesSlug || null,
      careersPageUrl: s.schooljp || null,
      website: s.schooljp || null,
      agency: s.agency || null,
      revalidationStatus: 'success',
      updatedAt: new Date().toISOString()
    };

    batch.set(docRef, payload, { merge: true });
    count++;

    if (count % 400 === 0) {
      await batch.commit();
      batch = db.batch();
      console.log(`  Committed batch up to item ${count}...`);
    }
  }

  await batch.commit();
  console.log(`\n🎉 BULK UPDATE COMPLETE! Successfully updated ${count} school documents (FLIS0204 - FLIS0242) in Firestore.`);
}

bulkUpdateFlis0204To0242().catch(console.error);
